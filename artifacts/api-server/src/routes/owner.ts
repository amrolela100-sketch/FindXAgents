import { Router } from "express";
import { timingSafeEqual } from "crypto";
import { requireAuth } from "../middleware/auth";
import { supabaseAdmin } from "../lib/supabase-admin";
import { db, users, agentPipelineRuns, leads } from "@workspace/db";
import { count, sql } from "drizzle-orm";

const router = Router();
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "";

router.use(requireAuth);

function isOwner(email: string): boolean {
  return OWNER_EMAIL.length > 0 && email.toLowerCase() === OWNER_EMAIL;
}

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

router.get("/owner/dashboard", async (req, res) => {
  const email = req.user!.email.toLowerCase();
  if (!isOwner(email)) return res.status(403).json({ error: "Forbidden" });
  try {
    const [totalLeadsResult, totalRunsResult, leadsThisWeekResult, leadsAnalyzedResult, leadsContactedResult, leadsWonResult] = await Promise.all([
      db.select({ count: count() }).from(leads),
      db.select({ count: count() }).from(agentPipelineRuns),
      db.select({ count: count() }).from(leads).where(sql`created_at >= now() - interval '7 days'`),
      db.select({ count: count() }).from(leads).where(sql`status in ('analyzed','contacting','qualified','won')`),
      db.select({ count: count() }).from(leads).where(sql`status in ('contacting','qualified','won')`),
      db.select({ count: count() }).from(leads).where(sql`status = 'won'`),
    ]);
    const totalLeads = totalLeadsResult[0]?.count ?? 0;
    const totalRuns = totalRunsResult[0]?.count ?? 0;
    const leadsAnalyzed = leadsAnalyzedResult[0]?.count ?? 0;
    const leadsContacted = leadsContactedResult[0]?.count ?? 0;
    const leadsWon = leadsWonResult[0]?.count ?? 0;
    const conversionRate = totalLeads > 0 ? Math.round((leadsWon / totalLeads) * 100) : 0;
    const recentRuns = await db.select({
      id: agentPipelineRuns.id,
      query: agentPipelineRuns.query,
      status: agentPipelineRuns.status,
      createdAt: agentPipelineRuns.createdAt,
      leadsFound: agentPipelineRuns.leadsFound,
    }).from(agentPipelineRuns).orderBy(sql`${agentPipelineRuns.createdAt} desc`).limit(5);

    const [userCountResult] = await db.select({ count: count() }).from(users);
    const userCount = userCountResult?.count ?? 0;

    return res.json({
      totalUsers: userCount,
      totalLeads,
      totalRuns,
      leadsThisWeek: leadsThisWeekResult[0]?.count ?? 0,
      leadsAnalyzed,
      leadsContacted,
      leadsWon,
      conversionRate,
      activeWorkspaces: 0,
      onboardingCompleted: 0,
      recentRuns,
      recentWorkspaces: [],
      health: { api: true, auth: true, database: true, agents: totalRuns > 0 },
    });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
