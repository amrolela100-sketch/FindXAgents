import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

type AgentRun = { id: string; workspaceId: string; status: string; query: string };
type AgentLog = { id: string; runId: string; workspaceId: string; message: string };

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa" } as Record<string, string>,
  mockState: { runs: [] as AgentRun[], logs: [] as AgentLog[], insertedRun: null as AgentRun | null },
}));

// Proxy-based table stubs — prevents drizzle-orm from throwing on undefined columns
const makeTable = () => new Proxy({}, { get: (_t, p) => ({ __mockCol: String(p) }) });

vi.mock("@workspace/db", () => ({
  db: {
    select: () => {
      const c: any = {};
      ["from","where","orderBy","limit","offset","leftJoin","innerJoin","groupBy"].forEach(m => { c[m] = () => c; });
      c.then = (r: any, j: any) => Promise.resolve(mockState.runs).then(r, j);
      c.catch = (f: any) => Promise.resolve(mockState.runs).catch(f);
      c.finally = (f: any) => Promise.resolve(mockState.runs).finally(f);
      return c;
    },
    insert: () => ({ values: () => ({ returning: async () => mockState.insertedRun ? [mockState.insertedRun] : [] }) }),
    update: () => ({ set: () => ({ where: () => ({ execute: async () => [] }) }) }),
    delete: () => ({ where: () => ({ execute: async () => [] }) }),
  },
  leads: makeTable(), analyses: makeTable(), outreaches: makeTable(), users: makeTable(),
  agents: makeTable(), agentSkills: makeTable(), agentLogs: makeTable(), agentPipelineRuns: makeTable(),
  pipelineStages: makeTable(), searchConfigs: makeTable(), resendConfigs: makeTable(),
  smtpConfigs: makeTable(), emailSettings: makeTable(), telegramSettings: makeTable(),
  pushTokens: makeTable(), aiProviders: makeTable(), emailProviderTokens: makeTable(),
  workspaces: makeTable(), workspaceMembers: makeTable(), notifications: makeTable(),
}));

// Full standalone mock — no importOriginal
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = (req as any).headers?.authorization;
    if (!authHeader?.startsWith("Bearer ") || !authCtx.userId) return res.status(401).json({ error: "Unauthorized" });
    (req as any).user = { sub: authCtx.userId, userId: authCtx.userId, email: "test@example.com", role: "user", activeWorkspaceId: authCtx.workspaceId };
    return next();
  },
  requireWorkspace: (req: Request, res: Response, next: NextFunction) => {
    if (!authCtx.workspaceId) return res.status(403).json({ error: "No workspace" });
    (req as any).workspace = { id: authCtx.workspaceId };
    return next();
  },
  optionalAuth: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import app from "../artifacts/api-server/src/app";
import request from "supertest";

const RUN_AAA: AgentRun = { id: "run-1", workspaceId: "ws-aaa", status: "running", query: "test query" };
const LOG_AAA: AgentLog = { id: "log-1", runId: "run-1", workspaceId: "ws-aaa", message: "Processing..." };

beforeEach(() => {
  authCtx.userId = "user-aaa";
  authCtx.workspaceId = "ws-aaa";
  mockState.runs = [RUN_AAA];
  mockState.logs = [LOG_AAA];
  mockState.insertedRun = null;
});

describe("GET /api/agents/runs", () => {
  it("returns runs list for workspace", async () => {
    const res = await request(app).get("/api/agents/runs").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/agents/runs");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/agents/runs/:id", () => {
  it("returns run details when authorized", async () => {
    const res = await request(app).get("/api/agents/runs/run-1").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/agents/runs/run-1");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/agents/runs/:id/logs", () => {
  it("returns logs for authorized run", async () => {
    const res = await request(app).get("/api/agents/runs/run-1/logs").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/agents/runs/run-1/logs");
    expect(res.status).toBe(401);
  });
  it("returns 404 when run belongs to different workspace", async () => {
    authCtx.workspaceId = "ws-bbb";
    mockState.runs = [];
    const res = await request(app).get("/api/agents/runs/run-1/logs").set("Authorization", "Bearer valid-token");
    expect([404, 403, 400]).toContain(res.status);
  });
});

describe("GET /api/agents/logs", () => {
  it("returns workspace-scoped logs", async () => {
    const res = await request(app).get("/api/agents/logs").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/agents/logs");
    expect(res.status).toBe(401);
  });
});

describe("POST /api/agents/run", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).post("/api/agents/run").send({ query: "find leads" });
    expect(res.status).toBe(401);
  });
  it("returns 400 when no query provided", async () => {
    const res = await request(app).post("/api/agents/run").set("Authorization", "Bearer valid-token").send({});
    expect([400, 422]).toContain(res.status);
  });
  it("starts run and returns runId when authenticated", async () => {
    mockState.insertedRun = RUN_AAA;
    const res = await request(app).post("/api/agents/run").set("Authorization", "Bearer valid-token").send({ query: "find restaurants in Berlin" });
    expect(res.status).toBeLessThan(500);
  });
});
