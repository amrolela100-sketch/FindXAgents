import "dotenv/config";
import { initSentry } from "./lib/sentry.js"; // ← must be FIRST before any other import
initSentry();

import { env, assertEnv } from "./lib/env";
assertEnv();
import app from "./app";
import { logger } from "./lib/logger";
import { closeRedis } from "./lib/redis.js";
import { markActiveAgentRunsInterrupted } from "./lib/agent-job-queue.js";

const port = Number(env.PORT);

import { runMigrations } from "@workspace/db";
import { seedAgents } from "./lib/seed-agents.js";

async function recoverStuckRuns(): Promise<void> {
  try {
    const { db } = await import("@workspace/db");
    const { agentPipelineRuns } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    const cutoff = new Date(Date.now() - 30 * 60 * 1000);

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

    await recoverStuckRuns();
    await seedAgents();

    const server = app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Shutting down gracefully...");
      server.close(async () => {
        await markActiveAgentRunsInterrupted(
          `Server received ${signal} before the agent run completed. Please re-run.`
        );
        await closeRedis();
        logger.info("Server and Redis closed. Bye.");
        process.exit(0);
      });
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
