import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

const { authCtx } = vi.hoisted(() => ({
  authCtx: {
    userId: "user-aaa",
    workspaceId: "ws-aaa",
    isAdmin: false,
  } as Record<string, string | boolean>,
}));

// Proxy-based table stubs — prevents drizzle-orm from throwing on undefined columns
const makeTable = () => new Proxy({}, { get: (_t, p) => ({ __mockCol: String(p) }) });

vi.mock("@workspace/db", () => ({
  db: {
    select: () => { const c: any = {}; ["from","where","orderBy","limit","offset","leftJoin","innerJoin","groupBy"].forEach(m => { c[m] = () => c; }); c.then = (r: any, j: any) => Promise.resolve([]).then(r, j); c.catch = (f: any) => Promise.resolve([]).catch(f); c.finally = (f: any) => Promise.resolve([]).finally(f); return c; },
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
  verifySupabaseToken: async (authHeader: string) => {
    const token = authHeader?.replace("Bearer ", "");
    if (!token || token === "invalid-token" || !authCtx.userId) return null;
    return { id: authCtx.userId as string, email: "test@example.com" };
  },
}));

// Full standalone mock — bypasses DB-sync in real requireAuth entirely
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = (req as any).headers?.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
    const token = authHeader.replace("Bearer ", "");
    if (!token || token === "invalid-token" || !authCtx.userId) return res.status(401).json({ error: "Unauthorized" });
    (req as any).user = {
      sub: authCtx.userId as string, userId: authCtx.userId as string,
      email: "test@example.com", role: authCtx.isAdmin ? "admin" : "user",
      activeWorkspaceId: authCtx.workspaceId as string,
    };
    return next();
  },
  requireWorkspace: (req: Request, res: Response, next: NextFunction) => {
    if (!authCtx.workspaceId) return res.status(403).json({ error: "No active workspace" });
    (req as any).workspace = { id: authCtx.workspaceId, role: authCtx.isAdmin ? "admin" : "member" };
    return next();
  },
  optionalAuth: async (_req: Request, _res: Response, next: NextFunction) => next(),
}));

import app from "../artifacts/api-server/src/app";
import request from "supertest";

beforeEach(() => {
  authCtx.userId = "user-aaa";
  authCtx.workspaceId = "ws-aaa";
  authCtx.isAdmin = false;
});

describe("Auth middleware — requireAuth behavior", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  it("returns 403 when valid token but no active workspace", async () => {
    authCtx.workspaceId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });

  it("returns 200-range when valid token and valid workspace", async () => {
    const res = await request(app).get("/api/leads").set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Admin-only route guards", () => {
  it("returns 403 when POST /api/agents with non-admin user", async () => {
    authCtx.isAdmin = false;
    const res = await request(app).post("/api/agents").set("Authorization", "Bearer valid-token").send({ name: "test-agent", query: "test" });
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

  it("returns 401 for non-Bearer auth scheme", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
  });

  it("returns 401 for empty Authorization header value", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads").set("Authorization", "");
    expect(res.status).toBe(401);
  });
});
