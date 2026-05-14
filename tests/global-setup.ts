/**
 * Vitest globalSetup — runs in the main process BEFORE any worker threads
 * are forked. Environment variables set here are inherited by all workers,
 * so env.ts sees them before its Zod validation fires at module load time.
 *
 * setupFiles runs inside each worker after module resolution has started,
 * which is too late to prevent process.exit(1) in env.ts.
 */
export function setup() {
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";
  process.env.SUPABASE_URL ??= "https://placeholder.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role-key";
  process.env.OPENROUTER_API_KEY ??= "test-key";
}
