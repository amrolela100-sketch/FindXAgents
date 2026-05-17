import { Router } from "express";
import { db } from "@workspace/db";
import { outreaches, analyses, agentLogs, agentPipelineRuns, leads, users, workspaceMembers, workspaces } from "@workspace/db";
import { count, eq, inArray } from "drizzle-orm";
import { requireAuth, assertUser } from "../middleware/auth";

const router = Router();

// ─── Clear all workspace data (existing) ─────────────────────────────────────
router.delete("/data/clear-all", requireAuth, async (req, res) => {
  const workspaceId = assertUser(req).activeWorkspaceId;

  try {
    const result = await db.transaction(async (tx) => {
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

// ─── GDPR: Export all user data as JSON ──────────────────────────────────────
router.get("/data/export", requireAuth, async (req, res) => {
  const { userId, activeWorkspaceId: workspaceId } = assertUser(req);

  try {
    // User profile
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    // Workspaces
    const userWorkspaces = await db
      .select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

    // Leads
    const userLeads = await db.select().from(leads).where(eq(leads.workspaceId, workspaceId));
    const leadIds = userLeads.map((l) => l.id);

    // Analyses & outreaches
    const userAnalyses  = leadIds.length > 0 ? await db.select().from(analyses).where(inArray(analyses.leadId, leadIds)) : [];
    const userOutreaches = leadIds.length > 0 ? await db.select().from(outreaches).where(inArray(outreaches.leadId, leadIds)) : [];

    // Pipeline runs
    const userRuns = await db.select().from(agentPipelineRuns).where(eq(agentPipelineRuns.workspaceId, workspaceId));
    const runIds = userRuns.map((r) => r.id);
    const userLogs = runIds.length > 0 ? await db.select().from(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds)) : [];

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id:        user?.id,
        email:     user?.email,
        name:      user?.name,
        createdAt: user?.createdAt,
      },
      workspaces: userWorkspaces.map(w => ({ ...w.workspace, role: w.role })),
      leads:      userLeads,
      analyses:   userAnalyses,
      outreaches: userOutreaches.map(o => ({
        ...o,
        // Mask email body to protect recipient privacy in export
        body: o.body ? "[email body — available in app]" : null,
      })),
      pipelineRuns: userRuns,
      agentLogs:    userLogs,
    };

    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="findx-data-export-${new Date().toISOString().split("T")[0]}.json"`);
    return res.json(exportData);
  } catch (err) {
    return res.status(500).json({ error: "Failed to export data" });
  }
});

// ─── GDPR: Delete account permanently ────────────────────────────────────────
router.delete("/data/delete-account", requireAuth, async (req, res) => {
  const { userId, activeWorkspaceId: workspaceId } = assertUser(req);

  try {
    await db.transaction(async (tx) => {
      // Delete all leads and related data in active workspace
      const userLeads = await tx.select({ id: leads.id }).from(leads).where(eq(leads.workspaceId, workspaceId));
      const leadIds = userLeads.map((l) => l.id);

      if (leadIds.length > 0) {
        await tx.delete(outreaches).where(inArray(outreaches.leadId, leadIds));
        await tx.delete(analyses).where(inArray(analyses.leadId, leadIds));
        await tx.delete(leads).where(eq(leads.workspaceId, workspaceId));
      }

      // Delete pipeline runs and logs
      const userRuns = await tx.select({ id: agentPipelineRuns.id }).from(agentPipelineRuns).where(eq(agentPipelineRuns.workspaceId, workspaceId));
      const runIds = userRuns.map((r) => r.id);
      if (runIds.length > 0) {
        await tx.delete(agentLogs).where(inArray(agentLogs.pipelineRunId, runIds));
        await tx.delete(agentPipelineRuns).where(eq(agentPipelineRuns.workspaceId, workspaceId));
      }

      // Remove workspace memberships (but keep workspace if user is not owner)
      await tx.delete(workspaceMembers).where(eq(workspaceMembers.userId, userId));

      // Delete the user record itself
      await tx.delete(users).where(eq(users.id, userId));
    });

    return res.json({ deleted: true, message: "Account permanently deleted" });
  } catch (err) {
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
