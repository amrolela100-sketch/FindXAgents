import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";
import { db } from "@workspace/db";
import { aiProviders } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are FindX Assistant — a smart, friendly AI built into the FindX B2B Prospecting platform.

Your job is to help users get the most out of FindX. You know everything about:

## FindX AI Pipeline (3 stages)
1. **DISCOVER**: Searches the web via Tavily API to find real business websites. Filters out directories (Clutch, Yelp, etc.) and article/blog URLs. Each result must be a real company\'s homepage.
2. **ANALYZE**: Visits each company\'s website, scrapes real data (SSL, load speed, emails, phones, social links), then scores it 0–100. Lower score = more digital gaps = better prospect.
3. **OUTREACH**: Generates hyper-personalized cold emails using verified facts from the scraped website. No hallucination — every claim is grounded.

## Key Concepts
- **Lead Score (0–100)**: Calculated from real metrics. Low score = weak digital presence = opportunity. High score = strong online presence.
- **Pipeline Stages**: New → Qualified → Won (drag-and-drop Kanban board)
- **Agent Runs**: Each run discovers up to 50 businesses matching your search query
- **Workspace**: Organize your leads and team per workspace
- **Languages**: Arabic, English, Dutch, French, Spanish, German — fully supported

## Common Tasks You Help With
- Running your first agent search
- Understanding why a lead has a certain score
- Improving outreach emails
- Setting up API keys (Tavily, Gemini, Resend)
- Moving leads through the pipeline
- Reading analysis results and findings
- Troubleshooting failed agent runs

## Tone
Be concise, warm, and helpful. Never be robotic. Speak naturally.

**Language rule**: If the user writes in Arabic → respond in Arabic. If English → respond in English. Match their language always.

If you don\'t know something specific about the user\'s data, ask them to share more context.`;

// ─── Provider Base URLs ───────────────────────────────────────────────────────

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai:      "https://api.openai.com/v1",
  anthropic:   "https://api.anthropic.com/v1",
  gemini:      "https://generativelanguage.googleapis.com/v1beta/openai",
  google:      "https://generativelanguage.googleapis.com/v1beta/openai",
  groq:        "https://api.groq.com/openai/v1",
  deepseek:    "https://api.deepseek.com/v1",
  glm:         "https://open.bigmodel.cn/api/paas/v4",
  minimax:     "https://api.minimax.chat/v1",
  kimi:        "https://api.moonshot.cn/v1",
  ollama:      "http://localhost:11434/v1",
  openrouter:  "https://openrouter.ai/api/v1",
  mistral:     "https://api.mistral.ai/v1",
  together:    "https://api.together.xyz/v1",
};

// ─── Resolve AI Client from DB (any active provider) ─────────────────────────

async function resolveAIClient(workspaceId: string): Promise<{ client: OpenAI; model: string; providerType: string } | null> {
  try {
    // 1. Try the default provider for this workspace first
    const [defaultProv] = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.workspaceId, workspaceId), eq(aiProviders.isDefault, true)))
      .limit(1);

    if (defaultProv?.apiKey || defaultProv?.providerType === "ollama") {
      const baseURL = defaultProv.baseUrl || PROVIDER_BASE_URLS[defaultProv.providerType] || "";
      return {
        client: new OpenAI({
          apiKey: defaultProv.apiKey || "ollama",
          baseURL,
          defaultHeaders: defaultProv.providerType === "openrouter" ? {
            "HTTP-Referer": "https://find-x-agents-findx.vercel.app",
            "X-Title": "FindX Assistant",
          } : undefined,
        }),
        model: defaultProv.model,
        providerType: defaultProv.providerType,
      };
    }

    // 2. Try any active provider in this workspace
    const [anyProv] = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.workspaceId, workspaceId), eq(aiProviders.isActive, true)))
      .orderBy(desc(aiProviders.createdAt))
      .limit(1);

    if (anyProv?.apiKey || anyProv?.providerType === "ollama") {
      const baseURL = anyProv.baseUrl || PROVIDER_BASE_URLS[anyProv.providerType] || "";
      return {
        client: new OpenAI({
          apiKey: anyProv.apiKey || "ollama",
          baseURL,
          defaultHeaders: anyProv.providerType === "openrouter" ? {
            "HTTP-Referer": "https://find-x-agents-findx.vercel.app",
            "X-Title": "FindX Assistant",
          } : undefined,
        }),
        model: anyProv.model,
        providerType: anyProv.providerType,
      };
    }
  } catch { /* fall through to env fallback */ }

  // 3. Fallback: env vars — support all common providers
  const envProviders = [
    { key: process.env.GEMINI_API_KEY,      type: "gemini",     model: "gemini-2.0-flash",              baseURL: PROVIDER_BASE_URLS.gemini },
    { key: process.env.OPENROUTER_API_KEY,  type: "openrouter", model: "google/gemini-2.0-flash-001",   baseURL: PROVIDER_BASE_URLS.openrouter },
    { key: process.env.OPENAI_API_KEY,      type: "openai",     model: "gpt-4o-mini",                   baseURL: PROVIDER_BASE_URLS.openai },
    { key: process.env.ANTHROPIC_API_KEY,   type: "anthropic",  model: "claude-haiku-4-20250514",       baseURL: PROVIDER_BASE_URLS.anthropic },
    { key: process.env.GROQ_API_KEY,        type: "groq",       model: "llama-3.3-70b-versatile",       baseURL: PROVIDER_BASE_URLS.groq },
    { key: process.env.DEEPSEEK_API_KEY,    type: "deepseek",   model: "deepseek-chat",                 baseURL: PROVIDER_BASE_URLS.deepseek },
    { key: process.env.MISTRAL_API_KEY,     type: "mistral",    model: "mistral-large-latest",          baseURL: PROVIDER_BASE_URLS.mistral },
    { key: process.env.TOGETHER_API_KEY,    type: "together",   model: "meta-llama/Llama-3.3-70B-Instruct-Turbo", baseURL: PROVIDER_BASE_URLS.together },
  ];

  for (const p of envProviders) {
    if (p.key) {
      return {
        client: new OpenAI({
          apiKey: p.key,
          baseURL: p.baseURL,
          defaultHeaders: p.type === "openrouter" ? {
            "HTTP-Referer": "https://find-x-agents-findx.vercel.app",
            "X-Title": "FindX Assistant",
          } : undefined,
        }),
        model: p.model,
        providerType: p.type,
      };
    }
  }

  return null;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(50),
  context: z.string().max(1000).optional(),
});

// ─── POST /chat ───────────────────────────────────────────────────────────────

router.post("/chat", requireAuth, async (req, res): Promise<void> => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const ai = await resolveAIClient(req.user!.activeWorkspaceId);
  if (!ai) {
    res.status(503).json({
      error: "No AI provider configured. Please add an API key in Settings → AI Providers.",
    });
    return;
  }

  const { messages, context } = parsed.data;

  // Inject page context
  let systemContent = SYSTEM_PROMPT;
  if (context?.trim()) {
    systemContent += `\n\n---\n**Current context provided by the user\'s app:**\n${context.trim()}`;
  }

  // ── SSE Setup ───────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 20_000);

  try {
    const stream = await ai.client.chat.completions.create({
      model: ai.model,
      messages: [
        { role: "system", content: systemContent },
        ...messages,
      ],
      stream: true,
      max_tokens: 1024,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err.message ?? "AI error" })}\n\n`);
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
});

export default router;
