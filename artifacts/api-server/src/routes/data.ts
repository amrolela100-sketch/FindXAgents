import { Router } from "express";
import { db } from "@workspace/db";
import { outreaches, analyses, agentLogs, agentPipelineRuns, leads } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

router.delete("/data/clear-all", requireAuth, async (req, res) => {
  // Only admins can clear data
  if (!isAdmin(req.user!.email)) {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }

  try {
    // Get lead IDs belonging to this user only
    const userLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.userId, req.user!.userId));

    const leadIds = userLeads.map((l) => l.id);

    let deletedOutreaches = 0;
    let deletedAnalyses = 0;

    if (leadIds.length > 0) {
      const [outreachCount] = await db.select({ count: count() }).from(outreaches).where(inArray(outreaches.leadId, leadIds));
      const [analysisCount] = await db.select({ count: count() }).from(analyses).where(inArray(analyses.leadId, leadIds));
      deletedOutreaches = Number(outreachCount?.count ?? 0);
      deletedAnalyses = Number(analysisCount?.count ?? 0);

      await db.delete(outreaches).where(inArray(outreaches.leadId, leadIds));
      await db.delete(analyses).where(inArray(analyses.leadId, leadIds));
    }

    // Clear runs and logs scoped to this user
    const userRuns = await db
      .select({ id: agentPipelineRuns.id })
      .from(agentPipelineRuns)
      .where(eq(agentPipelineRuns.userId, req.user!.userId));

    const runIds = userRuns.map((r) => r.id);
    let deletedLogs = 0;

    if (runIds.length > 0) {
      const [logsCount] = await db.select({ count: count() }).from(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
      deletedLogs = Number(logsCount?.count ?? 0);
      await db.delete(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
      await db.delete(agentPipelineRuns).where(eq(agentPipelineRuns.userId, req.user!.userId));
    }

    const [leadsCount] = await db.select({ count: count() }).from(leads).where(eq(leads.userId, req.user!.userId));
    const deletedLeads = Number(leadsCount?.count ?? 0);
    await db.delete(leads).where(eq(leads.userId, req.user!.userId));

    return res.json({
      deleted: {
        outreaches: deletedOutreaches,
        analyses: deletedAnalyses,
        agentLogs: deletedLogs,
        pipelineRuns: runIds.length,
        leads: deletedLeads,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to clear data" });
  }
});

export default router;
