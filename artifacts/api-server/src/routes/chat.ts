import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";
import { db } from "@workspace/db";
import { aiProviders } from "@workspace/db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

const router = Router();

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are FindX Assistant — a smart, friendly AI built into the FindX B2B Prospecting platform.

Your job is to help users get the most out of FindX. You know everything about:

## FindX AI Pipeline (3 stages)
1. **DISCOVER**: Searches the web via Tavily API to find real business websites. Filters out directories (Clutch, Yelp, etc.) and article/blog URLs. Each result must be a real company's homepage.
2. **ANALYZE**: Visits each company's website, scrapes real data (SSL, load speed, emails, phones, social links), then scores it 0–100. Lower score = more digital gaps = better prospect.
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

If you don't know something specific about the user's data, ask them to share more context.`;

// ─── AI Client Resolution ─────────────────────────────────────────────────────

async function resolveAIClient(): Promise<{ client: OpenAI; model: string } | null> {
  // 1. Try OpenRouter from DB
  try {
    const [cfg] = await db
      .select({ apiKey: aiProviders.apiKey, model: aiProviders.model })
      .from(aiProviders)
      .where(eq(aiProviders.providerType, "openrouter"))
      .limit(1);
    if (cfg?.apiKey?.startsWith("sk-or-")) {
      return {
        client: new OpenAI({
          apiKey: cfg.apiKey,
          baseURL: "https://openrouter.ai/api/v1",
          defaultHeaders: {
            "HTTP-Referer": "https://find-x-agents-findx.vercel.app",
            "X-Title": "FindX Assistant",
          },
        }),
        model: cfg.model || "google/gemini-2.5-flash",
      };
    }
  } catch { /* fall through */ }

  // 2. Try Gemini from DB
  try {
    const [cfg] = await db
      .select({ apiKey: aiProviders.apiKey, model: aiProviders.model })
      .from(aiProviders)
      .where(eq(aiProviders.providerType, "gemini"))
      .limit(1);
    if (cfg?.apiKey) {
      return {
        client: new OpenAI({
          apiKey: cfg.apiKey,
          baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
        }),
        model: cfg.model || "gemini-2.0-flash",
      };
    }
  } catch { /* fall through */ }

  // 3. Fallback to env vars
  if (process.env.GEMINI_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GEMINI_API_KEY,
        baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
      }),
      model: "gemini-2.0-flash",
    };
  }

  if (process.env.OPENROUTER_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: "https://openrouter.ai/api/v1",
        defaultHeaders: {
          "HTTP-Referer": "https://find-x-agents-findx.vercel.app",
          "X-Title": "FindX Assistant",
        },
      }),
      model: "google/gemini-2.5-flash",
    };
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
  /** Optional page/lead context to help the AI answer better */
  context: z.string().max(1000).optional(),
});

// ─── POST /chat ───────────────────────────────────────────────────────────────

router.post("/chat", requireAuth, async (req, res): Promise<void> => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const ai = await resolveAIClient();
  if (!ai) {
    res.status(503).json({
      error: "No AI provider configured. Please add an API key in Settings → AI Providers.",
    });
    return;
  }

  const { messages, context } = parsed.data;

  // Inject page context into system prompt if provided
  let systemContent = SYSTEM_PROMPT;
  if (context?.trim()) {
    systemContent += `\n\n---\n**Current context provided by the user's app:**\n${context.trim()}`;
  }

  // ── SSE Setup ───────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable nginx buffering
  res.flushHeaders();

  // Heartbeat to keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 20_000);

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
