# FindX — B2B Prospecting Platform

A full-stack AI-powered B2B lead generation and prospecting platform built for the Netherlands market.

---

## What's Included

| Artifact | Description |
|---|---|
| `artifacts/findx` | Web app (Vite + React) |
| `artifacts/api-server` | REST API (Express 5 + Drizzle ORM) |
| `artifacts/findx-mobile` | Mobile app (Expo / React Native) |
| `artifacts/findx-pitch-deck` | Pitch deck (slides) |
| `artifacts/findx-promo` | Promo video |
| `lib/db` | Shared database schema (Drizzle + PostgreSQL) |

---

## Tech Stack

- **Frontend**: Vite + React + TypeScript + TailwindCSS
- **Backend**: Express 5 + TypeScript
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Mobile**: Expo (React Native) + expo-router
- **Auth**: Supabase Auth (Google OAuth)
- **AI Agents**: OpenRouter / Gemini API
- **Email**: Resend API
- **Search**: Tavily API
- **Package manager**: pnpm (monorepo)

---

## Prerequisites

- Node.js >= 20
- pnpm >= 9 (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (PostgreSQL + Auth)
- API keys: Tavily, Resend, OpenRouter or Gemini

---

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Copy the example files and fill in your values:

```bash
cp artifacts/api-server/.env.example artifacts/api-server/.env
cp artifacts/findx/.env.example artifacts/findx/.env
cp artifacts/findx-mobile/.env.example artifacts/findx-mobile/.env
```

#### API Server (`artifacts/api-server/.env`)

```env
DATABASE_URL=postgresql://...        # Supabase connection string
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
OWNER_EMAIL=admin@yourdomain.com
OWNER_PASSWORD=your-secure-password
ADMIN_EMAILS=admin@yourdomain.com
TAVILY_API_KEY=tvly-...
RESEND_API_KEY=re_...
OPENROUTER_API_KEY=sk-or-...        # or GEMINI_API_KEY
GEMINI_API_KEY=AIza...
```

#### Web App (`artifacts/findx/.env`)

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_API_URL=http://localhost:3000/api
VITE_ADMIN_EMAILS=admin@yourdomain.com
```

#### Mobile App (`artifacts/findx-mobile/.env`)

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Push database schema

```bash
pnpm --filter @workspace/db run push
```

### 4. Run in development

```bash
# API server
pnpm --filter @workspace/api-server run dev

# Web app (separate terminal)
pnpm --filter @workspace/findx run dev

# Mobile app (separate terminal)
pnpm --filter @workspace/findx-mobile run dev
```

---

## Supabase Configuration

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Google** as an OAuth provider (Auth → Providers → Google)
3. Add your redirect URLs in Auth → URL Configuration:
   - `http://localhost:5173/` (local web dev)
   - `https://yourdomain.com/` (production web)
   - `findx-mobile://auth/callback` (mobile)
4. Copy your Project URL and anon/service keys into the `.env` files above

---

## Production Build

```bash
# Build everything
pnpm run build

# Or build individually
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/findx run build
```

---

## Project Structure

```
findx/
├── artifacts/
│   ├── findx/               # Web frontend (Vite + React)
│   │   └── src/
│   │       ├── pages/       # Route pages
│   │       ├── components/  # Shared UI components
│   │       └── lib/         # API client, auth, utils
│   ├── api-server/          # REST API (Express 5)
│   │   └── src/
│   │       ├── routes/      # All API endpoints
│   │       ├── lib/         # AI agents, email, search
│   │       └── middleware/  # Auth, error handling
│   ├── findx-mobile/        # Expo mobile app
│   │   └── app/
│   │       ├── (tabs)/      # Tab screens: dashboard, leads, runs, agents, profile
│   │       ├── lead/[id]    # Lead detail screen
│   │       └── run/[id]     # Run detail screen
│   ├── findx-pitch-deck/    # Pitch deck slides
│   └── findx-promo/         # Promo video
└── lib/
    └── db/                  # Shared Drizzle schema + migrations
```

---

## Key Features

- **AI Pipeline**: 3-agent pipeline (Discovery → Analysis → Outreach)
- **Lead Management**: Kanban board + list view, filters, search, CSV import/export
- **Pipeline Runs**: Start/stop/monitor agent runs in real-time
- **Workspaces**: Multi-tenant workspaces with ICP per workspace
- **Email Outreach**: AI-generated personalized emails via Resend
- **Mobile App**: Full iOS/Android app with push notifications
- **Admin Dashboard**: User management, platform-wide stats
- **Owner Dashboard**: Password-protected operator panel

---

## Owner Dashboard

Navigate to `/owner` in the web app. Enter credentials from `OWNER_EMAIL` / `OWNER_PASSWORD` in your API server `.env`.

---

## Support

Contact the development team for setup assistance.
