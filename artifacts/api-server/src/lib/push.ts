import { db } from "@workspace/db";
import { pushTokens } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger.js";

export interface PushMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushToUser(userId: string, message: PushMessage): Promise<void> {
  let tokens: { token: string }[];
  try {
    tokens = await db
      .select({ token: pushTokens.token })
      .from(pushTokens)
      .where(eq(pushTokens.userId, userId));
  } catch {
    return;
  }

  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default" as const,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error({ status: res.status, body }, "Expo push API error");
    }
  } catch (err) {
    logger.error({ err }, "sendPushToUser: fetch failed");
  }
}

export async function sendPushBroadcast(message: PushMessage): Promise<void> {
  let tokens: { token: string }[];
  try {
    tokens = await db.select({ token: pushTokens.token }).from(pushTokens);
  } catch {
    return;
  }
  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default" as const,
    title: message.title,
    body: message.body,
    data: message.data ?? {},
  }));

  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    logger.error({ err }, "sendPushBroadcast: fetch failed");
  }
}
