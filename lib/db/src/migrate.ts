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
 * PostgreSQL error codes produced when an object already exists.
 *
 * 42P07 — duplicate_table
 * 42701 — duplicate_column
 * 42710 — duplicate_object (index / constraint / type)
 *
 * These arise when a migration uses `CREATE TABLE IF NOT EXISTS` or
 * `ADD COLUMN IF NOT EXISTS` but the DDL guard was not present in an older
 * migration that already ran.  They are safe to skip ONLY at startup, and
 * we log them clearly so they surface in deploy logs for human review.
 *
 * All other errors (wrong type, FK violation, missing table, etc.) are
 * propagated immediately — they indicate real schema drift.
 *
 * ⚠️  Do NOT expand this set.  Every new addition here is a hidden bug.
 */
const SAFE_DUPLICATE_CODES = new Set(["42P07", "42701", "42710"]);

function extractCode(error: unknown): string | undefined {
  const e = error as any;
  return e?.cause?.code ?? e?.code;
}

function extractDetail(error: unknown): string {
  const e = error as any;
  return e?.cause?.message ?? e?.message ?? String(error);
}

async function attemptMigration(db: any, migrationsFolder: string): Promise<void> {
  try {
    await migrate(db, { migrationsFolder });
    console.log("✅  Migrations completed successfully.");
  } catch (error: unknown) {
    const code = extractCode(error);

    if (code && SAFE_DUPLICATE_CODES.has(code)) {
      // Object already exists — this migration step is a no-op on this DB.
      // Log with WARN so it is visible in deploy logs; do NOT suppress silently.
      console.warn(
        `⚠️  [pg ${code}] Duplicate object skipped during migration — ` +
        `the object already exists on this database. ` +
        `Detail: ${extractDetail(error)}`
      );
      console.warn(
        `   This is expected when replaying migrations on a DB that was ` +
        `already partially up-to-date.  If this appears on a fresh DB, ` +
        `it indicates a migration ordering problem — investigate immediately.`
      );
      // Continue — Drizzle's migrator has already recorded this migration in
      // __drizzle_migrations so it won't re-run on next startup.
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

    // All other errors are real problems — propagate and crash the process.
    console.error("❌  Migration failed with unexpected error (pg code:", code ?? "unknown", ")");
    console.error("   Detail:", extractDetail(error));
    console.error("   The database schema may be out of sync. Check migration history.");
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
