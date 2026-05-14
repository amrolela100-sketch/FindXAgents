import { defineConfig } from "vitest/config";
export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@workspace/db/src/schema",
        replacement: "lib/db/src/schema/index.ts",
      },
      { find: "@workspace/db", replacement: "lib/db/src/index.ts" },
      {
        find: /^drizzle-orm\/pg-core$/,
        replacement: "lib/db/node_modules/drizzle-orm/pg-core/index.js",
      },
      {
        find: /^drizzle-orm$/,
        replacement: "lib/db/node_modules/drizzle-orm/index.js",
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "artifacts/api-server/src/routes/**/*.ts",
        "artifacts/api-server/src/middleware/**/*.ts",
        "artifacts/findx/src/lib/api.ts",
      ],
      thresholds: {
        lines: 55,
        branches: 45,
        functions: 50,
        statements: 55,
      },
    },
  },
});
