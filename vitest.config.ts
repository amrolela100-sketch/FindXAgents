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
    // setupFiles runs before any test module is imported — required so that
    // env.ts (imported transitively by route files) sees DATABASE_URL etc.
    // before the Zod schema validation fires.
    setupFiles: ["./tests/setup.ts"],
  },
});
