import { Router, Request, Response, NextFunction } from "express";
import { db } from "@workspace/db";
import { agents, agentSkills, agentLogs, agentPipelineRuns, pipelineStages, leads } from "@workspace/db";
import { eq, and, desc, asc, sql, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { ALLOWED_PHASES, ALLOWED_LEVELS } from "../lib/constants.js";
import { requireAuth, requireWorkspace } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

/** Admin check based only on the DB-backed users.role field. */
function isAdmin(req: Request): boolean {
  return req.user?.role === "admin";
}

/** Middleware: blocks non-admin users with 403. */
function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Forbidden — admin only" });
    return;
  }
  next();
}

// ─── Pipeline Runs ────────────────────────────────────────────────────────────

import { enqueueAgentRun } from "../lib/agent-job-queue.js";
import { safeError } from "../lib/safe-error.js";

router.post("/agents/run", requireWorkspace, async (req, res) => {
  const schema = z.object({
    query: z.string().min(2).max(500),
    sync: z.boolean().default(false),
    maxResults: z.number().int().min(1).max(50).optional(),
    language: z.enum(["en", "nl", "ar", "fr", "es", "de"]).default("en"),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const [run] = await db.insert(agentPipelineRuns).values({
      userId:      req.user!.userId,
      workspaceId: req.user!.activeWorkspaceId,
      query:       parsed.data.query,
      status:      "queued",
    }).returning();

    let queue: { mode: "qstash" | "in-process" };
    try {
      queue = await enqueueAgentRun({
        runId:       run.id,
        query:       parsed.data.query,
        maxResults:  parsed.data.maxResults ?? 10,
        userId:      req.user?.sub ?? null,
        workspaceId: req.user?.activeWorkspaceId ?? null,
        language:    parsed.data.language,
      });
    } catch (enqueueErr: any) {
      await db.update(agentPipelineRuns)
        .set({ status: "failed", error: enqueueErr?.message ?? "Failed to enqueue agent run", completedAt: new Date() })
        .where(eq(agentPipelineRuns.id, run.id));
      throw enqueueErr;
    }

    return res.status(202).json({ runId: run.id, status: "queued", queue: queue.mode, run });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/agents/runs/:id/logs/stream", requireWorkspace, async (req, res): Promise<void> => {
  // Security fix: verify run ownership BEFORE opening the SSE stream.
  // Without this check any authenticated user who knows a runId can watch live logs.
  const runId = req.params["id"] as string;
  try {
    const [run] = await db
      .select({ workspaceId: agentPipelineRuns.workspaceId, userId: agentPipelineRuns.userId })
      .from(agentPipelineRuns)
      .where(eq(agentPipelineRuns.id, runId));

    if (!run) {
      res.status(404).json({ error: "Pipeline run not found" });
      return;
    }
    if (!checkRunOwnership({ workspaceId: run.workspaceId ?? null, userId: run.userId ?? null }, req, res)) {
      return;
    }
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const sentLogIds = new Set<string>();

  const interval = setInterval(async () => {
    try {
      const logs = await db.select({
        id: agentLogs.id,
        phase: agentLogs.phase,
        level: agentLogs.level,
        message: agentLogs.message,
        createdAt: agentLogs.createdAt,
      }).from(agentLogs)
        .where(eq(agentLogs.pipelineRunId, runId))
        .orderBy(asc(agentLogs.createdAt));

      const newLogs = logs.filter(l => !sentLogIds.has(l.id));
      
      if (newLogs.length > 0) {
        for (const log of newLogs) {
          res.write(`data: ${JSON.stringify(log)}\n\n`);
          sentLogIds.add(log.id);
        }
      }

      const [run] = await db.select({ status: agentPipelineRuns.status }).from(agentPipelineRuns).where(eq(agentPipelineRuns.id, runId));
      if (run && (run.status === "completed" || run.status === "failed" || run.status === "cancelled")) {
        clearInterval(interval);
        res.write(`event: end\ndata: ${JSON.stringify({ status: run.status })}\n\n`);
        res.end();
      }
    } catch (err) {
      console.error("SSE stream error:", err);
    }
  }, 1000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

router.get("/agents/runs", requireWorkspace, async (req, res) => {
  try {
    // Scope runs to the active workspace
    const whereClause = eq(agentPipelineRuns.workspaceId, req.user!.activeWorkspaceId);
    const runs = await db.select().from(agentPipelineRuns)
      .where(whereClause)
      .orderBy(desc(agentPipelineRuns.createdAt))
      .limit(50);
    return res.json({ runs });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

/**
 * Workspace ownership check for pipeline runs.
 * Returns false and writes a 404 response when access is denied.
 */
function checkRunOwnership(run: { workspaceId: string | null; userId: string | null }, req: Request, res: Response): boolean {
  if (isAdmin(req)) return true;
  const reqWs = req.user?.activeWorkspaceId ?? null;
  if (!reqWs || run.workspaceId !== reqWs) {
    res.status(404).json({ error: "Pipeline run not found" });
    return false;
  }
  return true;
}

router.get("/agents/runs/:id", requireWorkspace, async (req, res) => {
  try {
    const [run] = await db.select().from(agentPipelineRuns).where(eq(agentPipelineRuns.id, req.params["id"] as string));
    if (!run) return res.json({ run: null });
    if (!checkRunOwnership({ workspaceId: run.workspaceId ?? null, userId: run.userId ?? null }, req, res)) return;
    return res.json({ run });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/agents/runs/:id/emails", requireWorkspace, async (req, res) => {
  try {
    const [run] = await db.select({ id: agentPipelineRuns.id, workspaceId: agentPipelineRuns.workspaceId, userId: agentPipelineRuns.userId }).from(agentPipelineRuns).where(eq(agentPipelineRuns.id, req.params["id"] as string));
    if (!run || !checkRunOwnership({ workspaceId: run.workspaceId ?? null, userId: run.userId ?? null }, req, res)) return;
    return res.json({ emails: [] });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/agents/runs/:id/logs", requireWorkspace, async (req, res) => {
  try {
    const [run] = await db.select({ id: agentPipelineRuns.id, workspaceId: agentPipelineRuns.workspaceId, userId: agentPipelineRuns.userId }).from(agentPipelineRuns).where(eq(agentPipelineRuns.id, req.params["id"] as string));
    if (!run) return res.status(404).json({ error: "Pipeline run not found" });
    if (!checkRunOwnership({ workspaceId: run.workspaceId ?? null, userId: run.userId ?? null }, req, res)) return;

    const rows = await db.select({
      id: agentLogs.id,
      agentId: agentLogs.agentId,
      pipelineRunId: agentLogs.pipelineRunId,
      phase: agentLogs.phase,
      level: agentLogs.level,
      message: agentLogs.message,
      toolName: agentLogs.toolName,
      toolInput: agentLogs.toolInput,
      toolOutput: agentLogs.toolOutput,
      duration: agentLogs.duration,
      tokens: agentLogs.tokens,
      createdAt: agentLogs.createdAt,
      agent: { id: agents.id, name: agents.name, displayName: agents.displayName },
    }).from(agentLogs)
      .leftJoin(agents, eq(agentLogs.agentId, agents.id))
      .where(eq(agentLogs.pipelineRunId, req.params["id"] as string))
      .orderBy(asc(agentLogs.createdAt));
    return res.json({ logs: rows });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/agents/runs/:id/cancel", requireWorkspace, async (req, res) => {
  try {
    const [run] = await db.select().from(agentPipelineRuns).where(eq(agentPipelineRuns.id, req.params["id"] as string));
    if (!run) return res.status(404).json({ error: "Pipeline run not found" });
    if (!checkRunOwnership({ workspaceId: run.workspaceId ?? null, userId: run.userId ?? null }, req, res)) return;
    if (run.status !== "running" && run.status !== "queued") {
      return res.status(400).json({ error: `Cannot cancel run with status "${run.status}"` });
    }
    const [updated] = await db.update(agentPipelineRuns)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(eq(agentPipelineRuns.id, req.params["id"] as string))
      .returning();
    return res.json({ run: updated });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Agent Logs ───────────────────────────────────────────────────────────────

router.get("/agents/logs", requireWorkspace, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? "25"), 10)));
    const { agentId, pipelineRunId, phase, level } = req.query as Record<string, string>;

    // Security: validate enum-like query params before using in sql`` to prevent injection.
    // ALLOWED_PHASES and ALLOWED_LEVELS are imported from lib/constants — single source of truth.
    const safePhase = phase && ALLOWED_PHASES.has(phase) ? phase : undefined;
    const safeLevel = level && ALLOWED_LEVELS.has(level) ? level : undefined;

    // PERF-3 fix: use JOIN subquery instead of fetching all wsRunIds into memory.
    // Previous approach: select all runIds → huge IN(...) array → slow on large workspaces.
    // New approach: filter via EXISTS subquery — single query, no client-side array.
    const workspaceId = req.user!.activeWorkspaceId;

    const conditions: ReturnType<typeof eq>[] = [];
    // Workspace scoping via subquery join (avoids large IN clause)
    conditions.push(
      sql`${agentLogs.pipelineRunId} IN (
        SELECT id FROM agent_pipeline_runs WHERE workspace_id = ${workspaceId}
      )` as unknown as ReturnType<typeof eq>
    );
    if (agentId) conditions.push(eq(agentLogs.agentId, agentId));
    if (pipelineRunId) conditions.push(eq(agentLogs.pipelineRunId, pipelineRunId));
    if (safePhase) conditions.push(eq(agentLogs.phase, safePhase));
    if (safeLevel) conditions.push(eq(agentLogs.level, safeLevel));

    const where = conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.select({
        id: agentLogs.id,
        agentId: agentLogs.agentId,
        pipelineRunId: agentLogs.pipelineRunId,
        phase: agentLogs.phase,
        level: agentLogs.level,
        message: agentLogs.message,
        toolName: agentLogs.toolName,
        toolInput: agentLogs.toolInput,
        toolOutput: agentLogs.toolOutput,
        duration: agentLogs.duration,
        tokens: agentLogs.tokens,
        createdAt: agentLogs.createdAt,
        agent: { id: agents.id, name: agents.name, displayName: agents.displayName },
      }).from(agentLogs)
        .leftJoin(agents, eq(agentLogs.agentId, agents.id))
        .where(where)
        .orderBy(desc(agentLogs.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: count() }).from(agentLogs).where(where),
    ]);

    return res.json({ logs: rows, total: Number(totalResult[0]?.count ?? 0), page, pageSize });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/agents/logs/:logId", requireWorkspace, async (req, res) => {
  try {
    // Scope log access: verify the run belongs to the active workspace
    const [row] = await db.select({
      id: agentLogs.id,
      agentId: agentLogs.agentId,
      pipelineRunId: agentLogs.pipelineRunId,
      phase: agentLogs.phase,
      level: agentLogs.level,
      message: agentLogs.message,
      toolName: agentLogs.toolName,
      toolInput: agentLogs.toolInput,
      toolOutput: agentLogs.toolOutput,
      duration: agentLogs.duration,
      tokens: agentLogs.tokens,
      createdAt: agentLogs.createdAt,
      runWorkspaceId: agentPipelineRuns.workspaceId,
      agent: { id: agents.id, name: agents.name, displayName: agents.displayName },
    }).from(agentLogs)
      .leftJoin(agents, eq(agentLogs.agentId, agents.id))
      .leftJoin(agentPipelineRuns, eq(agentLogs.pipelineRunId, agentPipelineRuns.id))
      .where(eq(agentLogs.id, req.params["logId"] as string));
    if (!row) return res.status(404).json({ error: "Log not found" });
    // Enforce workspace isolation
    if (req.user?.role !== "admin" && row.runWorkspaceId !== req.user!.activeWorkspaceId) {
      return res.status(404).json({ error: "Log not found" });
    }
    const { runWorkspaceId: _ws, ...logData } = row;
    return res.json({ log: logData });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Tools ────────────────────────────────────────────────────────────────────

router.get("/agents/tools", async (_req, res) => {
  const tools = [
    { name: "web_search", description: "Search the web for businesses globally" },
    { name: "kvk_search", description: "Search the Dutch Chamber of Commerce (KVK) registry" },
    { name: "google_places_search", description: "Search Google Places for local businesses" },
    { name: "scrape_page", description: "Extract content from a webpage" },
    { name: "check_website", description: "Verify a website URL is accessible" },
    { name: "extract_emails", description: "Extract email addresses from a webpage" },
    { name: "extract_social_links", description: "Find social media profiles" },
    { name: "check_mx", description: "Verify a domain can receive email" },
    { name: "save_lead", description: "Save a discovered business as a lead" },
    { name: "run_lighthouse", description: "Run a Lighthouse performance audit" },
    { name: "detect_tech", description: "Detect technology stack" },
    { name: "check_ssl", description: "Check SSL certificate" },
    { name: "take_screenshot", description: "Capture a screenshot of a webpage" },
  ];
  return res.json({ tools });
});

// ─── Agent CRUD ───────────────────────────────────────────────────────────────

router.get("/agents", async (req, res) => {
  try {
    const { active, role } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof eq>[] = [];
    if (active === "true") conditions.push(sql`${agents.isActive} = true`);
    if (active === "false") conditions.push(sql`${agents.isActive} = false`);
    if (role) conditions.push(sql`${agents.role} = ${role}`);

    const where = conditions.length > 0 ? and(...(conditions as [ReturnType<typeof eq>, ...ReturnType<typeof eq>[]])) : undefined;
    const rows = await db.select().from(agents).where(where).orderBy(asc(agents.pipelineOrder));

    const agentIds = rows.map((a) => a.id);
    let skillCountMap = new Map<string, number>();
    let logCountMap = new Map<string, number>();

    if (agentIds.length > 0) {
      const [skillCounts, logCounts] = await Promise.all([
        db.select({ agentId: agentSkills.agentId, count: count() }).from(agentSkills).where(inArray(agentSkills.agentId, agentIds)).groupBy(agentSkills.agentId),
        db.select({ agentId: agentLogs.agentId, count: count() }).from(agentLogs).where(inArray(agentLogs.agentId, agentIds)).groupBy(agentLogs.agentId),
      ]);
      skillCountMap = new Map(skillCounts.map((r) => [r.agentId, Number(r.count)]));
      logCountMap = new Map(logCounts.map((r) => [r.agentId, Number(r.count)]));
    }

    const enriched = rows.map((a) => ({ ...a, _count: { skills: skillCountMap.get(a.id) ?? 0, logs: logCountMap.get(a.id) ?? 0 } }));
    return res.json({ agents: enriched });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/agents/name/:name", async (req, res) => {
  try {
    const [agent] = await db.select().from(agents).where(eq(agents.name, req.params["name"] as string));
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const [skills, logCount] = await Promise.all([
      db.select().from(agentSkills).where(eq(agentSkills.agentId, agent.id)).orderBy(asc(agentSkills.sortOrder)),
      db.select({ count: count() }).from(agentLogs).where(eq(agentLogs.agentId, agent.id)),
    ]);

    return res.json({ agent: { ...agent, skills, _count: { logs: Number(logCount[0]?.count ?? 0) } } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.patch("/agents/name/:name", requireAdmin, async (req, res) => {
  try {
    const updateSchema = z.object({
      displayName: z.string().min(1).max(200).optional(),
      description: z.string().min(1).optional(),
      role: z.string().min(1).optional(),
      icon: z.string().optional(),
      model: z.string().optional(),
      maxIterations: z.number().int().min(1).max(100).optional(),
      maxTokens: z.number().int().min(256).max(32768).optional(),
      temperature: z.number().min(0).max(2).nullable().optional(),
      identityMd: z.string().optional(),
      soulMd: z.string().optional(),
      toolsMd: z.string().optional(),
      systemPrompt: z.string().optional(),
      toolNames: z.array(z.string()).optional(),
      pipelineOrder: z.number().int().optional(),
      isActive: z.boolean().optional(),
    });
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

    const updateData: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
    if (updateData.temperature !== undefined) updateData.temperature = updateData.temperature === null ? null : String(updateData.temperature);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [agent] = await db.update(agents).set(updateData as any).where(eq(agents.name, req.params["name"] as string)).returning();
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    return res.json({ agent });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/agents/:id", async (req, res) => {
  try {
    const [agent] = await db.select().from(agents).where(eq(agents.id, req.params["id"] as string));
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const [skills, logCount] = await Promise.all([
      db.select().from(agentSkills).where(eq(agentSkills.agentId, agent.id)).orderBy(asc(agentSkills.sortOrder)),
      db.select({ count: count() }).from(agentLogs).where(eq(agentLogs.agentId, agent.id)),
    ]);

    return res.json({ agent: { ...agent, skills, _count: { logs: Number(logCount[0]?.count ?? 0) } } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/agents", requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(200),
    description: z.string().min(1),
    role: z.string().min(1),
    icon: z.string().default("Bot"),
    model: z.string().default("claude-sonnet-4-20250514"),
    maxIterations: z.number().int().min(1).max(100).default(15),
    maxTokens: z.number().int().min(256).max(32768).default(4096),
    temperature: z.number().min(0).max(2).optional(),
    identityMd: z.string().default(""),
    soulMd: z.string().default(""),
    toolsMd: z.string().default(""),
    systemPrompt: z.string().default(""),
    toolNames: z.array(z.string()).default([]),
    pipelineOrder: z.number().int().default(0),
    isActive: z.boolean().default(true),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const data = { ...parsed.data, temperature: parsed.data.temperature !== undefined ? String(parsed.data.temperature) : null };
    const [agent] = await db.insert(agents).values(data as typeof agents.$inferInsert).returning();
    return res.status(201).json({ agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) return res.status(409).json({ error: "Agent name already exists" });
    return safeError(res, err, "Failed to create agent");
  }
});

router.patch("/agents/:id", requireAdmin, async (req, res) => {
  const schema = z.object({
    displayName: z.string().min(1).max(200).optional(),
    description: z.string().optional(),
    role: z.string().optional(),
    icon: z.string().optional(),
    model: z.string().optional(),
    maxIterations: z.number().int().optional(),
    maxTokens: z.number().int().optional(),
    temperature: z.number().nullable().optional(),
    identityMd: z.string().optional(),
    soulMd: z.string().optional(),
    toolsMd: z.string().optional(),
    systemPrompt: z.string().optional(),
    toolNames: z.array(z.string()).optional(),
    pipelineOrder: z.number().int().optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  const data: Record<string, unknown> = { ...parsed.data, updatedAt: new Date() };
  if (data.temperature !== undefined) data.temperature = data.temperature === null ? null : String(data.temperature);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [agent] = await db.update(agents).set(data as any).where(eq(agents.id, req.params["id"] as string)).returning();
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    return res.json({ agent });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/agents/:id", requireAdmin, async (req, res) => {
  try {
    const result = await db.delete(agents).where(eq(agents.id, req.params["id"] as string)).returning();
    if (!result.length) return res.status(404).json({ error: "Agent not found" });
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.patch("/agents/:id/toggle", requireAdmin, async (req, res) => {
  try {
    const [agent] = await db.select().from(agents).where(eq(agents.id, req.params["id"] as string));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const [updated] = await db.update(agents).set({ isActive: !agent.isActive, updatedAt: new Date() }).where(eq(agents.id, req.params["id"] as string)).returning();
    return res.json({ agent: updated });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Agent Skills ─────────────────────────────────────────────────────────────

router.get("/agents/:id/skills", async (req, res) => {
  try {
    const [agent] = await db.select().from(agents).where(eq(agents.id, req.params["id"] as string));
    if (!agent) return res.status(404).json({ error: "Agent not found" });
    const skills = await db.select().from(agentSkills).where(eq(agentSkills.agentId, req.params["id"] as string)).orderBy(asc(agentSkills.sortOrder));
    return res.json({ skills });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/agents/:id/skills", requireAdmin, async (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().min(1),
    toolNames: z.array(z.string()).default([]),
    promptAdd: z.string().default(""),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    const [agent] = await db.select().from(agents).where(eq(agents.id, req.params["id"] as string));
    if (!agent) return res.status(404).json({ error: "Agent not found" });

    const [skill] = await db.insert(agentSkills).values({ ...parsed.data, agentId: req.params["id"] as string }).returning();
    return res.status(201).json({ skill });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("unique") || msg.includes("duplicate")) return res.status(409).json({ error: "Skill name already exists" });
    return safeError(res, err, "Internal server error");
  }
});

router.patch("/agents/:agentId/skills/:skillId", requireAdmin, async (req, res) => {
  const updateSkillSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().min(1).optional(),
    toolNames: z.array(z.string()).optional(),
    promptAdd: z.string().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
  });
  const parsed = updateSkillSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  try {
    const [skill] = await db.update(agentSkills)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(eq(agentSkills.id, req.params["skillId"] as string), eq(agentSkills.agentId, req.params["agentId"] as string)))
      .returning();
    if (!skill) return res.status(404).json({ error: "Skill not found" });
    return res.json({ skill });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/agents/:agentId/skills/:skillId", requireAdmin, async (req, res) => {
  try {
    const result = await db.delete(agentSkills)
      .where(and(eq(agentSkills.id, req.params["skillId"] as string), eq(agentSkills.agentId, req.params["agentId"] as string)))
      .returning();
    if (!result.length) return res.status(404).json({ error: "Skill not found" });
    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Seed ─────────────────────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { name: "discovered", order: 0 },
  { name: "analyzing", order: 1 },
  { name: "analyzed", order: 2 },
  { name: "contacting", order: 3 },
  { name: "responded", order: 4 },
  { name: "qualified", order: 5 },
  { name: "won", order: 6 },
  { name: "lost", order: 7 },
];

const SEED_AGENTS = [
  {
    name: "research",
    displayName: "Research Agent",
    description: "Discovers businesses matching search queries worldwide using web search, business registries, Google Places, website scraping, and lead enrichment tools.",
    role: "research",
    icon: "Search",
    model: "claude-sonnet-4-20250514",
    maxIterations: 25,
    maxTokens: 4096,
    pipelineOrder: 1,
    isActive: true,
  },
  {
    name: "analysis",
    displayName: "Analysis Agent",
    description: "Deep digital analysis agent: Lighthouse audits, tech detection, revenue leakage calculation, and AI opportunity scoring.",
    role: "analysis",
    icon: "BarChart3",
    model: "claude-sonnet-4-20250514",
    maxIterations: 20,
    maxTokens: 4096,
    pipelineOrder: 2,
    isActive: true,
  },
  {
    name: "outreach",
    displayName: "Outreach Agent",
    description: "Generates personalized email outreach based on analysis findings. Creates compelling, context-aware messages.",
    role: "outreach",
    icon: "Mail",
    model: "claude-sonnet-4-20250514",
    maxIterations: 10,
    maxTokens: 4096,
    pipelineOrder: 3,
    isActive: true,
  },
];

router.post("/agents/seed", async (req, res) => {
  if (!isAdmin(req)) {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  try {
    let stagesSeeded = 0;
    for (const stage of PIPELINE_STAGES) {
      const [existing] = await db.select().from(pipelineStages).where(eq(pipelineStages.name, stage.name));
      if (!existing) {
        await db.insert(pipelineStages).values(stage);
        stagesSeeded++;
      }
    }

    let agentsSeeded = 0;
    for (const agentData of SEED_AGENTS) {
      const [existing] = await db.select().from(agents).where(eq(agents.name, agentData.name));
      if (!existing) {
        await db.insert(agents).values({ ...agentData, toolNames: [] });
        agentsSeeded++;
      }
    }

    return res.json({ seeded: true, stages: stagesSeeded, agents: agentsSeeded });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
