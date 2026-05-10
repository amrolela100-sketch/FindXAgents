import { Router } from "express";
import { db } from "@workspace/db";
import { pushTokens } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.post("/notifications/register", requireAuth, async (req, res) => {
  const schema = z.object({
    token: z.string().min(1).max(512),
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
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

router.delete("/notifications/unregister", requireAuth, async (req, res) => {
  const schema = z.object({ token: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed" });

  const userId = req.user!.userId;
  try {
    await db
      .delete(pushTokens)
      .where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, parsed.data.token)));
    return res.json({ unregistered: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
