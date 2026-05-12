import { z } from "zod";

const envSchema = z.object({
  // Accept either a full URL (local dev) or a relative path "/api" (production proxy via Vercel)
  VITE_API_URL: z.string().optional().default("/api"),
  VITE_ADMIN_EMAILS: z.string().optional(),
});

const parsed = envSchema.safeParse(import.meta.env);

let isEnvValid = true;
let envErrors: string[] = [];

if (!parsed.success) {
  isEnvValid = false;
  envErrors = parsed.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  console.warn("Invalid environment variables:", envErrors);
}

export const env = parsed.data || { VITE_API_URL: "/api", VITE_ADMIN_EMAILS: "" };
export { isEnvValid, envErrors };
