"""
FindX Scrapy Deep Auditor — spider.py
Crawls a target website (up to max_pages) and collects:
  - All emails, phones
  - All internal/external links (broken link detection)
  - SEO signals per page (title, meta, H1, H2 count, images without alt)
  - Security headers
  - Page load times
  - Technology hints
"""

import re
import time
import scrapy
from scrapy import signals
from scrapy.crawler import CrawlerRunner
from scrapy.utils.project import get_project_settings
from scrapy.http import Response
from urllib.parse import urlparse, urljoin
from w3lib.html import remove_tags
from tldextract import extract as tld_extract
from collections import defaultdict
from typing import Dict, List, Set


# ── Regex patterns ──────────────────────────────────────────────────────────
EMAIL_RE = re.compile(
    r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}",
    re.IGNORECASE,
)
PHONE_RE = re.compile(
    r"(?:\+?\d[\d\s\-().]{6,}\d)",
)
SOCIAL_PATTERNS = {
    "linkedin":  re.compile(r"https?://(?:www\.)?linkedin\.com/(?:company|in)/[^\s\"'<>]+", re.I),
    "facebook":  re.compile(r"https?://(?:www\.)?facebook\.com/[^\s\"'<>]+", re.I),
    "instagram": re.compile(r"https?://(?:www\.)?instagram\.com/[^\s\"'<>]+", re.I),
    "twitter":   re.compile(r"https?://(?:www\.)?(?:twitter|x)\.com/[^\s\"'<>]+", re.I),
    "youtube":   re.compile(r"https?://(?:www\.)?youtube\.com/(?:channel|c|@)[^\s\"'<>]+", re.I),
    "whatsapp":  re.compile(r"https?://(?:api\.)?whatsapp\.com/[^\s\"'<>]+", re.I),
}

TECH_HINTS = {
    "WordPress":    ["wp-content", "wp-includes", "xmlrpc.php"],
    "Shopify":      ["cdn.shopify.com", "myshopify.com"],
    "Wix":          ["wix.com", "wixstatic.com", "wix-code"],
    "Squarespace":  ["squarespace.com", "squarespace-cdn.com"],
    "Webflow":      ["webflow.io", "webflow.com"],
    "Next.js":      ["_next/static", "__NEXT_DATA__"],
    "React":        ["react.production.min.js", "react-dom"],
    "Vue.js":       ["vue.runtime", "vue.min.js"],
    "Angular":      ["angular.min.js", "ng-version"],
    "Bootstrap":    ["bootstrap.min.css", "bootstrap.bundle"],
    "jQuery":       ["jquery.min.js", "jquery-", "/jquery/"],
    "Google Analytics": ["google-analytics.com/analytics.js", "gtag/js", "googletagmanager.com/gtag"],
    "Facebook Pixel":   ["connect.facebook.net/en_US/fbevents.js"],
    "HubSpot":      ["js.hs-scripts.com", "hubspot.com"],
    "Intercom":     ["intercom.io", "app.intercom.com"],
    "Hotjar":       ["static.hotjar.com", "hotjar.com"],
    "Cloudflare":   ["cloudflare.com", "cdnjs.cloudflare.com"],
}


class AuditResult:
    """Aggregated result from crawling a website."""
    def __init__(self, start_url: str):
        self.start_url = start_url
        self.pages_crawled: List[dict] = []
        self.all_emails: Set[str] = set()
        self.all_phones: Set[str] = set()
        self.social_links: Dict[str, str] = {}
        self.broken_links: List[dict] = []     # [{url, found_on, status}]
        self.external_links: Set[str] = set()
        self.internal_links: Set[str] = set()
        self.technologies: Set[str] = set()
        self.security_headers: Dict[str, str] = {}
        self.redirects: List[dict] = []        # [{from, to}]
        self.errors: List[str] = []

    def to_dict(self) -> dict:
        pages_count = len(self.pages_crawled)
        seo_issues = []
        missing_titles = sum(1 for p in self.pages_crawled if not p.get("title"))
        missing_meta   = sum(1 for p in self.pages_crawled if not p.get("meta_description"))
        missing_h1     = sum(1 for p in self.pages_crawled if p.get("h1_count", 0) == 0)
        slow_pages     = sum(1 for p in self.pages_crawled if p.get("load_time_ms", 0) > 3000)
        images_no_alt  = sum(p.get("images_missing_alt", 0) for p in self.pages_crawled)

        if missing_titles:
            seo_issues.append(f"{missing_titles} page(s) missing <title>")
        if missing_meta:
            seo_issues.append(f"{missing_meta} page(s) missing meta description")
        if missing_h1:
            seo_issues.append(f"{missing_h1} page(s) missing H1 tag")
        if images_no_alt:
            seo_issues.append(f"{images_no_alt} image(s) missing alt text")
        if self.broken_links:
            seo_issues.append(f"{len(self.broken_links)} broken link(s) found")

        return {
            "start_url":        self.start_url,
            "pages_crawled":    pages_count,
            "pages_detail":     self.pages_crawled[:50],  # cap for payload size
            "emails":           sorted(self.all_emails),
            "phones":           sorted(self.all_phones),
            "social_links":     self.social_links,
            "broken_links":     self.broken_links[:30],
            "external_links_count": len(self.external_links),
            "internal_links_count": len(self.internal_links),
            "technologies":     sorted(self.technologies),
            "security_headers": self.security_headers,
            "redirects":        self.redirects[:10],
            "seo_issues":       seo_issues,
            "slow_pages_count": slow_pages,
            "images_missing_alt": images_no_alt,
            "errors":           self.errors[:10],
        }


class DeepAuditSpider(scrapy.Spider):
    name = "deep_audit"

    def __init__(self, start_url: str, max_pages: int = 30, result: AuditResult = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.start_url = start_url if start_url.startswith("http") else f"https://{start_url}"
        self.max_pages = max_pages
        self.result = result or AuditResult(self.start_url)
        self.visited: Set[str] = set()
        self.queued: Set[str] = set()

        parsed = urlparse(self.start_url)
        self.base_domain = tld_extract(self.start_url).registered_domain
        self.start_urls = [self.start_url]

    def start_requests(self):
        yield scrapy.Request(
            self.start_url,
            callback=self.parse_page,
            errback=self.handle_error,
            meta={"start_time": time.time(), "found_on": None},
            dont_filter=False,
        )

    def parse_page(self, response: Response):
        if len(self.visited) >= self.max_pages:
            return

        url = response.url
        self.visited.add(url)
        load_time_ms = int((time.time() - response.meta.get("start_time", time.time())) * 1000)

        # ── Security headers (from first page only) ────────────────────────
        if not self.result.security_headers:
            headers_to_check = [
                "Strict-Transport-Security",
                "Content-Security-Policy",
                "X-Frame-Options",
                "X-Content-Type-Options",
                "Referrer-Policy",
                "Permissions-Policy",
                "X-XSS-Protection",
            ]
            for h in headers_to_check:
                val = response.headers.get(h)
                if val:
                    self.result.security_headers[h] = val.decode("utf-8", errors="replace")

        # ── Redirect detection ─────────────────────────────────────────────
        if response.meta.get("redirect_urls"):
            for src in response.meta["redirect_urls"]:
                self.result.redirects.append({"from": src, "to": url})

        html = response.text

        # ── Emails & phones ────────────────────────────────────────────────
        emails_found = set(EMAIL_RE.findall(html))
        emails_found = {
            e for e in emails_found
            if not any(skip in e.lower() for skip in ["example.com", "yourdomain", "sentry.io", "wixpress.com"])
            and not e.endswith((".png", ".jpg", ".svg", ".gif"))
            and len(e) < 80
        }
        self.result.all_emails.update(emails_found)

        phones_found = set(PHONE_RE.findall(html))
        phones_found = {p.strip() for p in phones_found if len(re.sub(r"\D", "", p)) >= 7}
        self.result.all_phones.update(phones_found)

        # ── Social links ───────────────────────────────────────────────────
        for platform, pattern in SOCIAL_PATTERNS.items():
            if platform not in self.result.social_links:
                match = pattern.search(html)
                if match:
                    self.result.social_links[platform] = match.group(0).rstrip("\"'>")

        # ── Technology detection ───────────────────────────────────────────
        for tech, hints in TECH_HINTS.items():
            if tech not in self.result.technologies:
                if any(hint.lower() in html.lower() for hint in hints):
                    self.result.technologies.add(tech)

        # ── SEO per-page signals ───────────────────────────────────────────
        title_match = re.search(r"<title[^>]*>([^<]+)</title>", html, re.I)
        title = title_match.group(1).strip() if title_match else None

        meta_match = (
            re.search(r'<meta[^>]+name=["\']description["\'][^>]+content=["\']([^"\']+)["\']', html, re.I) or
            re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+name=["\']description["\']', html, re.I)
        )
        meta_desc = meta_match.group(1).strip() if meta_match else None

        h1_count  = len(re.findall(r"<h1[^>]*>", html, re.I))
        h2_count  = len(re.findall(r"<h2[^>]*>", html, re.I))

        # Images without alt
        all_imgs     = re.findall(r"<img[^>]+>", html, re.I)
        imgs_no_alt  = sum(1 for img in all_imgs if not re.search(r'alt=["\'][^"\']+["\']', img, re.I))

        # Word count (stripped)
        text = remove_tags(html)
        word_count = len(text.split())

        canonical_match = re.search(r'<link[^>]+rel=["\']canonical["\'][^>]+href=["\']([^"\']+)["\']', html, re.I)
        canonical = canonical_match.group(1).strip() if canonical_match else None

        robots_match = re.search(r'<meta[^>]+name=["\']robots["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
        robots = robots_match.group(1).strip() if robots_match else None

        page_info = {
            "url":               url,
            "status":            response.status,
            "load_time_ms":      load_time_ms,
            "title":             title,
            "meta_description":  meta_desc,
            "h1_count":          h1_count,
            "h2_count":          h2_count,
            "images_total":      len(all_imgs),
            "images_missing_alt": imgs_no_alt,
            "word_count":        word_count,
            "canonical":         canonical,
            "robots_meta":       robots,
        }
        self.result.pages_crawled.append(page_info)

        # ── Discover and follow internal links ─────────────────────────────
        if len(self.visited) < self.max_pages:
            for href in response.css("a::attr(href)").getall():
                absolute = urljoin(url, href.strip())
                parsed = urlparse(absolute)

                # Strip fragment
                clean = absolute.split("#")[0].rstrip("/")
                if not clean or parsed.scheme not in ("http", "https"):
                    continue

                link_domain = tld_extract(clean).registered_domain

                if link_domain == self.base_domain:
                    # Internal link
                    self.result.internal_links.add(clean)
                    if clean not in self.visited and clean not in self.queued:
                        self.queued.add(clean)
                        yield scrapy.Request(
                            clean,
                            callback=self.parse_page,
                            errback=self.handle_error,
                            meta={"start_time": time.time(), "found_on": url},
                            dont_filter=False,
                        )
                else:
                    # External link — track for broken link check (HEAD only)
                    self.result.external_links.add(clean)
                    if len(self.result.broken_links) < 30:
                        yield scrapy.Request(
                            clean,
                            method="HEAD",
                            callback=self.check_external_link,
                            errback=self.handle_broken_link,
                            meta={"found_on": url, "check_url": clean},
                            dont_filter=True,
                        )

    def check_external_link(self, response: Response):
        if response.status >= 400:
            self.result.broken_links.append({
                "url": response.url,
                "status": response.status,
                "found_on": response.meta.get("found_on"),
            })

    def handle_broken_link(self, failure):
        url = failure.request.meta.get("check_url", failure.request.url)
        found_on = failure.request.meta.get("found_on")
        self.result.broken_links.append({
            "url": url,
            "status": "error",
            "found_on": found_on,
            "error": str(failure.value)[:100],
        })

    def handle_error(self, failure):
        url = failure.request.url
        found_on = failure.request.meta.get("found_on")
        self.result.errors.append(f"Failed to fetch {url}: {str(failure.value)[:80]}")
        if found_on:
            self.result.broken_links.append({
                "url": url,
                "status": "error",
                "found_on": found_on,
                "error": str(failure.value)[:80],
            })


# ── SSRF-safe Download Middleware ────────────────────────────────────────────
# Scrapy follows redirects internally; we intercept every request to reject
# any that resolves to a private IP (DNS-rebinding prevention at spider level).

import ipaddress as _ipaddress
import socket as _socket

class SSRFBlockerMiddleware:
    """
    Scrapy downloader middleware that rejects requests whose hostname resolves
    to a private / reserved IP.  Installed in DOWNLOADER_MIDDLEWARES.
    """

    @classmethod
    def from_crawler(cls, crawler):
        return cls()

    def process_request(self, request, spider):
        from urllib.parse import urlparse
        from scrapy.exceptions import IgnoreRequest

        try:
            hostname = urlparse(request.url).hostname or ""
            if not hostname:
                raise IgnoreRequest(f"SSRF_BLOCKED: missing hostname in {request.url}")

            # Skip check for bare IPs already caught by main.py; re-check here
            # covers redirects to new hostnames discovered during crawl.
            try:
                results = _socket.getaddrinfo(hostname, None)
                for _fam, _type, _proto, _canon, sockaddr in results:
                    ip_str = sockaddr[0]
                    ip = _ipaddress.ip_address(ip_str)
                    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                        raise IgnoreRequest(f"SSRF_BLOCKED: {hostname} → {ip_str}")
            except IgnoreRequest:
                raise
            except OSError:
                raise IgnoreRequest(f"DNS_FAILED: cannot resolve {hostname}")

        except IgnoreRequest:
            raise
        except Exception as e:
            from scrapy.exceptions import IgnoreRequest as IR
            raise IR(f"SSRF middleware error: {e}")

        return None  # allow request
