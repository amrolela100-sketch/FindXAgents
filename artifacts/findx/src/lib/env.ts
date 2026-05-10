import { z } from "zod";

const envSchema = z.object({
  VITE_API_URL: z.string().url("VITE_API_URL must be a valid URL").optional().default("http://localhost:5000/api"),
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

export const env = parsed.data || { VITE_API_URL: "http://localhost:5000/api", VITE_ADMIN_EMAILS: "" };
export { isEnvValid, envErrors };
