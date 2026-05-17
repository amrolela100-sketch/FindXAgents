# findx-landing — Astro SSG Landing Site

Static site generated with **Astro** for SEO-optimized landing pages.

## Why Astro (not Vite/React)?

- **Full SSG** → HTML pre-rendered at build time → indexed by Google, ChatGPT, Perplexity
- **Zero JS by default** → faster TTFB, better Core Web Vitals
- **JSON-LD + OpenGraph** → appears in AI Overviews
- **Sitemap auto-generated** via `@astrojs/sitemap`

## Routes

| Route      | Purpose                  |
|------------|--------------------------|
| `/`        | Main landing page        |
| `/pricing` | Pricing tiers            |

## Deploy (Vercel)

- **Root Directory:** `artifacts/findx-landing`
- **Build command:** `npm run build`
- **Output dir:** `dist`
- **Framework preset:** Astro

## Dev

```bash
cd artifacts/findx-landing
pnpm install
pnpm dev
```
