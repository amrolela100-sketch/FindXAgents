import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * LOW-13: Graceful DB reconnection
 *
 * pg.Pool already handles connection pooling and reconnection internally,
 * but we tune the defaults for production on Render:
 *
 *  - max: 10            — Render free tier Postgres allows ~20 connections
 *  - idleTimeoutMillis  — release idle connections after 30 s to stay within limits
 *  - connectionTimeoutMillis — fail fast rather than hang forever
 *  - allowExitOnIdle    — let Node exit cleanly in scripts/tests
 *
 * Error events are logged so ops can spot flapping connections without a crash.
 */
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  allowExitOnIdle: false,
});

pool.on("error", (err) => {
  // Log but never crash — pg.Pool will retry connections automatically.
  // A crashed process here would take down the whole API for all users.
  console.error("[db] unexpected idle client error:", err.message);
});

pool.on("connect", () => {
  // Useful for watching cold-start behaviour on Render free tier.
  if (process.env.NODE_ENV !== "test") {
    console.info("[db] new client connected");
  }
});

export const db = drizzle(pool, { schema });

export * from "./schema";
export { runMigrations } from "./migrate";
