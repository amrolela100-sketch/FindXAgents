import { Router } from "express";
import { db } from "@workspace/db";
import { analyses, leads } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

// All analysis routes require a valid session and an active workspace
router.use(requireAuth, requireWorkspace);

router.get("/analyses/:id", async (req, res) => {
  try {
    // Fetch analysis and join its parent lead to enforce workspace isolation
    const [row] = await db
      .select({ analysis: analyses, leadWorkspaceId: leads.workspaceId })
      .from(analyses)
      .leftJoin(leads, eq(analyses.leadId, leads.id))
      .where(eq(analyses.id, req.params.id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Analysis not found" });

    // Workspace isolation check — admins can see all, regular users only their workspace
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && row.leadWorkspaceId !== req.user!.activeWorkspaceId) {
      return res.status(404).json({ error: "Analysis not found" });
    }

    return res.json({ analysis: row.analysis });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/analyses/:id/report", async (_req, res) => {
  return res.status(501).json({ error: "PDF report generation not configured" });
});

export default router;
