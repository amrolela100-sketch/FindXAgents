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
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error({ errors: parsed.error.errors }, "Invalid environment variables");
  process.exit(1);
}

export const env = parsed.data;

if (!env.OPENROUTER_API_KEY) {
  logger.warn("AI features disabled - set OPENROUTER_API_KEY");
}
if (!env.TAVILY_API_KEY) {
  logger.warn("Tavily enrichment disabled - set TAVILY_API_KEY");
}
if (!env.KVK_API_KEY && !env.GOOGLE_MAPS_API_KEY) {
  logger.warn("Discovery disabled - set KVK_API_KEY or GOOGLE_MAPS_API_KEY");
}
