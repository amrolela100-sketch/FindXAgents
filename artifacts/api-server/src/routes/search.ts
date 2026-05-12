import { Router } from "express";
import { z } from "zod";
import { db, searchConfigs } from "@workspace/db";
import { eq, isNull, and } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();
router.use(requireAuth);

const TAVILY_API_URL = "https://api.tavily.com/search";

/** Workspace key → global fallback → env */
async function getTavilyApiKey(workspaceId: string): Promise<string | null> {
  try {
    const [ws] = await db.select().from(searchConfigs)
      .where(eq(searchConfigs.workspaceId, workspaceId)).limit(1);
    if (ws?.apiKey) return ws.apiKey;
    const [global] = await db.select().from(searchConfigs)
      .where(isNull(searchConfigs.workspaceId)).limit(1);
    if (global?.apiKey) return global.apiKey;
  } catch { /* fall through */ }
  return process.env.TAVILY_API_KEY ?? null;
}

router.post("/search", async (req, res) => {
  const schema = z.object({
    query:          z.string().min(1).max(400),
    maxResults:     z.number().int().min(1).max(20).default(5),
    searchDepth:    z.enum(["basic", "advanced"]).default("basic"),
    includeAnswer:  z.boolean().default(true),
    includeDomains: z.array(z.string()).optional(),
    excludeDomains: z.array(z.string()).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });

  const apiKey = await getTavilyApiKey(req.user!.activeWorkspaceId);
  if (!apiKey)
    return res.status(503).json({ error: "Tavily search is not configured. Add your API key in Settings → Search." });

  try {
    const payload = {
      api_key:      apiKey,
      query:        parsed.data.query,
      max_results:  parsed.data.maxResults,
      search_depth: parsed.data.searchDepth,
      include_answer: parsed.data.includeAnswer,
      ...(parsed.data.includeDomains && { include_domains: parsed.data.includeDomains }),
      ...(parsed.data.excludeDomains && { exclude_domains: parsed.data.excludeDomains }),
    };
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Tavily error: ${errText}` });
    }
    const data = await response.json() as {
      answer?: string;
      results: Array<{ title: string; url: string; content: string; score: number }>;
      query: string;
    };
    return res.json({
      query:   data.query,
      answer:  data.answer ?? null,
      results: data.results.map((r) => ({ title: r.title, url: r.url, snippet: r.content, score: r.score })),
      total:   data.results.length,
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/search/status", async (req, res) => {
  const wsId = req.user!.activeWorkspaceId;
  const apiKey = await getTavilyApiKey(wsId);
  const [config] = await db.select().from(searchConfigs)
    .where(eq(searchConfigs.workspaceId, wsId)).catch(() => [null]);
  return res.json({
    configured: !!apiKey,
    provider:   "tavily",
    source:     config ? "db" : (process.env.TAVILY_API_KEY ? "env" : null),
  });
});

router.get("/search/config", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    const [config] = await db.select().from(searchConfigs)
      .where(eq(searchConfigs.workspaceId, wsId));
    if (config) return res.json({ configured: true, provider: config.provider, source: "db" });
    if (process.env.TAVILY_API_KEY) return res.json({ configured: true, provider: "tavily", source: "env" });
    return res.json({ configured: false, provider: "tavily" });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/search/config", async (req, res) => {
  const schema = z.object({
    apiKey:   z.string().min(1),
    provider: z.string().default("tavily"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const wsId = req.user!.activeWorkspaceId;
    const [existing] = await db.select().from(searchConfigs)
      .where(eq(searchConfigs.workspaceId, wsId));
    if (existing) {
      await db.update(searchConfigs)
        .set({ apiKey: parsed.data.apiKey, provider: parsed.data.provider, updatedAt: new Date() })
        .where(eq(searchConfigs.workspaceId, wsId));
    } else {
      await db.insert(searchConfigs).values({
        workspaceId: wsId,
        apiKey:      parsed.data.apiKey,
        provider:    parsed.data.provider,
      });
    }
    return res.json({ configured: true, provider: parsed.data.provider, source: "db" });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/search/config", async (req, res) => {
  try {
    const wsId = req.user!.activeWorkspaceId;
    await db.delete(searchConfigs).where(eq(searchConfigs.workspaceId, wsId));
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/search/test", async (req, res) => {
  const apiKey = await getTavilyApiKey(req.user!.activeWorkspaceId);
  if (!apiKey)
    return res.status(503).json({ ok: false, error: "Tavily API key not configured" });
  try {
    const response = await fetch(TAVILY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, query: "test", max_results: 1, search_depth: "basic" }),
    });
    if (!response.ok) {
      const errText = await response.text();
      return res.json({ ok: false, error: `API returned ${response.status}: ${errText.slice(0, 200)}` });
    }
    return res.json({ ok: true, message: "Tavily connection successful" });
  } catch (err) {
    return res.json({ ok: false, error: err instanceof Error ? err.message : "Connection failed" });
  }
});

export default router;
