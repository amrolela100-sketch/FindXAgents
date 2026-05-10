import { Router } from "express";
import { db } from "@workspace/db";
import { outreaches, analyses, agentLogs, agentPipelineRuns, leads } from "@workspace/db";
import { count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.delete("/data/clear-all", requireAuth, async (_req, res) => {
  try {
    const [outreachCount] = await db.select({ count: count() }).from(outreaches);
    const [analysisCount] = await db.select({ count: count() }).from(analyses);
    const [logsCount] = await db.select({ count: count() }).from(agentLogs);
    const [runsCount] = await db.select({ count: count() }).from(agentPipelineRuns);
    const [leadsCount] = await db.select({ count: count() }).from(leads);

    await db.delete(outreaches);
    await db.delete(analyses);
    await db.delete(agentLogs);
    await db.delete(agentPipelineRuns);
    await db.delete(leads);

    return res.json({
      deleted: {
        outreaches: Number(outreachCount?.count ?? 0),
        analyses: Number(analysisCount?.count ?? 0),
        agentLogs: Number(logsCount?.count ?? 0),
        pipelineRuns: Number(runsCount?.count ?? 0),
        leads: Number(leadsCount?.count ?? 0),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: "Failed to clear data", details: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
