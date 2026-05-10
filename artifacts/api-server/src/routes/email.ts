import { Router } from "express";
import { db } from "@workspace/db";
import { emailProviderTokens, smtpConfigs, emailSettings, resendConfigs } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { isResendConfiguredAsync, sendViaResend } from "../lib/resend";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

// Security: all email configuration endpoints require authentication
router.use(requireAuth);

router.get("/email/provider/status", async (_req, res) => {
  try {
    const hasGmailCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const hasResendKey = await isResendConfiguredAsync();

    const [gmailToken] = await db.select().from(emailProviderTokens).where(eq(emailProviderTokens.provider, "gmail"));
    const [smtpConfig] = await db.select().from(smtpConfigs).where(eq(smtpConfigs.id, "default"));
    const [resendConfig] = await db.select().from(resendConfigs).where(eq(resendConfigs.id, "default"));
    const [setting] = await db.select().from(emailSettings).where(eq(emailSettings.id, "default"));

    const resendFromEmail = resendConfig?.fromEmail ?? process.env.EMAIL_FROM ?? null;

    let provider = "none";
    let configured = false;
    let connected = false;
    let email: string | null = null;

    if (setting?.defaultProvider) {
      if (setting.defaultProvider === "smtp" && smtpConfig) {
        provider = "smtp"; configured = true; connected = true; email = smtpConfig.fromEmail;
      } else if (setting.defaultProvider === "gmail" && hasGmailCredentials && gmailToken) {
        provider = "gmail"; configured = true; connected = true; email = gmailToken.email ?? null;
      } else if (setting.defaultProvider === "resend" && hasResendKey) {
        provider = "resend"; configured = true; connected = true; email = resendFromEmail;
      } else {
        provider = "none"; configured = false; connected = false;
      }
    } else if (hasGmailCredentials && gmailToken) {
      provider = "gmail"; configured = true; connected = true; email = gmailToken.email ?? null;
    } else if (hasGmailCredentials) {
      provider = "gmail"; configured = true; connected = false;
    } else if (smtpConfig) {
      provider = "smtp"; configured = true; connected = true; email = smtpConfig.fromEmail;
    } else if (hasResendKey) {
      provider = "resend"; configured = true; connected = true; email = resendFromEmail;
    }

    return res.json({ provider, configured, connected, email });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/email/gmail/connect", async (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: "Gmail OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." });
  }
  return res.status(501).json({ error: "Gmail OAuth flow not implemented in this deployment" });
});

router.post("/email/gmail/disconnect", async (_req, res) => {
  try {
    await db.delete(emailProviderTokens).where(eq(emailProviderTokens.provider, "gmail"));
    return res.json({ disconnected: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/email/settings", async (_req, res) => {
  try {
    const [setting] = await db.select().from(emailSettings).where(eq(emailSettings.id, "default"));
    const [gmailToken] = await db.select().from(emailProviderTokens).where(eq(emailProviderTokens.provider, "gmail"));
    const [smtpConfig] = await db.select().from(smtpConfigs).where(eq(smtpConfigs.id, "default"));
    const [resendConfig] = await db.select().from(resendConfigs).where(eq(resendConfigs.id, "default"));
    const hasResendKey = await isResendConfiguredAsync();

    return res.json({
      defaultProvider: setting?.defaultProvider ?? null,
      providers: {
        gmail: {
          configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          connected: !!gmailToken,
          email: gmailToken?.email ?? null,
        },
        smtp: {
          configured: !!smtpConfig,
          email: smtpConfig?.fromEmail ?? null,
        },
        resend: {
          configured: hasResendKey,
          email: resendConfig?.fromEmail ?? process.env.EMAIL_FROM ?? null,
          source: resendConfig ? "db" : (process.env.RESEND_API_KEY ? "env" : null),
        },
      },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/email/settings", async (req, res) => {
  const schema = z.object({ defaultProvider: z.enum(["resend", "gmail", "smtp"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid provider. Must be resend, gmail, or smtp." });

  try {
    const [existing] = await db.select().from(emailSettings).where(eq(emailSettings.id, "default"));
    if (existing) {
      await db.update(emailSettings).set({ defaultProvider: parsed.data.defaultProvider, updatedAt: new Date() }).where(eq(emailSettings.id, "default"));
    } else {
      await db.insert(emailSettings).values({ id: "default", defaultProvider: parsed.data.defaultProvider });
    }
    return res.json({ defaultProvider: parsed.data.defaultProvider });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/email/smtp/config", async (_req, res) => {
  try {
    const [config] = await db.select().from(smtpConfigs).where(eq(smtpConfigs.id, "default"));
    if (!config) return res.json({ configured: false });
    // Security: mask SMTP username to avoid credential exposure
    const maskedUser = config.user ? `${config.user.slice(0, 3)}${"*".repeat(Math.max(4, config.user.length - 3))}` : null;
    return res.json({ configured: true, host: config.host, port: config.port, secure: config.secure, user: maskedUser, fromEmail: config.fromEmail, fromName: config.fromName });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/email/smtp/config", async (req, res) => {
  const schema = z.object({
    host: z.string().min(1),
    port: z.number().int().min(1).max(65535).default(465),
    secure: z.boolean().default(true),
    user: z.string().min(1),
    password: z.string().min(1),
    fromEmail: z.string().email(),
    fromName: z.string().min(1).default("FindX"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const [existing] = await db.select().from(smtpConfigs).where(eq(smtpConfigs.id, "default"));
    let config;
    if (existing) {
      [config] = await db.update(smtpConfigs).set({ ...parsed.data, updatedAt: new Date() }).where(eq(smtpConfigs.id, "default")).returning();
    } else {
      [config] = await db.insert(smtpConfigs).values({ id: "default", ...parsed.data }).returning();
    }
    return res.json({ configured: true, host: config!.host, port: config!.port, secure: config!.secure, user: config!.user, fromEmail: config!.fromEmail, fromName: config!.fromName });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/email/smtp/config", async (_req, res) => {
  try {
    await db.delete(smtpConfigs).where(eq(smtpConfigs.id, "default"));
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/email/smtp/test", async (_req, res) => {
  return res.json({ success: false, error: "SMTP test not implemented. Configure SMTP credentials and retry." });
});

const sendEmailSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(500),
  html: z.string().min(1),
  text: z.string().optional(),
  from: z.string().optional(),
  replyTo: z.string().email().optional(),
});

router.post("/email/send", async (req, res) => {
  const parsed = sendEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
  }

  const configured = await isResendConfiguredAsync();
  if (!configured) {
    return res.status(503).json({ error: "No email provider configured. Set RESEND_API_KEY or configure it in Settings." });
  }

  try {
    const result = await sendViaResend(parsed.data);
    return res.json({ success: true, id: result.id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/email/resend/config", async (_req, res) => {
  try {
    const [config] = await db.select().from(resendConfigs).where(eq(resendConfigs.id, "default"));
    if (config) {
      return res.json({ configured: true, fromEmail: config.fromEmail, source: "db" });
    }
    if (process.env.RESEND_API_KEY) {
      return res.json({ configured: true, fromEmail: process.env.EMAIL_FROM ?? null, source: "env" });
    }
    return res.json({ configured: false });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/email/resend/config", async (req, res) => {
  const schema = z.object({
    apiKey: z.string().min(1),
    fromEmail: z.string().min(1).default("FindX <onboarding@resend.dev>"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const [existing] = await db.select().from(resendConfigs).where(eq(resendConfigs.id, "default"));
    let config;
    if (existing) {
      [config] = await db.update(resendConfigs).set({ ...parsed.data, updatedAt: new Date() }).where(eq(resendConfigs.id, "default")).returning();
    } else {
      [config] = await db.insert(resendConfigs).values({ id: "default", ...parsed.data }).returning();
    }
    return res.json({ configured: true, fromEmail: config!.fromEmail, source: "db" });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/email/resend/config", async (_req, res) => {
  try {
    await db.delete(resendConfigs).where(eq(resendConfigs.id, "default"));
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/email/resend/test", async (_req, res) => {
  const isConfigured = await isResendConfiguredAsync();
  if (!isConfigured) {
    return res.status(503).json({ ok: false, error: "Resend API key is not configured" });
  }
  try {
    const { getResendClientAsync } = await import("../lib/resend");
    const client = await getResendClientAsync();
    await client.domains.list();
    return res.json({ ok: true, message: "Resend connection successful" });
  } catch (err) {
    return res.json({ ok: false, error: err instanceof Error ? err.message : "Connection test failed" });
  }
});

export default router;
