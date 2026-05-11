"""
FindX Scrapy Auditor — FastAPI entrypoint
Exposes two endpoints:
  POST /audit          — full deep crawl (up to max_pages)
  GET  /health         — liveness probe
"""

import asyncio
import ipaddress
import logging
import os
import socket
from typing import Optional
from urllib.parse import urlparse

from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, field_validator

from scrapy import signals
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from twisted.internet import reactor, defer
import threading

from spider import DeepAuditSpider, AuditResult
from scorer import calculate_deep_score

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.WARNING)
log = logging.getLogger("scrapy_auditor")


# ── SSRF Protection ───────────────────────────────────────────────────────────

def _is_private_ip(addr: str) -> bool:
    """Return True if the address is private, loopback, link-local, or reserved."""
    try:
        ip = ipaddress.ip_address(addr)
        return (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        )
    except ValueError:
        return True  # unparseable → block


def assert_public_url(url: str) -> None:
    """
    Resolve the hostname in *url* and raise HTTPException(400) if it maps to
    a private / reserved IP address.  Call this before passing a URL to Scrapy.
    """
    try:
        parsed = urlparse(url)
        hostname = parsed.hostname or ""
    except Exception:
        raise HTTPException(status_code=400, detail="SSRF_BLOCKED: malformed URL")

    if not hostname:
        raise HTTPException(status_code=400, detail="SSRF_BLOCKED: missing hostname")

    # Bare-IP fast path — reject immediately without DNS
    try:
        bare = hostname.strip("[]")  # strip IPv6 brackets
        if _is_private_ip(bare):
            raise HTTPException(status_code=400, detail=f"SSRF_BLOCKED: direct private IP {hostname}")
    except HTTPException:
        raise
    except Exception:
        pass  # not a bare IP; fall through to DNS

    # DNS resolution — blocks DNS rebinding to internal IPs
    try:
        results = socket.getaddrinfo(hostname, None)
        for _family, _type, _proto, _canonname, sockaddr in results:
            ip_str = sockaddr[0]
            if _is_private_ip(ip_str):
                raise HTTPException(
                    status_code=400,
                    detail=f"SSRF_BLOCKED: {hostname} resolves to private IP {ip_str}",
                )
    except HTTPException:
        raise
    except OSError as e:
        # DNS failure → treat as unreachable, not a security error
        raise HTTPException(status_code=400, detail=f"DNS_FAILED: {str(e)[:80]}")

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="FindX Scrapy Auditor",
    description="Deep website crawler and digital health scorer",
    version="1.0.0",
)

# CORS: This microservice is internal-only.
# Allowed origin is read from SCRAPY_AUDITOR_CORS_ORIGIN env var (defaults to
# the API server's address). Set to the exact internal URL in production;
# never expose this service on a public port.
_cors_origin = os.getenv("SCRAPY_AUDITOR_CORS_ORIGIN", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[_cors_origin],
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type", "Authorization"],
)

# ── Scrapy settings ───────────────────────────────────────────────────────────
SCRAPY_SETTINGS = {
    "ROBOTSTXT_OBEY":           False,
    # SSRF protection: validate every request (including redirects) at the spider level
    "DOWNLOADER_MIDDLEWARES": {
        "spider.SSRFBlockerMiddleware": 100,
    },
    "CONCURRENT_REQUESTS":      8,
    "CONCURRENT_REQUESTS_PER_DOMAIN": 4,
    "DOWNLOAD_TIMEOUT":         12,
    "RETRY_TIMES":              1,
    "RETRY_HTTP_CODES":         [500, 502, 503, 504, 408],
    "COOKIES_ENABLED":          False,
    "TELNETCONSOLE_ENABLED":    False,
    "LOG_LEVEL":                "ERROR",
    "REDIRECT_MAX_TIMES":       3,
    "DEFAULT_REQUEST_HEADERS":  {
        "Accept":          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "User-Agent":      "Mozilla/5.0 (compatible; FindXBot/1.0; +https://findx.app/bot)",
    },
    # Limit crawl depth so we don't go too deep
    "DEPTH_LIMIT":              3,
    # Be respectful — small delay between requests to same domain
    "DOWNLOAD_DELAY":           0.3,
    "AUTOTHROTTLE_ENABLED":     True,
    "AUTOTHROTTLE_TARGET_CONCURRENCY": 2.0,
}


# ── Twisted reactor in a background thread ────────────────────────────────────
# Twisted reactor must run in a single dedicated thread.
_reactor_started = False
_reactor_lock = threading.Lock()

def _start_reactor():
    global _reactor_started
    with _reactor_lock:
        if not _reactor_started:
            _reactor_started = True
            t = threading.Thread(target=reactor.run, kwargs={"installSignalHandlers": False}, daemon=True)
            t.start()

_start_reactor()


# ── Schema ────────────────────────────────────────────────────────────────────
class AuditRequest(BaseModel):
    url: str
    max_pages: Optional[int] = 30

    @field_validator("url")
    @classmethod
    def normalize_url(cls, v: str) -> str:
        v = v.strip()
        if not v.startswith("http"):
            v = f"https://{v}"
        return v

    @field_validator("max_pages")
    @classmethod
    def clamp_pages(cls, v: int) -> int:
        return max(1, min(v, 100))


class AuditResponse(BaseModel):
    url: str
    audit: dict
    score_result: dict


# ── Crawl helper ──────────────────────────────────────────────────────────────
async def run_scrapy_audit(url: str, max_pages: int) -> AuditResult:
    """
    Run the DeepAuditSpider inside Twisted reactor (already running in bg thread).
    Uses asyncio Future to bridge Twisted Deferred → asyncio.
    """
    loop = asyncio.get_event_loop()
    future: asyncio.Future = loop.create_future()

    result = AuditResult(url)

    settings = get_project_settings()
    settings.update(SCRAPY_SETTINGS)
    runner = CrawlerRunner(settings)

    def _crawl():
        d = runner.crawl(DeepAuditSpider, start_url=url, max_pages=max_pages, result=result)
        d.addCallback(lambda _: loop.call_soon_threadsafe(future.set_result, result))
        d.addErrback(lambda f: loop.call_soon_threadsafe(
            future.set_exception, Exception(str(f.value))
        ))

    reactor.callFromThread(_crawl)

    return await asyncio.wait_for(future, timeout=120)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "scrapy-auditor"}


_AUDITOR_SECRET = os.environ.get("SCRAPY_AUDITOR_SECRET", "")


@app.post("/audit", response_model=AuditResponse)
async def audit_website(req: AuditRequest, request: Request):
    # ── Shared-secret authentication ──────────────────────────────────────────
    if _AUDITOR_SECRET:
        provided = request.headers.get("X-Auditor-Secret", "")
        if provided != _AUDITOR_SECRET:
            raise HTTPException(status_code=401, detail="Unauthorized: invalid or missing X-Auditor-Secret header")

    # ── SSRF guard — validate before handing off to Scrapy ───────────────────
    assert_public_url(req.url)

    log.info(f"Audit request: {req.url} (max_pages={req.max_pages})")

    try:
        result = await run_scrapy_audit(req.url, req.max_pages)
    except asyncio.TimeoutError:
        raise HTTPException(status_code=504, detail="Audit timed out — site may be too large or unreachable")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Crawl error: {str(e)[:200]}")

    audit_dict  = result.to_dict()
    score_result = calculate_deep_score(audit_dict)

    return AuditResponse(
        url=req.url,
        audit=audit_dict,
        score_result=score_result,
    )
