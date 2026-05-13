import { z } from "zod";

const envSchema = z.object({
  // Accept either a full URL (local dev) or a relative path "/api" (production proxy via Vercel)
  VITE_API_URL:          z.string().optional().default("/api"),
  VITE_ADMIN_EMAILS:     z.string().optional(),
  // Supabase — optional here so the app can render a friendly error banner
  // instead of crashing at import time (see supabase.ts for lazy init)
  VITE_SUPABASE_URL:     z.string().url().optional(),
  VITE_SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

let isEnvValid = true;
let envErrors: string[] = [];

if (!parsed.success) {
  isEnvValid = false;
  envErrors = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  console.warn("Invalid environment variables:", envErrors);
}

// Warn (not throw) when Supabase vars are missing — the app handles this gracefully
if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  isEnvValid = false;
  const missing: string[] = [];
  if (!import.meta.env.VITE_SUPABASE_URL)      missing.push("VITE_SUPABASE_URL");
  if (!import.meta.env.VITE_SUPABASE_ANON_KEY) missing.push("VITE_SUPABASE_ANON_KEY");
  envErrors = [...envErrors, ...missing.map((v) => `${v}: Required`)];
  console.warn("Missing Supabase env vars:", missing);
}

export const env = parsed.data || { VITE_API_URL: "/api", VITE_ADMIN_EMAILS: "" };
export { isEnvValid, envErrors };
