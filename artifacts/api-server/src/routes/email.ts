import { Router } from "express";
import { db } from "@workspace/db";
import { emailProviderTokens, smtpConfigs, emailSettings, resendConfigs } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { isResendConfiguredAsync, sendViaResend } from "../lib/resend";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();
router.use(requireAuth);

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getSmtpConfig(wsId: string) {
  const [ws] = await db.select().from(smtpConfigs).where(eq(smtpConfigs.workspaceId, wsId)).limit(1);
  return ws ?? null;
}

async function getResendConfig(wsId: string) {
  const [ws] = await db.select().from(resendConfigs).where(eq(resendConfigs.workspaceId, wsId)).limit(1);
  if (ws) return ws;
  // global fallback
  const [global] = await db.select().from(resendConfigs).where(isNull(resendConfigs.workspaceId)).limit(1);
  return global ?? null;
}

async function getEmailSettings(wsId: string) {
  const [ws] = await db.select().from(emailSettings).where(eq(emailSettings.workspaceId, wsId)).limit(1);
  return ws ?? null;
}

// ─── routes ──────────────────────────────────────────────────────────────────

router.get("/email/provider/status", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const hasGmailCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const hasResendKey = await isResendConfiguredAsync();
    const [gmailToken]  = await db.select().from(emailProviderTokens).where(eq(emailProviderTokens.provider, "gmail"));
    const smtpConfig    = await getSmtpConfig(wsId);
    const resendConfig  = await getResendConfig(wsId);
    const setting       = await getEmailSettings(wsId);
    const resendFromEmail = resendConfig?.fromEmail ?? process.env.EMAIL_FROM ?? null;

    let provider = "none", configured = false, connected = false, email: string | null = null;

    if (setting?.defaultProvider) {
      if (setting.defaultProvider === "smtp" && smtpConfig) {
        provider = "smtp"; configured = true; connected = true; email = smtpConfig.fromEmail;
      } else if (setting.defaultProvider === "gmail" && hasGmailCredentials && gmailToken) {
        provider = "gmail"; configured = true; connected = true; email = gmailToken.email ?? null;
      } else if (setting.defaultProvider === "resend" && hasResendKey) {
        provider = "resend"; configured = true; connected = true; email = resendFromEmail;
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
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET)
    return res.status(400).json({ error: "Gmail OAuth not configured." });
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

router.get("/email/settings", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const setting      = await getEmailSettings(wsId);
    const smtpConfig   = await getSmtpConfig(wsId);
    const resendConfig = await getResendConfig(wsId);
    const hasResendKey = await isResendConfiguredAsync();
    const [gmailToken] = await db.select().from(emailProviderTokens).where(eq(emailProviderTokens.provider, "gmail"));

    return res.json({
      defaultProvider: setting?.defaultProvider ?? null,
      providers: {
        gmail: {
          configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
          connected:  !!gmailToken,
          email:      gmailToken?.email ?? null,
        },
        smtp: {
          configured: !!smtpConfig,
          email:      smtpConfig?.fromEmail ?? null,
        },
        resend: {
          configured: hasResendKey,
          email:      resendConfig?.fromEmail ?? process.env.EMAIL_FROM ?? null,
          source:     resendConfig ? "db" : (process.env.RESEND_API_KEY ? "env" : null),
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
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid provider. Must be resend, gmail, or smtp." });

  try {
    const wsId = req.user!.activeWorkspaceId;
    const existing = await getEmailSettings(wsId);
    if (existing) {
      await db.update(emailSettings)
        .set({ defaultProvider: parsed.data.defaultProvider, updatedAt: new Date() })
        .where(eq(emailSettings.workspaceId, wsId));
    } else {
      await db.insert(emailSettings).values({ workspaceId: wsId, defaultProvider: parsed.data.defaultProvider });
    }
    return res.json({ defaultProvider: parsed.data.defaultProvider });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/email/smtp/config", async (req, res) => {
  try {
    const config = await getSmtpConfig(req.user!.activeWorkspaceId);
    if (!config) return res.json({ configured: false });
    const maskedUser = config.user ? `${config.user.slice(0, 3)}${"*".repeat(Math.max(4, config.user.length - 3))}` : null;
    return res.json({ configured: true, host: config.host, port: config.port, secure: config.secure, user: maskedUser, fromEmail: config.fromEmail, fromName: config.fromName });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/email/smtp/config", async (req, res) => {
  const schema = z.object({
    host:      z.string().min(1),
    port:      z.number().int().min(1).max(65535).default(465),
    secure:    z.boolean().default(true),
    user:      z.string().min(1),
    password:  z.string().min(1),
    fromEmail: z.string().email(),
    fromName:  z.string().min(1).default("FindX"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const wsId = req.user!.activeWorkspaceId;
    const existing = await getSmtpConfig(wsId);
    let config;
    if (existing) {
      [config] = await db.update(smtpConfigs)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(smtpConfigs.workspaceId, wsId)).returning();
    } else {
      [config] = await db.insert(smtpConfigs).values({ workspaceId: wsId, ...parsed.data }).returning();
    }
    return res.json({ configured: true, host: config!.host, port: config!.port, secure: config!.secure, user: config!.user, fromEmail: config!.fromEmail, fromName: config!.fromName });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/email/smtp/config", async (req, res) => {
  try {
    await db.delete(smtpConfigs).where(eq(smtpConfigs.workspaceId, req.user!.activeWorkspaceId));
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/email/smtp/test", async (_req, res) => {
  return res.json({ success: false, error: "SMTP test not implemented." });
});

const sendEmailSchema = z.object({
  to:      z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1).max(500),
  html:    z.string().min(1),
  text:    z.string().optional(),
  from:    z.string().optional(),
  replyTo: z.string().email().optional(),
});

router.post("/email/send", async (req, res) => {
  const parsed = sendEmailSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

  const configured = await isResendConfiguredAsync();
  if (!configured)
    return res.status(503).json({ error: "No email provider configured." });

  try {
    const result = await sendViaResend(parsed.data);
    return res.json({ success: true, id: result.id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/email/resend/config", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const config = await getResendConfig(wsId);
    if (config) return res.json({ configured: true, fromEmail: config.fromEmail, source: "db" });
    if (process.env.RESEND_API_KEY) return res.json({ configured: true, fromEmail: process.env.EMAIL_FROM ?? null, source: "env" });
    return res.json({ configured: false });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/email/resend/config", async (req, res) => {
  const schema = z.object({
    apiKey:    z.string().min(1),
    fromEmail: z.string().min(1).default("FindX <onboarding@resend.dev>"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const wsId = req.user!.activeWorkspaceId;
    const existing = await getResendConfig(wsId);
    let config;
    if (existing && existing.workspaceId === wsId) {
      [config] = await db.update(resendConfigs)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(eq(resendConfigs.workspaceId, wsId)).returning();
    } else {
      [config] = await db.insert(resendConfigs).values({ workspaceId: wsId, ...parsed.data }).returning();
    }
    return res.json({ configured: true, fromEmail: config!.fromEmail, source: "db" });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/email/resend/config", async (req, res) => {
  try {
    await db.delete(resendConfigs).where(eq(resendConfigs.workspaceId, req.user!.activeWorkspaceId));
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/email/resend/test", async (_req, res) => {
  const isConfigured = await isResendConfiguredAsync();
  if (!isConfigured)
    return res.status(503).json({ ok: false, error: "Resend API key is not configured" });
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
