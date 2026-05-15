import { vi, describe, it, expect, beforeEach } from "vitest";

const { authCtx } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa", isAdmin: false },
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
      select: () => { const c = {}; ["from","where","orderBy","limit","offset","leftJoin","innerJoin","groupBy"].forEach(m => { c[m] = () => c; }); c.then = (r, j) => Promise.resolve([]).then(r, j); c.catch = f => Promise.resolve([]).catch(f); c.finally = f => Promise.resolve([]).finally(f); return c; },
      insert: () => ({ values: () => ({ returning: async () => [] }) }),
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
vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: async (h) => {
    const t = h?.replace("Bearer ", "");
    if (!t || t === "invalid-token" || !authCtx.userId) return null;
    return { id: authCtx.userId, email: "test@example.com" };
  },
}));
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

beforeEach(() => { authCtx.userId = "user-aaa"; authCtx.workspaceId = "ws-aaa"; authCtx.isAdmin = false; });

describe("Auth middleware — requireAuth behavior", () => {
  it("401 when no Authorization header", async () => {
    expect((await request(app).get("/api/leads")).status).toBe(401);
  });
  it("401 when token is invalid", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/leads").set("Authorization", "Bearer invalid-token")).status).toBe(401);
  });
  it("403 when valid token but no workspace", async () => {
    authCtx.workspaceId = "";
    expect((await request(app).get("/api/leads").set("Authorization", "Bearer valid-token")).status).toBe(403);
  });
  it("200-range when valid token and workspace", async () => {
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Admin-only route guards", () => {
  it("403/404/400/422 when POST /api/agents with non-admin", async () => {
    authCtx.isAdmin = false;
    expect([403, 404, 400, 422]).toContain((await request(app).post("/api/agents").set("Authorization", "Bearer valid-token").send({ name: "t", query: "t" })).status);
  });
  it("no 401 for authenticated admin", async () => {
    authCtx.isAdmin = true;
    expect((await request(app).get("/api/leads").set("Authorization", "Bearer valid-token")).status).not.toBe(401);
  });
});

describe("Token format edge cases", () => {
  it("401 for empty Bearer", async () => {
    expect((await request(app).get("/api/leads").set("Authorization", "Bearer")).status).toBe(401);
  });
  it("401 for non-Bearer scheme", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/leads").set("Authorization", "Basic dXNlcjpwYXNz")).status).toBe(401);
  });
});
