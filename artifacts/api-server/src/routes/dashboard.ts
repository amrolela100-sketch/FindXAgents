import { Router } from "express";
import { db } from "@workspace/db";
import { leads, analyses, agentPipelineRuns } from "@workspace/db";
import { sql, count, and, gte, isNull, isNotNull } from "drizzle-orm";
import { optionalAuth } from "../middleware/auth";

const router = Router();

router.use(optionalAuth);

router.get("/dashboard/stats", async (req, res) => {
  try {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const userFilter = req.user?.userId
      ? sql`${leads.userId} = ${req.user.userId}`
      : undefined;

    const withUser = (extra?: ReturnType<typeof sql>) =>
      userFilter && extra ? and(userFilter, extra) : userFilter ?? extra;

    const [
      totalLeadsResult,
      leadsAnalyzedResult,
      leadsContactedResult,
      leadsRespondedResult,
      leadsWonResult,
      leadsThisWeekResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(leads).where(withUser()),
      db.select({ count: count() }).from(leads).where(
        withUser(sql`${leads.status} IN ('analyzed', 'contacting', 'responded', 'won', 'lost')`)
      ),
      db.select({ count: count() }).from(leads).where(
        withUser(sql`${leads.status} IN ('contacting', 'responded', 'won')`)
      ),
      db.select({ count: count() }).from(leads).where(
        withUser(sql`${leads.status} = 'responded'`)
      ),
      db.select({ count: count() }).from(leads).where(
        withUser(sql`${leads.status} = 'won'`)
      ),
      db.select({ count: count() }).from(leads).where(
        withUser(gte(leads.discoveredAt, lastWeek) as unknown as ReturnType<typeof sql>)
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
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/leads/score-distribution", async (req, res) => {
  try {
    const userFilter = req.user?.userId
      ? sql`${leads.userId} = ${req.user.userId}`
      : undefined;

    const withUser = (extra?: ReturnType<typeof sql>) =>
      userFilter && extra ? and(userFilter, extra) : userFilter ?? extra;

    const [aggResult, unscoredResult] = await Promise.all([
      db.select({
        hot: sql<number>`COUNT(CASE WHEN ${leads.leadScore} >= 70 THEN 1 END)::int`,
        warm: sql<number>`COUNT(CASE WHEN ${leads.leadScore} >= 40 AND ${leads.leadScore} < 70 THEN 1 END)::int`,
        cold: sql<number>`COUNT(CASE WHEN ${leads.leadScore} < 40 THEN 1 END)::int`,
        totalScored: count(leads.leadScore),
        avgScore: sql<number>`COALESCE(AVG(${leads.leadScore}), 0)::int`,
      }).from(leads).where(withUser(isNotNull(leads.leadScore) as unknown as ReturnType<typeof sql>)),
      db.select({ count: count() }).from(leads)
        .where(withUser(isNull(leads.leadScore) as unknown as ReturnType<typeof sql>)),
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
    res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
