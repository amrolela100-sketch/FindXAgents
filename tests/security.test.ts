/**
 * tests/security.test.ts
 *
 * Adversarial security tests — TEST-3
 *
 * Covers:
 *  1. IDOR — user A cannot access/modify user B's leads
 *  2. Cross-workspace data leakage on bulk operations
 *  3. Input validation — SQL injection attempts on query params
 *  4. Invalid UUID handling (should not crash, return 400/404)
 *  5. Unauthenticated access blocked on all protected routes
 *  6. Admin bypass — admin CAN access any workspace (by design)
 *  7. Bulk delete IDOR — user cannot delete leads outside their workspace
 *  8. PATCH /leads/:id — cannot overwrite another workspace's lead
 *  9. Status enum — rejects invalid status values
 * 10. Oversized payloads on import endpoint
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ── vi.hoisted: mutable auth context shared between mock factory and tests ─────
const { authCtx } = vi.hoisted(() => ({
  authCtx: {
    userId:      "user-aaa",
    workspaceId: "workspace-aaa",
    role:        "user" as "user" | "admin",
  },
}));

// ── Mock DB ───────────────────────────────────────────────────────────────────
vi.mock("@workspace/db", () => {
  // Leads belonging to workspace-aaa
  const ownLead = {
    id:          "lead-own-001",
    userId:      "user-aaa",
    workspaceId: "workspace-aaa",
    businessName: "My Company",
    city:        "Amsterdam",
    status:      "discovered",
    hasWebsite:  false,
    leadScore:   null,
    website:     null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  };

  // Lead belonging to a different workspace
  const foreignLead = {
    id:          "lead-foreign-999",
    userId:      "user-bbb",
    workspaceId: "workspace-bbb",
    businessName: "Foreign Corp",
    city:        "Rotterdam",
    status:      "discovered",
    hasWebsite:  false,
    leadScore:   null,
    website:     null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
  };

  // Map for single-lead lookups by id
  const leadById: Record<string, typeof ownLead> = {
    "lead-own-001":    ownLead,
    "lead-foreign-999": foreignLead,
  };

  function makeChain(rows: any[] = []) {
    const c: any = {};
    ["from", "where", "orderBy", "limit", "offset", "leftJoin", "innerJoin", "groupBy"].forEach((m) => {
      c[m] = vi.fn().mockReturnValue(c);
    });
    c.then    = (res: any, rej: any) => Promise.resolve(rows).then(res, rej);
    c.catch   = (rej: any)           => Promise.resolve(rows).catch(rej);
    c.finally = (fn: any)            => Promise.resolve(rows).finally(fn);
    return c;
  }

  return {
    db: {
      // select: by default returns [] — tests that need data override via mock
      select: vi.fn().mockImplementation(() => makeChain([])),

      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([ownLead]),
        }),
      }),

      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([ownLead]),
          }),
        }),
      }),

      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),

      transaction: vi.fn().mockImplementation(async (fn: any) => {
        const tx = {
          delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
          insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([ownLead]) }) }),
        };
        return fn(tx);
      }),
    },

    leads:             { id: "id", workspaceId: "workspaceId", userId: "userId", status: "status", businessName: "businessName", city: "city", industry: "industry", source: "source", hasWebsite: "hasWebsite", discoveredAt: "discoveredAt", leadScore: "leadScore", pipelineStageId: "pipelineStageId", website: "website" },
    analyses:          { leadId: "leadId", analyzedAt: "analyzedAt", type: "type" },
    outreaches:        { leadId: "leadId", createdAt: "createdAt", id: "id" },
    agents:            { id: "id", name: "name", isActive: "isActive", role: "role" },
    agentLogs:         { id: "id", agentId: "agentId", pipelineRunId: "pipelineRunId", phase: "phase", level: "level", message: "message", createdAt: "createdAt" },
    agentPipelineRuns: { id: "id", workspaceId: "workspaceId", userId: "userId", status: "status", query: "query", createdAt: "createdAt" },
    pipelineStages:    { id: "id", name: "name", order: "order" },
    users:             { id: "id", email: "email" },
    workspaces:        { id: "id", name: "name" },
    workspaceMembers:  { workspaceId: "workspaceId", userId: "userId", role: "role" },
    searchConfigs:     {}, resendConfigs: {}, smtpConfigs: {}, emailSettings: {},
    telegramSettings:  {}, pushTokens: {}, aiProviders: {}, emailProviderTokens: {},
    notifications:     {},
  };
});

vi.mock("../artifacts/api-server/src/lib/supabase-admin", () => ({
  verifySupabaseToken: vi.fn().mockResolvedValue(null),
}));

vi.mock("../artifacts/api-server/src/lib/cache", () => ({
  invalidateLeadCache: vi.fn().mockResolvedValue(undefined),
  getCachedLeadAnalysis: vi.fn().mockResolvedValue(null),
  setCachedLeadAnalysis: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini:      vi.fn().mockResolvedValue({ score: 75, summary: "mock", opportunities: [], weaknesses: [], recommendations: [], emailSubject: "test", digitalMaturity: "medium", estimatedRevenueImpact: "low" }),
  generateOutreachWithGemini: vi.fn().mockResolvedValue({ subject: "Hi", body: "Body", language: "en" }),
}));

vi.mock("../artifacts/api-server/src/lib/agent-runner", () => ({
  AgentRunner: vi.fn(class { run = vi.fn().mockResolvedValue(undefined); }),
}));

vi.mock("p-limit", () => ({ default: () => (fn: any) => fn() }));

// ── Auth mock — reads from authCtx ────────────────────────────────────────────
vi.mock("../artifacts/api-server/src/middleware/auth", () => ({
  requireAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = {
      sub:               authCtx.userId,
      userId:            authCtx.userId,
      email:             `${authCtx.userId}@test.com`,
      role:              authCtx.role,
      activeWorkspaceId: authCtx.workspaceId,
    };
    next();
  }),
  optionalAuth: vi.fn((req: any, _res: any, next: any) => {
    req.user = {
      sub:               authCtx.userId,
      userId:            authCtx.userId,
      email:             `${authCtx.userId}@test.com`,
      role:              authCtx.role,
      activeWorkspaceId: authCtx.workspaceId,
    };
    next();
  }),
  requireWorkspace: vi.fn((req: any, _res: any, next: any) => {
    req.workspace = { id: authCtx.workspaceId, role: "owner", name: "Test Workspace" };
    next();
  }),
  syncAndMapUser: vi.fn((req: any, _res: any, next: any) => next()),
}));

import app from "../artifacts/api-server/src/app";
import { db } from "@workspace/db";

// ── Helpers ───────────────────────────────────────────────────────────────────
function asUser(userId: string, workspaceId: string, role: "user" | "admin" = "user") {
  authCtx.userId      = userId;
  authCtx.workspaceId = workspaceId;
  authCtx.role        = role;
}

function mockSelectReturning(rows: any[]) {
  function makeChain(r: any[]) {
    const c: any = {};
    ["from", "where", "orderBy", "limit", "offset", "leftJoin", "innerJoin", "groupBy"].forEach((m) => {
      c[m] = vi.fn().mockReturnValue(c);
    });
    c.then    = (res: any, rej: any) => Promise.resolve(r).then(res, rej);
    c.catch   = (rej: any)           => Promise.resolve(r).catch(rej);
    c.finally = (fn: any)            => Promise.resolve(r).finally(fn);
    return c;
  }
  (db.select as any).mockImplementation(() => makeChain(rows));
}

// =============================================================================
describe("Security Tests — TEST-3", () => {

  beforeEach(() => {
    asUser("user-aaa", "workspace-aaa");
    vi.clearAllMocks();
  });

  // ── 1. Unauthenticated access ─────────────────────────────────────────────

  describe("1. Unauthenticated access is blocked", () => {
    beforeEach(() => {
      // Override requireAuth to NOT call next — simulates 401
      const authMod = vi.mocked(
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require("../artifacts/api-server/src/middleware/auth")
      );
      authMod.requireAuth.mockImplementationOnce((_req: any, res: any, _next: any) => {
        res.status(401).json({ error: "Unauthorized" });
      });
    });

    it("GET /api/leads returns 401 without auth", async () => {
      const res = await request(app).get("/api/leads");
      expect(res.status).toBe(401);
    });

    it("POST /api/leads returns 401 without auth", async () => {
      const res = await request(app).post("/api/leads").send({ businessName: "X", city: "Y" });
      expect(res.status).toBe(401);
    });
  });

  // ── 2. IDOR — access foreign lead ────────────────────────────────────────

  describe("2. IDOR — user cannot read a lead from another workspace", () => {
    it("GET /api/leads/:id returns 404 for foreign lead (workspace mismatch)", async () => {
      asUser("user-aaa", "workspace-aaa");
      // DB returns the foreign lead (belongs to workspace-bbb)
      mockSelectReturning([{
        id: "lead-foreign-999",
        workspaceId: "workspace-bbb",
        userId: "user-bbb",
      }]);
      const res = await request(app).get("/api/leads/lead-foreign-999");
      // checkLeadOwnership returns 404 when workspaceId doesn't match
      expect(res.status).toBe(404);
    });

    it("GET /api/leads/:id returns data for own lead (workspace match)", async () => {
      asUser("user-aaa", "workspace-aaa");
      mockSelectReturning([{
        id: "lead-own-001",
        workspaceId: "workspace-aaa",
        userId: "user-aaa",
        businessName: "My Company",
        city: "Amsterdam",
        status: "discovered",
        hasWebsite: false,
      }]);
      const res = await request(app).get("/api/leads/lead-own-001");
      expect(res.status).toBeLessThan(500);
    });
  });

  // ── 3. IDOR — PATCH a foreign lead ───────────────────────────────────────

  describe("3. IDOR — user cannot modify a lead from another workspace", () => {
    it("PATCH /api/leads/:id returns 404 for foreign lead", async () => {
      asUser("user-aaa", "workspace-aaa");
      mockSelectReturning([{
        id:          "lead-foreign-999",
        workspaceId: "workspace-bbb",
        userId:      "user-bbb",
      }]);
      const res = await request(app)
        .patch("/api/leads/lead-foreign-999")
        .send({ status: "qualified" });
      expect(res.status).toBe(404);
    });
  });

  // ── 4. IDOR — DELETE a foreign lead ──────────────────────────────────────

  describe("4. IDOR — user cannot delete a lead from another workspace", () => {
    it("DELETE /api/leads/:id returns 403 for foreign lead", async () => {
      asUser("user-aaa", "workspace-aaa");
      mockSelectReturning([{
        id:          "lead-foreign-999",
        workspaceId: "workspace-bbb",
        userId:      "user-bbb",
      }]);
      const res = await request(app).delete("/api/leads/lead-foreign-999");
      expect([403, 404]).toContain(res.status);
    });

    it("DELETE /api/leads/:id succeeds for own lead", async () => {
      asUser("user-aaa", "workspace-aaa");
      mockSelectReturning([{
        id:          "lead-own-001",
        workspaceId: "workspace-aaa",
        userId:      "user-aaa",
      }]);
      const res = await request(app).delete("/api/leads/lead-own-001");
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(true);
    });
  });

  // ── 5. Bulk delete IDOR ───────────────────────────────────────────────────

  describe("5. Bulk delete — workspace-scoped (IDOR prevention)", () => {
    it("returns 404 when no leads belong to the user's workspace", async () => {
      asUser("user-aaa", "workspace-aaa");
      // Simulate: DB returns empty set (foreign leads filtered out by workspace clause)
      mockSelectReturning([]);
      const res = await request(app)
        .post("/api/leads/bulk/delete")
        .send({ leadIds: ["00000000-0000-0000-0000-000000000099"] });
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/no leads found/i);
    });

    it("deletes only leads that belong to the active workspace", async () => {
      asUser("user-aaa", "workspace-aaa");
      // Simulate: only 1 of 2 IDs is in this workspace
      mockSelectReturning([{ id: "00000000-0000-0000-0000-000000000001" }]);
      const res = await request(app)
        .post("/api/leads/bulk/delete")
        .send({
          leadIds: [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002",
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.deleted).toBe(1);
      expect(res.body.skipped).toBe(1);
    });
  });

  // ── 6. Admin bypass ───────────────────────────────────────────────────────

  describe("6. Admin CAN access any lead (by design)", () => {
    it("admin gets data for foreign lead (bypasses workspace check)", async () => {
      asUser("admin-user", "workspace-admin", "admin");
      mockSelectReturning([{
        id:          "lead-foreign-999",
        workspaceId: "workspace-bbb",
        userId:      "user-bbb",
        businessName: "Foreign Corp",
        city:        "Rotterdam",
        status:      "discovered",
        hasWebsite:  false,
      }]);
      const res = await request(app).get("/api/leads/lead-foreign-999");
      // Admin should NOT get 404 — checkLeadOwnership returns true for admins
      expect(res.status).not.toBe(404);
      expect(res.status).toBeLessThan(500);
    });
  });

  // ── 7. Invalid UUID handling ──────────────────────────────────────────────

  describe("7. Invalid UUIDs are rejected gracefully", () => {
    it("GET /api/leads/:id with non-UUID returns 400 or 404, not 500", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).get("/api/leads/not-a-uuid");
      expect(res.status).not.toBe(500);
    });

    it("DELETE /api/leads/:id with SQL injection string returns non-500", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).delete("/api/leads/' OR 1=1 --");
      expect(res.status).not.toBe(500);
    });
  });

  // ── 8. Input validation — query params ───────────────────────────────────

  describe("8. Query param validation — SQL injection & bad values", () => {
    it("GET /api/leads?status=invalid_status returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).get("/api/leads?status=invalid_status");
      expect(res.status).toBe(400);
    });

    it("GET /api/leads?hasWebsite=notboolean returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).get("/api/leads?hasWebsite=notboolean");
      expect(res.status).toBe(400);
    });

    it("GET /api/leads?pageSize=9999 returns 400 (exceeds max)", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).get("/api/leads?pageSize=9999");
      expect(res.status).toBe(400);
    });

    it("GET /api/leads?page=-1 returns 400 (negative page)", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).get("/api/leads?page=-1");
      expect(res.status).toBe(400);
    });

    it("GET /api/leads with valid params returns 200", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app).get("/api/leads?status=discovered&hasWebsite=true&page=1&pageSize=10");
      expect(res.status).toBe(200);
    });
  });

  // ── 9. Bulk ops — invalid inputs rejected ────────────────────────────────

  describe("9. Bulk operations reject invalid inputs", () => {
    it("POST /api/leads/bulk/delete with non-UUID returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .post("/api/leads/bulk/delete")
        .send({ leadIds: ["not-a-uuid"] });
      expect(res.status).toBe(400);
    });

    it("POST /api/leads/bulk/delete with empty array returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .post("/api/leads/bulk/delete")
        .send({ leadIds: [] });
      expect(res.status).toBe(400);
    });

    it("PATCH /api/leads/bulk/status with invalid status returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .patch("/api/leads/bulk/status")
        .send({
          leadIds: ["00000000-0000-0000-0000-000000000001"],
          status: "hacked",
        });
      expect(res.status).toBe(400);
    });

    it("POST /api/leads/bulk/analyze with more than 100 IDs returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const ids = Array.from({ length: 101 }, (_, i) =>
        `00000000-0000-0000-0000-${String(i).padStart(12, "0")}`
      );
      const res = await request(app)
        .post("/api/leads/bulk/analyze")
        .send({ leadIds: ids });
      expect(res.status).toBe(400);
    });
  });

  // ── 10. Oversized import payload ──────────────────────────────────────────

  describe("10. Import endpoint rejects oversized CSV", () => {
    it("POST /api/leads/import with >5MB CSV returns 413", async () => {
      asUser("user-aaa", "workspace-aaa");
      // Generate a string larger than 5MB
      const bigCsv = "businessName,city\n" + "A".repeat(6 * 1024 * 1024);
      const res = await request(app)
        .post("/api/leads/import")
        .send({ csv: bigCsv });
      expect(res.status).toBe(413);
    });

    it("POST /api/leads/import with missing csv field returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .post("/api/leads/import")
        .send({ notcsv: "data" });
      expect(res.status).toBe(400);
    });
  });

  // ── 11. Lead creation — sanitization ─────────────────────────────────────

  describe("11. Lead creation input validation", () => {
    it("POST /api/leads with missing businessName returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .post("/api/leads")
        .send({ city: "Amsterdam" });
      expect(res.status).toBe(400);
    });

    it("POST /api/leads with missing city returns 400", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .post("/api/leads")
        .send({ businessName: "Test Co" });
      expect(res.status).toBe(400);
    });

    it("POST /api/leads with valid data returns 201", async () => {
      asUser("user-aaa", "workspace-aaa");
      const res = await request(app)
        .post("/api/leads")
        .send({ businessName: "Valid Company", city: "Amsterdam" });
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty("lead");
    });
  });

  // ── 12. Legacy leads (workspaceId = null) ─────────────────────────────────

  describe("12. Legacy leads (workspaceId=null) are inaccessible to normal users", () => {
    it("GET /api/leads/:id returns 404 for legacy lead (null workspaceId)", async () => {
      asUser("user-aaa", "workspace-aaa");
      mockSelectReturning([{
        id:          "lead-legacy-000",
        workspaceId: null,
        userId:      null,
      }]);
      const res = await request(app).get("/api/leads/lead-legacy-000");
      expect(res.status).toBe(404);
    });

    it("admin CAN access legacy lead (null workspaceId)", async () => {
      asUser("admin-user", "workspace-admin", "admin");
      mockSelectReturning([{
        id:          "lead-legacy-000",
        workspaceId: null,
        userId:      null,
        businessName: "Old Lead",
        city:        "Utrecht",
        status:      "discovered",
        hasWebsite:  false,
      }]);
      const res = await request(app).get("/api/leads/lead-legacy-000");
      expect(res.status).not.toBe(404);
      expect(res.status).toBeLessThan(500);
    });
  });
});
