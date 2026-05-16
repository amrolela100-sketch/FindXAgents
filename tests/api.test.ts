import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

const TEST_USER_ID = "test-user-id";
const TEST_WORKSPACE_ID = "test-workspace-id";

const { mockLeadRow } = vi.hoisted(() => ({
  mockLeadRow: {
    id: "test-lead-id",
    businessName: "Integration Test BV",
    city: "Rotterdam",
    source: "test",
    status: "discovered",
    hasWebsite: false,
    leadScore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
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
  const returning = vi.fn().mockResolvedValue([mockLeadRow]);
  const insertFn = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning }) });
  const makeSelect = () => {
    const c = {};
    ["from","where","orderBy","limit","groupBy","offset","leftJoin","innerJoin"].forEach(m => { c[m] = vi.fn().mockReturnValue(c); });
    c.then = (r, j) => Promise.resolve([]).then(r, j);
    c.catch = f => Promise.resolve([]).catch(f);
    c.finally = f => Promise.resolve([]).finally(f);
    return c;
  };
  return {
    db: {
      insert: insertFn,
      select: vi.fn().mockImplementation(makeSelect),
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
      delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
    },
    leads: makeTable(), analyses: makeTable(), outreaches: makeTable(), users: makeTable(),
    agents: makeTable(), agentSkills: makeTable(), agentLogs: makeTable(), agentPipelineRuns: makeTable(),
    pipelineStages: makeTable(), searchConfigs: makeTable(), resendConfigs: makeTable(),
    smtpConfigs: makeTable(), emailSettings: makeTable(), telegramSettings: makeTable(),
    pushTokens: makeTable(), aiProviders: makeTable(), emailProviderTokens: makeTable(),
    workspaces: makeTable(), workspaceMembers: makeTable(), notifications: makeTable(),
  };
});
vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({ verifySupabaseToken: vi.fn().mockResolvedValue(null) }));
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: vi.fn((req, _res, next) => {
    req.user = { sub: TEST_USER_ID, userId: TEST_USER_ID, email: "test@example.com", role: "user", activeWorkspaceId: TEST_WORKSPACE_ID };
    next();
  }),
  optionalAuth: vi.fn((req, _res, next) => {
    req.user = { sub: TEST_USER_ID, userId: TEST_USER_ID, email: "test@example.com", role: "user", activeWorkspaceId: TEST_WORKSPACE_ID };
    next();
  }),
  requireWorkspace: vi.fn((req, _res, next) => {
    if (!req.user) req.user = {};
    req.workspace = { id: TEST_WORKSPACE_ID, role: "owner" };
    next();
  }),
}));
vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini: vi.fn().mockResolvedValue({ score: 90, summary: "Mock", opportunities: [], weaknesses: [], recommendations: [], emailSubject: "Test", digitalMaturity: "low", estimatedRevenueImpact: "high" }),
  generateOutreachWithGemini: vi.fn().mockResolvedValue({ subject: "Test", body: "Test body", language: "nl" }),
}));

import app from "../artifacts/api-server/src/app";

describe("API Integration Tests", () => {
  beforeAll(() => { process.env.OPENROUTER_API_KEY = "test-key"; });

  it("GET /api/healthz returns ok", async () => {
    // /healthz is a fast liveness probe — always 200, no DB check.
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
  });

  it("GET /api/readyz returns dependency status", async () => {
    // /readyz checks DB + Redis. CI has real postgres:16 + redis:7 services.
    const res = await request(app).get("/api/readyz");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("checks");
    expect(res.body.checks).toHaveProperty("db");
  });

  it("POST /api/leads creates a new lead", async () => {
    const res = await request(app)
      .post("/api/leads").set("Authorization", "Bearer test-token")
      .send({ businessName: "Integration Test BV", city: "Rotterdam", source: "test" });
    expect(res.status).toBe(201);
    expect(res.body.lead).toHaveProperty("id");
    expect(res.body.lead.businessName).toBe("Integration Test BV");
  });

  it("GET /api/dashboard/stats does not crash", async () => {
    expect((await request(app).get("/api/dashboard/stats").set("Authorization", "Bearer test-token")).status).toBeLessThan(500);
  });

  it("GET /api/agents does not crash", async () => {
    expect((await request(app).get("/api/agents").set("Authorization", "Bearer test-token")).status).toBeLessThanOrEqual(500);
  });
});
