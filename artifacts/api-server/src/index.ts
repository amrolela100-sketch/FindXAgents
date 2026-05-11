import "dotenv/config";
import { env } from "./lib/env";
import app from "./app";
import { logger } from "./lib/logger";
import { closeRedis } from "./lib/redis.js";

const port = Number(env.PORT);

import { runMigrations } from "@workspace/db";

async function startServer() {
  try {
    if (process.env.SKIP_MIGRATIONS !== "true") {
      await runMigrations();
    } else {
      logger.info("Skipping migrations");
    }

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
