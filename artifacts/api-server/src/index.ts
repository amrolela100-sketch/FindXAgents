import "dotenv/config";
import { env } from "./lib/env";
import app from "./app";
import { logger } from "./lib/logger";
import { closeRedis } from "./lib/redis.js";

const port = Number(env.PORT);

import { runMigrations } from "@workspace/db";
import { seedAgents } from "./lib/seed-agents.js";

/**
 * Recover "ghost" pipeline runs that were left in "running" or "queued" state
 * after a server crash or restart. Any run older than 30 minutes that is still
 * running/queued is marked as failed with an explanatory error message.
 *
 * This runs once at startup — no queue, no cron, no extra deps.
 */
async function recoverStuckRuns(): Promise<void> {
  try {
    const { db } = await import("@workspace/db");
    const { agentPipelineRuns } = await import("@workspace/db");
    const { inArray, lt, sql } = await import("drizzle-orm");

    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago

    const result = await db
      .update(agentPipelineRuns)
      .set({
        status: "failed",
        error: "Server restarted while this run was in progress. Please re-run.",
        completedAt: new Date(),
      })
      .where(
        sql`${agentPipelineRuns.status} IN ('running', 'queued')
            AND ${agentPipelineRuns.createdAt} < ${cutoff.toISOString()}`
      )
      .returning({ id: agentPipelineRuns.id });

    if (result.length > 0) {
      logger.warn(
        { recovered: result.length, ids: result.map((r) => r.id) },
        "Recovered ghost pipeline runs from previous server instance"
      );
    }
  } catch (err) {
    // Non-fatal — log and continue starting the server
    logger.error({ err }, "Failed to recover stuck runs on startup");
  }
}

async function startServer() {
  try {
    if (process.env.SKIP_MIGRATIONS !== "true") {
      await runMigrations();
    } else {
      logger.info("Skipping migrations");
    }

    // Recover any runs stuck in "running"/"queued" from a previous crash
    await recoverStuckRuns();

    // Ensure the 3 core pipeline agents exist in DB
    await seedAgents();

    const server = app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });

    // Graceful shutdown — close Redis and HTTP server cleanly
    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Shutting down gracefully...");
      server.close(async () => {
        await closeRedis();
        logger.info("Server and Redis closed. Bye.");
        process.exit(0);
      });
      // Force exit after 10s if something hangs
      setTimeout(() => process.exit(1), 10_000).unref();
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));

  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
