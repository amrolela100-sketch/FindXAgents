"""
FindX Scrapy Auditor — FastAPI entrypoint
Exposes two endpoints:
  POST /audit          — full deep crawl (up to max_pages)
  GET  /health         — liveness probe
"""

import asyncio
import logging
import os
from typing import Optional

from fastapi import FastAPI, HTTPException, BackgroundTasks
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

# ── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="FindX Scrapy Auditor",
    description="Deep website crawler and digital health scorer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Scrapy settings ───────────────────────────────────────────────────────────
SCRAPY_SETTINGS = {
    "ROBOTSTXT_OBEY":           False,
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


@app.post("/audit", response_model=AuditResponse)
async def audit_website(req: AuditRequest):
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
