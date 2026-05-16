import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@workspace/db/src/schema",
        replacement: path.resolve(__dirname, "lib/db/src/schema/index.ts"),
      },
      {
        find: "@workspace/db",
        replacement: path.resolve(__dirname, "lib/db/src/index.ts"),
      },
      {
        find: /^drizzle-orm\/pg-core$/,
        replacement: path.resolve(__dirname, "lib/db/node_modules/drizzle-orm/pg-core"),
      },
      {
        find: /^drizzle-orm$/,
        replacement: path.resolve(__dirname, "lib/db/node_modules/drizzle-orm"),
      },
    ],
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    clearMocks: true,
    environmentMatchGlobs: [["tests/frontend-api-client.test.ts", "jsdom"]],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "artifacts/api-server/src/routes/**/*.ts",
        "artifacts/api-server/src/middleware/**/*.ts",
        "artifacts/findx/src/lib/api.ts",
      ],
      // TEST-4: raised from 55/45/50/55 → 70/60/65/70
      thresholds: {
        lines:      70,
        branches:   60,
        functions:  65,
        statements: 70,
      },
    },
  },
});
