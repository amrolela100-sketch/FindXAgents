import "dotenv/config";
import { env } from "./lib/env";
import app from "./app";
import { logger } from "./lib/logger";

const port = Number(env.PORT);

import { runMigrations } from "@workspace/db";

async function startServer() {
  try {
    if (process.env.SKIP_MIGRATIONS !== "true") {
      await runMigrations();
    } else {
      logger.info("Skipping migrations");
    }
    
    app.listen(port, () => {
      logger.info({ port }, "Server listening");
    });
  } catch (err) {
    logger.error({ err }, "Failed to start server");
    process.exit(1);
  }
}

startServer();
