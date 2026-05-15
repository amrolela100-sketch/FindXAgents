import { vi, describe, it, expect, beforeEach } from "vitest";
import request from "supertest";

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa" },
  mockState: {
    leads: [
      {
        id: "lead-1",
        userId: "user-aaa",
        workspaceId: "ws-aaa",
        businessName: "Acme Corp",
        city: "Amsterdam",
        status: "discovered",
        hasWebsite: true,
        leadScore: 80,
        website: "https://acme.test",
        email: "hello@acme.test",
        phone: "+31612345678",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  },
}));

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
  sql: Object.assign(() => ({}), { raw: () => ({}) }),
  getTableColumns: () => ({}), getTableName: () => "mock_table", placeholder: () => ({}),
}));

vi.mock("../artifacts/api-server/src/lib/agent-runner.js", () => ({
  AgentRunner: vi.fn(class MockAgentRunner {
    run = vi.fn().mockResolvedValue(undefined);
  }),
}));
vi.mock("p-limit", () => ({ default: () => (fn: any) => fn() }));

vi.mock("@workspace/db", () => {
  const makeTable = () => new Proxy({}, { get: (_t, p) => ({ col: String(p) }) });
  const makeSelect = (rows: any[] = mockState.leads) => {
    const c: any = {};
    ["from", "where", "orderBy", "limit", "offset", "leftJoin", "innerJoin", "groupBy"].forEach((m) => {
      c[m] = vi.fn().mockReturnValue(c);
    });
    c.then = (r: any, j: any) => Promise.resolve(rows).then(r, j);
    c.catch = (f: any) => Promise.resolve(rows).catch(f);
    c.finally = (f: any) => Promise.resolve(rows).finally(f);
    return c;
  };

  return {
    db: {
      select: vi.fn().mockImplementation(() => makeSelect(mockState.leads)),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockState.leads[0]]),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockState.leads[0]]),
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
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
  requireAuth: (req: any, res: any, next: any) => {
    const h = req.headers?.authorization;
    if (!h?.startsWith("Bearer ") || !authCtx.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    req.user = {
      sub: authCtx.userId,
      userId: authCtx.userId,
      email: "test@example.com",
      role: "user",
      activeWorkspaceId: authCtx.workspaceId,
    };
    next();
  },
  requireWorkspace: (req: any, res: any, next: any) => {
    if (!authCtx.workspaceId) return res.status(403).json({ error: "No workspace" });
    req.workspace = { id: authCtx.workspaceId, role: "owner", name: "Test Workspace" };
    next();
  },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini: vi.fn().mockResolvedValue({
    score: 80,
    summary: "Mock analysis",
    opportunities: [],
    weaknesses: [],
    recommendations: [],
    emailSubject: "Subject",
    digitalMaturity: "low",
    estimatedRevenueImpact: "low",
  }),
  generateOutreachWithGemini: vi.fn().mockResolvedValue({ subject: "Test", body: "Body", language: "en" }),
}));

import app from "../artifacts/api-server/src/app";

beforeEach(() => {
  authCtx.userId = "user-aaa";
  authCtx.workspaceId = "ws-aaa";
});

describe("Lead CRUD smoke tests", () => {
  it("GET /api/leads returns non-500 when authenticated", async () => {
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });

  it("GET /api/leads returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });

  it("GET /api/leads/:id returns non-500 when authenticated", async () => {
    const res = await request(app).get("/api/leads/lead-1").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });

  it("PATCH /api/leads/:id returns non-500 when authenticated", async () => {
    const res = await request(app)
      .patch("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "qualified" });
    expect(res.status).toBeLessThan(500);
  });

  it("DELETE /api/leads/:id returns non-500 when authenticated", async () => {
    const res = await request(app)
      .delete("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });

  it("POST /api/leads/discover returns non-500 when authenticated", async () => {
    const res = await request(app)
      .post("/api/leads/discover")
      .set("Authorization", "Bearer valid-token")
      .send({ query: "restaurants in Amsterdam" });
    expect(res.status).toBeLessThan(500);
  });

  it("GET /api/leads/export returns non-500 when authenticated", async () => {
    const res = await request(app)
      .get("/api/leads/export")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });

  it("POST /api/leads/import returns 400 when csv missing", async () => {
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /api/leads/import returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).post("/api/leads/import").send({ csv: "businessName,city\nAcme,Amsterdam" });
    expect(res.status).toBe(401);
  });

  it("GET /api/leads/score-distribution returns non-500 when authenticated", async () => {
    const res = await request(app)
      .get("/api/leads/score-distribution")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
});
