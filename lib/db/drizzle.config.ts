import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables from api-server since it holds DATABASE_URL
dotenv.config({ path: path.resolve(__dirname, "../../artifacts/api-server/.env") });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set.\n" +
    "Copy artifacts/api-server/.env.example → artifacts/api-server/.env and fill in the value."
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Verbose output helps spot drift during generate/push
  verbose: true,
  strict: true,
});
