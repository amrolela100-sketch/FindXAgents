/**
 * FindX Motion System — Centralized Animation Presets
 *
 * Single source of truth for ALL animation variants, spring configs,
 * and micro-interaction presets used across the app.
 *
 * Every page previously defined its own SPRING + FADE_UP variants.
 * Now they all import from here — consistent motion language app-wide.
 *
 * @module lib/motion
 * @version 1.0.0
 */

import { type Variants, type Transition } from "framer-motion";

// ═══════════════════════════════════════════════════════════════════════════════
// SPRING PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default spring — smooth, natural feel for most UI elements */
export const SPRING: Transition = { type: "spring", stiffness: 120, damping: 22 };

/** Gentle spring — slower, softer for modals and overlays */
export const SPRING_GENTLE: Transition = { type: "spring", stiffness: 80, damping: 20 };

/** Snappy spring — quick response for buttons and interactive elements */
export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 400, damping: 25 };

/** Bouncy spring — playful for success states and celebrations */
export const SPRING_BOUNCY: Transition = { type: "spring", stiffness: 300, damping: 15 };

// ═══════════════════════════════════════════════════════════════════════════════
// DURATION PRESETS (for non-spring animations)
// ═══════════════════════════════════════════════════════════════════════════════

export const DURATION = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.4,
  slowest: 0.5,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// EASING CURVES
// ═══════════════════════════════════════════════════════════════════════════════

export const EASE = {
  /** Smooth ease-out for most content animations */
  out: [0.22, 1, 0.36, 1] as const,
  /** Ease-out cubic for scrolling reveals */
  outCubic: [0.16, 1, 0.3, 1] as const,
  /** Standard ease for subtle transitions */
  standard: [0.4, 0, 0.2, 1] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
// VARIANT PRESETS — Reusable Framer Motion Variants
// ═══════════════════════════════════════════════════════════════════════════════

/** Fade up from below — the primary content entrance animation */
export const FADE_UP: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...SPRING, delay: i * 0.06 },
  }),
};

/** Fade up with stagger delay — for lists and grids */
export const FADE_UP_STAGGER: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.05, ease: EASE.out },
  }),
};

/** Fade in only — for overlays and modals */
export const FADE_IN: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.normal } },
  exit: { opacity: 0, transition: { duration: DURATION.fast } },
};

/** Scale in from center — for modals, command palette, popups */
export const SCALE_IN: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.normal, ease: EASE.outCubic },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: DURATION.fast },
  },
};

/** Slide in from right — for detail panels */
export const SLIDE_RIGHT: Variants = {
  hidden: { opacity: 0, x: 40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.slow, ease: EASE.outCubic },
  },
  exit: {
    opacity: 0,
    x: 40,
    transition: { duration: DURATION.normal },
  },
};

/** Slide in from left — for RTL variant */
export const SLIDE_LEFT: Variants = {
  hidden: { opacity: 0, x: -40 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: DURATION.slow, ease: EASE.outCubic },
  },
  exit: {
    opacity: 0,
    x: -40,
    transition: { duration: DURATION.normal },
  },
};

/** Slide up from bottom — for bottom sheets and drawers */
export const SLIDE_UP: Variants = {
  hidden: { opacity: 0, y: "100%" },
  visible: {
    opacity: 1,
    y: 0,
    transition: { ...SPRING_GENTLE },
  },
  exit: {
    opacity: 0,
    y: "100%",
    transition: { duration: DURATION.normal, ease: EASE.standard },
  },
};

/** Height collapse — for expandable sections */
export const COLLAPSE: Variants = {
  hidden: { height: 0, opacity: 0 },
  visible: {
    height: "auto",
    opacity: 1,
    transition: { duration: DURATION.normal, ease: EASE.outCubic },
  },
  exit: {
    height: 0,
    opacity: 0,
    transition: { duration: DURATION.fast },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MICRO-INTERACTION PRESETS (for whileHover, whileTap, etc.)
// ═══════════════════════════════════════════════════════════════════════════════

/** Subtle lift on hover — for cards */
export const HOVER_LIFT = {
  y: -2,
  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
  transition: { duration: DURATION.fast },
};

/** Scale up slightly on hover — for buttons */
export const HOVER_SCALE = { scale: 1.02, transition: { duration: DURATION.fast } };

/** Scale down on tap — for buttons */
export const TAP_SCALE = { scale: 0.97 };

/** Icon wiggle — for active tab icons */
export const ICON_WIGGLE = {
  rotate: [0, -8, 8, 0],
  transition: { duration: 0.35 },
};

/** Tab hover effect */
export const TAB_HOVER = { scale: 1.04, y: -1 };

/** Tab tap effect */
export const TAB_TAP = { scale: 0.96 };

/** Card hover with subtle glow */
export const CARD_HOVER_GLOW = (color: string) => ({
  y: -1,
  boxShadow: `0 0 20px ${color}20, 0 4px 16px rgba(0,0,0,0.08)`,
  transition: { duration: DURATION.fast },
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONTAINER VARIANTS (for stagger orchestration)
// ═══════════════════════════════════════════════════════════════════════════════

/** Stagger container — children animate one after another */
export const STAGGER_CONTAINER: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

/** Stagger child item */
export const STAGGER_CHILD: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: EASE.outCubic },
  },
};

/** Stagger child with scale */
export const STAGGER_CHILD_SCALE: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: EASE.outCubic },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER — Create stagger delay for lists
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns a delay value for staggered animations.
 * @param index - Item index in the list
 * @param baseDelay - Delay per item in seconds (default: 0.06)
 */
export function staggerDelay(index: number, baseDelay = 0.06): number {
  return index * baseDelay;
}
