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
┌────────────────────────────────────────────────────────────────────────┐
│ Layer 1: Primitive Tokens (raw hex values)                             │
│   --findx-color-brand-500: #F59E0B                                     │
│   --findx-space-4: 1rem                                                │
│   --findx-radius-md: 0.5rem                                           │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Semantic Tokens (purpose-based aliases)                      │
│   --findx-accent: var(--findx-color-brand-500)                        │
│   --findx-text-primary: var(--findx-color-neutral-900)                │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Tailwind @theme (for className usage)                        │
│   bg-brand, text-neutral-900, etc.                                    │
├────────────────────────────────────────────────────────────────────────┤
│ Layer 4: Legacy Aliases (backward compatibility)                      │
│   --brand: var(--findx-accent)      ← REMOVE in v2.0                 │
└────────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Import the CSS

```tsx
// Option A: Import in main.tsx or App.tsx
import '@findx/design-system/styles/foundation.css';
import '@findx/design-system/index.css'; // component utilities

// Option B: In your CSS file
@import '@findx/design-system/styles/foundation.css';
```

### 2. Use Design Tokens

```tsx
// Using the hook (recommended for dynamic theming)
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

// Using CSS variables (recommended for static styles)
<div className="bg-[var(--findx-accent)] text-[var(--findx-text-primary)]" />

// Using Tailwind classes (for rapid development)
<div className="bg-brand text-neutral-900 rounded-md" />
```

### 3. Use Components

```tsx
import { Button, Card, Badge, DataTable, FormBuilder } from '@/design-system';

// Button with variants
<Button variant="primary" size="md">Click me</Button>
<Button variant="destructive" icon={Trash}>Delete</Button>

// Card with glass effect
<Card variant="glass" elevated padding="lg">
  <CardHeader title="Statistics" />
  <CardContent>...</CardContent>
</Card>

// Badge with status
<Badge variant="success" dot>Active</Badge>

// DataTable
<DataTable
  data={leads}
  columns={columns}
  pagination={{ page: 1, pageSize: 20, total: 100 }}
/>

// FormBuilder
<FormBuilder
  sections={formConfig}
  onSubmit={handleSubmit}
/>
```

## Token Categories

### Color Tokens

| Token | Description | Light | Dark |
|-------|-------------|-------|------|
| `--findx-accent` | Primary brand | `#F59E0B` | `#FBBF24` |
| `--findx-text-primary` | Main text | `#171717` | `#EEECFA` |
| `--findx-bg-base` | Background | `#F0EFF8` | `#080810` |
| `--findx-surface-glass` | Glass card | `rgba(255,255,255,0.65)` | `rgba(255,255,255,0.04)` |

### Tailwind Color Classes

These map to the semantic tokens for rapid development:

| Class | Token |
|-------|-------|
| `bg-brand` | `--findx-accent` |
| `text-neutral-900` | `--findx-text-primary` |
| `bg-glass` | `--findx-surface-glass` |
| `border-border` | `--findx-border-default` |

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

### Primitives

| Component | Variants | Sizes | Description |
|-----------|----------|-------|-------------|
| **Button** | 10 | 8 | Primary actions, loading, icons |
| **Input** | 4 states | 3 | Text, error, success states |
| **Card** | 7 | 5 padding | Glass, hover, elevation |
| **Badge** | 10 | 3 | Status, dot, removable |
| **Avatar** | 3 shapes | 6 | Image, initials, group |

### Patterns

| Component | Description |
|-----------|-------------|
| **PageShell** | Standard page layout wrapper |
| **EmptyState** | Empty lists, skeleton loaders |

### Advanced

| Component | Description |
|-----------|-------------|
| **DataTable** | Sortable, filterable, paginated tables |
| **FormBuilder** | Dynamic form generation with validation |
| **MultiStepWizard** | Step-by-step workflows |
| **Notification** | Toast system with provider |

## Hooks

### useDesignTokens

Access all design tokens with theme awareness:

```tsx
const tokens = useDesignTokens();
// tokens.color.accent          // → var(--findx-accent)
// tokens.spacing['4']          // → var(--findx-space-4)
// tokens.isDark                // → boolean
// tokens.isRtl                 // → boolean
// tokens.motion.durations.fast // → '100ms'
```

### useBreakpoint

Responsive breakpoint detection:

```tsx
const breakpoint = useBreakpoint();
// 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
```

### useNotification

Toast/notification system:

```tsx
const { success, error, info, loading } = useNotification();

success('Saved successfully!');
error('Something went wrong', 'Please try again');
```

## Migration Guide

### From Legacy Variables to Semantic Tokens

| Legacy | Semantic | Tailwind Class |
|--------|----------|----------------|
| `--brand` | `--findx-accent` | `bg-brand` |
| `--brand-hover` | `--findx-accent-hover` | `hover:bg-brand` |
| `--text` | `--findx-text-primary` | `text-neutral-900` |
| `--text-muted` | `--findx-text-secondary` | `text-neutral-600` |
| `--bg` | `--findx-bg-base` | `bg-neutral-50` |
| `--glass` | `--findx-surface-glass` | `bg-glass` |

### Phase Schedule

- **Phase 0** ✅ Foundation tokens & CSS architecture
- **Phase 1** ✅ Primitives (Button, Input, Card, Badge, Avatar)
- **Phase 2** ✅ Advanced (DataTable, FormBuilder, Wizard, Notification)
- **Phase 3** 🔄 Page refactoring
- **Phase 4** 📋 Motion & micro-interactions
- **Phase 5** 📋 Accessibility audit
- **Phase 6** 📋 Storybook + visual regression
- **Phase 7** 📋 npm package publishing

## File Structure

```
src/design-system/
├── tokens/           # Design token definitions (JSON + TS)
├── styles/           # Foundation CSS (import this)
├── primitives/       # Core UI components
├── patterns/         # Reusable UI patterns
├── advanced/         # Complex components (DataTable, etc.)
├── hooks/            # React hooks
├── index.ts          # Main exports
├── index.css         # Component utilities
└── README.md         # This file
```

## Version

- **Version**: 1.2.0
- **Last Updated**: 2026-05-16
- **Status**: Phase 0-2 Complete

## Troubleshooting

### CSS Variables Not Working?

1. Ensure foundation.css is imported
2. Check for `@import` order (must be at top)
3. Verify no conflicting variable names

### TypeScript Errors?

1. Ensure `@/` path alias is configured in tsconfig.json
2. Check that all required dependencies are installed
3. Verify React is imported in component files

### Design System Not Taking Effect?

1. Clear browser cache
2. Check CSS specificity
3. Verify z-index layering