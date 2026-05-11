/**
 * Rate-limiting middleware — Redis-backed in production, MemoryStore in dev.
 *
 * When REDIS_URL is set:
 *   → Uses RedisStore (rate-limit-redis) — limits are shared across all
 *     instances / dynos on Render, Railway, etc.
 *
 * When REDIS_URL is absent:
 *   → Falls back to MemoryStore (express-rate-limit default) — fine for
 *     local dev and single-instance deployments.
 *
 * Usage is identical either way — no changes needed in route files.
 */

import rateLimit, { type Options } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

/**
 * Build a rateLimit Options object, auto-selecting RedisStore or MemoryStore.
 */
function makeOptions(base: Omit<Options, "store">): Options {
  const redis = getRedisClient();

  if (redis) {
    logger.info(`rate-limit: using RedisStore`);
    return {
      ...base,
      store: new RedisStore({
        // ioredis client — rate-limit-redis accepts it via sendCommand wrapper
        sendCommand: (...args: string[]) => redis.call(...args) as any,
        // Prefix keeps rate-limit keys distinct from other Redis data
        prefix: "rl:",
      }),
    };
  }

  // Dev / no-Redis fallback
  logger.warn("rate-limit: REDIS_URL not set — using MemoryStore (single-instance only)");
  return base as Options;
}

/** 100 req / min — applied to all /api/* routes */
export const globalLimiter = rateLimit(makeOptions({
  windowMs:       60 * 1_000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many requests, please try again later." },
  keyGenerator:   (req) => req.ip ?? "unknown",
}));

/** 5 req / min — login / auth endpoints */
export const authLimiter = rateLimit(makeOptions({
  windowMs:       60 * 1_000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many authentication attempts, please try again after a minute." },
  keyGenerator:   (req) => req.ip ?? "unknown",
}));

/** 10 req / hr — lead discovery (Tavily + AI) */
export const discoveryLimiter = rateLimit(makeOptions({
  windowMs:       60 * 60 * 1_000,
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Discovery limit reached. Please try again after an hour." },
  keyGenerator:   (req) => (req as any).user?.userId ?? req.ip ?? "unknown",
}));

/** 20 req / hr — bulk AI analyze / outreach */
export const aiLimiter = rateLimit(makeOptions({
  windowMs:       60 * 60 * 1_000,
  max:            20,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "AI operation limit reached. Please try again after an hour." },
  keyGenerator:   (req) => (req as any).user?.userId ?? req.ip ?? "unknown",
}));

/** 5 req / min — Telegram & integration test endpoints */
export const integrationTestLimiter = rateLimit(makeOptions({
  windowMs:       60 * 1_000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many test requests. Please wait a minute before retrying." },
  keyGenerator:   (req) => req.ip ?? "unknown",
}));
