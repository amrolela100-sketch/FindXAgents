# FindX Design System — Changelog

## v3.0.0 — Precision Dark Design System (2026-05-17)

### 🎨 Design Philosophy

**Precision Dark** replaces *Liquid Glass* as FindX's visual identity.

| Old (Liquid Glass) | New (Precision Dark) |
|--------------------|----------------------|
| Glass morphism + blur | Flat surfaces, crisp borders |
| Teal `#0D9488` accent | Indigo `#6366F1` accent |
| Outfit font | Inter font |
| Cream/purple bg | Near-black `#0C0C0E` bg |
| Mesh radial gradients | Single subtle top glow |
| `backdrop-filter: blur(...)` | `backdrop-filter: blur(0px)` |

**Inspiration:** Linear, Vercel, Stripe — precision tools for precision people.
**From open-design.ai:** editorial micro-typography, section numbers, metadata hints, single-accent discipline.

### 🎯 Token Changes

#### Brand Accent — Teal → Indigo

| Token | Old (Teal) | New (Indigo) |
|-------|------------|--------------|
| `--findx-color-brand-500` | `#0D9488` | `#6366F1` |
| `--findx-color-brand-600` | `#0F766E` | `#4F46E5` |
| `--findx-accent` (dark) | `#2DD4BF` | `#6366F1` |
| `--findx-accent-subtle` | `rgba(13,148,136,0.10)` | `rgba(99,102,241,0.12)` |
| `--findx-accent-glow` | teal glow | indigo glow |

#### Surfaces — Glass → Flat Precision

| Token | Old | New |
|-------|-----|-----|
| `--findx-bg-base` | `#080810` | `#0C0C0E` |
| `--findx-bg-subtle` | `#0E0D1A` | `#141416` |
| `--findx-bg-inset` | `#141228` | `#1C1C1F` |
| `--findx-bg-elevated` | `#1A1930` | `#222226` |
| `--findx-surface-glass` | `rgba(255,255,255,0.04)` | `#141416` (opaque) |
| `--findx-surface-border` | `rgba(255,255,255,0.08)` | `#222226` (crisp) |
| `--findx-blur-glass` | `blur(24px)` | `blur(0px)` |

#### Neutral Palette — Gray → Zinc

Switched from `zinc/gray` mix to pure Zinc scale (cooler undertone, matches dark surfaces).

#### Font

| | Old | New |
|--|-----|-----|
| `--font-sans` | Outfit | **Inter** |
| `--font-mono` | JetBrains Mono | JetBrains Mono (unchanged) |

### 📁 Files Changed

#### `artifacts/findx/src/design-system/`
- `styles/tokens/primitives.css` — Indigo brand + Zinc neutrals + Precision Dark surface palette
- `styles/tokens/semantic-dark.css` — Dark-first (`:root, .dark`) with flat surfaces
- `styles/tokens/semantic-light.css` — Secondary theme override (`.light, [data-theme="light"]`)
- `styles/tokens/tailwind-theme.css` — Inter font + updated color mappings
- `styles/base/base.css` — Dark-first body, single glow, editorial utility classes
- `styles/components/glass.css` — Flat precision cards (`.glass-card` backward compat kept)
- `styles/components/navigation.css` — Precision nav-link, sidebar, topbar
- `styles/components/forms.css` — Flat buttons (Indigo primary), precision inputs
- `styles/components/data-display.css` — Flat badges, precision table, metric card
- `tokens/index.ts` — `primitiveColors` updated (Indigo brand, Zinc neutral)

#### `artifacts/findx/`
- `index.html` — `class="dark"` on `<html>` + Inter font
- `src/lib/theme-context.tsx` — Default theme = `"dark"` (dark-first)

#### `artifacts/findx-landing/`
- `src/styles/global.css` — Precision Dark CSS variables + editorial utilities
- `src/layouts/Base.astro` — Inter font replaces Outfit
- `src/pages/index.astro` — Full precision dark landing page
  - Compact nav (h-14, no blur-xl)
  - Editorial section numbers (01, 02, 03, 04)
  - Single Indigo glow instead of mesh gradients
  - Precision mockup cards (flat, crisp borders)
  - `section-label`, `meta-hint`, `section-number` classes

### Added — Editorial Utilities (from open-design.ai)

```css
.section-label   /* 11px, 600, uppercase, 0.08em spacing, accent color */
.section-number  /* 11px, 700, tabular-nums, accent color */
.meta-hint       /* 12px, tabular-nums, muted color */
```

### Deprecated

- `--findx-surface-blur` (previously `blur(24px)`) — now `blur(0px)`, will be removed in v4.0
- All `backdrop-filter: var(--blur-glass-*)` usage — no-op in Precision Dark

### Migration Notes

```css
/* Old glass morphism */
.my-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.08);
}

/* New precision flat */
.my-card {
  background: var(--findx-surface-glass); /* #141416 */
  border: 1px solid var(--findx-border-default); /* #222226 */
  /* No backdrop-filter needed */
}
```

---

## v2.1.0 — Brand Refresh + SSR Migration (2026-05-17)

### 🎨 Brand Refresh — Amber → Teal

**Motivation:** Amber/gold with lightning bolt icon is generic (used by hundreds of SaaS products). Deep Teal communicates intelligence, precision, and trust — better for B2B.

#### Color Token Migration

| Token | Old Value (Amber) | New Value (Teal) |
|-------|-------------------|-----------------|
| `--findx-color-brand-500` (PRIMARY) | `#F59E0B` | `#0D9488` |
| `--findx-color-brand-600` (HOVER)   | `#D97706` | `#0F766E` |
| `--findx-accent` (dark mode)        | `#FBBF24` | `#2DD4BF` |
| `--findx-shadow-glow-brand`         | amber glow | teal glow |
| `--findx-accent-foreground`         | `#1A1A1A` | `#FFFFFF`  |

#### Icon Migration

- `⚡ Zap` (lucide-react) → `RadarIcon` (custom SVG)
- New component: `src/components/radar-icon.tsx`
- Concept: radar sweep = intelligent scanning + discovery
- Replaced in: `sidebar.tsx`, `LandingPage/index.tsx`, `LoginPage/index.tsx`, `PrivacyPage.tsx`, `TermsPage.tsx`, `not-found.tsx`, `OnboardingPage.tsx`, `LandingPage.tsx`

#### Gradient Update
- `bg-gradient-to-br from-primary to-orange-600` → `from-primary to-teal-600`

---

### 🚀 SSR Migration — New `findx-landing` Astro Package

**New package:** `artifacts/findx-landing/` (`@workspace/findx-landing`)

**Why:** The React/Vite landing page is CSR — Google, ChatGPT, and Perplexity can't index it properly. Astro generates static HTML at build time.

**Features:**
- Astro 4 + SSG (`output: "static"`)
- Auto sitemap via `@astrojs/sitemap`
- Full JSON-LD structured data (SoftwareApplication, FAQPage)
- OpenGraph + Twitter card meta
- Zero JS by default → fast TTFB + Core Web Vitals
- Routes: `/` (landing) + `/pricing`
- Teal brand tokens baked in

---

## v2.0.0 — Phase 0.5: Token System Unification (2026-05-16)

### 🎯 Mission

Unified the dual CSS architecture (32KB monolith `index.css` + unused `foundation.css`) into a single, modular token-based design system.

### Breaking Changes

**None** — Full backward compatibility maintained. All existing CSS classes (`glass-card`, `btn-primary`, `nav-link`, etc.) continue to work unchanged.

### Added

#### Modular CSS Architecture (13 files)

Replaced the 32KB monolith `src/index.css` with a modular architecture:

```
src/index.css                          ← Thin entry point (imports only)
src/design-system/styles/
├── tokens/
│   ├── primitives.css                 ← Layer 1: Raw values (141 tokens)
│   ├── semantic-light.css             ← Layer 2: Purpose-based (light mode)
│   ├── semantic-dark.css              ← Layer 2: Dark mode overrides
│   ├── tailwind-theme.css             ← Tailwind v4 @theme bridge
│   └── animations.css                 ← Keyframes + animation utilities
├── base/
│   └── base.css                       ← Reset, body, mesh, scrollbar
├── components/
│   ├── glass.css                      ← Glass card, variants, brand glow, skeleton
│   ├── navigation.css                 ← Sidebar, topbar, nav-link
│   ├── forms.css                      ← Input, select, button
│   ├── data-display.css               ← Badge, kanban, status pulse
│   └── command-palette.css            ← Ctrl+K command palette
├── utilities.css                      ← Line clamp, scroll reveal, gradients
└── rtl-a11y.css                       ← RTL overrides, reduced motion, print
```

#### Token Architecture (3 Layers)

```
Layer 1: Primitives (--findx-color-brand-500, --findx-space-4, etc.)
   ↓
Layer 2: Semantic (--findx-accent, --findx-text-primary, --findx-surface-glass)
   ↓
Layer 3: Component (via CVA in primitives/*.tsx)
```

#### Backward-Compat Aliases

All legacy short-name variables now reference `--findx-*` tokens:

| Legacy | → | Semantic Token |
|--------|---|----------------|
| `--brand` | → | `var(--findx-accent)` |
| `--text` | → | `var(--findx-text-primary)` |
| `--glass` | → | `var(--findx-surface-glass)` |
| `--bg` | → | `var(--findx-bg-base)` |
| `--border` | → | `var(--findx-surface-border)` |

#### Tooling

- `scripts/validate-tokens.js` — Validates token architecture (71 checks)
- `scripts/generate-token-json.js` — Generates `tokens.json` (141 tokens)
- `design-system/tokens/tokens.json` — Machine-readable token definitions

#### Design System Entry Point

Updated `design-system/index.css` to use the modular system while providing additional utility classes (card-elevated, badge variants, form helpers, kbd, spinner, avatar sizes, live-indicator).

### Fixed

- **CSS monolith**: 32KB `index.css` → 13 modular files
- **Dead CSS**: `foundation.css` was never imported at runtime — now integrated
- **Token duplication**: Two separate variable systems → single source of truth
- **Dark mode consistency**: All semantic tokens have proper dark overrides
- **RTL support**: All directional styles are RTL-aware

### Migration Guide

For existing components:
```css
/* Before (still works) */
.my-component { color: var(--text); background: var(--glass); }

/* After (preferred for new code) */
.my-component { 
  color: var(--findx-text-primary); 
  background: var(--findx-surface-glass); 
}
```

---

## v1.0.0 — Phase 0: Foundation (2026-05-16)

### Added

#### Design Token System
- `tokens/colors.tokens.json` — Complete color palette
  - Brand (Amber): 50-900 scale
  - Neutral (Gray): 50-950 scale
  - Success, Warning, Danger, Info: 50-900 scales
  - Purple, Pink: accent colors for mesh effects
  
- `tokens/typography.tokens.json` — Type scale and font families
  - Display font: Outfit (Latin)
  - Body font: Noto Sans Arabic (Arabic-first)
  - Mono font: JetBrains Mono
  - Complete type scale: xs through 6xl

- `tokens/spacing.tokens.json` — 4px base grid system
  - All spacing values from 0.5rem to 96rem
  - Border radius scale
  - Border width scale

- `tokens/motion.tokens.json` — Animation and motion tokens
  - Duration scale: instant through slowest
  - Easing curves: linear, ease, spring, bounce
  - Stagger delays for orchestrated animations
  - Shadow scale: xs through 2xl + glow variants
  - Z-index scale for layering

- `tokens/index.ts` — TypeScript token definitions
  - `primitiveColors` — Raw hex values
  - `semanticTokens` — Purpose-based aliases
  - `componentTokens` — Component-scoped values
  - `generateCSSVariables()` — CSS generator utility

#### Foundation CSS
- `styles/foundation.css` — New CSS architecture
  - Layer 1: Primitive tokens (raw values)
  - Layer 2: Semantic tokens (purpose-based)
  - Layer 3: Dark mode semantic overrides
  - Layer 4: Backward-compatibility aliases
  - Tailwind `@theme inline` configuration
  - Custom scrollbar styles
  - Selection styles
  - Focus styles (accessibility)
  - Animation keyframes
  - Glass morphism utilities
  - Reduced motion support
  - Print styles

#### Design Patterns
- `patterns/PageShell.tsx` — Standard page layout wrapper
- `patterns/EmptyState.tsx` — Empty state patterns

#### Design Hooks
- `hooks/use-design-tokens.ts` — Design token React hook
- `hooks/use-breakpoint.ts` — Responsive breakpoint detection

### Architecture Changes

#### Directory Structure
```
artifacts/findx/src/design-system/
├── tokens/
│   ├── index.ts
│   └── tokens.json (NEW in v2.0.0)
├── styles/
│   ├── tokens/        (NEW in v2.0.0)
│   ├── base/          (NEW in v2.0.0)
│   ├── components/    (NEW in v2.0.0)
│   └── utilities.css  (NEW in v2.0.0)
├── patterns/
├── hooks/
├── primitives/
├── index.ts
└── index.css
```

### Breaking Changes
None.

### Deprecation Notes
- Legacy aliases (`--brand`, `--text`, `--glass`) will be removed in v3.0
- Components should migrate to `--findx-*` semantic tokens by v2.5

---

## Statistics

| Metric | v1.0.0 | v2.0.0 |
|--------|--------|--------|
| CSS files | 1 monolith (32KB) | 13 modular files |
| Token definitions | 150+ | 141 primitives + 24 semantic + 17 aliases |
| Validation checks | 0 | 71 |
| Machine-readable output | No | tokens.json (141 tokens) |

---

## Contributors

- Phase 0: AI-assisted development
- Phase 0.5 (v2.0.0): Token unification + CSS modularization
- Design system architecture based on: Base Web, Anthropic, Fluent UI patterns
