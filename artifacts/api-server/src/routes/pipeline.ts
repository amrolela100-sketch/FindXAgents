import { Router } from "express";
import { db } from "@workspace/db";
import { leads, pipelineStages } from "@workspace/db";
import { count, sql, eq, and } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth, requireWorkspace);

router.get("/pipeline", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;

    const stages = await db
      .select()
      .from(pipelineStages)
      .orderBy(pipelineStages.order);

    // Status counts and stage lead counts scoped to active workspace
    const statusCountsRaw = await db
      .select({ status: leads.status, count: count() })
      .from(leads)
      .where(eq(leads.workspaceId, wsId))
      .groupBy(leads.status);

    const leadCountsByStage = await db
      .select({ stageId: leads.pipelineStageId, count: count() })
      .from(leads)
      .where(eq(leads.workspaceId, wsId))
      .groupBy(leads.pipelineStageId);

    const countMap = new Map(leadCountsByStage.map((r: { stageId: string | null; count: number }) => [r.stageId, Number(r.count)]));

    const stagesWithCount = stages.map((s: typeof stages[number]) => ({
      ...s,
      _count: { leads: countMap.get(s.id) ?? 0 },
    }));

    res.json({
      stages: stagesWithCount,
      statusCounts: statusCountsRaw.map((r: { status: string; count: number }) => ({ status: r.status, _count: Number(r.count) })),
    });
  } catch (err) {
    safeError(res, err, "Internal server error");
  }
});

export default router;
