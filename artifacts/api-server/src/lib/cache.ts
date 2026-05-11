/**
 * cache.ts
 * Thin Redis caching layer for expensive operations:
 *   - Website scrape results  (TTL: 24h)
 *   - AI analysis results     (TTL: 6h)
 *
 * All methods fall back gracefully when Redis is unavailable — the app
 * continues to work, just without caching.
 */

import { getRedisClient } from "./redis.js";
import { logger } from "./logger.js";

// ── TTLs ──────────────────────────────────────────────────────────────────────
const SCRAPE_TTL_SEC  = 60 * 60 * 24;   // 24 hours  — website data doesn't change often
const ANALYSIS_TTL_SEC = 60 * 60 * 6;   // 6 hours   — re-analyse if score drift matters
const OUTREACH_TTL_SEC = 60 * 60 * 12;  // 12 hours  — email copy

// ── Key builders ─────────────────────────────────────────────────────────────
function scrapeKey(url: string)    { return `findx:scrape:${url.toLowerCase().trim()}`; }
function analysisKey(leadId: string) { return `findx:analysis:${leadId}`; }
function outreachKey(leadId: string, lang: string) { return `findx:outreach:${leadId}:${lang}`; }

// ── Generic helpers ───────────────────────────────────────────────────────────

async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (e: any) {
    logger.warn({ key, err: e.message }, "cache: GET failed");
    return null;
  }
}

async function setCache(key: string, value: unknown, ttlSec: number): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSec);
  } catch (e: any) {
    logger.warn({ key, err: e.message }, "cache: SET failed");
  }
}

async function delCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (e: any) {
    logger.warn({ key, err: e.message }, "cache: DEL failed");
  }
}

// ── Scrape cache ──────────────────────────────────────────────────────────────

export async function getCachedScrape<T>(url: string): Promise<T | null> {
  return getCache<T>(scrapeKey(url));
}

export async function setCachedScrape(url: string, result: unknown): Promise<void> {
  return setCache(scrapeKey(url), result, SCRAPE_TTL_SEC);
}

export async function invalidateScrapeCache(url: string): Promise<void> {
  return delCache(scrapeKey(url));
}

// ── Analysis cache ────────────────────────────────────────────────────────────

export async function getCachedAnalysis<T>(leadId: string): Promise<T | null> {
  return getCache<T>(analysisKey(leadId));
}

export async function setCachedAnalysis(leadId: string, result: unknown): Promise<void> {
  return setCache(analysisKey(leadId), result, ANALYSIS_TTL_SEC);
}

export async function invalidateAnalysisCache(leadId: string): Promise<void> {
  return delCache(analysisKey(leadId));
}

// ── Outreach cache ────────────────────────────────────────────────────────────

export async function getCachedOutreach<T>(leadId: string, lang: string): Promise<T | null> {
  return getCache<T>(outreachKey(leadId, lang));
}

export async function setCachedOutreach(leadId: string, lang: string, result: unknown): Promise<void> {
  return setCache(outreachKey(leadId, lang), result, OUTREACH_TTL_SEC);
}

export async function invalidateOutreachCache(leadId: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;
  try {
    // Delete all language variants for this lead
    const pattern = outreachKey(leadId, "*");
    const keys = await redis.keys(pattern);
    if (keys.length) await redis.del(...keys);
  } catch (e: any) {
    logger.warn({ leadId, err: e.message }, "cache: outreach invalidation failed");
  }
}

/**
 * Invalidate all cached data for a lead (scrape + analysis + outreach).
 * Call this when a lead's website URL changes.
 */
export async function invalidateLeadCache(leadId: string, websiteUrl?: string): Promise<void> {
  await Promise.all([
    invalidateAnalysisCache(leadId),
    invalidateOutreachCache(leadId),
    ...(websiteUrl ? [invalidateScrapeCache(websiteUrl)] : []),
  ]);
}
