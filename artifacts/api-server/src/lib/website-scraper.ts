/**
 * website-scraper.ts
 * Real website scraper — visits a URL and extracts grounded data.
 * No hallucination: only returns what actually exists on the page.
 */

export interface ScrapedWebsite {
  url: string;
  reachable: boolean;
  isHttps: boolean;
  statusCode?: number;
  loadTimeMs?: number;
  title?: string;
  metaDescription?: string;
  // Contact signals
  emailAddresses: string[];
  phoneNumbers: string[];
  // Social links
  socialLinks: {
    linkedin?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
    whatsapp?: string;
  };
  // Quality signals
  hasBlog: boolean;
  hasContactPage: boolean;
  hasPrivacyPolicy: boolean;
  hasSocialMedia: boolean;
  language?: string;
  wordCount?: number;
  // Raw snippet for AI
  contentSnippet?: string;
  // Errors
  error?: string;
}

const DIRECTORY_DOMAINS = new Set([
  "designrush.com",
  "sortlist.com",
  "clutch.co",
  "techbehemoths.com",
  "goodfirms.co",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "yelp.com",
  "yellowpages.com",
  "foursquare.com",
  "tripadvisor.com",
  "bark.com",
  "expertise.com",
  "upcity.com",
  "semrush.com",
  "similarweb.com",
  "crunchbase.com",
  "producthunt.com",
  "angieslist.com",
  "houzz.com",
  "thumbtack.com",
  "upwork.com",
  "fiverr.com",
  "freelancer.com",
  "hubspot.com",
  "forbes.com",
  "entrepreneur.com",
  "businessinsider.com",
  "medium.com",
  "linkedin.com",
  "quora.com",
  "reddit.com",
  "wikipedia.org",
  "nogood.io",
  "mayple.com",
  "agencyanalytics.com",
  "webfx.com",
  "digitalagencynetwork.com",
  "toprankmarketing.com",
  // listing/review/directory aggregators
  "topdevelopers.co",
  "toptal.com",
  "guru.com",
  "99designs.com",
  "themanifest.com",
  "upcity.com",
  "agencyspotter.com",
  "digitalagencymatch.com",
  "softwaredevelopment.co",
  "manifest.com",
  "topseos.com",
  "wadline.com",
  "superbcompanies.com",
  "gartner.com",
  "softwareadvice.com",
  "getapp.com",
  "glassdoor.com",
  "indeed.com",
  "rocketreach.co",
  "prospeo.io",
  "zoominfo.com",
  "apollo.io",
  "leadsforge.ai",
  "tanqeeb.com",
  "bayt.com",
  "wuzzuf.net",
  "naukrigulf.com",
  "biggerpockets.com",
  "businessemailetiquette.com",
  "qrcode-generator.app",
  "instagram.com",
  "facebook.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "youtube.com",
  "pinterest.com",
  "snapchat.com",
]);

/** URL path segments that indicate a blog/article/list page — not a real company */
const CONTENT_PAGE_PATHS = [
  "/blog/",
  "/articles/",
  "/article/",
  "/news/",
  "/post/",
  "/posts/",
  "/resources/",
  "/insights/",
  "/guides/",
  "/tips/",
  "/how-to/",
  "/top-",
  "/best-",
  "/list/",
  "/directory/",
  "/companies/",
  "/agencies/",
  "/directory",
  "/ranking",
  "/rankings",
  "/compare",
  "/comparison",
  "/vs-",
  "/forum",
  "/forums/",
  "/topics/",
  "/community/",
  "/s/",       // search results (e.g. tanqeeb.com/ar/s/...)
  "/search",
  "/reel/",    // instagram reels
  "/watch",    // youtube
];

const BLOG_INDICATORS = ["/blog", "/news", "/articles", "/insights", "/resources", "/posts"];
const CONTACT_INDICATORS = ["/contact", "/contact-us", "/get-in-touch", "/reach-us", "/contactez", "/kontakt"];
const PRIVACY_INDICATORS = ["/privacy", "/privacy-policy", "/datenschutz", "/privacybeleid"];

export function isDirectoryUrl(url: string): boolean {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();

    // Strip www. and check exact domain
    const bare = hostname.replace(/^www\./, "");
    if (DIRECTORY_DOMAINS.has(bare)) return true;

    // Check parent domain — catches subdomains like agencies.semrush.com
    const parts = bare.split(".");
    if (parts.length >= 2) {
      const parent = parts.slice(-2).join(".");
      if (DIRECTORY_DOMAINS.has(parent)) return true;
    }

    // Check path — blog posts, articles, listing pages, search results, etc.
    if (CONTENT_PAGE_PATHS.some(p => pathname.includes(p))) return true;

    return false;
  } catch {
    return false;
  }
}

function extractEmails(html: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const found = html.match(emailRegex) ?? [];
  // Filter out common false positives
  return [...new Set(found)].filter(e =>
    !e.includes("example.com") &&
    !e.includes("yourdomain") &&
    !e.includes("sentry.io") &&
    !e.includes("wixpress.com") &&
    !e.endsWith(".png") &&
    !e.endsWith(".jpg") &&
    e.length < 80
  ).slice(0, 5);
}

function extractPhones(html: string): string[] {
  const phonePatterns = [
    /\+\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{1,4}[\s\-.]?\d{1,4}[\s\-.]?\d{0,9}/g,
    /\(\d{3}\)\s?\d{3}[\s\-]\d{4}/g,
    /\b0\d{9,10}\b/g,
    /\b\d{3}[\s\-]\d{3}[\s\-]\d{4}\b/g,
  ];
  const found = new Set<string>();
  for (const pattern of phonePatterns) {
    const matches = html.match(pattern) ?? [];
    matches.forEach(m => {
      const cleaned = m.trim();
      if (cleaned.replace(/\D/g, "").length >= 7) found.add(cleaned);
    });
  }
  return [...found].slice(0, 5);
}

function extractSocialLinks(html: string): ScrapedWebsite["socialLinks"] {
  const links: ScrapedWebsite["socialLinks"] = {};
  const patterns: Array<[keyof ScrapedWebsite["socialLinks"], RegExp]> = [
    ["linkedin", /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>]+/i],
    ["facebook", /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>]+/i],
    ["instagram", /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>]+/i],
    ["twitter", /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>]+/i],
    ["youtube", /https?:\/\/(?:www\.)?youtube\.com\/(?:channel|c|@)[^\s"'<>]+/i],
    ["whatsapp", /https?:\/\/(?:api\.)?whatsapp\.com\/[^\s"'<>]+/i],
  ];
  for (const [key, pattern] of patterns) {
    const match = html.match(pattern);
    if (match) links[key] = match[0].replace(/["'>]+$/, "").trim();
  }
  return links;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match?.[1]?.trim();
}

function extractMetaDescription(html: string): string | undefined {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  return match?.[1]?.trim();
}

function detectLanguage(html: string): string | undefined {
  const match = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  return match?.[1]?.toLowerCase().split("-")[0];
}

// ── SSRF Protection ──────────────────────────────────────────────────────────

/**
 * Returns true if an IPv4/IPv6 address is private, loopback, link-local,
 * or any other non-routable range that must never be reached from the server.
 *
 * Blocked ranges:
 *   IPv4: 127.x.x.x, 10.x.x.x, 172.16-31.x.x, 192.168.x.x,
 *         169.254.x.x (link-local / AWS metadata), 0.0.0.0/8,
 *         100.64.x.x (CGNAT), 198.18-19.x.x (benchmarking),
 *         240.x.x.x (reserved), 255.255.255.255
 *   IPv6: ::1, fc00::/7 (ULA), fe80::/10 (link-local), ::ffff:... (v4-mapped)
 */
function isPrivateOrReservedIP(address: string): boolean {
  // IPv6 checks
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    if (lower === "::1") return true;                        // loopback
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
    if (lower.startsWith("fe80")) return true;              // link-local
    if (lower.startsWith("::ffff:")) return true;           // IPv4-mapped
    if (lower === "::" || lower === "0:0:0:0:0:0:0:0") return true;
    return false;
  }

  // IPv4 checks
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;

  if (a === 0) return true;                    // 0.0.0.0/8
  if (a === 10) return true;                   // 10.0.0.0/8
  if (a === 127) return true;                  // 127.0.0.0/8 loopback
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 169 && b === 254) return true;     // 169.254.0.0/16 link-local / AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
  if (a === 192 && b === 168) return true;     // 192.168.0.0/16
  if (a === 192 && b === 0 && parts[2] === 2) return true; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return true;    // 198.18.0.0/15 benchmarking
  if (a === 203 && b === 0 && parts[2] === 113) return true; // TEST-NET-3
  if (a >= 224) return true;                   // multicast + reserved + broadcast

  return false;
}

/**
 * SSRF guard: resolves the hostname and rejects any private/reserved IP.
 * Throws an error if the URL points to an internal resource.
 */
async function assertPublicHost(urlString: string): Promise<void> {
  let hostname: string;
  try {
    hostname = new URL(urlString).hostname;
  } catch {
    throw new Error("SSRF_BLOCKED: Invalid URL");
  }

  // Block bare IP addresses that are obviously private before DNS
  const ipv4Pattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
  const ipv6Pattern = /^\[?[0-9a-fA-F:]+\]?$/;
  if (ipv4Pattern.test(hostname) || ipv6Pattern.test(hostname.replace(/^\[|\]$/g, ""))) {
    const bare = hostname.replace(/^\[|\]$/g, "");
    if (isPrivateOrReservedIP(bare)) {
      throw new Error(`SSRF_BLOCKED: Direct IP ${hostname} is a private/reserved address`);
    }
  }

  // DNS resolution check — prevents DNS rebinding and hostname aliasing to private IPs
  try {
    const { lookup } = await import("dns/promises");
    const { address } = await lookup(hostname, { verbatim: false });
    if (isPrivateOrReservedIP(address)) {
      throw new Error(`SSRF_BLOCKED: ${hostname} resolves to private IP ${address}`);
    }
  } catch (e: any) {
    if (e.message?.startsWith("SSRF_BLOCKED")) throw e;
    // DNS lookup failure (NXDOMAIN, timeout, etc.) — treat as unreachable, not a security error
    throw new Error(`DNS_FAILED: ${e.message?.slice(0, 80)}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Scrape a website and return grounded data.
 * Uses native fetch with a short timeout — no puppeteer needed.
 */
export async function scrapeWebsite(url: string, timeoutMs = 8000): Promise<ScrapedWebsite> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const isHttps = normalizedUrl.startsWith("https://");

  // ── SSRF guard — must run before any network call ─────────────────────────
  try {
    await assertPublicHost(normalizedUrl);
  } catch (e: any) {
    return {
      url: normalizedUrl,
      reachable: false,
      isHttps,
      emailAddresses: [],
      phoneNumbers: [],
      socialLinks: {},
      hasBlog: false,
      hasContactPage: false,
      hasPrivacyPolicy: false,
      hasSocialMedia: false,
      error: e.message?.startsWith("SSRF_BLOCKED")
        ? "Blocked: internal/private host"
        : e.message?.slice(0, 100),
    };
  }

  const base: ScrapedWebsite = {
    url: normalizedUrl,
    reachable: false,
    isHttps,
    emailAddresses: [],
    phoneNumbers: [],
    socialLinks: {},
    hasBlog: false,
    hasContactPage: false,
    hasPrivacyPolicy: false,
    hasSocialMedia: false,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    // Use redirect:"manual" so we can validate every hop before following.
    // This closes the DNS-rebinding redirect bypass where the initial URL
    // resolves to a public IP, but a redirect points to 169.254.x.x / 10.x etc.
    let currentUrl = normalizedUrl;
    let response!: Response;
    const MAX_REDIRECTS = 5;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      // Re-validate IP at every redirect hop
      await assertPublicHost(currentUrl);

      const res = await fetch(currentUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; FindXBot/1.0; +https://findx.app/bot)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate",
          "Connection": "keep-alive",
          "Upgrade-Insecure-Requests": "1",
        },
        redirect: "manual",   // inspect every redirect ourselves
      });

      const isRedirect = res.status >= 300 && res.status < 400;
      if (!isRedirect) {
        response = res;
        break;
      }

      const location = res.headers.get("location");
      if (!location) { response = res; break; }

      // Resolve relative redirects against current URL
      currentUrl = new URL(location, currentUrl).href;

      if (hop === MAX_REDIRECTS) {
        throw new Error("SSRF_BLOCKED: Too many redirects");
      }
    }

    clearTimeout(timeout);

    base.reachable = true;
    base.statusCode = response.status;
    base.loadTimeMs = Date.now() - startTime;
    // Final URL after manual redirect chain
    base.isHttps = currentUrl.startsWith("https://");

    if (response.ok) {
      const html = await response.text();

      // Sanitize title/meta before storing — both are embedded in AI prompts
      const rawTitle = extractTitle(html);
      const rawMeta  = extractMetaDescription(html);
      base.title           = rawTitle  ? sanitizeScrapedContent(rawTitle, 200)  : undefined;
      base.metaDescription = rawMeta   ? sanitizeScrapedContent(rawMeta, 300)   : undefined;
      base.language = detectLanguage(html);
      base.emailAddresses = extractEmails(html);
      base.phoneNumbers = extractPhones(html);
      base.socialLinks = extractSocialLinks(html);

      const lowerHtml = html.toLowerCase();

      // Check structural signals
      base.hasBlog = BLOG_INDICATORS.some(p => lowerHtml.includes(p));
      base.hasContactPage = CONTACT_INDICATORS.some(p => lowerHtml.includes(p));
      base.hasPrivacyPolicy = PRIVACY_INDICATORS.some(p => lowerHtml.includes(p));
      base.hasSocialMedia = Object.keys(base.socialLinks).length > 0;

      // Content snippet for AI
      const text = stripHtml(html);
      base.wordCount = text.split(/\s+/).filter(Boolean).length;
      base.contentSnippet = sanitizeScrapedContent(text, 800);
    }
  } catch (err: any) {
    clearTimeout(timeout);
    base.error = err.name === "AbortError" ? "Timeout" : err.message?.slice(0, 100);
    base.reachable = false;
  }

  return base;
}

/**
 * Calculate a deterministic score based on real scraped metrics.
 * Returns 0-100. Higher = more digital improvement opportunity (i.e. more gaps).
 */
export function calculateGroundedScore(scraped: ScrapedWebsite): number {
  if (!scraped.reachable) return 90; // Can't even reach site = huge opportunity

  let score = 40; // baseline for having a website

  // Penalize / reward based on real signals
  if (!scraped.isHttps) score += 15; // No SSL = major weakness
  if (scraped.emailAddresses.length === 0) score += 15; // No visible contact email
  if (scraped.phoneNumbers.length === 0) score += 10; // No visible phone
  if (!scraped.hasSocialMedia) score += 10; // No social media
  if (!scraped.hasBlog) score += 8; // No blog/content marketing
  if (!scraped.hasContactPage) score += 7; // No contact page
  if (!scraped.hasPrivacyPolicy) score += 5; // No privacy policy (GDPR risk)

  // Slow load time
  if (scraped.loadTimeMs && scraped.loadTimeMs > 5000) score += 10;
  else if (scraped.loadTimeMs && scraped.loadTimeMs > 3000) score += 5;

  // Low word count = thin content
  if (scraped.wordCount !== undefined && scraped.wordCount < 300) score += 8;

  // Cap at 95
  return Math.min(Math.max(score, 10), 95);
}

// ── Prompt-injection sanitizer for scraped content ───────────────────────────

/**
 * Sanitize text scraped from external websites before embedding it into
 * AI prompts.  Attackers can publish pages with hidden prompt-injection
 * payloads.  This function neutralises the most common patterns:
 *
 *  - LLM special tokens  (<|im_start|>, [INST], <<SYS>>, etc.)
 *  - Role-hijacking prefixes  (system:, assistant:, user:, HUMAN:, AI:)
 *  - Injection phrases  ("ignore all previous instructions", "forget above", …)
 *  - Persona override patterns  ("act as", "pretend you are", …)
 *  - Null bytes and dangerous control chars
 *  - Excessive whitespace / blank lines (collapse to max 2)
 *
 * The sanitization is intentionally lossy for adversarial text; legitimate
 * website copy is almost never affected.
 */
function sanitizeScrapedContent(raw: string, maxLength = 800): string {
  let s = raw
    // Null bytes + non-printable control chars (keep \n \t \r)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ")
    // Collapse excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // ── LLM special tokens ────────────────────────────────────────────────────
  s = s
    .replace(/<\|im_(start|end|sep)\|>/gi, "")
    .replace(/\[INST\]|\[\/INST\]/gi, "")
    .replace(/<<SYS>>|<\/SYS>/gi, "")
    .replace(/<\|begin_of_text\|>|<\|end_of_text\|>/gi, "")
    .replace(/<\|start_header_id\|>.*?<\|end_header_id\|>/gi, "")
    .replace(/\{%-?\s*system\s*-?%\}/gi, "");

  // ── Role hijacking ────────────────────────────────────────────────────────
  // Replace "system:", "assistant:", "user:", "human:", "ai:" at line start
  s = s.replace(/^[ \t]*(system|assistant|user|human|ai)\s*:/gim, "[role-redacted]:");

  // ── Injection / override phrases ──────────────────────────────────────────
  s = s.replace(
    /\b(ignore|forget|disregard|override|bypass|skip|suppress)\b.{0,80}\b(above|previous|prior|all|every|instructions?|prompt|context|rules?|constraints?|guidelines?)\b/gi,
    "[injection-redacted]",
  );
  s = s.replace(
    /\b(now\s+)?(act|pretend|behave|respond|answer|reply|roleplay)\s+(as|like|you\s+are|you're)\b/gi,
    "[injection-redacted]",
  );
  s = s.replace(
    /\bdo\s+not\s+(follow|obey|respect|adhere\s+to)\b.{0,60}\b(rules?|instructions?|guidelines?|constraints?)\b/gi,
    "[injection-redacted]",
  );
  s = s.replace(
    /\b(jailbreak|dan\s+mode|developer\s+mode|unrestricted\s+mode)\b/gi,
    "[injection-redacted]",
  );

  // Truncate
  return s.slice(0, maxLength);
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a grounded context string to pass to the AI.
 * Only includes what was actually found — no guesses.
 */
export function buildScrapedContext(scraped: ScrapedWebsite): string {
  const lines: string[] = [];

  lines.push(`Website: ${scraped.url}`);
  lines.push(`Reachable: ${scraped.reachable ? "YES" : "NO"}`);
  lines.push(`HTTPS/SSL: ${scraped.isHttps ? "YES" : "NO ⚠️"}`);

  if (scraped.statusCode) lines.push(`HTTP Status: ${scraped.statusCode}`);
  if (scraped.loadTimeMs) lines.push(`Load Time: ${scraped.loadTimeMs}ms${scraped.loadTimeMs > 3000 ? " ⚠️ SLOW" : ""}`);
  if (scraped.title) lines.push(`Page Title: ${scraped.title}`);
  if (scraped.metaDescription) lines.push(`Meta Description: ${scraped.metaDescription}`);
  if (scraped.language) lines.push(`Language: ${scraped.language}`);
  if (scraped.wordCount !== undefined) lines.push(`Content Words: ~${scraped.wordCount}${scraped.wordCount < 300 ? " ⚠️ THIN CONTENT" : ""}`);

  lines.push(`Contact Email Found: ${scraped.emailAddresses.length > 0 ? scraped.emailAddresses.join(", ") : "NOT FOUND"}`);
  lines.push(`Phone Found: ${scraped.phoneNumbers.length > 0 ? scraped.phoneNumbers.join(", ") : "NOT FOUND"}`);

  const socialCount = Object.keys(scraped.socialLinks).length;
  lines.push(`Social Media Links: ${socialCount > 0 ? Object.entries(scraped.socialLinks).map(([k, v]) => `${k}: ${v}`).join(", ") : "NONE FOUND"}`);

  lines.push(`Has Blog/Content: ${scraped.hasBlog ? "YES" : "NO"}`);
  lines.push(`Has Contact Page: ${scraped.hasContactPage ? "YES" : "NO"}`);
  lines.push(`Has Privacy Policy: ${scraped.hasPrivacyPolicy ? "YES" : "NO"}`);

  if (scraped.contentSnippet) {
    lines.push(`\nPage Content Snippet:\n${scraped.contentSnippet}`);
  }

  if (scraped.error) {
    lines.push(`\nScraping Error: ${scraped.error}`);
  }

  return lines.join("\n");
}

// ────────────────────────────────────────────────────────────────────────────
// Scrapy Deep Auditor integration
// ────────────────────────────────────────────────────────────────────────────

/**
 * Rich result returned by the Scrapy microservice.
 * Merges into ScrapedWebsite for backward compatibility with ai-engine.ts.
 */
export interface ScrapyAuditResult extends ScrapedWebsite {
  // Deep audit extras
  deepScore: number;           // 0-100 from scorer.py
  grade: string;               // A / B / C / D / F
  breakdown: Record<string, { points: number; max: number }>;
  issues: string[];            // Specific problems found
  strengths: string[];         // What they do well
  technologies: string[];      // WordPress, React, etc.
  brokenLinksCount: number;
  pagesCrawled: number;
  securityHeadersPresent: string[];
  seoIssues: string[];
  isDeepAudit: true;
}

/**
 * Call the Scrapy auditor microservice for a full deep crawl.
 * Returns null if the service is unavailable (graceful fallback).
 */
export async function auditWithScrapy(
  url: string,
  maxPages = 30,
  timeoutMs = 90_000,
): Promise<ScrapyAuditResult | null> {
  const auditorUrl = process.env.SCRAPY_AUDITOR_URL;
  if (!auditorUrl) return null;

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const secret = process.env.SCRAPY_AUDITOR_SECRET;
    if (secret) headers["X-Auditor-Secret"] = secret;

    const res = await fetch(`${auditorUrl}/audit`, {
      method: "POST",
      headers,
      signal: controller.signal,
      body: JSON.stringify({ url: normalizedUrl, max_pages: maxPages }),
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data: any = await res.json();
    const audit = data.audit ?? {};
    const sr = data.score_result ?? {};

    // Map Scrapy result → ScrapedWebsite shape (backward compatible)
    const emails: string[] = sr.emails_found ?? audit.emails ?? [];
    const phones: string[] = sr.phones_found ?? audit.phones ?? [];
    const socialRaw: Record<string, string> = sr.social_links ?? audit.social_links ?? {};

    const social: ScrapedWebsite["socialLinks"] = {};
    if (socialRaw.linkedin)  social.linkedin  = socialRaw.linkedin;
    if (socialRaw.facebook)  social.facebook  = socialRaw.facebook;
    if (socialRaw.instagram) social.instagram = socialRaw.instagram;
    if (socialRaw.twitter)   social.twitter   = socialRaw.twitter;
    if (socialRaw.youtube)   social.youtube   = socialRaw.youtube;
    if (socialRaw.whatsapp)  social.whatsapp  = socialRaw.whatsapp;

    const firstPage = (audit.pages_detail ?? [])[0];

    const result: ScrapyAuditResult = {
      // ScrapedWebsite base fields
      url:             normalizedUrl,
      reachable:       (audit.pages_crawled ?? 0) > 0,
      isHttps:         normalizedUrl.startsWith("https://"),
      statusCode:      firstPage?.status,
      loadTimeMs:      firstPage?.load_time_ms,
      title:           firstPage?.title,
      metaDescription: firstPage?.meta_description,
      emailAddresses:  emails.slice(0, 5),
      phoneNumbers:    phones.slice(0, 5),
      socialLinks:     social,
      hasBlog:         (audit.pages_detail ?? []).some((p: any) =>
                         /blog|news|articles|insights/.test(p.url ?? "")
                       ),
      hasContactPage:  (audit.pages_detail ?? []).some((p: any) =>
                         /contact|reach|get-in-touch/.test(p.url ?? "")
                       ),
      hasPrivacyPolicy:(audit.pages_detail ?? []).some((p: any) =>
                         /privacy|datenschutz/.test(p.url ?? "")
                       ),
      hasSocialMedia:  Object.keys(social).length > 0,
      wordCount:       firstPage?.word_count,
      contentSnippet:  undefined,
      language:        undefined,

      // Deep audit extras
      deepScore:                sr.score ?? 50,
      grade:                    sr.grade ?? "C",
      breakdown:                sr.breakdown ?? {},
      issues:                   sr.issues ?? [],
      strengths:                sr.strengths ?? [],
      technologies:             sr.technologies ?? audit.technologies ?? [],
      brokenLinksCount:         sr.broken_links_count ?? (audit.broken_links ?? []).length,
      pagesCrawled:             audit.pages_crawled ?? 0,
      securityHeadersPresent:   sr.security_headers_present ?? [],
      seoIssues:                sr.seo_issues ?? [],
      isDeepAudit:              true,
    };

    return result;
  } catch (err: any) {
    clearTimeout(timeout);
    return null;
  }
}

/**
 * Smart scraper: tries Scrapy deep audit first, falls back to built-in scraper.
 * Use this in agent-runner.ts instead of calling scrapeWebsite() directly.
 */
/**
 * Smart scraper with Redis caching.
 *
 * Cache hit  → return stored result immediately (no network call).
 * Cache miss → run deep/basic scrape, store result, return it.
 *
 * TTL is 24 h — see cache.ts.  Pass forceRefresh=true to bypass cache.
 */
export async function smartScrape(
  url: string,
  timeoutMs = 10_000,
  forceRefresh = false,
): Promise<ScrapedWebsite | ScrapyAuditResult> {
  const { getCachedScrape, setCachedScrape } = await import("./cache.js");

  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  // ── Cache read ────────────────────────────────────────────────────────────
  if (!forceRefresh) {
    const cached = await getCachedScrape<ScrapedWebsite | ScrapyAuditResult>(normalizedUrl);
    if (cached) return cached;
  }

  // ── Live fetch ────────────────────────────────────────────────────────────
  const deep = await auditWithScrapy(normalizedUrl, 30, 90_000);
  const result = deep ?? await scrapeWebsite(normalizedUrl, timeoutMs);

  // ── Cache write (only if reachable — no point caching failures) ───────────
  if (result.reachable) {
    await setCachedScrape(normalizedUrl, result);
  }

  return result;
}

/**
 * Extended context builder — handles both ScrapedWebsite and ScrapyAuditResult.
 * Adds deep-audit sections when available.
 */
export function buildExtendedContext(scraped: ScrapedWebsite | ScrapyAuditResult): string {
  // Start with standard context
  let ctx = buildScrapedContext(scraped);

  const deep = scraped as ScrapyAuditResult;
  if (!deep.isDeepAudit) return ctx;

  // Append deep-audit extras
  const extras: string[] = [];

  extras.push(`\n── Deep Audit (${deep.pagesCrawled} pages crawled) ──`);
  extras.push(`Deep Score: ${deep.deepScore}/100 — Grade: ${deep.grade}`);

  if (deep.technologies.length > 0) {
    extras.push(`Technologies: ${deep.technologies.join(", ")}`);
  }

  if (deep.securityHeadersPresent.length > 0) {
    extras.push(`Security Headers Present: ${deep.securityHeadersPresent.join(", ")}`);
  } else {
    extras.push("Security Headers: NONE detected ⚠️");
  }

  if (deep.brokenLinksCount > 0) {
    extras.push(`Broken Links: ${deep.brokenLinksCount} found ⚠️`);
  }

  if (deep.seoIssues.length > 0) {
    extras.push(`SEO Issues:\n${deep.seoIssues.map(i => `  • ${i}`).join("\n")}`);
  }

  if (deep.issues.length > 0) {
    extras.push(`All Issues Found:\n${deep.issues.map(i => `  ❌ ${i}`).join("\n")}`);
  }

  if (deep.strengths.length > 0) {
    extras.push(`Strengths:\n${deep.strengths.map(s => `  ✅ ${s}`).join("\n")}`);
  }

  if (deep.breakdown && Object.keys(deep.breakdown).length > 0) {
    const breakdownLines = Object.entries(deep.breakdown).map(
      ([cat, val]) => `  ${cat}: ${val.points}/${val.max}`
    );
    extras.push(`Score Breakdown:\n${breakdownLines.join("\n")}`);
  }

  return ctx + "\n" + extras.join("\n");
}
