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
    let migrationsFolder = process.env.DRIZZLE_MIGRATIONS_PATH || path.resolve(__dirname, "../migrations");
    
    // Fallback for bundled environment (artifacts/api-server/dist -> lib/db/migrations)
    if (!fs.existsSync(path.join(migrationsFolder, "meta/_journal.json"))) {
      const fallback = path.resolve(__dirname, "../../../lib/db/migrations");
      if (fs.existsSync(path.join(fallback, "meta/_journal.json"))) {
        migrationsFolder = fallback;
      }
    }
    
    await migrate(db, { migrationsFolder });
    console.log("Migrations completed successfully!");
  } catch (error: any) {
    // If tables/indexes already exist (42P07) or column already exists (42701),
    // it means the DB was already set up — treat as success and continue.
    const IDEMPOTENT_CODES = ["42P07", "42701", "42710"];
    if (error?.cause?.code && IDEMPOTENT_CODES.includes(error.cause.code)) {
      console.warn(
        `Migration skipped (schema already exists, code: ${error.cause.code}). Continuing...`
      );
    } else if (error?.code && IDEMPOTENT_CODES.includes(error.code)) {
      console.warn(
        `Migration skipped (schema already exists, code: ${error.code}). Continuing...`
      );
    } else {
      console.error("Error running migrations:", error);
      throw error;
    }
  } finally {
    await pool.end();
  }
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().then(() => process.exit(0)).catch(() => process.exit(1));
}
