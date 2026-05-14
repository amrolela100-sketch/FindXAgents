import { z } from "zod";
import { logger } from "./logger.js";

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),
  PORT: z.string().optional().default("3000"),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  OPENROUTER_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  KVK_API_KEY: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  // Access control
  OWNER_EMAIL: z.string().optional().default(""),
  OWNER_PASSWORD: z.string().optional().default(""),
  ADMIN_EMAILS: z.string().optional().default(""),
  // CORS
  FRONTEND_URL: z.string().url().optional(),
  // Infrastructure
  REDIS_URL: z.string().optional(),
  SCRAPY_AUDITOR_URL: z.string().url().optional(),
  SCRAPY_AUDITOR_SECRET: z.string().optional(),
  SKIP_MIGRATIONS: z.string().optional(),
});

// Parse without crashing — callers decide what to do on failure.
// The app entry point (index.ts) calls assertEnv() which exits on error.
// Test files import route modules freely without triggering process.exit.
const parsed = envSchema.safeParse(process.env);

export type Env = z.infer<typeof envSchema>;

/**
 * Validated env object. Always exported — in tests the object may be
 * partially populated (only optional fields have defaults). Route helpers
 * like isAdminEmail() degrade gracefully when values are empty strings.
 *
 * Call assertEnv() at app startup (index.ts) to hard-fail on missing vars.
 */
export const env: Env = parsed.success
  ? parsed.data
  : ({} as Env);

/**
 * assertEnv() — call ONCE at app startup, before any requests are served.
 * Logs the validation errors and exits the process if required vars are missing.
 * Never call this in shared library code or test code.
 */
export function assertEnv(): void {
  if (!parsed.success) {
    logger.error({ errors: parsed.error.errors }, "Invalid environment variables");
    process.exit(1);
  }

  // Startup warnings (only logged when server actually boots)
  if (!env.OPENROUTER_API_KEY) {
    logger.warn("AI features disabled - set OPENROUTER_API_KEY");
  }
  if (!env.TAVILY_API_KEY) {
    logger.warn("Tavily enrichment disabled - set TAVILY_API_KEY");
  }
  if (!env.KVK_API_KEY && !env.GOOGLE_MAPS_API_KEY) {
    logger.warn("Discovery disabled - set KVK_API_KEY or GOOGLE_MAPS_API_KEY");
  }
  if (!env.OWNER_EMAIL || !env.OWNER_PASSWORD) {
    logger.warn("Owner panel disabled - set OWNER_EMAIL and OWNER_PASSWORD");
  }
}

// ── Derived helpers ───────────────────────────────────────────────────────────

/** Parsed, lowercased list of admin emails from ADMIN_EMAILS env var */
export const adminEmails: string[] = (env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/** Lowercased owner email */
export const ownerEmail: string = (env.OWNER_EMAIL ?? "").trim().toLowerCase();

/** Returns true if the given email belongs to an admin */
export function isAdminEmail(email: string): boolean {
  return adminEmails.includes(email.toLowerCase());
}

/** Returns true if the given email is the owner */
export function isOwnerEmail(email: string): boolean {
  return ownerEmail.length > 0 && email.toLowerCase() === ownerEmail;
}
