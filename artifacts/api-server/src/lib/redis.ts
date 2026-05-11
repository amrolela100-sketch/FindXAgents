/**
 * Redis singleton — shared across rate-limiters and any future caching.
 *
 * Behaviour:
 *  - If REDIS_URL is set  → connects to Redis (production / Docker)
 *  - If REDIS_URL is absent → returns null (dev mode, MemoryStore fallback)
 *
 * Never throws on import. Connection errors are logged and handled gracefully
 * so the app can still start even if Redis is temporarily unavailable.
 */

import IORedis from "ioredis";
import { logger } from "./logger.js";

let _client: IORedis | null = null;
let _connecting = false;

export function getRedisClient(): IORedis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  if (_client) return _client;
  if (_connecting) return null;

  _connecting = true;

  _client = new IORedis(url, {
    // Retry strategy: exponential back-off, max 30 s, give up after 10 tries
    retryStrategy(times) {
      if (times > 10) {
        logger.error("Redis: giving up after 10 reconnection attempts");
        return null; // stop retrying
      }
      return Math.min(times * 200, 30_000);
    },
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
    lazyConnect: false,
    connectTimeout: 5_000,
    // Keep-alive to prevent idle disconnects on Render / Railway
    keepAlive: 30_000,
  });

  _client.on("connect", () => {
    logger.info("Redis: connected");
  });

  _client.on("ready", () => {
    logger.info("Redis: ready");
  });

  _client.on("error", (err: Error) => {
    // Log but never crash the process — rate-limiter falls back to MemoryStore
    logger.error({ err: err.message }, "Redis: connection error");
  });

  _client.on("close", () => {
    logger.warn("Redis: connection closed");
  });

  _client.on("reconnecting", () => {
    logger.info("Redis: reconnecting...");
  });

  _client.on("end", () => {
    logger.warn("Redis: connection ended — rate limiting will fall back to MemoryStore");
    _client = null;
    _connecting = false;
  });

  return _client;
}

/**
 * Gracefully disconnect Redis (called on SIGTERM / SIGINT).
 */
export async function closeRedis(): Promise<void> {
  if (_client) {
    await _client.quit().catch(() => {});
    _client = null;
    _connecting = false;
  }
}
