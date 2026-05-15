import { Resend } from "resend";
import { db, resendConfigs } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { decryptSecret } from "./secret-crypto.js";

let _client: Resend | null = null;
let _cachedKey: string | null = null;

/**
 * Resolve Resend API key — workspace config → global DB config → env var.
 * Pass workspaceId to get the workspace-specific key.
 */
async function getResendApiKey(workspaceId?: string | null): Promise<string | null> {
  try {
    // 1. Workspace-specific config
    if (workspaceId) {
      const [wsCfg] = await db.select({ apiKey: resendConfigs.apiKey })
        .from(resendConfigs)
        .where(eq(resendConfigs.workspaceId, workspaceId))
        .limit(1);
      if (wsCfg?.apiKey) return decryptSecret(wsCfg.apiKey);
    }
    // 2. Global / owner-level config (workspaceId IS NULL)
    const [globalCfg] = await db.select({ apiKey: resendConfigs.apiKey })
      .from(resendConfigs)
      .where(isNull(resendConfigs.workspaceId))
      .limit(1);
    if (globalCfg?.apiKey) return decryptSecret(globalCfg.apiKey);
  } catch { /* fall through */ }
  // 3. Environment variable fallback
  return process.env.RESEND_API_KEY ?? null;
}

async function getResendFromEmail(workspaceId?: string | null): Promise<string> {
  try {
    if (workspaceId) {
      const [wsCfg] = await db.select({ fromEmail: resendConfigs.fromEmail })
        .from(resendConfigs)
        .where(eq(resendConfigs.workspaceId, workspaceId))
        .limit(1);
      if (wsCfg?.fromEmail) return wsCfg.fromEmail;
    }
    const [globalCfg] = await db.select({ fromEmail: resendConfigs.fromEmail })
      .from(resendConfigs)
      .where(isNull(resendConfigs.workspaceId))
      .limit(1);
    if (globalCfg?.fromEmail) return globalCfg.fromEmail;
  } catch { /* fall through */ }
  return process.env.EMAIL_FROM ?? "FindX <onboarding@resend.dev>";
}

export async function getResendClientAsync(workspaceId?: string | null): Promise<Resend> {
  const key = await getResendApiKey(workspaceId);
  if (!key) throw new Error("Resend API key is not configured");
  if (!_client || _cachedKey !== key) {
    _client = new Resend(key);
    _cachedKey = key;
  }
  return _client;
}

export function getResendClient(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY);
    _cachedKey = process.env.RESEND_API_KEY;
  }
  return _client;
}

export async function isResendConfiguredAsync(workspaceId?: string | null): Promise<boolean> {
  const key = await getResendApiKey(workspaceId);
  return !!key;
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

export async function sendViaResend(opts: SendEmailOptions, workspaceId?: string | null): Promise<{ id: string }> {
  const client = await getResendClientAsync(workspaceId);
  const from = opts.from ?? (await getResendFromEmail(workspaceId));

  const { data, error } = await client.emails.send({
    from,
    to: Array.isArray(opts.to) ? opts.to : [opts.to],
    subject: opts.subject,
    html: opts.html,
    ...(opts.text && { text: opts.text }),
    ...(opts.replyTo && { reply_to: opts.replyTo }),
  });

  if (error || !data) {
    throw new Error(error?.message ?? "Resend: unknown send error");
  }
  return { id: data.id };
}
