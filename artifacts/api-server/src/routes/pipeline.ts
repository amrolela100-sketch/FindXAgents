import { Router } from "express";
import { db } from "@workspace/db";
import { leads, pipelineStages } from "@workspace/db";
import { count, sql } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.get("/pipeline", async (_req, res) => {
  try {
    const stages = await db
      .select()
      .from(pipelineStages)
      .orderBy(pipelineStages.order);

    const statusCountsRaw = await db
      .select({ status: leads.status, count: count() })
      .from(leads)
      .groupBy(leads.status);

    const leadCountsByStage = await db
      .select({ stageId: leads.pipelineStageId, count: count() })
      .from(leads)
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
