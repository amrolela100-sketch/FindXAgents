import { Router } from "express";
import { db } from "@workspace/db";
import { leads, analyses, outreaches } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { z } from "zod";
import { aiLimiter } from "../../middleware/rate-limit.js";
import { safeError } from "../../lib/safe-error.js";
import { isAdminUser } from "../../services/leads.service.js";

const router = Router();

// ─── POST /leads/bulk/analyze ─────────────────────────────────────────────────

router.post("/leads/bulk/analyze", aiLimiter, async (req, res) => {
  const schema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "leadIds must be an array of UUIDs (max 100)", details: parsed.error.flatten() });

  const { leadIds } = parsed.data;
  await db.update(leads)
    .set({ status: "analyzing", updatedAt: new Date() })
    .where(and(inArray(leads.id, leadIds), eq(leads.workspaceId, req.user!.activeWorkspaceId)));
  return res.json({ queued: leadIds.length, message: "Analysis queued. Configure AI provider to run analysis." });
});

// ─── POST /leads/bulk/outreach ────────────────────────────────────────────────

router.post("/leads/bulk/outreach", aiLimiter, async (req, res) => {
  const schema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "leadIds must be an array of UUIDs (max 100)", details: parsed.error.flatten() });
  return res.json({ queued: parsed.data.leadIds.length, message: "Outreach generation queued. Configure AI provider to run generation." });
});

// ─── PATCH /leads/bulk/status ─────────────────────────────────────────────────

router.patch("/leads/bulk/status", async (req, res) => {
  const schema = z.object({
    leadIds: z.array(z.string().uuid()).min(1).max(100),
    status: z.enum(["discovered", "analyzing", "analyzed", "contacting", "responded", "qualified", "won", "lost"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { leadIds, status } = parsed.data;
  await db.update(leads)
    .set({ status, updatedAt: new Date() })
    .where(and(inArray(leads.id, leadIds), eq(leads.workspaceId, req.user!.activeWorkspaceId)));
  return res.json({ updated: leadIds.length, status });
});

// ─── POST /leads/bulk/delete ──────────────────────────────────────────────────

router.post("/leads/bulk/delete", async (req, res) => {
  const schema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(200) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "leadIds must be an array of UUIDs (max 200)", details: parsed.error.flatten() });
  }

  const { leadIds } = parsed.data;
  const admin = isAdminUser(req);

  try {
    let allowedIds: string[];
    if (admin) {
      const rows = await db.select({ id: leads.id }).from(leads).where(inArray(leads.id, leadIds));
      allowedIds = rows.map((r) => r.id);
    } else {
      const rows = await db.select({ id: leads.id }).from(leads).where(
        and(inArray(leads.id, leadIds), eq(leads.workspaceId, req.user!.activeWorkspaceId))
      );
      allowedIds = rows.map((r) => r.id);
    }

    if (allowedIds.length === 0) {
      return res.status(404).json({ error: "No leads found to delete" });
    }

    await db.transaction(async (tx) => {
      await tx.delete(outreaches).where(inArray(outreaches.leadId, allowedIds));
      await tx.delete(analyses).where(inArray(analyses.leadId, allowedIds));
      await tx.delete(leads).where(inArray(leads.id, allowedIds));
    });

    return res.json({ deleted: allowedIds.length, skipped: leadIds.length - allowedIds.length });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
