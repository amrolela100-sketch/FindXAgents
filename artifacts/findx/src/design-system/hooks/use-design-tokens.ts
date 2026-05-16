/**
 * FindX Design System — useDesignTokens Hook
 * 
 * A React hook that provides access to design tokens with theme awareness.
 * Supports real-time theme switching and RTL direction detection.
 */

import { useEffect, useState } from 'react';

export interface DesignTokens {
  color: {
    accent: string;
    accentHover: string;
    accentSubtle: string;
    accentForeground: string;
    accentGlow: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
    textSubtle: string;
    textInverted: string;
    bgBase: string;
    bgSubtle: string;
    bgInset: string;
    bgElevated: string;
    surface: string;
    surfaceRaised: string;
    surfaceOverlay: string;
    surfaceBorder: string;
    surfaceBorderStrong: string;
    success: string;
    successBg: string;
    successBorder: string;
    warning: string;
    warningBg: string;
    warningBorder: string;
    danger: string;
    dangerBg: string;
    dangerBorder: string;
    info: string;
    infoBg: string;
    infoBorder: string;
    brand500: string;
    brand600: string;
    neutral50: string;
    neutral900: string;
  };
  font: { display: string; body: string; mono: string; arabic: string };
  spacing: Record<string, string>;
  radius: Record<string, string>;
  shadow: { xs: string; sm: string; md: string; lg: string; xl: string; '2xl': string; inner: string; glowBrand: string; glowSuccess: string; glowDanger: string };
  motion: { durations: { instant: string; fast: string; quick: string; normal: string; slow: string; slower: string; slowest: string }; easings: { linear: string; ease: string; easeIn: string; easeOut: string; easeInOut: string; spring: string } };
  zIndex: { base: string; overlay: string; modal: string; popover: string; toast: string; command: string };
  isDark: boolean;
  isRtl: boolean;
  mode: 'light' | 'dark';
}

export function useDesignTokens(): DesignTokens {
  const [isDark, setIsDark] = useState(false);
  const [isRtl, setIsRtl] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    setIsRtl(document.documentElement.dir === 'rtl');
    
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
      setIsRtl(document.documentElement.dir === 'rtl');
    });
    
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'dir'] });
    return () => observer.disconnect();
  }, []);

  const spacing: Record<string, string> = {};
  [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32].forEach(v => {
    spacing[String(v)] = `var(--findx-space-${v})`;
  });

  const radius: Record<string, string> = {};
  ['sm', 'xs', 'md', 'lg', 'xl', '2xl', '3xl', 'full'].forEach(r => {
    radius[r] = `var(--findx-radius-${r})`;
  });

  return {
    color: {
      accent: 'var(--findx-accent)',
      accentHover: 'var(--findx-accent-hover)',
      accentSubtle: 'var(--findx-accent-subtle)',
      accentForeground: 'var(--findx-accent-foreground)',
      accentGlow: 'var(--findx-accent-glow)',
      textPrimary: 'var(--findx-text-primary)',
      textSecondary: 'var(--findx-text-secondary)',
      textMuted: 'var(--findx-text-muted)',
      textSubtle: 'var(--findx-text-subtle)',
      textInverted: 'var(--findx-text-inverted)',
      bgBase: 'var(--findx-bg-base)',
      bgSubtle: 'var(--findx-bg-subtle)',
      bgInset: 'var(--findx-bg-inset)',
      bgElevated: 'var(--findx-bg-elevated)',
      surface: 'var(--findx-surface-glass)',
      surfaceRaised: 'var(--findx-surface-glass-raised)',
      surfaceOverlay: 'var(--findx-surface-glass-overlay)',
      surfaceBorder: 'var(--findx-surface-border)',
      surfaceBorderStrong: 'var(--findx-surface-border-strong)',
      success: 'var(--findx-feedback-success)',
      successBg: 'var(--findx-feedback-success-bg)',
      successBorder: 'var(--findx-feedback-success-border)',
      warning: 'var(--findx-feedback-warning)',
      warningBg: 'var(--findx-feedback-warning-bg)',
      warningBorder: 'var(--findx-feedback-warning-border)',
      danger: 'var(--findx-feedback-danger)',
      dangerBg: 'var(--findx-feedback-danger-bg)',
      dangerBorder: 'var(--findx-feedback-danger-border)',
      info: 'var(--findx-feedback-info)',
      infoBg: 'var(--findx-feedback-info-bg)',
      infoBorder: 'var(--findx-feedback-info-border)',
      brand500: '#F59E0B',
      brand600: '#D97706',
      neutral50: '#FAFAFA',
      neutral900: '#171717',
    },
    font: {
      display: 'var(--findx-font-display)',
      body: 'var(--findx-font-body)',
      mono: 'var(--findx-font-mono)',
      arabic: 'var(--findx-font-arabic)',
    },
    spacing,
    radius,
    shadow: {
      xs: 'var(--findx-shadow-xs)',
      sm: 'var(--findx-shadow-sm)',
      md: 'var(--findx-shadow-md)',
      lg: 'var(--findx-shadow-lg)',
      xl: 'var(--findx-shadow-xl)',
      '2xl': 'var(--findx-shadow-2xl)',
      inner: 'var(--findx-shadow-inner)',
      glowBrand: 'var(--findx-shadow-glow-brand)',
      glowSuccess: 'var(--findx-shadow-glow-success)',
      glowDanger: 'var(--findx-shadow-glow-danger)',
    },
    motion: {
      durations: { instant: '0ms', fast: '100ms', quick: '150ms', normal: '200ms', slow: '300ms', slower: '400ms', slowest: '500ms' },
      easings: { linear: 'linear', ease: 'cubic-bezier(0.4, 0, 0.2, 1)', easeIn: 'cubic-bezier(0.4, 0, 1, 1)', easeOut: 'cubic-bezier(0, 0, 0.2, 1)', easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
    },
    zIndex: { base: 'var(--findx-z-base)', overlay: 'var(--findx-z-overlay)', modal: 'var(--findx-z-modal)', popover: 'var(--findx-z-popover)', toast: 'var(--findx-z-toast)', command: 'var(--findx-z-command)' },
    isDark,
    isRtl,
    mode: isDark ? 'dark' : 'light',
  };
}

export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

const breakpointValues: Record<Breakpoint, number> = { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

export function useBreakpoint(): Breakpoint {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (Object.entries(breakpointValues).reverse().find(([, minWidth]) => width >= minWidth)?.[0] ?? 'xs') as Breakpoint;
}