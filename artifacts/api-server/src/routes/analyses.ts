import { Router } from "express";
import { db } from "@workspace/db";
import { analyses } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/analyses/:id", async (req, res) => {
  try {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, req.params.id));
    if (!analysis) return res.status(404).json({ error: "Analysis not found" });
    return res.json({ analysis });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.get("/analyses/:id/report", async (req, res) => {
  return res.status(501).json({ error: "PDF report generation not configured" });
});

export default router;
