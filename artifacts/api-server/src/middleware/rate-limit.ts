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
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

/** Shared options type — plain object, no Omit gymnastics */
interface LimiterConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
  message: { error: string };
  keyGenerator?: (req: any) => string;
}

/**
 * Build a rateLimit middleware, auto-selecting RedisStore or MemoryStore.
 */
function makeLimiter(config: LimiterConfig) {
  const redis = getRedisClient();

  if (redis) {
    return rateLimit({
      ...config,
      store: new RedisStore({
        // ioredis sendCommand signature: (command: string, ...args: string[])
        sendCommand: (command: string, ...args: string[]) =>
          redis.call(command, ...args) as Promise<RedisReply>,
        prefix: "rl:",
      }),
    });
  }

  // Dev / no-Redis fallback — MemoryStore (default)
  logger.warn("rate-limit: REDIS_URL not set — using MemoryStore (single-instance only)");
  return rateLimit(config);
}

/** 100 req / min — applied to all /api/* routes */
export const globalLimiter = makeLimiter({
  windowMs:       60 * 1_000,
  max:            100,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many requests, please try again later." },
  keyGenerator:   (req) => ipKeyGenerator(req),
});

/** 5 req / min — login / auth endpoints */
export const authLimiter = makeLimiter({
  windowMs:       60 * 1_000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many authentication attempts, please try again after a minute." },
  keyGenerator:   (req) => ipKeyGenerator(req),
});

/** 10 req / hr — lead discovery (Tavily + AI) */
export const discoveryLimiter = makeLimiter({
  windowMs:       60 * 60 * 1_000,
  max:            10,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Discovery limit reached. Please try again after an hour." },
  keyGenerator:   (req) => req.user?.userId ?? ipKeyGenerator(req),
});

/** 20 req / hr — bulk AI analyze / outreach */
export const aiLimiter = makeLimiter({
  windowMs:       60 * 60 * 1_000,
  max:            20,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "AI operation limit reached. Please try again after an hour." },
  keyGenerator:   (req) => req.user?.userId ?? ipKeyGenerator(req),
});

/** 5 req / min — Telegram & integration test endpoints */
export const integrationTestLimiter = makeLimiter({
  windowMs:       60 * 1_000,
  max:            5,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { error: "Too many test requests. Please wait a minute before retrying." },
  keyGenerator:   (req) => ipKeyGenerator(req),
});
