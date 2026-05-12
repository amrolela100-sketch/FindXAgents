// artifacts/api-server/src/lib/telegram.ts
import { db, telegramSettings } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { logger } from "./logger.js";

interface TelegramMessage {
  text: string;
  parse_mode?: "HTML" | "Markdown";
}

/**
 * Resolve Telegram settings for a given workspace.
 *
 * Priority:
 *  1. Workspace-specific settings (workspaceId = given id, isActive = true)
 *  2. Global/owner fallback     (workspaceId IS NULL,    isActive = true)
 *  3. null → no notification sent
 */
async function resolveSettings(workspaceId?: string | null) {
  // 1. workspace-specific
  if (workspaceId) {
    const [ws] = await db
      .select()
      .from(telegramSettings)
      .where(
        and(
          eq(telegramSettings.workspaceId, workspaceId),
          eq(telegramSettings.isActive, true),
        ),
      )
      .limit(1);
    if (ws?.botToken && ws?.chatId) return ws;
  }

  // 2. global fallback (workspaceId IS NULL)
  const [global] = await db
    .select()
    .from(telegramSettings)
    .where(
      and(
        isNull(telegramSettings.workspaceId),
        eq(telegramSettings.isActive, true),
      ),
    )
    .limit(1);

  return global ?? null;
}

/**
 * Sends a Telegram message for a specific workspace.
 * Falls back to the global token if no workspace token is configured.
 */
export async function sendTelegramNotification(
  message: TelegramMessage,
  workspaceId?: string | null,
): Promise<boolean> {
  try {
    const settings = await resolveSettings(workspaceId);
    if (!settings?.botToken || !settings?.chatId) return false;

    const apiUrl = `https://api.telegram.org/bot${settings.botToken}/sendMessage`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id:    settings.chatId,
        text:       message.text,
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

// ─── Pipeline notification helpers ───────────────────────────────────────────

export async function notifyPipelineComplete(opts: {
  query:          string;
  leadsFound:     number;
  leadsAnalyzed:  number;
  emailsDrafted:  number;
  durationMs:     number;
  workspaceId?:   string | null;   // ← NEW
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

  await sendTelegramNotification({ text, parse_mode: "HTML" }, opts.workspaceId);
}

export async function notifyPipelineFailed(opts: {
  query:        string;
  error:        string;
  durationMs:   number;
  workspaceId?: string | null;   // ← NEW
}): Promise<void> {
  const durationSec = Math.round(opts.durationMs / 1000);

  const text = [
    `❌ <b>FindX Pipeline Failed</b>`,
    ``,
    `🔍 <b>Query:</b> ${opts.query}`,
    `💥 <b>Error:</b> ${opts.error.slice(0, 200)}`,
    `⏱️ <b>Duration:</b> ${durationSec}s`,
  ].join("\n");

  await sendTelegramNotification({ text, parse_mode: "HTML" }, opts.workspaceId);
}
