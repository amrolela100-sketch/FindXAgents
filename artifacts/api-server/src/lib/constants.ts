/**
 * Shared constants — single source of truth.
 * Import from here instead of duplicating enums across routes/lib.
 */
import { z } from "zod";

// ── Supported languages ───────────────────────────────────────────────────────
export const SUPPORTED_LANGUAGES = ["ar", "en", "nl", "fr", "es", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];
export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const languageSchema = z
  .enum(SUPPORTED_LANGUAGES)
  .default(DEFAULT_LANGUAGE);

// ── Agent pipeline phases ─────────────────────────────────────────────────────
// Must match the phase strings passed to logToDB() inside agent-runner.ts
export const AGENT_PHASES = [
  "discover-web",
  "qualify-ai",
  "generate-outreach",
  "stage-pipeline",
] as const;
export type AgentPhase = (typeof AGENT_PHASES)[number];
export const ALLOWED_PHASES = new Set<string>(AGENT_PHASES);

// ── Log levels ────────────────────────────────────────────────────────────────
export const LOG_LEVELS = ["info", "warn", "error", "debug", "success"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];
export const ALLOWED_LEVELS = new Set<string>(LOG_LEVELS);
