import { Router } from "express";
import { db } from "@workspace/db";
import { telegramSettings } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { z } from "zod";
import { integrationTestLimiter } from "../middleware/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();
router.use(requireAuth);

const BOT_TOKEN_REGEX = /^\d{8,12}:[A-Za-z0-9_-]{35}$/;
const KEEP_SENTINEL = "__keep__";

const telegramSchema = z.object({
  botToken: z.string().min(1),
  chatId:   z.string().min(1).max(50).regex(/^-?\d+$/, "Chat ID must be a numeric value"),
});

/** Resolve telegram settings for the current workspace, fallback to global */
async function getSettings(workspaceId: string) {
  const [ws] = await db.select().from(telegramSettings)
    .where(and(eq(telegramSettings.workspaceId, workspaceId), eq(telegramSettings.isActive, true)))
    .limit(1);
  if (ws) return ws;
  const [global] = await db.select().from(telegramSettings)
    .where(and(isNull(telegramSettings.workspaceId), eq(telegramSettings.isActive, true)))
    .limit(1);
  return global ?? null;
}

router.get("/telegram/settings", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const settings = await getSettings(wsId);
    if (!settings) return res.json({ configured: false, chatId: undefined });
    return res.json({ configured: !!settings.botToken, chatId: settings.chatId });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/telegram/settings", async (req, res) => {
  const parsed = telegramSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  const wsId = req.user!.activeWorkspaceId;
  const { chatId } = parsed.data;
  let { botToken } = parsed.data;

  try {
    const [existing] = await db.select().from(telegramSettings)
      .where(eq(telegramSettings.workspaceId, wsId))
      .limit(1);

    if (botToken === KEEP_SENTINEL) {
      if (!existing?.botToken)
        return res.status(400).json({ error: "Bot Token is required for first-time setup" });
      botToken = existing.botToken;
    }

    if (!BOT_TOKEN_REGEX.test(botToken))
      return res.status(400).json({ error: "Invalid bot token format. Expected: 123456789:ABCdef..." });

    if (existing) {
      await db.update(telegramSettings)
        .set({ botToken, chatId, updatedAt: new Date() })
        .where(eq(telegramSettings.workspaceId, wsId));
    } else {
      await db.insert(telegramSettings).values({ workspaceId: wsId, botToken, chatId });
    }
    return res.json({ success: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/telegram/test", integrationTestLimiter, async (req, res) => {
  const parsed = telegramSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  const wsId = req.user!.activeWorkspaceId;
  let { botToken } = parsed.data;
  const { chatId } = parsed.data;

  try {
    if (!botToken || botToken === KEEP_SENTINEL) {
      const settings = await getSettings(wsId);
      if (!settings?.botToken)
        return res.status(400).json({ error: "No bot token configured. Please save settings first." });
      botToken = settings.botToken;
    }

    if (!BOT_TOKEN_REGEX.test(botToken))
      return res.status(400).json({ error: "Invalid bot token format" });

    const text = `✅ <b>FindX Test Notification</b>\n\nYour Telegram notifications are working correctly!`;
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });

    const data = await response.json() as { ok: boolean; description?: string };
    if (!data.ok) return res.json({ success: false, error: data.description ?? "Telegram API error" });
    return res.json({ success: true });
  } catch (err) {
    return res.json({ success: false, error: err instanceof Error ? err.message : "Test failed" });
  }
});

router.delete("/telegram/settings", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const result = await db.delete(telegramSettings)
      .where(eq(telegramSettings.workspaceId, wsId))
      .returning();
    if (!result.length) return res.status(404).json({ error: "Settings not found" });
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
