import { Router } from "express";
import { timingSafeEqual, createHmac } from "crypto";
import { requireAuth } from "../middleware/auth";
import { db, users, agentPipelineRuns, leads } from "@workspace/db";
import { count, sql, eq, desc } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();
const OWNER_EMAIL    = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "";
const ADMIN_EMAILS   = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

// Secret used to sign short-lived unlock tokens (falls back to a derived secret)
const UNLOCK_SECRET  = process.env.OWNER_UNLOCK_SECRET ?? `owner-unlock-${process.env.OWNER_PASSWORD ?? "changeme"}`;
// Unlock tokens are valid for 30 minutes
const UNLOCK_TTL_MS  = 30 * 60 * 1000;

router.use(requireAuth);

function isOwner(email: string): boolean {
  return OWNER_EMAIL.length > 0 && email.toLowerCase() === OWNER_EMAIL;
}

/**
 * Generate a short-lived HMAC token that proves the owner completed step-up auth.
 * Format: "<timestamp>.<hmac>"
 */
function generateUnlockToken(email: string): string {
  const ts  = Date.now().toString();
  const mac = createHmac("sha256", UNLOCK_SECRET).update(`${email}:${ts}`).digest("hex");
  return Buffer.from(`${ts}.${mac}`).toString("base64url");
}

/**
 * Verify an unlock token. Returns true only if the token is valid AND not expired.
 */
function verifyUnlockToken(email: string, token: string): boolean {
  try {
    const decoded  = Buffer.from(token, "base64url").toString();
    const dotIndex = decoded.indexOf(".");
    if (dotIndex === -1) return false;
    const ts  = decoded.slice(0, dotIndex);
    const mac = decoded.slice(dotIndex + 1);
    const expectedMac = createHmac("sha256", UNLOCK_SECRET).update(`${email}:${ts}`).digest("hex");
    // Timing-safe MAC comparison
    const macBuf      = Buffer.from(mac);
    const expectedBuf = Buffer.from(expectedMac);
    if (macBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(macBuf, expectedBuf)) return false;
    // Check expiry
    const issuedAt = parseInt(ts, 10);
    if (isNaN(issuedAt) || Date.now() - issuedAt > UNLOCK_TTL_MS) return false;
    return true;
  } catch {
    return false;
  }
}

// ─── Unlock ───────────────────────────────────────────────────────────────────

router.post("/owner/unlock", async (req, res) => {
  const email = req.user!.email.toLowerCase();
  if (!isOwner(email)) return res.status(403).json({ error: "Forbidden" });
  if (!OWNER_PASSWORD) return res.status(503).json({ error: "Owner password not configured" });
  const password = String(req.body?.password ?? "");
  // Use timing-safe comparison to prevent timing attacks
  const passwordMatch =
    password.length === OWNER_PASSWORD.length &&
    timingSafeEqual(Buffer.from(password), Buffer.from(OWNER_PASSWORD));
  if (!passwordMatch) return res.status(401).json({ error: "Incorrect password" });

  // Issue a short-lived unlock token — owner dashboard routes will verify this
  const token = generateUnlockToken(email);
  return res.json({ unlocked: true, token });
});

// ─── Middleware: require a valid unlock token ─────────────────────────────────

function requireOwnerUnlock(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  if (!isOwner(req.user!.email)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  // Accept token from Authorization header ("Bearer <token>") or X-Owner-Token header
  const authHeader = req.headers["x-owner-token"] as string | undefined;
  const token = authHeader ?? (req.headers.authorization?.startsWith("OwnerToken ") ? req.headers.authorization.slice(11) : undefined);
  if (!token || !verifyUnlockToken(req.user!.email.toLowerCase(), token)) {
    return res.status(401).json({ error: "Owner step-up authentication required. Call /owner/unlock first." });
  }
  return next();
}

// ─── Owner Dashboard ──────────────────────────────────────────────────────────

router.get("/owner/dashboard", requireOwnerUnlock, async (req, res) => {
  try {
    const [
      totalLeadsResult,
      totalRunsResult,
      leadsThisWeekResult,
      leadsAnalyzedResult,
      leadsContactedResult,
      leadsWonResult,
      userCountResult,
      onboardingCountResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(leads),
      db.select({ count: count() }).from(agentPipelineRuns),
      db.select({ count: count() }).from(leads).where(sql`created_at >= now() - interval '7 days'`),
      db.select({ count: count() }).from(leads).where(sql`status in ('analyzed','contacting','qualified','won')`),
      db.select({ count: count() }).from(leads).where(sql`status in ('contacting','qualified','won')`),
      db.select({ count: count() }).from(leads).where(sql`status = 'won'`),
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(eq(users.onboardingCompleted, true)),
    ]);

    const totalLeads = Number(totalLeadsResult[0]?.count ?? 0);
    const totalRuns = Number(totalRunsResult[0]?.count ?? 0);
    const leadsAnalyzed = Number(leadsAnalyzedResult[0]?.count ?? 0);
    const leadsContacted = Number(leadsContactedResult[0]?.count ?? 0);
    const leadsWon = Number(leadsWonResult[0]?.count ?? 0);
    const totalUsers = Number(userCountResult[0]?.count ?? 0);
    const onboardingCompleted = Number(onboardingCountResult[0]?.count ?? 0);
    const conversionRate = totalLeads > 0 ? Math.round((leadsWon / totalLeads) * 100) : 0;

    const recentRuns = await db
      .select({
        id: agentPipelineRuns.id,
        query: agentPipelineRuns.query,
        status: agentPipelineRuns.status,
        createdAt: agentPipelineRuns.createdAt,
        leadsFound: agentPipelineRuns.leadsFound,
      })
      .from(agentPipelineRuns)
      .orderBy(desc(agentPipelineRuns.createdAt))
      .limit(10);

    return res.json({
      totalUsers,
      totalLeads,
      totalRuns,
      leadsThisWeek: Number(leadsThisWeekResult[0]?.count ?? 0),
      leadsAnalyzed,
      leadsContacted,
      leadsWon,
      conversionRate,
      onboardingCompleted,
      activeWorkspaces: 0,
      recentRuns,
      recentWorkspaces: [],
      health: { api: true, auth: true, database: true, agents: totalRuns > 0 },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Owner: All Users (detailed) ──────────────────────────────────────────────

router.get("/owner/users", requireOwnerUnlock, async (req, res) => {
  try {
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        onboardingCompleted: users.onboardingCompleted,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    // Lead counts per user
    const leadCounts = await db
      .select({ userId: leads.userId, cnt: count() })
      .from(leads)
      .groupBy(leads.userId);
    const leadCountMap: Record<string, number> = {};
    for (const row of leadCounts) {
      if (row.userId) leadCountMap[row.userId] = Number(row.cnt);
    }

    // Pipeline run counts per user
    const runCounts = await db
      .select({ userId: agentPipelineRuns.userId, cnt: count() })
      .from(agentPipelineRuns)
      .groupBy(agentPipelineRuns.userId);
    const runCountMap: Record<string, number> = {};
    for (const row of runCounts) {
      if (row.userId) runCountMap[row.userId] = Number(row.cnt);
    }

    const enriched = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isAdmin: ADMIN_EMAILS.includes(u.email.toLowerCase()),
      isOwner: u.email.toLowerCase() === OWNER_EMAIL,
      onboardingCompleted: u.onboardingCompleted,
      leadCount: leadCountMap[u.id] ?? 0,
      runCount: runCountMap[u.id] ?? 0,
      createdAt: u.createdAt,
      lastActiveAt: u.updatedAt,
    }));

    return res.json({ users: enriched, total: enriched.length });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Owner: All Runs (across all users) ───────────────────────────────────────

router.get("/owner/runs", requireOwnerUnlock, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "25"), 10)));

    const [rows, totalResult] = await Promise.all([
      db
        .select({
          id: agentPipelineRuns.id,
          userId: agentPipelineRuns.userId,
          query: agentPipelineRuns.query,
          status: agentPipelineRuns.status,
          leadsFound: agentPipelineRuns.leadsFound,
          createdAt: agentPipelineRuns.createdAt,
          completedAt: agentPipelineRuns.completedAt,
        })
        .from(agentPipelineRuns)
        .orderBy(desc(agentPipelineRuns.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: count() }).from(agentPipelineRuns),
    ]);

    return res.json({ runs: rows, total: Number(totalResult[0]?.count ?? 0), page, pageSize });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
