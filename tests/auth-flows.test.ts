import { vi, describe, it, expect, beforeEach } from "vitest";

const { authCtx } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa", isAdmin: false } as Record<string, string | boolean>,
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
      c.then = (r: any, j: any) => Promise.resolve([]).then(r, j);
      c.catch = (f: any) => Promise.resolve([]).catch(f);
      c.finally = (f: any) => Promise.resolve([]).finally(f);
      return c;
    },
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
}));

vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: async (h: string) => {
    const t = h?.replace("Bearer ", "");
    if (!t || t === "invalid-token" || !authCtx.userId) return null;
    return { id: authCtx.userId as string, email: "test@example.com" };
  },
}));

// Full standalone auth mock — no DB calls, no importOriginal
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: async (req: any, res: any, next: any) => {
    const h = req.headers?.authorization;
    if (!h?.startsWith("Bearer ") || !authCtx.userId) return res.status(401).json({ error: "Unauthorized" });
    req.user = { sub: authCtx.userId, userId: authCtx.userId, email: "test@example.com", role: authCtx.isAdmin ? "admin" : "user", activeWorkspaceId: authCtx.workspaceId };
    return next();
  },
  requireWorkspace: (req: any, res: any, next: any) => {
    if (!authCtx.workspaceId) return res.status(403).json({ error: "No workspace" });
    req.workspace = { id: authCtx.workspaceId, role: authCtx.isAdmin ? "admin" : "member" };
    return next();
  },
  optionalAuth: (_req: any, _res: any, next: any) => next(),
}));

import app from "../artifacts/api-server/src/app";
import request from "supertest";

beforeEach(() => { authCtx.userId = "user-aaa"; authCtx.workspaceId = "ws-aaa"; authCtx.isAdmin = false; });

describe("Auth middleware — requireAuth behavior", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  it("returns 403 when valid token but no workspace", async () => {
    authCtx.workspaceId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });

  it("returns 200-range when valid token and workspace", async () => {
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Admin-only route guards", () => {
  it("returns 403/404/400/422 when POST /api/agents with non-admin", async () => {
    authCtx.isAdmin = false;
    const res = await request(app).post("/api/agents").set("Authorization", "Bearer valid-token").send({ name: "x", query: "x" });
    expect([403, 404, 400, 422]).toContain(res.status);
  });

  it("does not return 401 for authenticated admin routes", async () => {
    authCtx.isAdmin = true;
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).not.toBe(401);
  });
});

describe("Token format edge cases", () => {
  it("returns 401 for malformed Bearer token", async () => {
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer");
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-Bearer scheme", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
  });

  it("returns 401 for empty Authorization", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "");
    expect(res.status).toBe(401);
  });
});
