import { Router } from "express";
import { db } from "@workspace/db";
import { notifications, pushTokens } from "@workspace/db";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";
import { safeError } from "../lib/safe-error.js";

const router = Router();
const MAX_NOTIFICATIONS = 50;

// ── GET /notifications ────────────────────────────────────────────────────────
// Returns all notifications for the authenticated user (newest first, max 50)
router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, req.user!.userId))
      .orderBy(desc(notifications.createdAt))
      .limit(MAX_NOTIFICATIONS);

    const unreadCount = rows.filter((n) => !n.read).length;
    return res.json({ notifications: rows, unreadCount });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// MED-6 fix: allowlist notification types.
// Previously `type` accepted any string — an attacker could craft arbitrary
// notification types to confuse the frontend or enable phishing within the platform.
const NOTIFICATION_TYPES = [
  "pipeline_complete",
  "pipeline_failed",
  "run_failed",
  "lead_analyzed",
  "lead_contacted",
  "workspace_invite",
  "system",
] as const;

// ── POST /notifications ───────────────────────────────────────────────────────
// Create a new notification (called internally by the pipeline, or from frontend)
router.post("/notifications", requireAuth, async (req, res) => {
  const schema = z.object({
    type:  z.enum(NOTIFICATION_TYPES).default("pipeline_complete"),
    title: z.string().min(1).max(200),
    body:  z.string().default(""),
    meta:  z.record(z.unknown()).default({}),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const [row] = await db
      .insert(notifications)
      .values({
        userId: req.user!.userId,
        type:   parsed.data.type,
        title:  parsed.data.title,
        body:   parsed.data.body,
        meta:   parsed.data.meta,
      })
      .returning();

    // Trim old notifications — keep latest 50 per user
    await db.execute(
      sql`DELETE FROM notifications
          WHERE user_id = ${req.user!.userId}
            AND id NOT IN (
              SELECT id FROM notifications
              WHERE user_id = ${req.user!.userId}
              ORDER BY created_at DESC
              LIMIT ${MAX_NOTIFICATIONS}
            )`
    );

    return res.status(201).json({ notification: row });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── PATCH /notifications/read-all ─────────────────────────────────────────────
router.patch("/notifications/read-all", requireAuth, async (req, res) => {
  try {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, req.user!.userId),
          eq(notifications.read, false),
        )
      );
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── PATCH /notifications/:id/read ─────────────────────────────────────────────
router.patch("/notifications/:id/read", requireAuth, async (req, res) => {
  try {
    const notifId = String(req.params.id);
    const userId  = String(req.user!.userId);
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, notifId),
          eq(notifications.userId, userId),
        )
      );
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── DELETE /notifications ─────────────────────────────────────────────────────
router.delete("/notifications", requireAuth, async (req, res) => {
  try {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, req.user!.userId));
    return res.json({ ok: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── Push token registration (existing — kept for mobile) ─────────────────────
router.post("/notifications/register", requireAuth, async (req, res) => {
  const schema = z.object({
    token:    z.string().min(1).max(512),
    platform: z.enum(["expo", "ios", "android"]).default("expo"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  const { token, platform } = parsed.data;
  const userId = req.user!.userId;

  try {
    const [existing] = await db
      .select({ id: pushTokens.id })
      .from(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));

    if (!existing) {
      await db.insert(pushTokens).values({ userId, token, platform });
    } else {
      await db
        .update(pushTokens)
        .set({ updatedAt: new Date() })
        .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
    }
    return res.json({ registered: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/notifications/unregister", requireAuth, async (req, res) => {
  const schema = z.object({ token: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed" });

  const userId = req.user!.userId;
  try {
    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, parsed.data.token)));
    return res.json({ unregistered: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
