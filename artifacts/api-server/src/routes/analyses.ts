import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db } from "@workspace/db";
import { analyses, leads } from "@workspace/db";
import { eq } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();

// All analysis routes require authentication
router.use(requireAuth);

/**
 * Security: analyses don't have a workspaceId directly — they belong to a lead.
 * We join leads to enforce workspace ownership before returning any data.
 * Returns null and writes a 404 if the analysis doesn't belong to the caller's workspace.
 */
async function getAnalysisScoped(analysisId: string, req: Parameters<typeof requireAuth>[0]) {
  const [row] = await db
    .select({ analysis: analyses, leadWorkspaceId: leads.workspaceId })
    .from(analyses)
    .innerJoin(leads, eq(analyses.leadId, leads.id))
    .where(eq(analyses.id, analysisId))
    .limit(1);

  if (!row) return null;

  const isAdmin = req.user?.role === "admin";
  if (!isAdmin && row.leadWorkspaceId !== req.user?.activeWorkspaceId) return null;

  return row.analysis;
}

router.get("/analyses/:id", async (req, res) => {
  try {
    const analysis = await getAnalysisScoped(req.params["id"] as string, req);
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });
    return res.json({ analysis });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/analyses/:id/report", async (req, res) => {
  try {
    // Enforce ownership before 501 — don't leak that an analysis exists
    const analysis = await getAnalysisScoped(req.params["id"] as string, req);
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });
    return res.status(501).json({ error: "PDF report generation not configured" });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
