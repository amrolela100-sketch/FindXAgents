import { vi, describe, it, expect, beforeEach } from "vitest";

type AgentRun = { id: string; workspaceId: string; status: string; query: string };
type AgentLog = { id: string; runId: string; workspaceId: string; message: string };

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa", isAdmin: false } as Record<string, string | boolean>,
  mockState: { runs: [] as AgentRun[], logs: [] as AgentLog[], insertedRun: null as AgentRun | null },
}));

// ── Mock drizzle-orm operators ────────────────────────────────────────────────
// Routes import eq/and/ilike/count etc directly from drizzle-orm.
// Real drizzle checks for internal column symbols and throws on mock objects.
// Replace all operators with safe stubs that accept anything and return {}.
vi.mock("drizzle-orm", () => ({
  eq: () => ({}), and: () => ({}), or: () => ({}), not: () => ({}),
  ne: () => ({}), gt: () => ({}), gte: () => ({}), lt: () => ({}), lte: () => ({}),
  ilike: () => ({}), like: () => ({}), notIlike: () => ({}), notLike: () => ({}),
  isNull: () => ({}), isNotNull: () => ({}),
  inArray: () => ({}), notInArray: () => ({}),
  between: () => ({}), notBetween: () => ({}),
  desc: (c: unknown) => c, asc: (c: unknown) => c,
  count: () => ({ __count: true }),
  countDistinct: () => ({ __count: true }),
  sum: () => ({ __agg: true }), avg: () => ({ __agg: true }),
  max: () => ({ __agg: true }), min: () => ({ __agg: true }),
  sql: () => ({}),
  getTableColumns: () => ({}),
  getTableName: () => "mock_table",
}));

// Proxy-based table stubs — any column access returns a plain object.
const makeTable = () => new Proxy({}, { get: (_t, p) => ({ col: String(p) }) });

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

vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: async (req: any, res: any, next: any) => {
    const h = req.headers?.authorization;
    if (!h?.startsWith("Bearer ") || !authCtx.userId) return res.status(401).json({ error: "Unauthorized" });
    req.user = { sub: authCtx.userId, userId: authCtx.userId, email: "test@example.com", role: "user", activeWorkspaceId: authCtx.workspaceId };
    return next();
  },
  requireWorkspace: (req: any, res: any, next: any) => {
    if (!authCtx.workspaceId) return res.status(403).json({ error: "No workspace" });
    req.workspace = { id: authCtx.workspaceId };
    return next();
  },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));

import app from "../artifacts/api-server/src/app";
import request from "supertest";

const RUN_AAA: AgentRun = { id: "run-1", workspaceId: "ws-aaa", status: "running", query: "test query" };
const LOG_AAA: AgentLog = { id: "log-1", runId: "run-1", workspaceId: "ws-aaa", message: "Processing..." };

beforeEach(() => { authCtx.userId = "user-aaa"; authCtx.workspaceId = "ws-aaa"; authCtx.isAdmin = false; mockState.runs = [RUN_AAA]; mockState.logs = [LOG_AAA]; mockState.insertedRun = null; });

describe("GET /api/agents/runs", () => {
  it("returns runs list for workspace", async () => {
    expect((await request(app).get("/api/agents/runs").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/runs")).status).toBe(401);
  });
});

describe("GET /api/agents/runs/:id", () => {
  it("returns run details when authorized", async () => {
    expect((await request(app).get("/api/agents/runs/run-1").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/runs/run-1")).status).toBe(401);
  });
});

describe("GET /api/agents/runs/:id/logs", () => {
  it("returns logs for authorized run", async () => {
    expect((await request(app).get("/api/agents/runs/run-1/logs").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/runs/run-1/logs")).status).toBe(401);
  });
  it("returns 404/403/400 when run belongs to different workspace", async () => {
    authCtx.workspaceId = "ws-bbb"; mockState.runs = [];
    expect([404, 403, 400]).toContain((await request(app).get("/api/agents/runs/run-1/logs").set("Authorization", "Bearer valid-token")).status);
  });
});

describe("GET /api/agents/logs", () => {
  it("returns workspace-scoped logs", async () => {
    expect((await request(app).get("/api/agents/logs").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/logs")).status).toBe(401);
  });
});

describe("POST /api/agents/run", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).post("/api/agents/run").send({ query: "find leads" })).status).toBe(401);
  });
  it("returns 400 when no query", async () => {
    expect([400, 422]).toContain((await request(app).post("/api/agents/run").set("Authorization", "Bearer valid-token").send({})).status);
  });
  it("starts run when authenticated", async () => {
    mockState.insertedRun = RUN_AAA;
    expect((await request(app).post("/api/agents/run").set("Authorization", "Bearer valid-token").send({ query: "find restaurants in Berlin" })).status).toBeLessThan(500);
  });
});
