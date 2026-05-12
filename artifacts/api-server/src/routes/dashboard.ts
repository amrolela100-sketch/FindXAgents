import { Router } from "express";
import { db } from "@workspace/db";
import { leads, analyses, agentPipelineRuns } from "@workspace/db";
import { sql, count, and, gte, isNull, isNotNull, eq } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth, requireWorkspace);

router.get("/dashboard/stats", async (req, res) => {
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const wsId = req.user!.activeWorkspaceId;

    // All stats scoped to the active workspace
    const wsFilter = eq(leads.workspaceId, wsId);

    const withWs = (extra?: ReturnType<typeof sql>) =>
      extra ? and(wsFilter, extra) : wsFilter;

    const [
      totalLeadsResult,
      leadsAnalyzedResult,
      leadsContactedResult,
      leadsRespondedResult,
      leadsWonResult,
      leadsThisWeekResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(leads).where(withWs()),
      db.select({ count: count() }).from(leads).where(
        withWs(sql`${leads.status} IN ('analyzed', 'contacting', 'responded', 'won', 'lost')`)
      ),
      db.select({ count: count() }).from(leads).where(
        withWs(sql`${leads.status} IN ('contacting', 'responded', 'won')`)
      ),
      db.select({ count: count() }).from(leads).where(
        withWs(sql`${leads.status} = 'responded'`)
      ),
      db.select({ count: count() }).from(leads).where(
        withWs(sql`${leads.status} = 'won'`)
      ),
      db.select({ count: count() }).from(leads).where(
        withWs(gte(leads.discoveredAt, lastWeek) as unknown as ReturnType<typeof sql>)
      ),
    ]);

    const totalLeads = totalLeadsResult[0]?.count ?? 0;
    const leadsAnalyzed = leadsAnalyzedResult[0]?.count ?? 0;
    const leadsContacted = leadsContactedResult[0]?.count ?? 0;
    const leadsResponded = leadsRespondedResult[0]?.count ?? 0;
    const leadsWon = leadsWonResult[0]?.count ?? 0;
    const leadsThisWeek = leadsThisWeekResult[0]?.count ?? 0;

    const conversionRate =
      leadsContacted > 0 ? ((leadsWon / leadsContacted) * 100).toFixed(1) : "0";

    res.json({
      stats: {
        totalLeads,
        leadsAnalyzed,
        leadsContacted,
        leadsResponded,
        leadsWon,
        leadsThisWeek,
        conversionRate,
      },
    });
  } catch (err) {
    safeError(res, err, "Internal server error");
  }
});

router.get("/leads/score-distribution", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const wsFilter = eq(leads.workspaceId, wsId);

    const withWs = (extra?: ReturnType<typeof sql>) =>
      extra ? and(wsFilter, extra) : wsFilter;

    const [aggResult, unscoredResult] = await Promise.all([
      db.select({
        hot: sql<number>`COUNT(CASE WHEN ${leads.leadScore} >= 70 THEN 1 END)::int`,
        warm: sql<number>`COUNT(CASE WHEN ${leads.leadScore} >= 40 AND ${leads.leadScore} < 70 THEN 1 END)::int`,
        cold: sql<number>`COUNT(CASE WHEN ${leads.leadScore} < 40 THEN 1 END)::int`,
        totalScored: count(leads.leadScore),
        avgScore: sql<number>`COALESCE(AVG(${leads.leadScore}), 0)::int`,
      }).from(leads).where(withWs(isNotNull(leads.leadScore) as unknown as ReturnType<typeof sql>)),
      db.select({ count: count() }).from(leads)
        .where(withWs(isNull(leads.leadScore) as unknown as ReturnType<typeof sql>)),
    ]);

    const agg = aggResult[0];
    const buckets = {
      cold: Number(agg?.cold ?? 0),
      warm: Number(agg?.warm ?? 0),
      hot: Number(agg?.hot ?? 0),
      unscored: Number(unscoredResult[0]?.count ?? 0),
    };

    res.json({
      buckets,
      avgScore: Number(agg?.avgScore ?? 0),
      totalScored: Number(agg?.totalScored ?? 0),
    });
  } catch (err) {
    safeError(res, err, "Internal server error");
  }
});

export default router;
