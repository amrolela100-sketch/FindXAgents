import { vi, describe, it, expect, beforeEach } from "vitest";

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa" },
  mockState: { leads: [], insertedLead: null },
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
vi.mock("../artifacts/api-server/src/lib/agent-runner", () => ({
  AgentRunner: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockResolvedValue(undefined),
  })),
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
      select: () => { const c = {}; ["from","where","orderBy","limit","offset","leftJoin","innerJoin","groupBy"].forEach(m => { c[m] = () => c; }); c.then = (r, j) => Promise.resolve(mockState.leads).then(r, j); c.catch = f => Promise.resolve(mockState.leads).catch(f); c.finally = f => Promise.resolve(mockState.leads).finally(f); return c; },
      insert: () => ({ values: () => ({ returning: async () => mockState.insertedLead ? [mockState.insertedLead] : [], onConflictDoNothing: () => ({ returning: async () => mockState.insertedLead ? [mockState.insertedLead] : [] }) }) }),
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
    req.user = { sub: authCtx.userId, userId: authCtx.userId, email: "test@example.com", role: "user", activeWorkspaceId: authCtx.workspaceId };
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

const SAMPLE = [
  { id: "lead-1", workspaceId: "ws-aaa", businessName: "Acme Corp", city: "Amsterdam", status: "new", score: 80, email: "acme@example.com", phone: "+31612345678", website: "https://acme.nl" },
  { id: "lead-2", workspaceId: "ws-aaa", businessName: "Beta BV", city: "Rotterdam", status: "analyzed", score: 60, email: null, phone: null, website: null },
];

beforeEach(() => { authCtx.userId = "user-aaa"; authCtx.workspaceId = "ws-aaa"; mockState.leads = [...SAMPLE]; mockState.insertedLead = null; });

describe("GET /api/leads/export", () => {
  it("non-401 non-500 for authenticated user", async () => {
    const res = await request(app).get("/api/leads/export").set("Authorization", "Bearer valid-token");
    expect(res.status).not.toBe(401);
    expect(res.status).toBeLessThan(500);
  });
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).get("/api/leads/export")).status).toBe(401);
  });
});

describe("POST /api/leads/import", () => {
  it("401 when unauthenticated", async () => {
    authCtx.userId = "";
    expect((await request(app).post("/api/leads/import").send({})).status).toBe(401);
  });
  it("400 when no file provided", async () => {
    expect([400, 422]).toContain((await request(app).post("/api/leads/import").set("Authorization", "Bearer valid-token").send({})).status);
  });
});
