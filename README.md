<div align="center">

![FindX Banner](./banner.png)

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-findx.vercel.app-orange?style=for-the-badge&logo=vercel)](https://find-x-agents-findx.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ecf8e?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)

<h3>🔥 AI-Powered B2B Prospecting — Discover · Analyze · Outreach</h3>

<p>FindX uses a 3-stage AI pipeline to find real businesses, visit their websites,
score their digital gaps, and write personalized cold emails — automatically.</p>

</div>

---

## 📦 What's In This Repo

This is a **pnpm monorepo**. The repo is organized into two tiers:

### 🟢 Core Product (built + deployed)

| Package | Path | Description |
|---|---|---|
| `@workspace/findx` | `artifacts/findx/` | Web App — Vite · React 19 · TailwindCSS |
| `@workspace/api-server` | `artifacts/api-server/` | REST API — Express 5 · Drizzle ORM |
| `@workspace/db` | `lib/db/` | Shared DB schema · Drizzle · Migrations |

> `pnpm run build` only builds these three. Everything else is opt-in.

### 🟡 Optional Artifacts

| Package | Path | Description |
|---|---|---|
| `@workspace/findx-mobile` | `artifacts/findx-mobile/` | Mobile App — Expo · React Native |
| `@workspace/findx-pitch-deck` | `artifacts/findx-pitch-deck/` | Pitch Deck — Vite slides |
| `@workspace/findx-promo` | `artifacts/findx-promo/` | Promo Video — React scenes |

> Build with: `pnpm run build:mobile` or `pnpm run build:marketing`

---

## ✨ What Makes FindX Different

| Feature | Description |
|---|---|
| 🔍 **Real Website Scraping** | Visits every lead's website — extracts emails, phones, SSL, load speed, social links |
| 🧠 **Grounded AI Scoring** | Score is calculated from real metrics, not AI guesses. No hallucination. |
| 🚫 **Directory Filtering** | Rejects Clutch, Sortlist, DesignRush, blog posts, and 40+ aggregator domains |
| ✉️ **Hyper-Personalized Outreach** | Each email references a specific verified fact from the scraped site |
| 📊 **Kanban Pipeline** | Visual drag-and-drop board: New → Qualified → Won |
| 📱 **Mobile App** | iOS/Android app with real-time notifications |
| 🌍 **Multi-Language** | Arabic, English, Dutch, French, Spanish, German |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    AI Pipeline                       │
│                                                      │
│  ┌────────────┐   ┌────────────┐   ┌──────────────┐ │
│  │  Discover  │──▶│  Analyze   │──▶│   Outreach   │ │
│  │            │   │            │   │              │ │
│  │ Tavily     │   │ Scrape     │   │ Generate     │ │
│  │ Filter     │   │ Real Score │   │ Personalized │ │
│  │ Extract    │   │ 0–100      │   │ Cold Email   │ │
│  └────────────┘   └────────────┘   └──────────────┘ │
└──────────────────────────────────────────────────────┘
        │                  │                 │
        ▼                  ▼                 ▼
  PostgreSQL          Gemini 2.5         Resend API
  (Supabase)          Flash AI           (Email Send)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite · React 19 · TypeScript · TailwindCSS v4 |
| **Backend** | Express 5 · TypeScript · Drizzle ORM |
| **Database** | PostgreSQL via Supabase |
| **Auth** | Supabase Auth · Google OAuth |
| **AI** | OpenRouter · Gemini 2.5 Flash |
| **Search** | Tavily API |
| **Email** | Resend API |
| **Package Manager** | pnpm (monorepo) |
| **Deployment** | Vercel (frontend) · Render (API) |

---

## 🚀 Quick Start

### Prerequisites

- Node.js `>= 22`
- pnpm `>= 10` — `npm install -g pnpm`
- A [Supabase](https://supabase.com) project
- API keys: **Tavily**, **Resend**, **OpenRouter** or **Gemini**

### 1. Clone & Install

```bash
git clone https://github.com/amrolela100-sketch/FindXAgents.git
cd FindXAgents
pnpm install
```

### 2. Environment Variables

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/findx/.env.example       artifacts/findx/.env
```

**API Server** (`artifacts/api-server/.env`):
```env
DATABASE_URL=postgresql://...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OWNER_EMAIL=admin@yourdomain.com
OWNER_PASSWORD=your-secure-password
ADMIN_EMAILS=admin@yourdomain.com
TAVILY_API_KEY=tvly-...
RESEND_API_KEY=re_...
GEMINI_API_KEY=AIza...
```

**Web App** (`artifacts/findx/.env`):
```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_API_URL=http://localhost:3000/api
VITE_ADMIN_EMAILS=admin@yourdomain.com
```

### 3. Database Setup

```bash
# Apply migrations (safe, incremental)
pnpm --filter @workspace/db run migrate

# Or push schema directly (local dev only)
pnpm --filter @workspace/db run push
```

### 4. Run in Development

```bash
# Terminal 1 — API (port 3000)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Web App (port 5173)
pnpm --filter @workspace/findx run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## ☁️ Deployment

See [`DEPLOY.md`](./DEPLOY.md) for full instructions.

**Summary:**
- **Frontend** → Vercel (auto-deploy on push to `main`)
- **API** → Render (Docker, `render.yaml` included)
- **Database** → Supabase (managed PostgreSQL)

---

## 🔐 Access Levels

| Role | Access |
|---|---|
| **User** | Own leads, pipeline, outreach |
| **Admin** | All users' leads + admin panel |
| **Owner** | Everything + operator panel at `/owner` |

Set `ADMIN_EMAILS` in your API `.env` to grant admin.
Set `OWNER_EMAIL` + `OWNER_PASSWORD` to enable the owner panel.

---

## 📂 Repo Structure

```
FindXAgents/
├── artifacts/
│   ├── findx/              🌐 Web App (core)
│   ├── api-server/         ⚙️  REST API (core)
│   ├── findx-mobile/       📱 Mobile App (optional)
│   ├── findx-pitch-deck/   📊 Pitch Deck (optional)
│   └── findx-promo/        🎬 Promo Video (optional)
├── lib/
│   └── db/                 🗄️  Shared Drizzle Schema + Migrations
├── tests/                  🧪 Integration tests (vitest)
├── .github/workflows/      🤖 CI — lint, typecheck, test, build
├── DEPLOY.md               ☁️  Deployment guide
└── package.json            📦 Root workspace scripts
```

---

## 🤝 Contributing

1. Fork → create a feature branch (`phase/N-description`)
2. Make changes → open a PR targeting `main`
3. CI must pass (lint, typecheck, tests)
4. Merge → Vercel auto-deploys

---

<div align="center">
<sub>Built with ⚡ by the FindX team</sub>
</div>
