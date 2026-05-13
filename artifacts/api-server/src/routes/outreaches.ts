import { Router, Request, Response } from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import { db } from "@workspace/db";
import { outreaches, leads } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { sanitizeString } from "../lib/sanitize.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth, requireWorkspace);

/**
 * Ownership check for outreaches.
 * An outreach is owned by the user who owns its parent lead.
 * Outreaches whose lead has userId = null (legacy) are accessible to anyone.
 * Returns false and writes a 404 response when access is denied.
 */
async function checkOutreachOwnership(
  outreachId: string,
  req: Request,
  res: Response,
): Promise<{ outreach: typeof outreaches.$inferSelect } | null> {
  const [row] = await db
    .select({ outreach: outreaches, leadWorkspaceId: leads.workspaceId })
    .from(outreaches)
    .leftJoin(leads, eq(outreaches.leadId, leads.id))
    .where(eq(outreaches.id, outreachId))
    .limit(1);

  if (!row) {
    res.status(404).json({ error: "Outreach not found" });
    return null;
  }

  const isAdmin = req.user?.role === "admin";
  if (!isAdmin && row.leadWorkspaceId !== req.user?.activeWorkspaceId) {
    res.status(404).json({ error: "Outreach not found" });
    return null;
  }

  return { outreach: row.outreach };
}

router.get("/outreaches", async (req, res) => {
  try {
    const { status, leadId, page: pageStr, pageSize: pageSizeStr } = req.query as Record<string, string>;
    const page = Math.max(1, parseInt(pageStr ?? "1", 10));
    const pageSize = Math.min(200, Math.max(1, parseInt(pageSizeStr ?? "25", 10)));

    const conditions: ReturnType<typeof eq>[] = [];
    if (status) conditions.push(sql`${outreaches.status} = ${status}`);
    if (leadId) conditions.push(eq(outreaches.leadId, leadId));

    const where = conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])) : undefined;

    // Scope to workspace: join leads to check workspace ownership
    const wsId = req.user!.activeWorkspaceId;
    const wsCondition = sql`EXISTS (SELECT 1 FROM leads l WHERE l.id = ${outreaches.leadId} AND l.workspace_id = ${wsId})`;
    const finalWhere = where ? and(where, wsCondition as unknown as ReturnType<typeof eq>) : (wsCondition as unknown as ReturnType<typeof eq>);
    const rows = await db.select().from(outreaches).where(finalWhere).orderBy(desc(outreaches.createdAt)).limit(pageSize).offset((page - 1) * pageSize);

    return res.json({ outreaches: rows, page, pageSize });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Static sub-paths MUST be declared BEFORE /:id ───────────────────────────

// GET /outreaches/export — MUST be before GET /outreaches/:id
router.get("/outreaches/export", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    const wsId = req.user!.activeWorkspaceId;

    // Security: scope export to caller's workspace — prevent cross-tenant data leak
    const wsCondition = sql`EXISTS (SELECT 1 FROM leads l WHERE l.id = ${outreaches.leadId} AND l.workspace_id = ${wsId})`;
    const where = status
      ? and(sql`${outreaches.status} = ${status}` as unknown as ReturnType<typeof eq>, wsCondition as unknown as ReturnType<typeof eq>)
      : (wsCondition as unknown as ReturnType<typeof eq>);

    const rows = await db
      .select({
        id: outreaches.id,
        subject: outreaches.subject,
        status: outreaches.status,
        leadId: outreaches.leadId,
        sentAt: outreaches.sentAt,
        openedAt: outreaches.openedAt,
        repliedAt: outreaches.repliedAt,
        createdAt: outreaches.createdAt,
      })
      .from(outreaches)
      .where(where)
      .orderBy(desc(outreaches.createdAt))
      .limit(5000);

    const headers = ["id", "subject", "status", "leadId", "sentAt", "openedAt", "repliedAt", "createdAt"];
    const csv = [
      headers.join(","),
      ...rows.map((o: Record<string, unknown>) => headers.map((h) => JSON.stringify(o[h] ?? "")).join(",")),
    ].join("\n");

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header("Content-Disposition", "attachment; filename=findx-outreaches.csv");
    return res.send(csv);
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/outreach/rate-limit", async (_req, res) => {
  return res.json({ allowed: true, remaining: 100, resetAt: null });
});

router.post("/webhooks/resend", async (_req, res) => {
  return res.json({ processed: false, reason: "Webhook handler not configured" });
});

// ─── Parameterised :id routes ─────────────────────────────────────────────────

router.get("/outreaches/:id", async (req, res) => {
  try {
    // Security: verify ownership before returning data (prevents IDOR)
    const result = await checkOutreachOwnership(req.params.id, req, res);
    if (!result) return;
    return res.json({ outreach: result.outreach });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.patch("/outreaches/:id", async (req, res) => {
  try {
    // Security: verify ownership before updating (prevents IDOR)
    const existing = await checkOutreachOwnership(req.params.id, req, res);
    if (!existing) return;

    const { subject, body, status } = req.body as { subject?: string; body?: string; status?: string };
    const update: Record<string, unknown> = { updatedAt: new Date() };
    const ALLOWED_STATUSES = ["draft", "approved", "sent", "saved", "pending_approval"];
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(", ")}` });
      }
      update.status = status;
    }

    // Sanitize user inputs
    if (subject) {
      const sanitizedSubject = sanitizeString(subject);
      if (sanitizedSubject) update.subject = sanitizedSubject;
    }
    if (body) {
      const sanitizedBody = sanitizeString(body);
      if (sanitizedBody) update.body = sanitizedBody;
    }

    const [outreach] = await db.update(outreaches).set(update as Partial<typeof outreaches.$inferInsert>).where(eq(outreaches.id, req.params.id)).returning();
    if (!outreach) return res.status(404).json({ error: "Outreach not found" });
    return res.json({ outreach });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/outreaches/:id/schedule", async (req, res) => {
  try {
    // Security: verify ownership before scheduling (prevents IDOR)
    const existing = await checkOutreachOwnership(req.params.id, req, res);
    if (!existing) return;

    const { sendAt } = req.body as { sendAt?: string };
    if (!sendAt) return res.status(400).json({ error: "sendAt is required" });
    const sendDate = new Date(sendAt);
    if (isNaN(sendDate.getTime()) || sendDate <= new Date()) {
      return res.status(400).json({ error: "sendAt must be a valid future date" });
    }

    const [updated] = await db.update(outreaches).set({ scheduledAt: sendDate, status: "scheduled", updatedAt: new Date() }).where(eq(outreaches.id, req.params.id)).returning();
    return res.json({ success: true, outreach: updated });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/outreaches/:id/schedule", async (req, res) => {
  try {
    // Security: verify ownership before unscheduling (prevents IDOR)
    const existing = await checkOutreachOwnership(req.params.id, req, res);
    if (!existing) return;

    if (existing.outreach.status !== "scheduled") return res.status(400).json({ error: "Outreach is not scheduled" });

    const [updated] = await db.update(outreaches).set({ scheduledAt: null, status: "approved", updatedAt: new Date() }).where(eq(outreaches.id, req.params.id)).returning();
    return res.json({ success: true, outreach: updated });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
