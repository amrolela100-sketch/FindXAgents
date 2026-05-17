/**
 * FindX Design System — Token Index
 * 
 * This file exports all design tokens and generates the CSS variables
 * that power the entire design system.
 * 
 * Token Architecture:
 * ┌─────────────────────────────────────────────────┐
 * │ Layer 1: Primitive tokens (raw values)          │
 * │   e.g., --findx-color-brand-500: #F59E0B        │
 * │                                                  │
 * │ Layer 2: Semantic tokens (purpose-based)        │
 * │   e.g., --findx-accent: var(--findx-color-brand-500)  │
 * │   e.g., --findx-text-primary: var(--findx-color-neutral-900) │
 * │                                                  │
 * │ Layer 3: Component tokens (scoped)              │
 * │   e.g., --findx-button-height: var(--findx-space-9)│
 * └─────────────────────────────────────────────────┘
 */

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 1: PRIMITIVE TOKENS (Raw values - never use these directly in components)
// ═══════════════════════════════════════════════════════════════════════════════

export const primitiveColors = {
  // Brand (Indigo — Precision Dark accent)
  brand50:  '#EEF2FF',
  brand100: '#E0E7FF',
  brand200: '#C7D2FE',
  brand300: '#A5B4FC',
  brand400: '#818CF8',
  brand500: '#6366F1', // Primary — Indigo
  brand600: '#4F46E5', // Primary Hover
  brand700: '#4338CA',
  brand800: '#3730A3',
  brand900: '#312E81',
  brand950: '#1E1B4B',

  // Neutral (Zinc — cooler, matches Precision Dark)
  neutral50:  '#FAFAFA',
  neutral100: '#F4F4F5',
  neutral200: '#E4E4E7',
  neutral300: '#D4D4D8',
  neutral400: '#A1A1AA',
  neutral500: '#71717A',
  neutral600: '#52525B',
  neutral700: '#3F3F46',
  neutral800: '#27272A',
  neutral900: '#18181B',
  neutral950: '#09090B',

  // Semantic
  success50:  '#ECFDF5',
  success500: '#10B981',
  success600: '#059669',
  success700: '#047857',

  warning50:  '#FFFBEB',
  warning500: '#F59E0B',
  warning600: '#D97706',
  warning700: '#B45309',

  danger50:  '#FEF2F2',
  danger500: '#EF4444',
  danger600: '#DC2626',
  danger700: '#B91C1C',

  info50:  '#EFF6FF',
  info500: '#3B82F6',
  info600: '#2563EB',
  info700: '#1D4ED8',

  // Accent (Purple for mesh effects)
  purple50:  '#FAF5FF',
  purple200: '#E9D5FF',
  purple500: '#A855F7',
  purple600: '#9333EA',

  // Pink
  pink50:  '#FDF2F8',
  pink200: '#FBCFE8',
  pink500: '#EC4899',
  pink600: '#DB2777',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 2: SEMANTIC TOKENS (Use these in components)
// ═══════════════════════════════════════════════════════════════════════════════

export const semanticTokens = {
  // Brand / Accent
  accent: {
    DEFAULT:  'var(--findx-accent)',          // #6366F1 — Indigo
    hover:    'var(--findx-accent-hover)',     // #4F46E5
    subtle:   'var(--findx-accent-subtle)',    // rgba(99,102,241,0.12)
    muted:    'var(--findx-accent-muted)',     // rgba(99,102,241,0.20)
    foreground: 'var(--findx-accent-foreground)', // #FFFFFF
    glow:     'var(--findx-accent-glow)',      // rgba(99,102,241,0.20)
  },

  // Text
  text: {
    primary:   'var(--findx-color-neutral-900)',
    secondary: 'var(--findx-color-neutral-600)',
    muted:     'var(--findx-color-neutral-400)',
    subtle:    'var(--findx-color-neutral-300)',
    inverted:  '#FFFFFF',
  },

  // Backgrounds
  bg: {
    primary:   'var(--findx-color-neutral-50)',
    secondary: 'var(--findx-color-neutral-100)',
    inset:     'var(--findx-color-neutral-200)',
    canvas:    'var(--findx-bg-base)',
  },

  // Surfaces (Glass)
  surface: {
    DEFAULT:  'var(--findx-surface-glass)',
    raised:   'var(--findx-surface-glass-raised)',
    overlay:  'var(--findx-surface-glass-overlay)',
    border:   'var(--findx-surface-border)',
    borderStrong: 'var(--findx-surface-border-strong)',
  },

  // Borders
  border: {
    DEFAULT: 'var(--findx-color-neutral-200)',
    strong:  'var(--findx-color-neutral-300)',
    focus:   'var(--findx-color-brand-500)',
  },

  // Feedback
  feedback: {
    success:     'var(--findx-color-success-500)',
    successBg:   'rgba(16, 185, 129, 0.12)',
    successBorder: 'rgba(16, 185, 129, 0.25)',
    warning:     'var(--findx-color-warning-500)',
    warningBg:   'rgba(245, 158, 11, 0.12)',
    warningBorder: 'rgba(245, 158, 11, 0.25)',
    danger:      'var(--findx-color-danger-500)',
    dangerBg:    'rgba(239, 68, 68, 0.12)',
    dangerBorder: 'rgba(239, 68, 68, 0.25)',
    info:        'var(--findx-color-info-500)',
    infoBg:      'rgba(59, 130, 246, 0.12)',
    infoBorder:  'rgba(59, 130, 246, 0.25)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LAYER 3: COMPONENT TOKENS (Scoped to specific components)
// ═══════════════════════════════════════════════════════════════════════════════

export const componentTokens = {
  button: {
    paddingX: 'var(--findx-space-4)',
    paddingY: 'var(--findx-space-2)',
    fontSize: 'var(--findx-text-sm)',
    fontWeight: '500',
    borderRadius: 'var(--findx-radius-md)',
    height: {
      sm: 'var(--findx-space-8)',
      md: 'var(--findx-space-9)',
      lg: 'var(--findx-space-10)',
      icon: 'var(--findx-space-9)',
    },
  },
  input: {
    height: 'var(--findx-space-9)',
    paddingX: 'var(--findx-space-3)',
    fontSize: 'var(--findx-text-sm)',
    borderRadius: 'var(--findx-radius-md)',
  },
  card: {
    padding: 'var(--findx-space-4)',
    borderRadius: 'var(--findx-radius-lg)',
    gap: 'var(--findx-space-4)',
  },
  badge: {
    paddingX: 'var(--findx-space-2)',
    paddingY: 'var(--findx-space-0.5)',
    fontSize: 'var(--findx-text-xs)',
    fontWeight: '500',
    borderRadius: 'var(--findx-radius-full)',
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type PrimitiveColorKey = keyof typeof primitiveColors;
export type SemanticTokenPath = 
  | `accent.${keyof typeof semanticTokens.accent}`
  | `text.${keyof typeof semanticTokens.text}`
  | `bg.${keyof typeof semanticTokens.bg}`
  | `surface.${keyof typeof semanticTokens.surface}`
  | `border.${keyof typeof semanticTokens.border}`
  | `feedback.${keyof typeof semanticTokens.feedback}`;

// ═══════════════════════════════════════════════════════════════════════════════
// CSS GENERATION UTILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate CSS custom properties from tokens
 * Used by the design-system CSS generator
 */
export function generateCSSVariables(): string {
  let css = '/* ===== FINDX DESIGN SYSTEM TOKENS ===== */\n\n';

  // Color primitives
  css += '/* Primitive Colors */\n';
  css += ':root {\n';
  
  Object.entries(primitiveColors).forEach(([name, value]) => {
    const tokenName = name.replace(/([A-Z])/g, '-$1').toLowerCase();
    css += `  --findx-color-${tokenName}: ${value};\n`;
  });

  css += '\n  /* Typography */\n';
  css += `  --findx-font-display: 'Outfit', system-ui, -apple-system, sans-serif;\n`;
  css += `  --findx-font-body: 'Noto Sans Arabic', 'Outfit', system-ui, sans-serif;\n`;
  css += `  --findx-font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;\n`;

  css += '\n  /* Spacing */\n';
  const spacing = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96];
  spacing.forEach(v => {
    css += `  --findx-space-${v}: ${v * 0.25}rem;\n`;
  });

  css += '\n  /* Border Radius */\n';
  const radii = { sm: '0.25rem', DEFAULT: '0.375rem', md: '0.5rem', lg: '0.75rem', xl: '1rem', '2xl': '1.5rem', full: '9999px' };
  Object.entries(radii).forEach(([name, value]) => {
    css += `  --findx-radius-${name}: ${value};\n`;
  });

  css += '\n  /* Shadows */\n';
  css += `  --findx-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);\n`;
  css += `  --findx-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);\n`;
  css += `  --findx-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);\n`;
  css += `  --findx-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);\n`;
  css += `  --findx-shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);\n`;
  css += `  --findx-shadow-glow-brand: 0 0 20px rgba(245, 158, 11, 0.35);\n`;

  css += '\n  /* Motion */\n';
  css += `  --findx-motion-fast: 150ms;\n`;
  css += `  --findx-motion-normal: 200ms;\n`;
  css += `  --findx-motion-slow: 300ms;\n`;
  css += `  --findx-ease-out: cubic-bezier(0.16, 1, 0.3, 1);\n`;
  css += `  --findx-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);\n`;

  css += '}\n';
  
  return css;
}