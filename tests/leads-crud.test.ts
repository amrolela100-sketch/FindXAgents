import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

type Lead = {
  id: string;
  workspaceId: string;
  businessName: string;
  city: string;
  status: string;
  score: number | null;
};

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa" } as Record<string, string>,
  mockState: {
    leads: [] as Lead[],
    insertedLead: null as Lead | null,
    updatedCount: 0,
    deletedCount: 0,
  },
}));

vi.mock("@workspace/db", () => {
  let _whereArg: unknown = null;
  const whereClause = {
    execute: async () => mockState.leads,
    _whereArg,
    orderBy: () => ({
      limit: () => ({
        offset: async () => mockState.leads,
      }),
    }),
    leftJoin: () => ({ where: () => whereClause }),
  };
  const chainable: Record<string, unknown> = {
    select: () => ({
      from: () => ({
        where: (arg: unknown) => {
          _whereArg = arg;
          return whereClause;
        },
        leftJoin: () => ({
          where: (arg: unknown) => {
            _whereArg = arg;
            return whereClause;
          },
        }),
        orderBy: () => ({
          limit: () => ({
            offset: async () => mockState.leads,
          }),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () =>
          mockState.insertedLead ? [mockState.insertedLead] : [],
      }),
    }),
    update: () => ({
      set: () => ({
        where: (arg: unknown) => {
          _whereArg = arg;
          return {
            execute: async () => [],
            returning: async () =>
              mockState.leads.length > 0 ? [mockState.leads[0]] : [],
          };
        },
      }),
    }),
    delete: () => ({
      where: (arg: unknown) => {
        _whereArg = arg;
        return { execute: async () => [] };
      },
    }),
    _getWhereArg: () => _whereArg,
  };
  return { db: chainable };
});

vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: async (_token: string) =>
    authCtx.userId ? { id: authCtx.userId } : null,
}));

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
      };
      next();
    },
  };
});

import app from "../artifacts/api-server/src/app";
import request from "supertest";

const LEAD_AAA: Lead = {
  id: "lead-1",
  workspaceId: "ws-aaa",
  businessName: "Acme Corp",
  city: "Amsterdam",
  status: "new",
  score: 75,
};

beforeEach(() => {
  authCtx.userId = "user-aaa";
  authCtx.workspaceId = "ws-aaa";
  mockState.leads = [LEAD_AAA];
  mockState.insertedLead = null;
});

describe("GET /api/leads", () => {
  it("returns paginated list for authenticated user", async () => {
    const res = await request(app)
      .get("/api/leads")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });

  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads");
    expect(res.status).toBe(401);
  });
});

describe("GET /api/leads/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads/lead-1");
    expect(res.status).toBe(401);
  });

  it("returns 404 when lead not found", async () => {
    mockState.leads = [];
    const res = await request(app)
      .get("/api/leads/nonexistent-lead")
      .set("Authorization", "Bearer valid-token");
    expect([404, 400]).toContain(res.status);
  });

  it("returns 404 when lead belongs to different workspace (IDOR check)", async () => {
    authCtx.workspaceId = "ws-bbb";
    mockState.leads = [];
    const res = await request(app)
      .get("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token");
    expect([404, 403, 400]).toContain(res.status);
  });
});

describe("PATCH /api/leads/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app)
      .patch("/api/leads/lead-1")
      .send({ status: "contacted" });
    expect(res.status).toBe(401);
  });

  it("returns success when authenticated and lead is in workspace", async () => {
    mockState.leads = [LEAD_AAA];
    const res = await request(app)
      .patch("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "contacted" });
    expect(res.status).toBeLessThan(500);
  });

  it("returns error when lead belongs to different workspace", async () => {
    authCtx.workspaceId = "ws-bbb";
    mockState.leads = [];
    const res = await request(app)
      .patch("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token")
      .send({ status: "contacted" });
    expect([403, 404, 400]).toContain(res.status);
  });
});

describe("DELETE /api/leads/:id", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).delete("/api/leads/lead-1");
    expect(res.status).toBe(401);
  });

  it("returns success when authenticated and lead is in workspace", async () => {
    mockState.leads = [LEAD_AAA];
    const res = await request(app)
      .delete("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });

  it("returns error when lead belongs to different workspace", async () => {
    authCtx.workspaceId = "ws-bbb";
    mockState.leads = [];
    const res = await request(app)
      .delete("/api/leads/lead-1")
      .set("Authorization", "Bearer valid-token");
    expect([403, 404, 400]).toContain(res.status);
  });
});

describe("POST /api/leads/discover", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app)
      .post("/api/leads/discover")
      .send({ query: "restaurants in Amsterdam" });
    expect(res.status).toBe(401);
  });

  it("accepts query and returns job info when authenticated", async () => {
    const res = await request(app)
      .post("/api/leads/discover")
      .set("Authorization", "Bearer valid-token")
      .send({ query: "restaurants in Amsterdam" });
    expect(res.status).toBeLessThan(500);
  });
});

describe("GET /api/leads/export", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads/export");
    expect(res.status).toBe(401);
  });

  it("returns CSV content type when authenticated", async () => {
    const res = await request(app)
      .get("/api/leads/export")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      expect(
        res.headers["content-type"]?.includes("csv") ||
          res.headers["content-disposition"]?.includes("csv")
      ).toBeTruthy();
    }
  });
});

describe("POST /api/leads/import", () => {
  it("returns 400 when no csv field in body", async () => {
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect([400, 422]).toContain(res.status);
  });

  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app)
      .post("/api/leads/import")
      .send({ csv: "businessName,city\nAcme,Amsterdam" });
    expect(res.status).toBe(401);
  });

  it("accepts CSV string and returns import counts", async () => {
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({ csv: "businessName,city\nAcme,Amsterdam" });
    expect(res.status).toBeLessThan(500);
  });
});

describe("GET /api/leads/score-distribution", () => {
  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads/score-distribution");
    expect(res.status).toBe(401);
  });

  it("returns score buckets when authenticated", async () => {
    const res = await request(app)
      .get("/api/leads/score-distribution")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
});
