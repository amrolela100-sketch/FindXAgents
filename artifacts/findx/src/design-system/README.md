# 🎨 FindX Design System

> A premium, production-ready design system for AI-powered B2B SaaS applications.

## Overview

The FindX Design System is a layered token-based system providing:

- ✅ **Semantic Design Tokens** — Meaningful, purpose-based CSS variables
- ✅ **Multi-theme Support** — Light/Dark modes with automatic RTL for Arabic
- ✅ **Accessible Components** — WCAG 2.1 AA compliant
- ✅ **Responsive Patterns** — Mobile-first approach
- ✅ **Type-safe Hooks** — React hooks for accessing design tokens
- ✅ **Backwards Compatibility** — Legacy variable aliases during migration

## Architecture

```
Layer 1: Primitive Tokens (raw hex values)
  --findx-color-brand-500: #F59E0B
  --findx-space-4: 1rem
  --findx-radius-md: 0.5rem

Layer 2: Semantic Tokens (purpose-based aliases)
  --findx-accent: var(--findx-color-brand-500)
  --findx-text-primary: var(--findx-color-neutral-900)

Layer 3: Component Tokens (scoped to specific components)
  --findx-button-height: var(--findx-space-9)

Layer 4: Legacy Aliases (backward compatibility)
  --brand: var(--findx-accent)    ← REMOVE in v2.0
```

## Quick Start

### Import the CSS

```tsx
// In your root layout or App.tsx
import '@findx/design-system/index.css';
```

### Use Design Tokens

```tsx
import { useDesignTokens } from '@/design-system/hooks';

function MyComponent() {
  const tokens = useDesignTokens();
  
  return (
    <div
      style={{
        color: tokens.color.accent,
        padding: tokens.spacing['4'],
        borderRadius: tokens.radius.md,
      }}
    >
      Using {tokens.mode} mode tokens
    </div>
  );
}
```

## Token Categories

### Color Tokens

| Token | Description | Light | Dark |
|-------|-------------|-------|------|
| `--findx-accent` | Primary brand | `#F59E0B` | `#FBBF24` |
| `--findx-text-primary` | Main text | `#171717` | `#EEECFA` |
| `--findx-bg-base` | Background | `#F0EFF8` | `#080810` |
| `--findx-surface-glass` | Glass card | `rgba(255,255,255,0.65)` | `rgba(255,255,255,0.04)` |

### Spacing Scale

| Token | Value | Token | Value |
|-------|-------|-------|-------|
| `--findx-space-1` | 4px | `--findx-space-8` | 32px |
| `--findx-space-2` | 8px | `--findx-space-12` | 48px |
| `--findx-space-4` | 16px | `--findx-space-16` | 64px |

### Motion

| Token | Value | Use Case |
|-------|-------|----------|
| `--findx-duration-fast` | 100ms | Hover states |
| `--findx-duration-normal` | 200ms | Transitions |
| `--findx-duration-slow` | 300ms | Modals, panels |
| `--findx-ease-spring` | cubic-bezier(0.34, 1.56, 0.64, 1) | Natural physics |

## Components

### PageShell

```tsx
import { PageShell } from '@/design-system/patterns';

<PageShell
  title="Leads"
  description="Manage your business prospects"
  breadcrumbs={[{ label: 'Dashboard', href: '/' }, { label: 'Leads' }]}
  header={<Button>Add Lead</Button>}
>
  <DataTable columns={columns} data={leads} />
</PageShell>
```

### EmptyState

```tsx
import { EmptyState } from '@/design-system/patterns';
import { Inbox } from 'lucide-react';

<EmptyState
  icon={Inbox}
  title="No leads yet"
  description="Start by discovering new business prospects"
  action={{ label: 'Discover Leads', onClick: () => openModal() }}
/>
```

### Skeleton

```tsx
import { Skeleton, PageSkeleton } from '@/design-system/patterns';

// Single skeleton
<Skeleton width="100%" height="1rem" />

// Full page loading
<PageSkeleton rows={5} />
```

## Hooks

### useDesignTokens

Access all design tokens with theme awareness:

```tsx
const tokens = useDesignTokens();
// tokens.color.accent
// tokens.spacing['4']
// tokens.isDark
// tokens.isRtl
```

### useBreakpoint

Responsive breakpoint detection:

```tsx
const breakpoint = useBreakpoint();
// 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
```

## Migration Guide

| Legacy | Semantic | Status |
|--------|----------|--------|
| `--brand` | `--findx-accent` | ✓ Migrated |
| `--text` | `--findx-text-primary` | ✓ Migrated |
| `--bg` | `--findx-bg-base` | ✓ Migrated |
| `--glass` | `--findx-surface-glass` | ✓ Migrated |

## File Structure

```
src/design-system/
├── tokens/           # Design token definitions (JSON + TS)
├── styles/           # Foundation CSS
├── patterns/         # Reusable UI patterns
├── hooks/            # React hooks
└── index.ts          # Main exports
```

## Version

- **Version**: 1.0.0
- **Last Updated**: 2026-05-16
- **Status**: Phase 0 Complete — Foundation established

## Roadmap

- [ ] Phase 1: Core Components refactoring
- [ ] Phase 2: Advanced components (DataTable, FormBuilder)
- [ ] Phase 3: Page refactoring
- [ ] Phase 4: Motion & micro-interactions
- [ ] Phase 5: Accessibility audit
- [ ] Phase 6: Storybook + visual regression tests
- [ ] Phase 7: npm package publishing