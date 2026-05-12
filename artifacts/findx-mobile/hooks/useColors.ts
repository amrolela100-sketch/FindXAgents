import { useColorScheme } from "react-native";
import Colors, { type ColorTokens, radius, spacing, typography } from "@/constants/colors";

export interface UseColorsReturn extends ColorTokens {
  radius: typeof radius;
  spacing: typeof spacing;
  typography: typeof typography;
  isDark: boolean;
  scheme: "light" | "dark";
}

/**
 * Returns the full color token set for the current color scheme.
 * Includes radius, spacing, and typography scales.
 */
export function useColors(): UseColorsReturn {
  const scheme = useColorScheme() ?? "light";
  const isDark = scheme === "dark";
  const tokens = isDark ? Colors.dark : Colors.light;

  return {
    ...tokens,
    radius,
    spacing,
    typography,
    isDark,
    scheme,
  };
}

export default useColors;
