import { Router } from "express";
import { db } from "@workspace/db";
import { outreaches, analyses, agentLogs, agentPipelineRuns, leads } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.delete("/data/clear-all", requireAuth, async (req, res) => {
  // Any authenticated user can clear their own workspace data
  const userId      = req.user!.userId;
  const workspaceId = req.user!.activeWorkspaceId;

  try {
    // Get lead IDs belonging to this workspace/user
    const userLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(eq(leads.workspaceId, workspaceId));

    const leadIds = userLeads.map((l) => l.id);

    let deletedOutreaches = 0;
    let deletedAnalyses   = 0;

    if (leadIds.length > 0) {
      const [outreachCount] = await db.select({ count: count() }).from(outreaches).where(inArray(outreaches.leadId, leadIds));
      const [analysisCount] = await db.select({ count: count() }).from(analyses).where(inArray(analyses.leadId, leadIds));
      deletedOutreaches = Number(outreachCount?.count ?? 0);
      deletedAnalyses   = Number(analysisCount?.count ?? 0);

      await db.delete(outreaches).where(inArray(outreaches.leadId, leadIds));
      await db.delete(analyses).where(inArray(analyses.leadId, leadIds));
    }

    // Clear pipeline runs and logs scoped to this workspace
    const userRuns = await db
      .select({ id: agentPipelineRuns.id })
      .from(agentPipelineRuns)
      .where(eq(agentPipelineRuns.workspaceId, workspaceId));

    const runIds      = userRuns.map((r) => r.id);
    let deletedLogs   = 0;

    if (runIds.length > 0) {
      const [logsCount] = await db.select({ count: count() }).from(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
      deletedLogs = Number(logsCount?.count ?? 0);
      await db.delete(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
      await db.delete(agentPipelineRuns).where(eq(agentPipelineRuns.workspaceId, workspaceId));
    }

    const [leadsCount]  = await db.select({ count: count() }).from(leads).where(eq(leads.workspaceId, workspaceId));
    const deletedLeads  = Number(leadsCount?.count ?? 0);
    await db.delete(leads).where(eq(leads.workspaceId, workspaceId));

    return res.json({
      deleted: {
        outreaches:    deletedOutreaches,
        analyses:      deletedAnalyses,
        agentLogs:     deletedLogs,
        pipelineRuns:  runIds.length,
        leads:         deletedLeads,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to clear data" });
  }
});

export default router;
