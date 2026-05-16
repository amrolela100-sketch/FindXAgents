import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getRedisClient } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

/**
 * GET /healthz
 * Liveness probe — fast, no external checks.
 * Returns 200 immediately so the load balancer knows the process is alive.
 */
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * GET /readyz
 * Readiness probe — checks DB + Redis connectivity.
 * Returns 200 only when all critical dependencies are reachable.
 * Render uses this to decide whether to route traffic to the instance.
 *
 * Response shape:
 * {
 *   status: "ok" | "degraded",
 *   checks: {
 *     db:    { status: "ok" | "fail", latencyMs: number, error?: string },
 *     redis: { status: "ok" | "skip" | "fail", latencyMs: number, error?: string }
 *   }
 * }
 */
router.get("/readyz", async (_req, res) => {
  const checks: Record<string, { status: string; latencyMs: number; error?: string }> = {};
  let httpStatus = 200;

  // ── DB check ──────────────────────────────────────────────────────────────
  const dbStart = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    checks.db = { status: "ok", latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    logger.error({ err: err?.message }, "readyz: DB check failed");
    checks.db = { status: "fail", latencyMs: Date.now() - dbStart, error: err?.message ?? "unknown" };
    httpStatus = 503;
  }

  // ── Redis check ───────────────────────────────────────────────────────────
  const redis = getRedisClient();
  if (!redis) {
    // Redis is optional — no REDIS_URL means dev/lite mode
    checks.redis = { status: "skip", latencyMs: 0 };
  } else {
    const redisStart = Date.now();
    try {
      await redis.ping();
      checks.redis = { status: "ok", latencyMs: Date.now() - redisStart };
    } catch (err: any) {
      logger.error({ err: err?.message }, "readyz: Redis check failed");
      checks.redis = { status: "fail", latencyMs: Date.now() - redisStart, error: err?.message ?? "unknown" };
      // Redis failure is degraded, not fatal — app can limp along with MemoryStore
      if (httpStatus === 200) httpStatus = 200; // keep 200 but mark degraded
    }
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok" || c.status === "skip");
  const status = allOk ? "ok" : checks.db.status === "fail" ? "unavailable" : "degraded";

  return res.status(httpStatus).json({ status, checks });
});

export default router;
