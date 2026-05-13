import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../../../artifacts/api-server/.env") });

/**
 * Error codes that are truly safe to ignore — they mean "object already
 * exists" and cannot indicate real drift in a correctly sequenced history.
 *
 * 42P07 — duplicate_table
 * 42701 — duplicate_column
 * 42710 — duplicate_object (index / constraint)
 *
 * ⚠️  We no longer catch generic errors here.  Any unexpected failure
 *     (wrong column type, FK violation, missing table, etc.) surfaces
 *     immediately so the operator knows the DB is out of sync.
 */
const SAFE_DUPLICATE_CODES = new Set(["42P07", "42701", "42710"]);

function extractCode(error: unknown): string | undefined {
  const e = error as any;
  return e?.cause?.code ?? e?.code;
}

async function attemptMigration(db: any, migrationsFolder: string): Promise<void> {
  try {
    await migrate(db, { migrationsFolder });
    console.log("✅  Migrations completed successfully.");
  } catch (error: unknown) {
    const code = extractCode(error);

    if (code && SAFE_DUPLICATE_CODES.has(code)) {
      // Object already exists — schema is already up to date for this step.
      console.warn(`⚠️  Migration step skipped (object already exists, pg code: ${code}). Continuing…`);
      return;
    }

    if (code === "40P01") {
      // Deadlock — another deploy is finishing up; wait and retry once.
      console.warn("⚠️  Deadlock detected during migration, retrying in 5 seconds…");
      await new Promise((r) => setTimeout(r, 5000));
      await migrate(db, { migrationsFolder });
      console.log("✅  Migrations completed successfully (after deadlock retry).");
      return;
    }

    // All other errors are real problems — propagate them.
    console.error("❌  Migration failed:", error);
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  console.log("Running Drizzle migrations…");

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1, // Only need 1 connection for migrations
  });

  const db = drizzle(pool);

  try {
    let migrationsFolder =
      process.env.DRIZZLE_MIGRATIONS_PATH ||
      path.resolve(__dirname, "../migrations");

    // Fallback for bundled environment (artifacts/api-server/dist → lib/db/migrations)
    if (!fs.existsSync(path.join(migrationsFolder, "meta/_journal.json"))) {
      const fallback = path.resolve(__dirname, "../../../lib/db/migrations");
      if (fs.existsSync(path.join(fallback, "meta/_journal.json"))) {
        migrationsFolder = fallback;
        console.log(`Using fallback migrations path: ${migrationsFolder}`);
      } else {
        throw new Error(
          `Cannot find migrations folder. Tried:\n  ${migrationsFolder}\n  ${fallback}`
        );
      }
    }

    await attemptMigration(db, migrationsFolder);
  } finally {
    await pool.end();
  }
}

// Allow running directly as a standalone script (not when bundled)
const isDirectRun = process.argv[1]?.includes("migrate") && !process.argv[1]?.includes("dist/index");
if (isDirectRun) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
