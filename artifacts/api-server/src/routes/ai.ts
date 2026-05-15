import { Router } from "express";
import { db } from "@workspace/db";
import { aiProviders } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";
import { integrationTestLimiter } from "../middleware/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";
import { safeError, extractErrorMessage } from "../lib/safe-error.js";
import { logger } from "../lib/logger.js";
import { decryptSecret, encryptNullableSecret, encryptSecret, maskSecret } from "../lib/secret-crypto.js";

const router = Router();

// All AI provider endpoints require authentication
router.use(requireAuth);

function isAdminRole(req: { user?: { role?: string } }): boolean {
  return req.user?.role === "admin";
}

const PROVIDER_DEFAULTS: Record<string, { defaultModel: string; defaultBaseUrl?: string }> = {
  openai:     { defaultModel: "gpt-4o",                          defaultBaseUrl: "https://api.openai.com/v1" },
  anthropic:  { defaultModel: "claude-sonnet-4-20250514",        defaultBaseUrl: "https://api.anthropic.com" },
  gemini:     { defaultModel: "gemini-2.0-flash",                defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  groq:       { defaultModel: "llama-3.3-70b-versatile",         defaultBaseUrl: "https://api.groq.com/openai/v1" },
  deepseek:   { defaultModel: "deepseek-chat",                   defaultBaseUrl: "https://api.deepseek.com/v1" },
  glm:        { defaultModel: "glm-4",                           defaultBaseUrl: process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4" },
  minimax:    { defaultModel: "MiniMax-Text-01",                  defaultBaseUrl: "https://api.minimax.chat/v1" },
  kimi:       { defaultModel: "moonshot-v1-8k",                  defaultBaseUrl: "https://api.moonshot.cn/v1" },
  ollama:     { defaultModel: "llama3",                          defaultBaseUrl: "http://localhost:11434/v1" },
  openrouter: { defaultModel: "google/gemini-2.0-flash",         defaultBaseUrl: "https://openrouter.ai/api/v1" },
  google:     { defaultModel: "gemini-2.5-flash",                defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai" },
  mistral:    { defaultModel: "mistral-large-latest",            defaultBaseUrl: "https://api.mistral.ai/v1" },
  together:   { defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", defaultBaseUrl: "https://api.together.xyz/v1" },
  custom:     { defaultModel: "",                                defaultBaseUrl: "" },
};


/**
 * Returns the active provider for a specific workspace only.
 * No cross-workspace fallback.
 */
async function getActiveProvider(workspaceId: string) {
  const [defaultProv] = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.workspaceId, workspaceId), eq(aiProviders.isDefault, true)))
    .limit(1);
  if (defaultProv) {
    return { id: defaultProv.id, name: defaultProv.name, providerType: defaultProv.providerType, baseUrl: defaultProv.baseUrl, model: defaultProv.model };
  }

  const [anyProv] = await db
    .select()
    .from(aiProviders)
    .where(and(eq(aiProviders.workspaceId, workspaceId), eq(aiProviders.isActive, true)))
    .limit(1);
  if (anyProv) {
    return { id: anyProv.id, name: anyProv.name, providerType: anyProv.providerType, baseUrl: anyProv.baseUrl, model: anyProv.model };
  }

  // Env fallback (not workspace-specific — used only when no DB provider configured yet)
  const provType = process.env.GEMINI_API_KEY ? "gemini"
    : process.env.GLM_API_KEY ? "glm"
    : process.env.OPENAI_API_KEY ? "openai"
    : "anthropic";
  return {
    id: null,
    name: `${provType} (env)`,
    providerType: provType,
    baseUrl: process.env.GLM_BASE_URL || PROVIDER_DEFAULTS[provType]?.defaultBaseUrl || null,
    model: PROVIDER_DEFAULTS[provType]?.defaultModel || "default",
    isEnvFallback: true,
  };
}

// ── GET /ai/providers ──────────────────────────────────────────────────────
router.get("/ai/providers", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const rows = await db
      .select()
      .from(aiProviders)
      .where(eq(aiProviders.workspaceId, wsId))
      .orderBy(desc(aiProviders.isDefault));
    const masked = rows.map((p) => ({ ...p, apiKey: maskSecret(p.apiKey) }));
    const active = await getActiveProvider(wsId);
    return res.json({
      providers: masked,
      defaults:  PROVIDER_DEFAULTS,
      activeProvider: {
        name:          active.name,
        providerType:  active.providerType,
        baseUrl:       active.baseUrl,
        model:         active.model,
        isEnvFallback: !active.id,
      },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

const aiProviderSchema = z.object({
  name:         z.string().min(1).max(100),
  providerType: z.enum(["glm", "anthropic", "openai", "ollama", "minimax", "kimi", "deepseek", "groq", "gemini", "openrouter", "google", "mistral", "together", "custom"]),
  apiKey:       z.string().optional(),
  baseUrl:      z.string().optional(),
  model:        z.string().min(1),
  temperature:  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().min(0).max(2).optional()
  ).nullable().optional(),
  maxTokens:    z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 4096 : Number(v)),
    z.number().int().min(1).max(65536)
  ).default(4096),
  isActive:     z.boolean().default(true),
});

// ── POST /ai/providers ─────────────────────────────────────────────────────
router.post("/ai/providers", async (req, res) => {
  const parsed = aiProviderSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const data        = parsed.data;
    const defaults    = PROVIDER_DEFAULTS[data.providerType];
    const workspaceId = req.user!.activeWorkspaceId ?? null;

    const [provider] = await db.insert(aiProviders).values({
      workspaceId,
      name:         data.name,
      providerType: data.providerType,
      apiKey:       encryptNullableSecret(data.apiKey),
      baseUrl:      data.baseUrl || defaults?.defaultBaseUrl || null,
      model:        data.model,
      temperature:  data.temperature !== undefined && data.temperature !== null ? String(data.temperature) : null,
      maxTokens:    data.maxTokens,
      isActive:     data.isActive,
      isDefault:    false,
    }).returning();
    return res.json({ provider: { ...provider, apiKey: maskSecret(provider.apiKey) } });
  } catch (err: any) {
    const message = extractErrorMessage(err);
    logger.error({ err }, "POST /ai/providers failed");
    return res.status(500).json({ error: message });
  }
});

// ── PATCH /ai/providers/:id ────────────────────────────────────────────────
router.patch("/ai/providers/:id", async (req, res) => {
  const parsed = aiProviderSchema.partial().safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const wsId = req.user!.activeWorkspaceId;
    // Verify ownership: provider must belong to this workspace
    const [existing] = await db
      .select({ id: aiProviders.id })
      .from(aiProviders)
      .where(and(eq(aiProviders.id, String(req.params.id)), eq(aiProviders.workspaceId, wsId)));
    if (!existing) return res.status(404).json({ error: "Provider not found" });

    const data   = parsed.data;
    const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.temperature !== undefined) update.temperature = data.temperature === null ? null : String(data.temperature);
    if (data.apiKey) update.apiKey = encryptSecret(data.apiKey);
    else delete update.apiKey;

    const [provider] = await db
      .update(aiProviders)
      .set(update as Partial<typeof aiProviders.$inferInsert>)
      .where(and(eq(aiProviders.id, String(req.params.id)), eq(aiProviders.workspaceId, wsId)))
      .returning();
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    return res.json({ provider: { ...provider, apiKey: maskSecret(provider.apiKey) } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── DELETE /ai/providers/:id ───────────────────────────────────────────────
router.delete("/ai/providers/:id", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    // Scoped delete: only delete if it belongs to this workspace
    const [provider] = await db
      .delete(aiProviders)
      .where(and(eq(aiProviders.id, String(req.params.id)), eq(aiProviders.workspaceId, wsId)))
      .returning();
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    return res.json({ deleted: true, name: provider.name });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── POST /ai/providers/:id/test ────────────────────────────────────────────
router.post("/ai/providers/:id/test", integrationTestLimiter, async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    // Only test providers that belong to this workspace
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.id, String(req.params.id)), eq(aiProviders.workspaceId, wsId)));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    const decryptedApiKey = decryptSecret(provider.apiKey);
    if (!decryptedApiKey && provider.providerType !== "ollama") {
      return res.json({ ok: false, error: "No API key configured for this provider" });
    }

    const PROVIDER_BASE_URLS: Record<string, string> = {
      openai:     "https://api.openai.com/v1",
      anthropic:  "https://api.anthropic.com/v1",
      gemini:     "https://generativelanguage.googleapis.com/v1beta/openai",
      google:     "https://generativelanguage.googleapis.com/v1beta/openai",
      groq:       "https://api.groq.com/openai/v1",
      deepseek:   "https://api.deepseek.com/v1",
      glm:        "https://open.bigmodel.cn/api/paas/v4",
      minimax:    "https://api.minimax.chat/v1",
      kimi:       "https://api.moonshot.cn/v1",
      ollama:     "http://localhost:11434/v1",
      openrouter: "https://openrouter.ai/api/v1",
      mistral:    "https://api.mistral.ai/v1",
      together:   "https://api.together.xyz/v1",
    };

    // ── SSRF guard ────────────────────────────────────────────────────────────
    // Block requests to localhost, private IP ranges, link-local and metadata endpoints.
    // Only the "custom" provider type is allowed to use a user-supplied baseUrl;
    // all known provider types are forced to use the hardcoded allowlist above.
    function isSsrfUrl(rawUrl: string): boolean {
      try {
        const u = new URL(rawUrl);
        const hostname = u.hostname.toLowerCase();
        // Block non-HTTP(S) schemes
        if (!["http:", "https:"].includes(u.protocol)) return true;
        // Localhost variants
        if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") return true;
        // Private RFC-1918 ranges: 10.x, 172.16-31.x, 192.168.x
        if (/^10\./.test(hostname)) return true;
        if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return true;
        if (/^192\.168\./.test(hostname)) return true;
        // Link-local 169.254.x (AWS/GCP metadata)
        if (/^169\.254\./.test(hostname)) return true;
        // IPv6 private / link-local
        if (/^(fc|fd|fe80)/i.test(hostname)) return true;
        // Common metadata endpoints
        if (hostname === "metadata.google.internal" || hostname === "169.254.169.254") return true;
        // 0.0.0.0
        if (hostname === "0.0.0.0") return true;
        return false;
      } catch {
        return true; // unparseable URL → block
      }
    }

    // For known provider types use the hardcoded base URL to prevent SSRF.
    // "custom" and "ollama" are allowed to use the stored baseUrl (with SSRF check).
    let resolvedBaseURL: string;
    if (provider.providerType !== "custom" && provider.providerType !== "ollama") {
      resolvedBaseURL = PROVIDER_BASE_URLS[provider.providerType] ?? "https://api.openai.com/v1";
    } else {
      const candidateUrl = provider.baseUrl || PROVIDER_BASE_URLS[provider.providerType] || "https://api.openai.com/v1";
      if (isSsrfUrl(candidateUrl)) {
        return res.json({ ok: false, error: "The configured base URL resolves to a blocked/private address" });
      }
      resolvedBaseURL = candidateUrl;
    }

    const baseURL = resolvedBaseURL;
    const apiKey  = decryptedApiKey || "ollama";
    const headers: Record<string, string> = {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${apiKey}`,
    };
    if (provider.providerType === "openrouter") {
      headers["HTTP-Referer"] = "https://find-x-agents-findx.vercel.app";
      headers["X-Title"]      = "FindX";
    }

    let ok = false;
    let errorMsg: string | undefined;
    try {
      const response = await fetch(`${baseURL}/chat/completions`, {
        method:  "POST",
        headers,
        body:    JSON.stringify({ model: provider.model, messages: [{ role: "user", content: "Hi" }], max_tokens: 5 }),
        signal:  AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        ok = true;
      } else {
        const body = await response.json().catch(() => ({}));
        errorMsg = (body as any)?.error?.message ?? `HTTP ${response.status}`;
      }
    } catch (fetchErr: any) {
      errorMsg = fetchErr?.message ?? "Connection failed";
    }
    return res.json({ ok, model: provider.model, ...(errorMsg ? { error: errorMsg } : {}) });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── POST /ai/providers/:id/default ────────────────────────────────────────
router.post("/ai/providers/:id/default", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;

    // Verify the provider belongs to this workspace
    const [provider] = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.id, String(req.params.id)), eq(aiProviders.workspaceId, wsId)));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    if (!provider.isActive) return res.status(400).json({ error: "Cannot set inactive provider as default" });

    // Reset isDefault ONLY within this workspace
    await db
      .update(aiProviders)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(aiProviders.workspaceId, wsId));

    await db
      .update(aiProviders)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(and(eq(aiProviders.id, String(req.params.id)), eq(aiProviders.workspaceId, wsId)));

    return res.json({ success: true, providerId: req.params.id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ── GET /ai/providers/defaults ─────────────────────────────────────────────
router.get("/ai/providers/defaults", (_req, res) => {
  return res.json({ defaults: PROVIDER_DEFAULTS });
});

// ── POST /ai/providers/seed-from-env ──────────────────────────────────────
router.post("/ai/providers/seed-from-env", async (req, res) => {
  if (!isAdminRole(req))
    return res.status(403).json({ error: "Forbidden — admin only" });

  try {
    const wsId   = req.user!.activeWorkspaceId;
    const results: string[] = [];

    if (process.env.GEMINI_API_KEY) {
      const [existing] = await db
        .select()
        .from(aiProviders)
        .where(and(eq(aiProviders.workspaceId, wsId), eq(aiProviders.providerType, "gemini")))
        .limit(1);
      if (!existing) {
        const defaults = PROVIDER_DEFAULTS["gemini"]!;
        await db.insert(aiProviders).values({
          workspaceId:  wsId,
          name:         "Gemini (env)",
          providerType: "gemini",
          apiKey:       encryptSecret(process.env.GEMINI_API_KEY),
          baseUrl:      defaults.defaultBaseUrl ?? null,
          model:        defaults.defaultModel,
          maxTokens:    4096,
          isActive:     true,
          isDefault:    true,
        });
        results.push("gemini");
      }
    }
    return res.json({ seeded: results });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
