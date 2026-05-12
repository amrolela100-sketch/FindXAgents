import { Router } from "express";
import { db } from "@workspace/db";
import { aiProviders } from "@workspace/db";
import { eq, desc, isNull } from "drizzle-orm";
import { z } from "zod";
import { integrationTestLimiter } from "../middleware/rate-limit.js";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

// All AI provider endpoints require authentication
router.use(requireAuth);

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
function isAdmin(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

const PROVIDER_DEFAULTS: Record<string, { defaultModel: string; defaultBaseUrl?: string }> = {
  openai: { defaultModel: "gpt-4o", defaultBaseUrl: "https://api.openai.com/v1" },
  anthropic: { defaultModel: "claude-sonnet-4-20250514", defaultBaseUrl: "https://api.anthropic.com" },
  gemini: { defaultModel: "gemini-1.5-flash", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  groq: { defaultModel: "llama-3.3-70b-versatile", defaultBaseUrl: "https://api.groq.com/openai/v1" },
  deepseek: { defaultModel: "deepseek-chat", defaultBaseUrl: "https://api.deepseek.com/v1" },
  glm: { defaultModel: "glm-4", defaultBaseUrl: process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4" },
  minimax: { defaultModel: "MiniMax-Text-01", defaultBaseUrl: "https://api.minimax.chat/v1" },
  kimi: { defaultModel: "moonshot-v1-8k", defaultBaseUrl: "https://api.moonshot.cn/v1" },
  ollama: { defaultModel: "llama3", defaultBaseUrl: "http://localhost:11434/v1" },
  openrouter: { defaultModel: "google/gemini-2.0-flash", defaultBaseUrl: "https://openrouter.ai/api/v1" },
  google: { defaultModel: "gemini-2.0-flash", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta" },
  mistral: { defaultModel: "mistral-large-latest", defaultBaseUrl: "https://api.mistral.ai/v1" },
  together: { defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo", defaultBaseUrl: "https://api.together.xyz/v1" },
  custom: { defaultModel: "", defaultBaseUrl: "" },
};

function maskKey(key: string | null | undefined) {
  if (!key) return null;
  return `${key.slice(0, 8)}${"*".repeat(8)}`;
}

async function getActiveProvider() {
  const [defaultProv] = await db.select().from(aiProviders).where(eq(aiProviders.isDefault, true)).limit(1);
  if (defaultProv) {
    return { id: defaultProv.id, name: defaultProv.name, providerType: defaultProv.providerType, baseUrl: defaultProv.baseUrl, model: defaultProv.model };
  }

  const [anyProv] = await db.select().from(aiProviders).where(eq(aiProviders.isActive, true)).limit(1);
  if (anyProv) {
    return { id: anyProv.id, name: anyProv.name, providerType: anyProv.providerType, baseUrl: anyProv.baseUrl, model: anyProv.model };
  }

  const envKey = process.env.GEMINI_API_KEY || process.env.GLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
  const provType = process.env.GEMINI_API_KEY ? "gemini"
    : process.env.GLM_API_KEY ? "glm"
    : process.env.OPENAI_API_KEY ? "openai"
    : "anthropic";
  void envKey;
  return {
    id: null,
    name: `${provType} (env)`,
    providerType: provType,
    baseUrl: process.env.GLM_BASE_URL || PROVIDER_DEFAULTS[provType]?.defaultBaseUrl || null,
    model: PROVIDER_DEFAULTS[provType]?.defaultModel || "default",
    isEnvFallback: true,
  };
}

router.get("/ai/providers", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const rows = await db.select().from(aiProviders).where(eq(aiProviders.workspaceId, wsId)).orderBy(desc(aiProviders.isDefault));
    const masked = rows.map((p) => ({ ...p, apiKey: maskKey(p.apiKey) }));
    const active = await getActiveProvider();
    return res.json({
      providers: masked,
      defaults: PROVIDER_DEFAULTS,
      activeProvider: {
        name: active.name,
        providerType: active.providerType,
        baseUrl: active.baseUrl,
        model: active.model,
        isEnvFallback: !active.id,
      },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

const aiProviderSchema = z.object({
  name: z.string().min(1).max(100),
  providerType: z.enum(["glm", "anthropic", "openai", "ollama", "minimax", "kimi", "deepseek", "groq", "gemini", "openrouter", "google", "mistral", "together", "custom"]),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2).optional().nullable(),
  maxTokens: z.number().int().min(1).max(65536).default(4096),
  isActive: z.boolean().default(true),
});

router.post("/ai/providers", async (req, res) => {
  try {
    const data = aiProviderSchema.parse(req.body);
    const defaults = PROVIDER_DEFAULTS[data.providerType];
    const [provider] = await db.insert(aiProviders).values({
      workspaceId: req.user!.activeWorkspaceId,
      name: data.name,
      providerType: data.providerType,
      apiKey: data.apiKey ?? null,
      baseUrl: data.baseUrl || defaults?.defaultBaseUrl || null,
      model: data.model,
      temperature: data.temperature !== undefined && data.temperature !== null ? String(data.temperature) : null,
      maxTokens: data.maxTokens,
      isActive: data.isActive,
      isDefault: false,
    }).returning();
    return res.json({ provider: { ...provider, apiKey: maskKey(provider.apiKey) } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.patch("/ai/providers/:id", async (req, res) => {
  try {
    const data = aiProviderSchema.partial().parse(req.body);
    const update: Record<string, unknown> = { ...data, updatedAt: new Date() };
    if (data.temperature !== undefined) update.temperature = data.temperature === null ? null : String(data.temperature);

    const [provider] = await db.update(aiProviders).set(update as Partial<typeof aiProviders.$inferInsert>).where(eq(aiProviders.id, String(req.params.id))).returning();
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    return res.json({ provider: { ...provider, apiKey: maskKey(provider.apiKey) } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/ai/providers/:id", async (req, res) => {
  try {
    const [provider] = await db.delete(aiProviders).where(eq(aiProviders.id, String(req.params.id))).returning();
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    return res.json({ deleted: true, name: provider.name });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/ai/providers/:id/test", integrationTestLimiter, async (req, res) => {
  try {
    const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, String(req.params.id)));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    if (!provider.apiKey && provider.providerType !== "ollama") {
      return res.json({ ok: false, error: "No API key configured for this provider" });
    }
    return res.json({ ok: true, model: provider.model });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/ai/providers/:id/default", async (req, res) => {
  try {
    const [provider] = await db.select().from(aiProviders).where(eq(aiProviders.id, String(req.params.id)));
    if (!provider) return res.status(404).json({ error: "Provider not found" });
    if (!provider.isActive) return res.status(400).json({ error: "Cannot set inactive provider as default" });

    await db.update(aiProviders).set({ isDefault: false, updatedAt: new Date() });
    await db.update(aiProviders).set({ isDefault: true, updatedAt: new Date() }).where(eq(aiProviders.id, String(req.params.id)));

    return res.json({ success: true, providerId: req.params.id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/ai/providers/defaults", (_req, res) => {
  return res.json({ defaults: PROVIDER_DEFAULTS });
});

router.post("/ai/providers/seed-from-env", async (req, res) => {
  if (!isAdmin(req.user!.email)) {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  try {
    const results: string[] = [];

    if (process.env.GEMINI_API_KEY) {
      const [existing] = await db.select().from(aiProviders)
        .where(eq(aiProviders.providerType, "gemini")).limit(1);
      if (!existing) {
        const defaults = PROVIDER_DEFAULTS["gemini"]!;
        await db.insert(aiProviders).values({
          name: "Gemini (env)",
          providerType: "gemini",
          apiKey: process.env.GEMINI_API_KEY,
          baseUrl: defaults.defaultBaseUrl ?? null,
          model: defaults.defaultModel,
          maxTokens: 4096,
          isActive: true,
          isDefault: true,
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

