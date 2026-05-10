import { Resend } from "resend";
import { db, resendConfigs } from "@workspace/db";
import { eq } from "drizzle-orm";

let _client: Resend | null = null;
let _cachedKey: string | null = null;

async function getResendApiKey(): Promise<string | null> {
  try {
    const [config] = await db.select().from(resendConfigs).where(eq(resendConfigs.id, "default"));
    if (config?.apiKey) return config.apiKey;
  } catch { /* fall through */ }
  return process.env.RESEND_API_KEY ?? null;
}

async function getResendFromEmail(): Promise<string> {
  try {
    const [config] = await db.select().from(resendConfigs).where(eq(resendConfigs.id, "default"));
    if (config?.fromEmail) return config.fromEmail;
  } catch { /* fall through */ }
  return process.env.EMAIL_FROM ?? "FindX <onboarding@resend.dev>";
}

export async function getResendClientAsync(): Promise<Resend> {
  const key = await getResendApiKey();
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

export async function isResendConfiguredAsync(): Promise<boolean> {
  const key = await getResendApiKey();
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

export async function sendViaResend(opts: SendEmailOptions): Promise<{ id: string }> {
  const client = await getResendClientAsync();
  const from = opts.from ?? (await getResendFromEmail());

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
