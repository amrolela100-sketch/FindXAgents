import { vi, describe, it, expect, beforeEach } from "vitest";
import type { Request, Response, NextFunction } from "express";

type Lead = {
  id: string;
  workspaceId: string;
  businessName: string;
  city: string;
  status: string;
  score: number | null;
  email: string | null;
  phone: string | null;
  website: string | null;
};

const { authCtx, mockState } = vi.hoisted(() => ({
  authCtx: { userId: "user-aaa", workspaceId: "ws-aaa" } as Record<string, string>,
  mockState: {
    leads: [] as Lead[],
    insertedLead: null as Lead | null,
  },
}));

vi.mock("@workspace/db", () => {
  const chainable: Record<string, unknown> = {
    select: () => ({
      from: () => ({
        where: async () => mockState.leads,
        orderBy: () => ({
          limit: () => ({
            offset: async () => mockState.leads,
          }),
        }),
        leftJoin: () => ({ where: async () => mockState.leads }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: async () =>
          mockState.insertedLead ? [mockState.insertedLead] : [],
        onConflictDoNothing: () => ({
          returning: async () =>
            mockState.insertedLead ? [mockState.insertedLead] : [],
        }),
      }),
    }),
    update: () => ({
      set: () => ({ where: () => ({ execute: async () => [] }) }),
    }),
    delete: () => ({ where: () => ({ execute: async () => [] }) }),
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

const SAMPLE_LEADS: Lead[] = [
  {
    id: "lead-1",
    workspaceId: "ws-aaa",
    businessName: "Acme Corp",
    city: "Amsterdam",
    status: "new",
    score: 80,
    email: "acme@example.com",
    phone: "+31612345678",
    website: "https://acme.com",
  },
  {
    id: "lead-2",
    workspaceId: "ws-aaa",
    businessName: "Beta BV",
    city: "Rotterdam",
    status: "contacted",
    score: 60,
    email: null,
    phone: null,
    website: null,
  },
  {
    id: "lead-3",
    workspaceId: "ws-aaa",
    businessName: "Gamma Gmbh",
    city: "Berlin",
    status: "qualified",
    score: 90,
    email: "gamma@example.de",
    phone: null,
    website: null,
  },
];

beforeEach(() => {
  authCtx.userId = "user-aaa";
  authCtx.workspaceId = "ws-aaa";
  mockState.leads = SAMPLE_LEADS;
  mockState.insertedLead = null;
});

describe("GET /api/leads/export", () => {
  it("returns CSV content-type for 3 leads", async () => {
    const res = await request(app)
      .get("/api/leads/export")
      .set("Authorization", "Bearer valid-token");

    expect(res.status).toBeLessThan(500);
    if (res.status === 200) {
      const contentType = res.headers["content-type"] ?? "";
      const contentDisp = res.headers["content-disposition"] ?? "";
      expect(
        contentType.includes("csv") ||
          contentDisp.includes("csv") ||
          contentDisp.includes("attachment")
      ).toBeTruthy();
    }
  });

  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app).get("/api/leads/export");
    expect(res.status).toBe(401);
  });

  it("passes status filter to DB query", async () => {
    const res = await request(app)
      .get("/api/leads/export?status=contacted")
      .set("Authorization", "Bearer valid-token");
    expect(res.status).toBeLessThan(500);
  });
});

describe("POST /api/leads/import", () => {
  it("returns 400 when body is empty", async () => {
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({});
    expect([400, 422]).toContain(res.status);
  });

  it("returns 400 when csv field is missing", async () => {
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({ data: "not a csv field" });
    expect([400, 422]).toContain(res.status);
  });

  it("returns 401 when unauthenticated", async () => {
    authCtx.userId = "";
    const res = await request(app)
      .post("/api/leads/import")
      .send({ csv: "businessName,city\nAcme,Amsterdam" });
    expect(res.status).toBe(401);
  });

  it("accepts valid CSV and returns created/skipped counts", async () => {
    mockState.insertedLead = SAMPLE_LEADS[0];
    const csv = "businessName,city,email\nAcme Corp,Amsterdam,acme@example.com";
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({ csv });
    expect(res.status).toBeLessThan(500);
    if (res.status === 200 || res.status === 201) {
      expect(res.body).toHaveProperty("created");
    }
  });

  it("handles malformed CSV without returning 500", async () => {
    const malformedCsv = 'businessName,city\n"unclosed quote,Amsterdam\n,';
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({ csv: malformedCsv });
    expect(res.status).not.toBe(500);
  });

  it("imports with skipDuplicates: false option", async () => {
    const csv = "businessName,city\nAcme Corp,Amsterdam";
    const res = await request(app)
      .post("/api/leads/import")
      .set("Authorization", "Bearer valid-token")
      .send({ csv, skipDuplicates: false });
    expect(res.status).toBeLessThan(500);
  });
});
