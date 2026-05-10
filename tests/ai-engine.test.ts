import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock is hoisted — use vi.fn() inside the factory directly
vi.mock("../artifacts/api-server/src/lib/ai-engine", () => ({
  analyzeLeadWithGemini: vi.fn().mockResolvedValue({
    score: 85,
    summary: "Great ICP fit.",
    opportunities: ["SEO", "Ads"],
    weaknesses: ["Slow site"],
    recommendations: ["Fix speed"],
    emailSubject: "Hello",
    digitalMaturity: "low",
    estimatedRevenueImpact: "€5,000/mo",
  }),
  generateOutreachWithGemini: vi.fn().mockResolvedValue({
    subject: "Test Subject",
    body: "Test Body\nNewline",
    language: "nl",
  }),
}));

import { analyzeLeadWithGemini, generateOutreachWithGemini } from "../artifacts/api-server/src/lib/ai-engine";

describe("AI Engine Logic", () => {
  beforeEach(() => {
    vi.mocked(analyzeLeadWithGemini).mockResolvedValue({
      score: 85,
      summary: "Great ICP fit.",
      opportunities: ["SEO", "Ads"],
      weaknesses: ["Slow site"],
      recommendations: ["Fix speed"],
      emailSubject: "Hello",
      digitalMaturity: "low",
      estimatedRevenueImpact: "€5,000/mo",
    });
    vi.mocked(generateOutreachWithGemini).mockResolvedValue({
      subject: "Test Subject",
      body: "Test Body\nNewline",
      language: "nl",
    });
  });

  it("should score lead and return ICP analysis", async () => {
    const lead = { id: "1", businessName: "Test BV", city: "Amsterdam" };

    const result = await analyzeLeadWithGemini(lead);

    expect(result.score).toBe(85);
    expect(result.summary).toContain("ICP");
    expect(result.opportunities).toContain("SEO");
    expect(vi.mocked(analyzeLeadWithGemini)).toHaveBeenCalledWith(lead);
  });

  it("should generate outreach with correct language", async () => {
    const lead = { id: "1", businessName: "Test BV", city: "Amsterdam" };
    const analysis = {
      score: 85,
      summary: "Great ICP fit.",
      opportunities: ["SEO"],
      weaknesses: ["Slow site"],
      recommendations: ["Fix speed"],
      emailSubject: "Hello",
      digitalMaturity: "low" as const,
      estimatedRevenueImpact: "€5k",
    };

    const result = await generateOutreachWithGemini(lead, analysis, "nl");

    expect(result.subject).toBe("Test Subject");
    expect(result.language).toBe("nl");
    expect(vi.mocked(generateOutreachWithGemini)).toHaveBeenCalledWith(lead, analysis, "nl");
  });
});
