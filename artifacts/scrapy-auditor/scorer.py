"""
FindX Deep Score Calculator
Takes the raw AuditResult dict and produces a rich score (0–100)
plus a detailed breakdown.

Higher score = more digital gaps = better B2B prospect for FindX.
"""

from typing import Dict, Any


SECURITY_HEADERS_IMPORTANT = [
    "Strict-Transport-Security",   # HTTPS enforcement
    "Content-Security-Policy",     # XSS protection
    "X-Frame-Options",             # Clickjacking
    "X-Content-Type-Options",      # MIME sniffing
]


def calculate_deep_score(audit: Dict[str, Any]) -> Dict[str, Any]:
    """
    Returns:
        score:        0–100 (opportunity score)
        grade:        A / B / C / D / F
        breakdown:    per-category scores
        issues:       list of specific problems found
        strengths:    list of things they do well
    """
    score = 0
    issues = []
    strengths = []
    breakdown = {}

    pages = audit.get("pages_crawled", 0)
    pages_detail = audit.get("pages_detail", [])

    # ── 1. CONTACT ACCESSIBILITY (20 pts) ───────────────────────────────────
    contact_score = 0
    emails = audit.get("emails", [])
    phones = audit.get("phones", [])

    if not emails:
        contact_score += 12
        issues.append("No contact email found anywhere on the site")
    else:
        strengths.append(f"Contact email found: {emails[0]}")

    if not phones:
        contact_score += 8
        issues.append("No phone number found on the site")
    else:
        strengths.append(f"Phone found: {phones[0]}")

    score += contact_score
    breakdown["contact_accessibility"] = {"points": contact_score, "max": 20}

    # ── 2. SEO HEALTH (25 pts) ───────────────────────────────────────────────
    seo_score = 0

    missing_titles = sum(1 for p in pages_detail if not p.get("title"))
    missing_meta   = sum(1 for p in pages_detail if not p.get("meta_description"))
    missing_h1     = sum(1 for p in pages_detail if p.get("h1_count", 0) == 0)
    imgs_no_alt    = audit.get("images_missing_alt", 0)
    seo_issues_raw = audit.get("seo_issues", [])

    if pages > 0:
        title_miss_ratio = missing_titles / pages
        meta_miss_ratio  = missing_meta / pages
        h1_miss_ratio    = missing_h1 / pages

        if title_miss_ratio > 0.5:
            seo_score += 8
            issues.append(f"{missing_titles}/{pages} pages missing <title> tag")
        elif title_miss_ratio > 0:
            seo_score += 4
            issues.append(f"{missing_titles} page(s) missing <title> tag")
        else:
            strengths.append("All pages have <title> tags")

        if meta_miss_ratio > 0.5:
            seo_score += 7
            issues.append(f"{missing_meta}/{pages} pages missing meta description")
        elif meta_miss_ratio > 0:
            seo_score += 3
            issues.append(f"{missing_meta} page(s) missing meta description")
        else:
            strengths.append("All pages have meta descriptions")

        if h1_miss_ratio > 0.3:
            seo_score += 5
            issues.append(f"{missing_h1}/{pages} pages missing H1 tag")
        elif h1_miss_ratio > 0:
            seo_score += 2

    if imgs_no_alt > 10:
        seo_score += 5
        issues.append(f"{imgs_no_alt} images missing alt text (accessibility + SEO)")
    elif imgs_no_alt > 0:
        seo_score += 2
        issues.append(f"{imgs_no_alt} images missing alt text")

    score += min(seo_score, 25)
    breakdown["seo_health"] = {"points": min(seo_score, 25), "max": 25}

    # ── 3. SECURITY (20 pts) ─────────────────────────────────────────────────
    security_score = 0
    security_headers = audit.get("security_headers", {})

    # Check if first page was HTTPS (infer from security headers presence or start_url)
    start_url = audit.get("start_url", "")
    if not start_url.startswith("https://"):
        security_score += 8
        issues.append("Site does NOT use HTTPS — major security risk")
    else:
        strengths.append("HTTPS/SSL enabled")

    missing_security_headers = [h for h in SECURITY_HEADERS_IMPORTANT if h not in security_headers]
    if len(missing_security_headers) >= 3:
        security_score += 8
        issues.append(f"Missing critical security headers: {', '.join(missing_security_headers)}")
    elif len(missing_security_headers) >= 1:
        security_score += 4
        issues.append(f"Missing security headers: {', '.join(missing_security_headers)}")
    else:
        strengths.append("Good security headers in place")

    broken = audit.get("broken_links", [])
    if len(broken) >= 5:
        security_score += 4
        issues.append(f"{len(broken)} broken links found — hurts SEO and user trust")
    elif len(broken) > 0:
        security_score += 2
        issues.append(f"{len(broken)} broken link(s) found")
    else:
        strengths.append("No broken links detected")

    score += min(security_score, 20)
    breakdown["security"] = {"points": min(security_score, 20), "max": 20}

    # ── 4. SOCIAL MEDIA PRESENCE (15 pts) ────────────────────────────────────
    social_score = 0
    social_links = audit.get("social_links", {})

    if not social_links:
        social_score += 15
        issues.append("No social media presence found on the site")
    elif len(social_links) == 1:
        social_score += 7
        issues.append(f"Only 1 social platform linked ({list(social_links.keys())[0]})")
    elif len(social_links) == 2:
        social_score += 4
        issues.append(f"Limited social media presence ({len(social_links)} platforms)")
    else:
        strengths.append(f"Active on {len(social_links)} social platforms: {', '.join(social_links.keys())}")

    score += social_score
    breakdown["social_media"] = {"points": social_score, "max": 15}

    # ── 5. PERFORMANCE (10 pts) ──────────────────────────────────────────────
    perf_score = 0
    slow_pages = audit.get("slow_pages_count", 0)

    if pages > 0:
        slow_ratio = slow_pages / pages
        if slow_ratio > 0.5:
            perf_score += 10
            issues.append(f"{slow_pages}/{pages} pages load slowly (>3s) — hurts conversions & SEO")
        elif slow_ratio > 0.2:
            perf_score += 5
            issues.append(f"{slow_pages} page(s) have slow load times (>3s)")
        elif slow_pages > 0:
            perf_score += 2
        else:
            strengths.append("Fast page load times across the site")

    score += perf_score
    breakdown["performance"] = {"points": perf_score, "max": 10}

    # ── 6. CONTENT QUALITY (10 pts) ──────────────────────────────────────────
    content_score = 0

    thin_pages = sum(1 for p in pages_detail if p.get("word_count", 0) < 300)
    techs = audit.get("technologies", [])

    if pages > 0 and thin_pages / pages > 0.5:
        content_score += 6
        issues.append(f"{thin_pages}/{pages} pages have thin content (<300 words)")
    elif thin_pages > 0:
        content_score += 3

    if not techs:
        content_score += 4
        issues.append("No modern web technologies detected — possibly outdated site")
    else:
        strengths.append(f"Built with: {', '.join(list(techs)[:5])}")

    score += min(content_score, 10)
    breakdown["content_quality"] = {"points": min(content_score, 10), "max": 10}

    # ── Final score ───────────────────────────────────────────────────────────
    final_score = min(max(score, 5), 98)

    # Grade
    if final_score >= 80:
        grade = "A"   # Massive opportunity
        maturity = "low"
    elif final_score >= 60:
        grade = "B"   # Good opportunity
        maturity = "low"
    elif final_score >= 40:
        grade = "C"   # Moderate
        maturity = "medium"
    elif final_score >= 20:
        grade = "D"   # Some gaps
        maturity = "medium"
    else:
        grade = "F"   # Already solid
        maturity = "high"

    return {
        "score":         final_score,
        "grade":         grade,
        "digital_maturity": maturity,
        "breakdown":     breakdown,
        "issues":        issues,
        "strengths":     strengths,
        "pages_audited": pages,
        "emails_found":  emails,
        "phones_found":  phones,
        "social_links":  social_links,
        "technologies":  audit.get("technologies", []),
        "security_headers_present": list(audit.get("security_headers", {}).keys()),
        "broken_links_count": len(audit.get("broken_links", [])),
        "seo_issues":    audit.get("seo_issues", []),
    }
