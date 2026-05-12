/**
 * FindX Liquid Glass Design System — Color Tokens
 * Matches the web app exactly. Dark mode supported.
 */

export type ColorScheme = "light" | "dark";

export interface ColorTokens {
  // Core backgrounds
  background: string;
  backgroundSecondary: string;

  // Foreground / text
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;

  // Brand
  brand: string;
  brandDark: string;
  brandGradientStart: string;
  brandGradientEnd: string;

  // Glass layers
  glassBackground: string;
  glassBorder: string;
  glassBackgroundStrong: string;
  glassBorderStrong: string;

  // Cards (non-blur fallback)
  card: string;
  cardBorder: string;

  // Input / form
  inputBackground: string;
  inputBorder: string;
  inputFocusBorder: string;

  // Semantic
  success: string;
  warning: string;
  danger: string;
  info: string;

  // Status colors (glass-aware, matches web status-badge.tsx)
  statusDiscoveredText: string;
  statusDiscoveredBg: string;
  statusAnalyzingText: string;
  statusAnalyzingBg: string;
  statusAnalyzedText: string;
  statusAnalyzedBg: string;
  statusContactingText: string;
  statusContactingBg: string;
  statusRespondedText: string;
  statusRespondedBg: string;
  statusQualifiedText: string;
  statusQualifiedBg: string;
  statusWonText: string;
  statusWonBg: string;
  statusLostText: string;
  statusLostBg: string;

  // Run status
  runRunningText: string;
  runRunningBg: string;
  runCompletedText: string;
  runCompletedBg: string;
  runPartialText: string;
  runPartialBg: string;
  runFailedText: string;
  runFailedBg: string;
  runQueuedText: string;
  runQueuedBg: string;

  // Tab bar
  tabBarBackground: string;
  tabBarBorder: string;
  tabActive: string;
  tabInactive: string;

  // Misc
  divider: string;
  overlay: string;
  shadow: string;
  scrim: string;
}

const light: ColorTokens = {
  // Core backgrounds
  background: "#F0EFF8",
  backgroundSecondary: "#E8E6F4",

  // Foreground / text
  foreground: "#1A1825",
  foregroundMuted: "#6B6580",
  foregroundSubtle: "#A09CB8",

  // Brand
  brand: "#F59E0B",
  brandDark: "#D97706",
  brandGradientStart: "#F59E0B",
  brandGradientEnd: "#F97316",

  // Glass layers
  glassBackground: "rgba(255,255,255,0.65)",
  glassBorder: "rgba(255,255,255,0.75)",
  glassBackgroundStrong: "rgba(255,255,255,0.82)",
  glassBorderStrong: "rgba(255,255,255,0.90)",

  // Cards
  card: "rgba(255,255,255,0.72)",
  cardBorder: "rgba(255,255,255,0.80)",

  // Input
  inputBackground: "rgba(255,255,255,0.55)",
  inputBorder: "rgba(255,255,255,0.70)",
  inputFocusBorder: "#F59E0B",

  // Semantic
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",

  // Status
  statusDiscoveredText: "#6B6580",
  statusDiscoveredBg: "rgba(148,163,184,0.12)",
  statusAnalyzingText: "#F59E0B",
  statusAnalyzingBg: "rgba(245,158,11,0.12)",
  statusAnalyzedText: "#818CF8",
  statusAnalyzedBg: "rgba(99,102,241,0.12)",
  statusContactingText: "#60A5FA",
  statusContactingBg: "rgba(59,130,246,0.12)",
  statusRespondedText: "#FB923C",
  statusRespondedBg: "rgba(249,115,22,0.12)",
  statusQualifiedText: "#C084FC",
  statusQualifiedBg: "rgba(168,85,247,0.12)",
  statusWonText: "#34D399",
  statusWonBg: "rgba(16,185,129,0.12)",
  statusLostText: "#F87171",
  statusLostBg: "rgba(239,68,68,0.12)",

  // Run status
  runRunningText: "#60A5FA",
  runRunningBg: "rgba(59,130,246,0.12)",
  runCompletedText: "#34D399",
  runCompletedBg: "rgba(16,185,129,0.12)",
  runPartialText: "#FB923C",
  runPartialBg: "rgba(249,115,22,0.12)",
  runFailedText: "#F87171",
  runFailedBg: "rgba(239,68,68,0.12)",
  runQueuedText: "#A09CB8",
  runQueuedBg: "rgba(148,163,184,0.12)",

  // Tab bar
  tabBarBackground: "rgba(255,255,255,0.72)",
  tabBarBorder: "rgba(255,255,255,0.75)",
  tabActive: "#F59E0B",
  tabInactive: "#A09CB8",

  // Misc
  divider: "rgba(26,24,37,0.08)",
  overlay: "rgba(26,24,37,0.45)",
  shadow: "rgba(26,24,37,0.12)",
  scrim: "rgba(240,239,248,0.85)",
};

const dark: ColorTokens = {
  // Core backgrounds
  background: "#080810",
  backgroundSecondary: "#0F0E1A",

  // Foreground / text
  foreground: "#EEECFA",
  foregroundMuted: "#8B87A8",
  foregroundSubtle: "#4D4A65",

  // Brand
  brand: "#FBBF24",
  brandDark: "#F59E0B",
  brandGradientStart: "#F59E0B",
  brandGradientEnd: "#F97316",

  // Glass layers
  glassBackground: "rgba(255,255,255,0.04)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassBackgroundStrong: "rgba(255,255,255,0.07)",
  glassBorderStrong: "rgba(255,255,255,0.12)",

  // Cards
  card: "rgba(255,255,255,0.05)",
  cardBorder: "rgba(255,255,255,0.09)",

  // Input
  inputBackground: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.10)",
  inputFocusBorder: "#FBBF24",

  // Semantic
  success: "#10B981",
  warning: "#FBBF24",
  danger: "#EF4444",
  info: "#3B82F6",

  // Status
  statusDiscoveredText: "#8B87A8",
  statusDiscoveredBg: "rgba(148,163,184,0.12)",
  statusAnalyzingText: "#FBBF24",
  statusAnalyzingBg: "rgba(245,158,11,0.12)",
  statusAnalyzedText: "#818CF8",
  statusAnalyzedBg: "rgba(99,102,241,0.12)",
  statusContactingText: "#60A5FA",
  statusContactingBg: "rgba(59,130,246,0.12)",
  statusRespondedText: "#FB923C",
  statusRespondedBg: "rgba(249,115,22,0.12)",
  statusQualifiedText: "#C084FC",
  statusQualifiedBg: "rgba(168,85,247,0.12)",
  statusWonText: "#34D399",
  statusWonBg: "rgba(16,185,129,0.12)",
  statusLostText: "#F87171",
  statusLostBg: "rgba(239,68,68,0.12)",

  // Run status
  runRunningText: "#60A5FA",
  runRunningBg: "rgba(59,130,246,0.12)",
  runCompletedText: "#34D399",
  runCompletedBg: "rgba(16,185,129,0.12)",
  runPartialText: "#FB923C",
  runPartialBg: "rgba(249,115,22,0.12)",
  runFailedText: "#F87171",
  runFailedBg: "rgba(239,68,68,0.12)",
  runQueuedText: "#4D4A65",
  runQueuedBg: "rgba(148,163,184,0.08)",

  // Tab bar
  tabBarBackground: "rgba(8,8,16,0.80)",
  tabBarBorder: "rgba(255,255,255,0.08)",
  tabActive: "#FBBF24",
  tabInactive: "#4D4A65",

  // Misc
  divider: "rgba(255,255,255,0.07)",
  overlay: "rgba(0,0,0,0.65)",
  shadow: "rgba(0,0,0,0.40)",
  scrim: "rgba(8,8,16,0.90)",
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  displayLg: { fontSize: 32, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  displayMd: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  displaySm: { fontSize: 22, fontFamily: "Inter_600SemiBold", letterSpacing: -0.2 },
  headingLg: { fontSize: 20, fontFamily: "Inter_600SemiBold", letterSpacing: -0.1 },
  headingMd: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  headingSm: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  bodyLg: { fontSize: 16, fontFamily: "Inter_400Regular" },
  bodyMd: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bodySm: { fontSize: 13, fontFamily: "Inter_400Regular" },
  labelLg: { fontSize: 14, fontFamily: "Inter_500Medium" },
  labelMd: { fontSize: 12, fontFamily: "Inter_500Medium" },
  labelSm: { fontSize: 11, fontFamily: "Inter_500Medium" },
  monoMd: { fontSize: 13, fontFamily: "Inter_400Regular" },
};

const Colors = { light, dark, radius, spacing, typography };

export default Colors;
