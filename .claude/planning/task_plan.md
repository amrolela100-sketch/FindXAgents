# Task Plan — FindX Full UI Refactor

## Goal
Complete visual and architectural redesign of FindX frontend (artifacts/findx) with:
- Anthropic-inspired warm design system
- Full Arabic / English bilingual support (RTL/LTR)
- Google OAuth login only
- Dark mode
- Command Palette (Ctrl+K)
- Modern component architecture (no dangerouslySetInnerHTML)

## Design System Decisions
- **Primary**: `#D97706` (Amber — Anthropic-like warmth)
- **Background Light**: `#FAF9F7`
- **Background Dark**: `#1C1917`
- **Surface Light**: `#FFFFFF` / `#F5F3EE`
- **Surface Dark**: `#292524` / `#3C3836`
- **Text Light**: `#1A1A1A` / `#6B6860`
- **Text Dark**: `#F5F5F4` / `#A8A29E`
- **Border Light**: `#E8E5DE`
- **Border Dark**: `#44403C`
- **Font**: Inter (Google Fonts) — body; system-serif for headings
- **Radius**: `12px` cards, `8px` buttons, `6px` inputs
- **Shadows**: warm amber tinted shadows

## Phases

### Phase 1 — Design System Foundation ✅ COMPLETE
- [ ] tailwind.config.ts — full new token system
- [ ] index.css — CSS variables, dark mode, typography, animations
- [ ] New color tokens: background, surface, primary, muted, border, ring

### Phase 2 — Core Layout Components ✅ COMPLETE
- [ ] sidebar.tsx — new sidebar with icon+label, collapsible, RTL
- [ ] top-bar.tsx — search, lang toggle, dark toggle, user menu
- [ ] page-shell.tsx — updated shell
- [ ] App.tsx — layout fixes

### Phase 3 — Auth Pages ✅ COMPLETE
- [ ] LoginPage.tsx — Google OAuth only, bilingual, beautiful
- [ ] LandingPage.tsx — marketing landing with CTA
- [ ] OnboardingPage.tsx — keep functional, restyle

### Phase 4 — Dashboard & Home ✅ COMPLETE
- [ ] HomePage.tsx — Bento Grid: KPIs, score ring, funnel, activity
- [ ] dashboard-cards.tsx — new card design
- [ ] activity-feed.tsx — restyle

### Phase 5 — Leads & Pipeline ✅ COMPLETE
- [ ] LeadsPage.tsx — list/kanban toggle, search bar, stats
- [ ] PipelinePage.tsx — pipeline + run form
- [ ] lead-card.tsx — restyle
- [ ] kanban-board.tsx — restyle columns
- [ ] lead-detail-panel.tsx — restyle panel

### Phase 6 — Agents & Clients ✅ COMPLETE
- [ ] AgentsPage.tsx — agent cards, run form
- [ ] ClientsPage.tsx — client grid

### Phase 7 — Command Palette ✅ COMPLETE
- [ ] command-palette.tsx — Ctrl+K, search leads/pages/actions
- [ ] hook: use-command-palette.ts

### Phase 8 — i18n System ✅ COMPLETE
- [ ] i18n/ar.ts — Arabic translations
- [ ] i18n/en.ts — English translations
- [ ] Update lang-context.tsx to use translation files

### Phase 9 — Final QA & Commit ✅ COMPLETE
- [ ] Check all imports
- [ ] TypeScript errors
- [ ] Git commit + push

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|

## Files Modified
- artifacts/findx/tailwind.config.ts (or .js)
- artifacts/findx/src/index.css
- artifacts/findx/src/App.tsx
- artifacts/findx/src/components/sidebar.tsx
- artifacts/findx/src/components/top-bar.tsx
- artifacts/findx/src/components/page-shell.tsx
- artifacts/findx/src/pages/LoginPage.tsx
- artifacts/findx/src/pages/LandingPage.tsx
- artifacts/findx/src/pages/HomePage.tsx
- artifacts/findx/src/pages/LeadsPage.tsx
- artifacts/findx/src/pages/PipelinePage.tsx
- artifacts/findx/src/pages/AgentsPage.tsx
- artifacts/findx/src/pages/ClientsPage.tsx
- artifacts/findx/src/components/command-palette.tsx (NEW)
- artifacts/findx/src/lib/i18n/ (NEW directory)
