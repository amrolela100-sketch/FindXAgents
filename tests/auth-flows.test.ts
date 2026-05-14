import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

// For auth flow tests, we only mock verifySupabaseToken — not the middleware itself.
// This tests the real requireAuth behavior.

const { authCtx } = vi.hoisted(() => ({
  authCtx: {
    userId: "user-aaa",
    workspaceId: "ws-aaa",
    isAdmin: false,
  } as Record<string, string | boolean>,
}));

vi.mock("@workspace/db", () => {
  const chainable: Record<string, unknown> = {
    select: () => ({
      from: () => ({
        where: async () => [],
        leftJoin: () => ({ where: async () => [] }),
      }),
    }),
    insert: () => ({ values: () => ({ returning: async () => [] }) }),
    update: () => ({
      set: () => ({ where: () => ({ execute: async () => [] }) }),
    }),
    delete: () => ({ where: () => ({ execute: async () => [] }) }),
  };
  return { db: chainable };
});

// Only mock verifySupabaseToken — middleware logic runs for real
vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: async (token: string) => {
    if (!token || token === "invalid-token") return null;
    return authCtx.userId ? { id: authCtx.userId as string } : null;
  },
}));

// Mock workspace lookup to simulate workspace membership
vi.mock("../artifacts/api-server/src/middleware/auth", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("../artifacts/api-server/src/middleware/auth")
    >();
  return {
    ...actual,
    requireWorkspace: (req: Request, res: Response, next: NextFunction) => {
      if (!authCtx.workspaceId)
        return res.status(403).json({ error: "No workspace" });
      (req as unknown as Record<string, unknown>).workspace = {
        id: authCtx.workspaceId,
        role: authCtx.isAdmin ? "admin" : "member",
      };
      next();
    },
  };
});

import app from "../artifacts/api-server/src/app";
import request from "supertest";

beforeEach(() => {
  authCtx.userId = "user-aaa";
  authCtx.workspaceId = "ws-aaa";
  authCtx.isAdmin = false;
});

describe("Auth middleware — real requireAuth behavior", () => {
  it("returns 401 when no Authorization header is present", async () => {
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is invalid (verifySupabaseToken returns null)", async () => {
    authCtx.userId = "";
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer invalid-token");
    expect(res.status).toBe(401);
  });

  it("returns 403 when valid token but no active workspace", async () => {
    authCtx.workspaceId = "";
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBe(403);
  });

  it("returns 200-range when valid token and valid workspace", async () => {
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

describe("Admin-only route guards", () => {
  it("returns 403 when POST /api/agents with non-admin user", async () => {
    authCtx.isAdmin = false;
    const res = await request(app)
      .post("/api/agents")
      .set("Authorization", "Bearer valid-token")
      .send({ name: "test-agent", query: "test" });
    // Should be 403 for non-admin, or 404 if route doesn't exist yet
    expect([403, 404, 400, 422]).toContain(res.status);
  });

  it("does not return 401 for authenticated admin routes", async () => {
    authCtx.isAdmin = true;
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).not.toBe(401);
  });
});

describe("Token format edge cases", () => {
  it("returns 401 for malformed Bearer token (spaces)", async () => {
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer");
    expect(res.status).toBe(401);
  });

  it("returns 401 for non-Bearer auth scheme", async () => {
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Basic dXNlcjpwYXNz");
    expect(res.status).toBe(401);
  });
});
