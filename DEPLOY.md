# 🚀 FindX — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  🌐 Vercel (Frontend)   🚂 Render (API)   🐘 Supabase   │
│  artifacts/findx        artifacts/api-server  (DB+Auth) │
│  Free forever           Free (750h/mo)    Free forever  │
└─────────────────────────────────────────────────────────┘
```

---

## Step 1 — Supabase (Database + Auth)

You likely have this already. If not:

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Choose a region close to your users (e.g. Frankfurt for NL)
3. Note down:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `VITE_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ keep this secret

4. Enable **Email auth** in Authentication → Providers (or Google OAuth)

---

## Step 2 — Render (Backend API)

### A. Create a new Web Service

1. Go to [render.com](https://render.com) → **New → Web Service**
2. Connect your GitHub repo: `amrolela100-sketch/FindXAgents`
3. Configure:

| Setting | Value |
|---------|-------|
| **Name** | `findx-api` |
| **Region** | Frankfurt (EU) |
| **Branch** | `main` |
| **Root Directory** | *(leave empty)* |
| **Build Command** | `npm install -g pnpm@10 && pnpm install && pnpm --filter @workspace/api-server run build` |
| **Start Command** | `node --enable-source-maps ./artifacts/api-server/dist/index.mjs` |
| **Plan** | Free |

### B. Set Environment Variables

In Render dashboard → **Environment** tab, add:

```
# Required
NODE_ENV                  = production
PORT                      = 3000
DATABASE_URL              = postgresql://... (your Supabase DB URL)
SUPABASE_URL              = https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY = eyJ...

# Your owner panel
OWNER_EMAIL               = your@email.com
OWNER_PASSWORD            = (strong secret password)
SECRET_ENCRYPTION_KEY    = generate-with-openssl-rand-base64-32

# CORS — paste your Vercel URL after Step 3
FRONTEND_URL              = https://your-app.vercel.app

# AI & Search (optional)
GEMINI_API_KEY            = AIzaSy...
OPENROUTER_API_KEY        = sk-or-v1-...
TAVILY_API_KEY            = tvly-...
KVK_API_KEY               = ...
RESEND_API_KEY            = re_...
```

> 💡 **Where is DATABASE_URL?**
> In Supabase → Project Settings → Database → Connection string → URI
> Use the **Pooler (Transaction mode)** URL for production.

4. Click **Deploy** — wait ~3 min for the first build
5. Copy your Render URL: `https://findx-api.onrender.com`

---

## Step 3 — Vercel (Frontend)

### A. Import project

1. Go to [vercel.com](https://vercel.com) → **Add New → Project**
2. Import `amrolela100-sketch/FindXAgents`
3. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `artifacts/findx` |
| **Build Command** | *(auto-detected from vercel.json)* |
| **Output Directory** | `dist` |

### B. Set Environment Variables

```
VITE_SUPABASE_URL        = https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJ...
VITE_API_URL             = /api
```

> ⚠️ **`VITE_API_URL` must be `/api` on Vercel**, not the full Render URL.
> Vercel rewrites `/api/*` → `https://findx-api.onrender.com/api/*` via `vercel.json`.
> Setting the full Render URL here bypasses the proxy and **breaks CORS**.

4. Click **Deploy** — done in ~1 min ✅

### C. Update CORS on Render

After Vercel gives you the URL (e.g. `https://findx.vercel.app`):
- Go to Render → your service → Environment
- Update `FRONTEND_URL` = `https://findx.vercel.app`
- Click **Save Changes** → service redeploys automatically

---

## Step 4 — Verify Everything Works

```
✅ https://your-app.vercel.app         → Frontend loads
✅ https://findx-api.onrender.com/api/healthz  → { "status": "ok" }
✅ Login with your Supabase email       → Dashboard opens
✅ https://your-app.vercel.app/owner    → Owner panel (needs OWNER_PASSWORD)
```

---

## Step 5 — Run DB Migrations (first time only)

The API runs migrations automatically on first startup via `runMigrations()`.

If you ever need to run them manually:
```bash
# Local: set DATABASE_URL then run
cd lib/db
cp .env.example .env   # fill in your Supabase DB URL
pnpm migrate
```

After the first successful deploy, you can set `SKIP_MIGRATIONS=true` on Render to speed up restarts.

---

## 🐳 Alternative: Docker Self-Hosted

If you prefer a VPS (DigitalOcean, Hetzner, etc.):

```bash
git clone https://github.com/amrolela100-sketch/FindXAgents.git
cd FindXAgents

# Copy and fill env
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/findx/.env.example artifacts/findx/.env
nano artifacts/api-server/.env   # fill all values

# Build and run
docker-compose up -d --build

# Check status
docker-compose ps
docker-compose logs -f api
```

Services:
- Frontend: `http://your-server-ip`
- API: `http://your-server-ip:3000/api/healthz`

---

## 🔑 Environment Variables Reference

### Backend (`artifacts/api-server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (secret!) |
| `OWNER_EMAIL` | ✅ | Your email — grants owner panel access |
| `OWNER_PASSWORD` | ✅ | Secondary password for `/owner` panel |
| `SECRET_ENCRYPTION_KEY` | ✅ | Master key for encrypting API keys stored in DB |
| `FRONTEND_URL` | ✅ | Vercel URL for CORS |
| `PORT` | ✅ | Server port (default: 3000) |
| `GEMINI_API_KEY` | ⚡ | AI analysis & outreach |
| `OPENROUTER_API_KEY` | ⚡ | Alternative AI provider |
| `TAVILY_API_KEY` | ⚡ | Lead enrichment |
| `KVK_API_KEY` | ⚡ | Dutch company registry search |
| `GOOGLE_MAPS_API_KEY` | ⚡ | Alternative lead discovery |
| `RESEND_API_KEY` | 📧 | Email sending |
| `SKIP_MIGRATIONS` | — | Set `true` after first deploy |

### Frontend (`artifacts/findx/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `VITE_API_URL` | ✅ | Always `/api` on Vercel — proxy handles routing to Render |

---

## 🔒 Security Notes

- **Never** commit `.env` files — they are in `.gitignore`
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — backend only, never expose to frontend
- `OWNER_PASSWORD` is a second factor on top of Supabase auth
- `VITE_*` variables are **public** (bundled into JS) — never put secrets there
