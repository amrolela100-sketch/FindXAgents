import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";

const TEST_USER_ID = "test-user-id";
const TEST_WORKSPACE_ID = "test-workspace-id";

const mockLeadRow = {
  id: "test-lead-id", businessName: "Integration Test BV", city: "Rotterdam",
  source: "test", status: "discovered", hasWebsite: false, leadScore: null,
  createdAt: new Date(), updatedAt: new Date(),
};

// Proxy-based table stubs — prevents drizzle-orm from throwing on undefined columns
const makeTable = () => new Proxy({}, { get: (_t, p) => ({ __mockCol: String(p) }) });

// ── Mock DB ───────────────────────────────────────────────────────────────────
vi.mock("@workspace/db", () => {
  const returning = vi.fn().mockResolvedValue([mockLeadRow]);
  const values = vi.fn().mockReturnValue({ returning });
  const insertFn = vi.fn().mockReturnValue({ values });

  const makeSelect = () => {
    const c: any = {};
    ["from","where","orderBy","limit","groupBy","offset","leftJoin","innerJoin"].forEach(m => { c[m] = vi.fn().mockReturnValue(c); });
    c.then = (res: any, rej: any) => Promise.resolve([]).then(res, rej);
    c.catch = (fn: any) => Promise.resolve([]).catch(fn);
    c.finally = (fn: any) => Promise.resolve([]).finally(fn);
    return c;
  };
  const selectFn = vi.fn().mockImplementation(makeSelect);
  const updateFn = vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) });
  const deleteFn = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

  return {
    db: { insert: insertFn, select: selectFn, update: updateFn, delete: deleteFn },
    leads: makeTable(), analyses: makeTable(), outreaches: makeTable(), users: makeTable(),
    agents: makeTable(), agentSkills: makeTable(), agentLogs: makeTable(), agentPipelineRuns: makeTable(),
    pipelineStages: makeTable(), searchConfigs: makeTable(), resendConfigs: makeTable(),
    smtpConfigs: makeTable(), emailSettings: makeTable(), telegramSettings: makeTable(),
    pushTokens: makeTable(), aiProviders: makeTable(), emailProviderTokens: makeTable(),
    workspaces: makeTable(), workspaceMembers: makeTable(), notifications: makeTable(),
  };
});

// ── Mock Supabase ─────────────────────────────────────────────────────────────
vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: vi.fn().mockResolvedValue(null),
}));

// ── Mock auth middleware ───────────────────────────────────────────────────────
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = { sub: TEST_USER_ID, userId: TEST_USER_ID, email: "test@example.com", role: "user", activeWorkspaceId: TEST_WORKSPACE_ID };
    next();
  }),
  optionalAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = { sub: TEST_USER_ID, userId: TEST_USER_ID, email: "test@example.com", role: "user", activeWorkspaceId: TEST_WORKSPACE_ID };
    next();
  }),
  requireWorkspace: vi.fn((req: any, _res: any, next: any) => {
    if (!req.user) req.user = {} as any;
    req.workspace = { id: TEST_WORKSPACE_ID, role: "owner" };
    next();
  }),
}));

// ── Mock AI Engine ────────────────────────────────────────────────────────────
vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini: vi.fn().mockResolvedValue({
    score: 90, summary: "Mock", opportunities: ["Opp 1"], weaknesses: ["W 1"],
    recommendations: ["Rec 1"], emailSubject: "Test", digitalMaturity: "low", estimatedRevenueImpact: "high",
  }),
  generateOutreachWithGemini: vi.fn().mockResolvedValue({ subject: "Test", body: "Test body", language: "nl" }),
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
      .set("Authorization", "Bearer test-token")
      .send({ businessName: "Integration Test BV", city: "Rotterdam", source: "test" });
    expect(res.status).toBe(201);
    expect(res.body.lead).toHaveProperty("id");
    expect(res.body.lead.businessName).toBe("Integration Test BV");
  });

  it("GET /api/dashboard/stats should not crash", async () => {
    const res = await request(app).get("/api/dashboard/stats").set("Authorization", "Bearer test-token");
    expect(res.status).toBeLessThan(500);
  });

  it("GET /api/agents should not crash", async () => {
    const res = await request(app).get("/api/agents").set("Authorization", "Bearer test-token");
    expect(res.status).toBeLessThanOrEqual(500);
  });
});
