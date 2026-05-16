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

// ── AI Model constants — MED-2 fix: single source of truth ───────────────────
/** OpenRouter model identifier for Gemini 2.5 Flash (used by agent pipeline) */
export const OPENROUTER_GEMINI_FLASH      = "google/gemini-2.5-flash";
/** OpenRouter model identifier for Gemini 2.0 Flash (chat/fast responses) */
export const OPENROUTER_GEMINI_2_FLASH    = "google/gemini-2.0-flash-001";
/** Native Gemini API model for ai-engine direct calls */
export const GEMINI_FLASH_MODEL           = "google/gemini-2.5-flash";
/** Native Gemini API fallback model */
export const GEMINI_LEGACY_MODEL          = "gemini-1.5-flash";
/** Default AI model for chat */
export const DEFAULT_CHAT_GEMINI_MODEL    = "gemini-2.0-flash";
