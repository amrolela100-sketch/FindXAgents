# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run generate` — generate Drizzle migrations from schema changes
- `pnpm --filter @workspace/db run migrate` — apply pending migrations to the database
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### FindX — Business Prospecting Platform (`artifacts/findx`)
Vite + React frontend with wouter routing, @dnd-kit kanban board. Pages: Dashboard, Agents, Pipeline, Workspaces, Settings, Admin (admin-only).
**Theme**: Anthropic-inspired warm cream aesthetic. Background `#F7F5F0`, white cards with `#E5E3D9` borders, `#1A1A1A` dark charcoal text + buttons, `#7A756D` secondary text, `#F0EDE6` kanban columns. Fonts: Playfair Display (serif) for headings, Inter for body.

**Onboarding flow** (`OnboardingPage.tsx`): 4-step wizard shown to new users (Welcome → Company → ICP → Done). Completion stored in Supabase `user_metadata.onboarding_completed`. Checked via `/api/onboarding/status` on every login.

**Multi-tenancy Workspaces** (`WorkspacePage.tsx`, `lib/workspace-context.tsx`): Users create named workspaces with ICP, target industry, target city. Workspaces stored in Supabase `user_metadata.workspaces` JSON array. Active workspace shown as a switcher pill in the sidebar. API: `/api/workspaces` CRUD + `/api/workspaces/:id/switch`.

**Admin Dashboard** (`AdminPage.tsx`): Internal admin panel for platform operators. Shows total users, leads, runs + per-user table with onboarding status. Only visible to emails listed in `VITE_ADMIN_EMAILS` env var. API: `/api/admin/stats`, `/api/admin/users` (guarded by `ADMIN_EMAILS` env var on server).

### API Server (`artifacts/api-server`)
Express 5 REST API mounted at `/api`. All routes in `artifacts/api-server/src/routes/`.

**Endpoints:**
- `GET /api/healthz` — health check
- `GET /api/dashboard/stats` — KPI summary (totalLeads, analyzed, contacted, won, conversionRate)
- `GET /api/leads/score-distribution` — cold/warm/hot/unscored buckets
- `GET/POST /api/leads` — list (paginated, filtered) + create
- `GET/PATCH /api/leads/:id` — fetch + update single lead
- `POST /api/leads/discover` — KVK/Google discovery (stubs 202 until API keys configured)
- `POST /api/leads/bulk/analyze|outreach` — bulk queue operations
- `PATCH /api/leads/bulk/status` — bulk status update
- `POST /api/leads/import`, `GET /api/leads/export` — CSV import/export
- `POST /api/leads/:id/analyze`, `GET /api/leads/:id/analyses` — per-lead analysis
- `POST /api/leads/:id/outreach/generate|send`, `GET /api/leads/:id/outreaches` — per-lead outreach
- `GET /api/pipeline` — pipeline stages with lead counts
- `GET/POST /api/agents` — agent CRUD
- `GET/PATCH /api/agents/:id`, `DELETE /api/agents/:id`, `PATCH /api/agents/:id/toggle`
- `GET/PATCH /api/agents/name/:name` — agent by name
- `GET/POST/PATCH/DELETE /api/agents/:id/skills/:skillId` — agent skills
- `POST /api/agents/run` — start pipeline run (stores run, actual AI execution needs provider configured)
- `GET /api/agents/runs`, `GET /api/agents/runs/:id` — pipeline run list/detail
- `POST /api/agents/runs/:id/cancel` — cancel run
- `GET /api/agents/runs/:id/logs` — logs for a run
- `GET /api/agents/logs` — all agent logs (paginated, filtered)
- `GET /api/agents/tools` — tool catalogue
- `POST /api/agents/seed` — seed pipeline stages + default agents
- `GET /api/analyses/:id` — analysis detail
- `GET/PATCH /api/outreaches`, `GET /api/outreaches/:id` — outreach list/detail
- `POST /api/outreaches/:id/schedule`, `DELETE /api/outreaches/:id/schedule` — scheduling
- `GET /api/ai/providers` — AI provider list + active provider info
- `POST /api/ai/providers` — add provider
- `PATCH/DELETE /api/ai/providers/:id` — update/remove
- `POST /api/ai/providers/:id/test` — test connectivity
- `POST /api/ai/providers/:id/default` — set default
- `GET /api/email/settings`, `PUT /api/email/settings` — email provider settings
- `GET /api/email/provider/status` — active provider status
- `GET/PUT/DELETE /api/email/smtp/config` — SMTP configuration
- `POST /api/email/smtp/test` — SMTP test
- `GET/POST /api/telegram/settings` — Telegram bot config
- `POST /api/telegram/test` — send test Telegram message (live fetch to Telegram API)
- `DELETE /api/data/clear-all` — wipe all leads/analyses/outreaches/runs/logs

## Database Schema (`lib/db/src/schema/index.ts`)
13 tables: `leads`, `analyses`, `outreaches`, `pipeline_stages`, `agent_pipeline_runs`, `agents`, `agent_skills`, `agent_logs`, `ai_providers`, `email_provider_tokens`, `smtp_configs`, `email_settings`, `telegram_settings`.
Enums: `lead_status`, `outreach_status`, `ai_provider_type`.
IDs: `text` with `crypto.randomUUID()` default.

### FindX Pitch Deck (`artifacts/findx-pitch-deck`)
10-slide React pitch deck, dark FindX branding (bg `#0f1623`, blue `#3b82f6`/`#60a5fa`, Space Grotesk font). Slides: Title, Problem, Solution, How It Works, AI Agents, Pipeline, Email Outreach, Traction, Pricing (€149/€349/€749), CTA. Preview at `/findx-pitch-deck/`.

### FindX Promo Video (`artifacts/findx-promo`)
~46s motion graphics promo video with 6 animated scenes. Preview at `/findx-promo/`.

### FindX Mobile (`artifacts/findx-mobile`)
Expo Router mobile app with 5 tabs: Dashboard, Leads, Runs, Agents, Profiel.

**Onboarding flow** (`app/onboarding.tsx`): 4-step native wizard (Welcome → Bedrijf → ICP → Klaar) shown after first login. Animated with `Animated.spring`. Calls `/api/onboarding/complete` on finish.

**Workspaces** (in `app/(tabs)/profile.tsx`): Full workspace management (create, switch, delete) via a card + sheet modal. Displays active workspace indicator per item.

**Admin section** (in `app/(tabs)/profile.tsx`): Collapsible admin panel showing platform stats and user list. Only rendered when `user.email` is in `EXPO_PUBLIC_ADMIN_EMAILS` env var.

**Auth + onboarding routing** (`app/_layout.tsx`): `AuthGate` checks onboarding status via `/api/onboarding/status` and routes to `/onboarding` for new users; routes to `/(tabs)` when done.

## External Integrations (require env vars to activate)
- **OpenRouter AI** ✅ LIVE: `OPENROUTER_API_KEY` — powers `POST /api/leads/:id/analyze` and `POST /api/leads/:id/outreach/generate`. Model: `google/gemini-2.5-flash`. Engine: `artifacts/api-server/src/lib/ai-engine.ts`.
- **Tavily Search** ✅ LIVE: `TAVILY_API_KEY` — powers `POST /api/search`. Status: `GET /api/search/status`.
- **Resend Email**: `RESEND_API_KEY` — powers `POST /api/email/send`. Test: `POST /api/email/resend/test`. Set `EMAIL_FROM` for custom sender.
- **Gemini AI**: `GEMINI_API_KEY` — seeded to ai_providers table. Use `POST /api/ai/providers/seed-from-env` to re-seed.
- **KVK Discovery**: KVK API credentials — Netherlands business registry search
- **Google Places**: `GOOGLE_MAPS_API_KEY` — Google Places search
- **Gmail OAuth**: `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` — Gmail sending
- **Telegram**: configured via `/api/telegram/settings` — notifications

## AI Engine (`artifacts/api-server/src/lib/ai-engine.ts`)
Real AI execution using OpenRouter (OpenAI-compatible SDK, `baseURL: https://openrouter.ai/api/v1`).
- `analyzeLeadWithGemini(lead)` → AnalysisResult (score 0-100, opportunities, weaknesses, recommendations, Dutch email subject)
- `generateOutreachWithGemini(lead, analysis, language)` → OutreachResult (subject + body in nl/en)
Both functions: `max_tokens: 1024`, model: `google/gemini-2.5-flash`.

## Integration Clients (`artifacts/api-server/src/lib/`)
- `ai-engine.ts` — `analyzeLeadWithGemini()`, `generateOutreachWithGemini()` via OpenRouter
- `resend.ts` — `sendViaResend(opts)`, `isResendConfigured()`
