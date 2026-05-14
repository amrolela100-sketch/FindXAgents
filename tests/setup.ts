/**
 * Global test setup — runs before any test file is imported.
 * Sets the minimum env vars required by env.ts Zod schema so that
 * route files (which import env.ts at module load time) don't call
 * process.exit(1) during tests.
 *
 * These are fake/placeholder values — the actual DB and Supabase
 * connections are fully mocked via vi.mock() in each test file.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://test:test@localhost:5432/test";
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? "https://placeholder.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "test-service-role-key";
process.env.OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY ?? "test-key";
