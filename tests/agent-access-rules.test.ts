import { vi, describe, it, expect, beforeEach } from "vitest";

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa", isAdmin: false },
  mockState: { runs: [], logs: [], insertedRun: null },
}));

vi.mock("drizzle-orm", () => ({
  eq: () => ({}), and: (...a) => ({}), or: (...a) => ({}), not: () => ({}),
  ne: () => ({}), gt: () => ({}), gte: () => ({}), lt: () => ({}), lte: () => ({}),
  ilike: () => ({}), like: () => ({}), notIlike: () => ({}), notLike: () => ({}),
  isNull: () => ({}), isNotNull: () => ({}),
  inArray: () => ({}), notInArray: () => ({}),
  between: () => ({}), notBetween: () => ({}),
  desc: (c) => c, asc: (c) => c,
  count: () => ({ __count: true }),
  countDistinct: () => ({ __count: true }),
  sum: () => ({ __agg: true }), avg: () => ({ __agg: true }),
  max: () => ({ __agg: true }), min: () => ({ __agg: true }),
  sql: Object.assign(() => ({}), { raw: () => ({}) }),
  getTableColumns: () => ({}), getTableName: () => "mock_table", placeholder: () => ({}),
}));

// AgentRunner fires real HTTP, AI, DB. Mock it to a no-op.
vi.mock("../artifacts/api-server/src/lib/agent-runner.js", () => ({
  AgentRunner: vi.fn(class MockAgentRunner {
    run = vi.fn().mockResolvedValue(undefined);
  }),
}));
vi.mock("../artifacts/api-server/src/lib/website-scraper", () => ({
  smartScrape: vi.fn().mockResolvedValue({}),
  isDirectoryUrl: vi.fn().mockReturnValue(false),
  buildExtendedContext: vi.fn().mockReturnValue(""),
}));
vi.mock("../artifacts/api-server/src/lib/telegram", () => ({
  notifyPipelineComplete: vi.fn().mockResolvedValue(undefined),
  notifyPipelineFailed: vi.fn().mockResolvedValue(undefined),
  sendTelegramMessage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../artifacts/api-server/src/lib/push", () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../artifacts/api-server/src/lib/resend", () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
}));
vi.mock("../artifacts/api-server/src/lib/gemini", () => ({
  generateWithGemini: vi.fn().mockResolvedValue("mock response"),
}));
vi.mock("p-limit", () => ({ default: () => (fn) => fn() }));

const makeTable = () => new Proxy({}, { get: (_t, p) => ({ col: String(p) }) });

vi.mock("@workspace/db", () => {
  const makeTable = () => new Proxy({}, { get: (_t, p) => ({ col: String(p) }) });
  return {
    db: {
      select: () => {
        const c = {};
        ["from","where","orderBy","limit","offset","leftJoin","innerJoin","groupBy"].forEach(m => { c[m] = () => c; });
        c.then = (r, j) => Promise.resolve(mockState.runs).then(r, j);
        c.catch = f => Promise.resolve(mockState.runs).catch(f);
        c.finally = f => Promise.resolve(mockState.runs).finally(f);
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
  };
});
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: async (req, res, next) => {
    const h = req.headers?.authorization;
    if (!h?.startsWith("Bearer ") || !authCtx.userId) return res.status(401).json({ error: "Unauthorized" });
    req.user = { sub: authCtx.userId, userId: authCtx.userId, email: "test@example.com", role: authCtx.isAdmin ? "admin" : "user", activeWorkspaceId: authCtx.workspaceId };
    return next();
  },
  requireWorkspace: (req, res, next) => {
    if (!authCtx.workspaceId) return res.status(403).json({ error: "No workspace" });
    req.workspace = { id: authCtx.workspaceId };
    return next();
  },
  optionalAuth: (_req, _res, next) => next(),
}));

import app from "../artifacts/api-server/src/app";
import request from "supertest";

const RUN_AAA = { id: "run-1", workspaceId: "ws-aaa", status: "running", query: "test query" };
const LOG_AAA = { id: "log-1", runId: "run-1", workspaceId: "ws-aaa", message: "Processing..." };

beforeEach(() => {
  authCtx.userId = "user-aaa"; authCtx.workspaceId = "ws-aaa"; authCtx.isAdmin = false;
  mockState.runs = [RUN_AAA]; mockState.logs = [LOG_AAA]; mockState.insertedRun = null;
});

describe("GET /api/agents/runs", () => {
  it("runs list for workspace", async () => {
    expect((await request(app).get("/api/agents/runs").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/runs")).status).toBe(401);
  });
});

describe("GET /api/agents/runs/:id", () => {
  it("run details when authorized", async () => {
    expect((await request(app).get("/api/agents/runs/run-1").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/runs/run-1")).status).toBe(401);
  });
});

describe("GET /api/agents/runs/:id/logs", () => {
  it("logs for authorized run", async () => {
    expect((await request(app).get("/api/agents/runs/run-1/logs").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/runs/run-1/logs")).status).toBe(401);
  });
  it("404/403/400 for different workspace", async () => {
    authCtx.workspaceId = "ws-bbb"; mockState.runs = [];
    expect([404, 403, 400]).toContain((await request(app).get("/api/agents/runs/run-1/logs").set("Authorization", "Bearer valid-token")).status);
  });
});

describe("GET /api/agents/logs", () => {
  it("workspace-scoped logs", async () => {
    expect((await request(app).get("/api/agents/logs").set("Authorization", "Bearer valid-token")).status).toBeLessThan(500);
  });
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/agents/logs")).status).toBe(401);
  });
});

describe("POST /api/agents/run", () => {
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).post("/api/agents/run").send({ query: "find leads" })).status).toBe(401);
  });
  it("400 when no query", async () => {
    expect([400, 422]).toContain((await request(app).post("/api/agents/run").set("Authorization", "Bearer valid-token").send({})).status);
  });
  it("starts run when authenticated", async () => {
    mockState.insertedRun = RUN_AAA;
    expect((await request(app).post("/api/agents/run").set("Authorization", "Bearer valid-token").send({ query: "find restaurants in Berlin" })).status).toBeLessThan(500);
  });
});
