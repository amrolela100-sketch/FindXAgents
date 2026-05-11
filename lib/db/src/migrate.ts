import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../artifacts/api-server/.env") });

// Error codes that mean "schema already exists" — safe to ignore
const IDEMPOTENT_CODES = ["42P07", "42701", "42710"];

async function attemptMigration(db: any, migrationsFolder: string): Promise<void> {
  try {
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed successfully!");
  } catch (error: any) {
    const code = error?.cause?.code ?? error?.code;

    if (code && IDEMPOTENT_CODES.includes(code)) {
      // Tables / columns / constraints already exist — schema is up to date
      console.warn(`Migration skipped (schema already exists, code: ${code}). Continuing...`);
      return;
    }

    if (code === "40P01") {
      // Deadlock — another deploy is finishing up; wait and retry once
      console.warn("Deadlock detected during migration, retrying in 5 seconds...");
      await new Promise((r) => setTimeout(r, 5000));
      await migrate(db, { migrationsFolder });
      console.log("Migrations completed successfully (after retry)!");
      return;
    }

    console.error("Error running migrations:", error);
    throw error;
  }
}

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Running Drizzle migrations...");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Only need 1 connection for migrations
  });

  const db = drizzle(pool);

  try {
    let migrationsFolder =
      process.env.DRIZZLE_MIGRATIONS_PATH ||
      path.resolve(__dirname, "../migrations");

    // Fallback for bundled environment (artifacts/api-server/dist -> lib/db/migrations)
    if (!fs.existsSync(path.join(migrationsFolder, "meta/_journal.json"))) {
      const fallback = path.resolve(__dirname, "../../../lib/db/migrations");
      if (fs.existsSync(path.join(fallback, "meta/_journal.json"))) {
        migrationsFolder = fallback;
      }
    }

    await attemptMigration(db, migrationsFolder);
  } finally {
    await pool.end();
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
