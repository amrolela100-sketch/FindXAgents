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

/**
 * Scrape a website and return grounded data.
 * Uses native fetch with a short timeout — no puppeteer needed.
 */
export async function scrapeWebsite(url: string, timeoutMs = 8000): Promise<ScrapedWebsite> {
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
  const isHttps = normalizedUrl.startsWith("https://");

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
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FindXBot/1.0; +https://findx.app/bot)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    base.reachable = true;
    base.statusCode = response.status;
    base.loadTimeMs = Date.now() - startTime;
    // Check if final URL is HTTPS (after redirect)
    const finalUrl = response.url || normalizedUrl;
    base.isHttps = finalUrl.startsWith("https://");

    if (response.ok) {
      const html = await response.text();

      base.title = extractTitle(html);
      base.metaDescription = extractMetaDescription(html);
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
      base.contentSnippet = text.slice(0, 800);
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
