# FindX Scrapy Auditor

Deep website crawler and digital health scorer — Python microservice used by the FindX API server.

## What it does

1. **Crawls** the target website (up to `max_pages`, default 30)
2. **Extracts** every email, phone number, and social link found
3. **Detects** technologies (WordPress, Shopify, React, etc.)
4. **Checks** SEO signals per page (title, meta description, H1, image alt text)
5. **Checks** security headers (HSTS, CSP, X-Frame-Options, etc.)
6. **Detects** broken internal + external links
7. **Scores** the site 0–100 with a detailed breakdown

## API

### `POST /audit`

```json
{
  "url": "https://example.com",
  "max_pages": 30
}
```

**Response:**
```json
{
  "url": "https://example.com",
  "audit": {
    "pages_crawled": 12,
    "emails": ["info@example.com"],
    "phones": ["+31 20 123 4567"],
    "social_links": { "linkedin": "https://linkedin.com/company/example" },
    "broken_links": [],
    "technologies": ["WordPress", "jQuery", "Google Analytics"],
    "security_headers": { "Strict-Transport-Security": "max-age=31536000" },
    "seo_issues": ["3 pages missing meta description"],
    ...
  },
  "score_result": {
    "score": 72,
    "grade": "B",
    "digital_maturity": "low",
    "breakdown": {
      "contact_accessibility": { "points": 12, "max": 20 },
      "seo_health":            { "points": 18, "max": 25 },
      "security":              { "points": 12, "max": 20 },
      "social_media":          { "points": 15, "max": 15 },
      "performance":           { "points": 5,  "max": 10 },
      "content_quality":       { "points": 10, "max": 10 }
    },
    "issues": [
      "No contact email found anywhere on the site",
      "3 pages missing meta description",
      "Missing security headers: Content-Security-Policy, X-Frame-Options"
    ],
    "strengths": [
      "HTTPS/SSL enabled",
      "Fast page load times",
      "Built with: WordPress, jQuery"
    ]
  }
}
```

### `GET /health`

Returns `{"status": "ok"}` — used by Docker healthcheck.

## Running locally

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 4000 --reload
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Port to listen on |
| `SCRAPY_AUDITOR_SECRET` | _(empty)_ | Optional shared secret for request auth |

## Integration with FindX API server

Set in `artifacts/api-server/.env`:
```env
SCRAPY_AUDITOR_URL=http://scrapy-auditor:4000
SCRAPY_AUDITOR_SECRET=your-secret-here
```

The API server calls `POST /audit` automatically during the `qualify-ai` pipeline step
when the full deep audit is needed. Falls back to the built-in `website-scraper.ts`
if the Scrapy service is unavailable.
