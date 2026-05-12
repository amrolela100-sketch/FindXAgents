import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

const mockLeadData = {
  id: "test-lead-id",
  businessName: "Integration Test BV",
  city: "Rotterdam",
  source: "test",
  status: "discovered",
  hasWebsite: false,
  leadScore: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mock DB ────────────────────────────────────────────────────────────────────
vi.mock("@workspace/db", () => {
  const returning = vi.fn().mockResolvedValue([{
    id: "test-lead-id",
    businessName: "Integration Test BV",
    city: "Rotterdam",
    source: "test",
    status: "discovered",
    hasWebsite: false,
    leadScore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }]);
  const values = vi.fn().mockReturnValue({ returning });
  const insertFn = vi.fn().mockReturnValue({ values });

  // Build a fully chainable select mock
  const resolveEmpty = vi.fn().mockResolvedValue([]);
  const chain: any = {};
  const chainMethods = ["from", "where", "orderBy", "limit", "groupBy", "offset"];
  chainMethods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain);
  });
  chain.then = resolveEmpty.bind(null); // make it thenable → resolves to []
  // Override to be a proper promise
  Object.assign(chain, Promise.resolve([]));
  const selectFn = vi.fn().mockImplementation(() => {
    const c: any = {};
    chainMethods.forEach((m) => { c[m] = vi.fn().mockReturnValue(c); });
    // Make it a thenable that resolves to []
    c[Symbol.toStringTag] = "Promise";
    c.then = (res: any, rej: any) => Promise.resolve([]).then(res, rej);
    c.catch = (rej: any) => Promise.resolve([]).catch(rej);
    c.finally = (fn: any) => Promise.resolve([]).finally(fn);
    return c;
  });

  const updateWhere = vi.fn().mockResolvedValue([]);
  const updateSet = vi.fn().mockReturnValue({ where: updateWhere });
  const updateFn = vi.fn().mockReturnValue({ set: updateSet });
  const deleteWhere = vi.fn().mockResolvedValue([]);
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere });

  return {
    db: { insert: insertFn, select: selectFn, update: updateFn, delete: deleteFn },
    leads: {}, analyses: {}, outreaches: {}, users: {}, agents: {},
    agentSkills: {}, agentLogs: {}, agentPipelineRuns: {}, pipelineStages: {},
    searchConfigs: {}, resendConfigs: {}, smtpConfigs: {}, emailSettings: {},
    telegramSettings: {}, pushTokens: {}, aiProviders: {}, emailProviderTokens: {},
  };
});

// ── Mock Supabase (disable auth for tests) ────────────────────────────────────
vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: vi.fn().mockResolvedValue(null),
}));

// ── Mock auth middleware to bypass requireAuth ────────────────────────────────
const TEST_WORKSPACE_ID = "test-workspace-id";
const TEST_USER_ID = "test-user-id";

vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = {
      sub: TEST_USER_ID,
      userId: TEST_USER_ID,
      email: "test@example.com",
      role: "user",
      activeWorkspaceId: TEST_WORKSPACE_ID,
    };
    next();
  }),
  optionalAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = {
      sub: TEST_USER_ID,
      userId: TEST_USER_ID,
      email: "test@example.com",
      role: "user",
      activeWorkspaceId: TEST_WORKSPACE_ID,
    };
    next();
  }),
  requireWorkspace: vi.fn((req: any, _res: any, next: any) => {
    // Workspace already set by requireAuth mock — just pass through
    next();
  }),
}));

// ── Mock AI Engine ────────────────────────────────────────────────────────────
vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini: vi.fn().mockResolvedValue({
    score: 90, summary: "Mock analysis summary",
    opportunities: ["Opp 1"], weaknesses: ["Weakness 1"],
    recommendations: ["Rec 1"], emailSubject: "Test",
    digitalMaturity: "low", estimatedRevenueImpact: "high",
  }),
  generateOutreachWithGemini: vi.fn().mockResolvedValue({
    subject: "Test", body: "Test body", language: "nl",
  }),
}));

import app from "../artifacts/api-server/src/app";

describe("API Integration Tests", () => {
  beforeAll(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  it("GET /api/healthz should return ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status");
  });

  it("POST /api/leads should create a new lead", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({ businessName: "Integration Test BV", city: "Rotterdam", source: "test" });

    expect(res.status).toBe(201);
    expect(res.body.lead).toHaveProperty("id");
    expect(res.body.lead.businessName).toBe("Integration Test BV");
  });

  it("GET /api/dashboard/stats should not crash", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    expect(res.status).toBeLessThan(500);
  });

  it("GET /api/agents should not crash", async () => {
    const res = await request(app).get("/api/agents");
    expect(res.status).toBeLessThanOrEqual(500);
  });
});
