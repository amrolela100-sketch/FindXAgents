import { Router } from "express";
import { db } from "@workspace/db";
import { analyses, leads } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth, requireWorkspace);

// GET /analyses/:id
// Security fix: join analyses -> leads and verify workspace ownership (prevents IDOR)
router.get("/analyses/:id", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;

    const [row] = await db
      .select({ analysis: analyses, leadWorkspaceId: leads.workspaceId })
      .from(analyses)
      .leftJoin(leads, eq(analyses.leadId, leads.id))
      .where(eq(analyses.id, req.params.id))
      .limit(1);

    if (!row) return res.status(404).json({ error: "Analysis not found" });

    // Enforce workspace isolation — admin bypasses the check
    const isAdmin = req.user?.role === "admin";
    if (!isAdmin && row.leadWorkspaceId !== wsId) {
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
