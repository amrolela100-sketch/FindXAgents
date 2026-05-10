import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { requireAuth } from "../middleware/auth";
import { db, users, agentPipelineRuns, leads } from "@workspace/db";
import { count, sql, eq, desc } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "";
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);

router.use(requireAuth);

function isOwner(email: string): boolean {
  return OWNER_EMAIL.length > 0 && email.toLowerCase() === OWNER_EMAIL;
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
  return res.json({ unlocked: true });
});

// ─── Owner Dashboard ──────────────────────────────────────────────────────────

router.get("/owner/dashboard", async (req, res) => {
  if (!isOwner(req.user!.email)) return res.status(403).json({ error: "Forbidden" });
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

router.get("/owner/users", async (req, res) => {
  if (!isOwner(req.user!.email)) return res.status(403).json({ error: "Forbidden" });
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

router.get("/owner/runs", async (req, res) => {
  if (!isOwner(req.user!.email)) return res.status(403).json({ error: "Forbidden" });
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
