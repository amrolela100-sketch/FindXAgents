import { Router } from "express";
import { db } from "@workspace/db";
import { agentPipelineRuns } from "@workspace/db";
import { z } from "zod";
import { discoveryLimiter } from "../../middleware/rate-limit.js";
import { safeError } from "../../lib/safe-error.js";
import { logger } from "../../lib/logger.js";
import { leads } from "@workspace/db";
import { eq } from "drizzle-orm";
import { runDiscoveryJob } from "../../services/discovery.service.js";
import { runTavilyEnrichment } from "../../services/enrichment.service.js";
import { checkLeadOwnership } from "../../services/leads.service.js";

const router = Router();

// ─── POST /leads/discover ─────────────────────────────────────────────────────

const discoverSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(100).default(10),
});

router.post("/leads/discover", discoveryLimiter, async (req, res) => {
  const parsed = discoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid query", details: parsed.error.flatten() });
  }
  const { query, maxResults } = parsed.data;

  try {
    const [run] = await db.insert(agentPipelineRuns).values({
      userId:      req.user?.sub ?? null,
      workspaceId: req.user?.activeWorkspaceId ?? null,
      query,
      status: "running",
    }).returning();

    runDiscoveryJob(run.id, query, maxResults, req.user?.sub ?? null, req.user?.activeWorkspaceId ?? null)
      .catch((err) => logger.error({ err }, "Discovery job failed"));

    return res.status(202).json({
      message: "Discovery queued.",
      jobs: [run.id],
      runId: run.id,
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── GET /leads/:id/enrich ────────────────────────────────────────────────────

router.get("/leads/:id/enrich", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    // HIGH-2 fix: pass workspaceId so enrichment resolves the correct Tavily key
    runTavilyEnrichment(lead.id, lead.businessName, lead.city, lead.workspaceId)
      .catch((err) => logger.error({ err }, "Tavily enrichment failed"));

    return res.status(202).json({ message: "Enrichment queued." });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
