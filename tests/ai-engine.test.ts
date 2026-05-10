import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyzeLeadWithGemini, generateOutreachWithGemini } from "../artifacts/api-server/src/lib/ai-engine";

// Mock the OpenAI client
vi.mock("openai", () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: vi.fn().mockImplementation((opts) => {
            // Check if we're testing outreach or analysis
            if (opts.messages[0].content.includes("outreach")) {
              return Promise.resolve({
                choices: [
                  {
                    message: {
                      content: JSON.stringify({
                        subject: "Test Subject",
                        body: "Test Body\nNewline",
                        language: "nl",
                      }),
                    },
                  },
                ],
              });
            }

            // Default: Analysis response
            return Promise.resolve({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      score: 85,
                      summary: "Great ICP fit.",
                      opportunities: ["SEO", "Ads"],
                      weaknesses: ["Slow site"],
                      recommendations: ["Fix speed"],
                      emailSubject: "Hello",
                      digitalMaturity: "low",
                      estimatedRevenueImpact: "€5,000/mo",
                    }),
                  },
                },
              ],
            });
          }),
        },
      },
    })),
  };
});

describe("AI Engine Logic", () => {
  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "test_key";
  });

  it("should score lead and return ICP analysis", async () => {
    const lead = {
      id: "1",
      businessName: "Test BV",
      city: "Amsterdam",
    };

    const result = await analyzeLeadWithGemini(lead);
    
    expect(result.score).toBe(85);
    expect(result.summary).toContain("ICP");
    expect(result.opportunities).toContain("SEO");
  });

  it("should generate outreach with correct language", async () => {
    const lead = {
      id: "1",
      businessName: "Test BV",
      city: "Amsterdam",
    };

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
  });
});
