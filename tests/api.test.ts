import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import app from "../artifacts/api-server/src/app";
import { db } from "@workspace/db";
import { eq } from "drizzle-orm";
import { leads } from "@workspace/db/src/schema";

// Mock the AI engine to avoid hitting real APIs
vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini: vi.fn().mockResolvedValue({
    score: 90,
    summary: "Mock analysis summary",
    opportunities: ["Opp 1"],
    weaknesses: ["Weakness 1"],
    recommendations: ["Rec 1"],
    emailSubject: "Test",
    digitalMaturity: "low",
    estimatedRevenueImpact: "high",
  }),
  generateOutreachWithGemini: vi.fn(),
}));

describe("API Integration Tests", () => {
  beforeAll(() => {
    process.env.OPENROUTER_API_KEY = "test-key";
  });

  let createdLeadId: string;

  it("POST /api/leads should create a new lead", async () => {
    const res = await request(app)
      .post("/api/leads")
      .send({
        businessName: "Integration Test BV",
        city: "Rotterdam",
        source: "test",
      });

    expect(res.status).toBe(201);
    expect(res.body.lead).toHaveProperty("id");
    expect(res.body.lead.businessName).toBe("Integration Test BV");
    
    createdLeadId = res.body.lead.id;
  });

  it("POST /api/leads/:id/analyze should run analysis", async () => {
    expect(createdLeadId).toBeDefined();

    const res = await request(app)
      .post(`/api/leads/${createdLeadId}/analyze`)
      .send();

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(90);
    expect(res.body.analysis).toHaveProperty("id");
  });

  it("GET /api/dashboard/stats should return dashboard stats", async () => {
    const res = await request(app).get("/api/dashboard/stats");
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("totalLeads");
    expect(res.body).toHaveProperty("analyzed");
    expect(res.body).toHaveProperty("contacted");
  });
  
  it("clean up test lead", async () => {
    await db.delete(leads).where(eq(leads.id, createdLeadId));
  });
});
