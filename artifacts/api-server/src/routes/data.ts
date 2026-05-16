import { Router } from "express";
import { db } from "@workspace/db";
import { outreaches, analyses, agentLogs, agentPipelineRuns, leads } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { requireAuth, assertUser } from "../middleware/auth";

const router = Router();

router.delete("/data/clear-all", requireAuth, async (req, res) => {
  // Any authenticated user can clear their own workspace data
  const workspaceId = assertUser(req).activeWorkspaceId;

  try {
    const result = await db.transaction(async (tx) => {
      // Get lead IDs belonging to this workspace/user
      const userLeads = await tx
        .select({ id: leads.id })
        .from(leads)
        .where(eq(leads.workspaceId, workspaceId));

      const leadIds = userLeads.map((l) => l.id);

      let deletedOutreaches = 0;
      let deletedAnalyses   = 0;

      if (leadIds.length > 0) {
        const [outreachCount] = await tx.select({ count: count() }).from(outreaches).where(inArray(outreaches.leadId, leadIds));
        const [analysisCount] = await tx.select({ count: count() }).from(analyses).where(inArray(analyses.leadId, leadIds));
        deletedOutreaches = Number(outreachCount?.count ?? 0);
        deletedAnalyses   = Number(analysisCount?.count ?? 0);

        await tx.delete(outreaches).where(inArray(outreaches.leadId, leadIds));
        await tx.delete(analyses).where(inArray(analyses.leadId, leadIds));
      }

      // Clear pipeline runs and logs scoped to this workspace
      const userRuns = await tx
        .select({ id: agentPipelineRuns.id })
        .from(agentPipelineRuns)
        .where(eq(agentPipelineRuns.workspaceId, workspaceId));

      const runIds    = userRuns.map((r) => r.id);
      let deletedLogs = 0;

      if (runIds.length > 0) {
        const [logsCount] = await tx.select({ count: count() }).from(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
        deletedLogs = Number(logsCount?.count ?? 0);
        await tx.delete(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
        await tx.delete(agentPipelineRuns).where(eq(agentPipelineRuns.workspaceId, workspaceId));
      }

      const [leadsCount] = await tx.select({ count: count() }).from(leads).where(eq(leads.workspaceId, workspaceId));
      const deletedLeads = Number(leadsCount?.count ?? 0);
      await tx.delete(leads).where(eq(leads.workspaceId, workspaceId));

      return {
        deleted: {
          outreaches:   deletedOutreaches,
          analyses:     deletedAnalyses,
          agentLogs:    deletedLogs,
          pipelineRuns: runIds.length,
          leads:        deletedLeads,
        },
      };
    });

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: "Failed to clear data" });
  }
});

export default router;
