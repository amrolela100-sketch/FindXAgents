#!/usr/bin/env node
/**
 * findx-mobile build script
 *
 * Expo Mobile apps don't produce a static web bundle the same way Vite does.
 * For CI purposes this script exports the Expo web build if EXPO_PUBLIC_* env
 * vars are available, or exits successfully when they are not (e.g. in CI
 * without Expo credentials).
 *
 * To build the native iOS/Android binaries use EAS Build:
 *   pnpm exec eas build --platform all
 */

const { execSync } = require("child_process");

const hasSupabase =
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!hasSupabase) {
  console.log(
    "[findx-mobile] Skipping Expo web export — EXPO_PUBLIC_SUPABASE_URL / " +
      "EXPO_PUBLIC_SUPABASE_ANON_KEY not set. " +
      "This is expected in CI build:core runs.",
  );
  process.exit(0);
}

console.log("[findx-mobile] Running Expo web export...");
try {
  execSync("pnpm exec expo export --platform web", { stdio: "inherit" });
} catch (err) {
  console.error("[findx-mobile] Expo web export failed:", err.message);
  process.exit(1);
}
