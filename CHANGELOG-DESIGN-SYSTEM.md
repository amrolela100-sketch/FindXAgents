# FindX Design System — Changelog

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
