import { db, telegramSettings } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

interface TelegramMessage {
  text: string;
  parse_mode?: "HTML" | "Markdown";
}

/**
 * Sends a message to Telegram using the stored bot token + chat ID.
 * Returns true on success, false on any failure (silent — non-blocking).
 */
export async function sendTelegramNotification(message: TelegramMessage): Promise<boolean> {
  try {
    const [settings] = await db
      .select()
      .from(telegramSettings)
      .where(eq(telegramSettings.id, "default"));

    if (!settings?.botToken || !settings?.chatId) return false;

    const apiUrl = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: settings.chatId,
        text: message.text,
        parse_mode: message.parse_mode ?? "HTML",
      }),
    });

    const data = (await response.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      logger.warn({ description: data.description }, "Telegram notification failed");
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err }, "Telegram notification error (non-blocking)");
    return false;
  }
}

/**
 * Formats and sends a pipeline completion notification to Telegram.
 */
export async function notifyPipelineComplete(opts: {
  query: string;
  leadsFound: number;
  leadsAnalyzed: number;
  emailsDrafted: number;
  durationMs: number;
}): Promise<void> {
  const durationSec = Math.round(opts.durationMs / 1000);
  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

  const text = [
    `🚀 <b>FindX Pipeline Completed</b>`,
    ``,
    `🔍 <b>Query:</b> ${opts.query}`,
    ``,
    `📊 <b>Results:</b>`,
    `  • 🏢 Leads found: <b>${opts.leadsFound}</b>`,
    `  • 🧠 Leads analyzed: <b>${opts.leadsAnalyzed}</b>`,
    `  • ✉️ Emails drafted: <b>${opts.emailsDrafted}</b>`,
    ``,
    `⏱️ <b>Duration:</b> ${durationStr}`,
    ``,
    `<i>Open FindX to view your new leads →</i>`,
  ].join("\n");

  await sendTelegramNotification({ text, parse_mode: "HTML" });
}

/**
 * Sends a pipeline failure notification to Telegram.
 */
export async function notifyPipelineFailed(opts: {
  query: string;
  error: string;
  durationMs: number;
}): Promise<void> {
  const durationSec = Math.round(opts.durationMs / 1000);

  const text = [
    `❌ <b>FindX Pipeline Failed</b>`,
    ``,
    `🔍 <b>Query:</b> ${opts.query}`,
    `💥 <b>Error:</b> ${opts.error.slice(0, 200)}`,
    `⏱️ <b>Duration:</b> ${durationSec}s`,
  ].join("\n");

  await sendTelegramNotification({ text, parse_mode: "HTML" });
}
