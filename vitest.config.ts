import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@workspace/db/src/schema", replacement: path.resolve(__dirname, "lib/db/src/schema/index.ts") },
      { find: "@workspace/db", replacement: path.resolve(__dirname, "lib/db/src/index.ts") },
      { find: "drizzle-orm/pg-core", replacement: path.resolve(__dirname, "lib/db/node_modules/drizzle-orm/pg-core") },
      { find: "drizzle-orm", replacement: path.resolve(__dirname, "lib/db/node_modules/drizzle-orm") },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    env: {
      // Minimum env vars required by env.ts Zod schema at test time.
      // Routes now import env.ts at module load — these prevent process.exit(1).
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      SUPABASE_URL: "https://placeholder.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      OPENROUTER_API_KEY: "test-key",
    },
  },
});
