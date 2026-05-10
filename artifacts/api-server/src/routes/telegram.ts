import { Router } from "express";
import { db } from "@workspace/db";
import { telegramSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/telegram/settings", async (_req, res) => {
  try {
    const [settings] = await db.select().from(telegramSettings).where(eq(telegramSettings.id, "default"));
    if (!settings) return res.json({ configured: false, chatId: undefined });
    return res.json({ configured: !!settings.botToken, chatId: settings.chatId });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

const telegramSchema = z.object({
  botToken: z.string().min(1),
  chatId: z.string().min(1),
});

router.post("/telegram/settings", async (req, res) => {
  const parsed = telegramSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const [existing] = await db.select().from(telegramSettings).where(eq(telegramSettings.id, "default"));
    if (existing) {
      await db.update(telegramSettings).set({ botToken: parsed.data.botToken, chatId: parsed.data.chatId, updatedAt: new Date() }).where(eq(telegramSettings.id, "default"));
    } else {
      await db.insert(telegramSettings).values({ id: "default", botToken: parsed.data.botToken, chatId: parsed.data.chatId });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to save settings" });
  }
});

router.post("/telegram/test", async (req, res) => {
  const parsed = telegramSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const { botToken, chatId } = parsed.data;
    const text = `🚀 FindX test notification\n\nYour Telegram notifications are working correctly!`;
    const apiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;

    const response = await fetch(apiUrl, {
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

router.delete("/telegram/settings", async (_req, res) => {
  try {
    const result = await db.delete(telegramSettings).where(eq(telegramSettings.id, "default")).returning();
    if (!result.length) return res.status(404).json({ error: "Settings not found" });
    return res.json({ deleted: true });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
