import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { mockState, analyzeLeadWithGeminiMock, generateOutreachWithGeminiMock, smartScrapeMock } = vi.hoisted(() => ({
  mockState: {
    logs: [] as Array<{ phase: string; level: string; message: string }>,
    insertedLeads: [] as any[],
    insertedAnalyses: [] as any[],
    insertedOutreaches: [] as any[],
    updates: [] as any[],
    leadsById: new Map<string, any>(),
    analysesByLeadId: new Map<string, any>(),
  },
  analyzeLeadWithGeminiMock: vi.fn(),
  generateOutreachWithGeminiMock: vi.fn(),
  smartScrapeMock: vi.fn(),
}));

const table = (name: string) => new Proxy({ __name: name }, { get: (target, prop) => prop === "__name" ? name : { table: name, column: String(prop) } });

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args) => ({ op: "eq", args })),
  and: vi.fn((...args) => ({ op: "and", args })),
  ilike: vi.fn((...args) => ({ op: "ilike", args })),
  isNull: vi.fn((...args) => ({ op: "isNull", args })),
  sql: Object.assign(vi.fn(() => ({ op: "sql" })), { raw: vi.fn(() => ({ op: "raw" })) }),
}));

vi.mock("p-limit", () => ({ default: () => (fn: () => unknown) => fn() }));

vi.mock("../artifacts/api-server/src/lib/website-scraper.js", () => ({
  smartScrape: smartScrapeMock,
  isDirectoryUrl: vi.fn(() => false),
  buildExtendedContext: vi.fn(() => "verified website context"),
}));

vi.mock("../artifacts/api-server/src/lib/telegram.js", () => ({
  notifyPipelineComplete: vi.fn().mockResolvedValue(undefined),
  notifyPipelineFailed: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../artifacts/api-server/src/lib/ai-engine.js", () => ({
  analyzeLeadWithGemini: analyzeLeadWithGeminiMock,
  generateOutreachWithGemini: generateOutreachWithGeminiMock,
}));

function makeSelectChain() {
  let selectedTable: any = null;
  const chain: any = {
    from(t: any) { selectedTable = t; return chain; },
    where() { return chain; },
    orderBy() { return chain; },
    limit() { return chain; },
    then(resolve: any, reject: any) {
      const name = selectedTable?.__name;
      let result: any[] = [];
      if (name === "leads") {
        // Full lead lookup in analysis/outreach paths.
        result = mockState.leadsById.size > 0 ? [mockState.leadsById.values().next().value] : [];
      } else if (name === "analyses") {
        result = mockState.analysesByLeadId.size > 0 ? [mockState.analysesByLeadId.values().next().value] : [];
      } else {
        // agents/searchConfigs/aiProviders/default duplicate checks all default empty.
        result = [];
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}

vi.mock("@workspace/db", () => {
  const leads = table("leads");
  const analyses = table("analyses");
  const outreaches = table("outreaches");
  const agentLogs = table("agentLogs");
  const agentPipelineRuns = table("agentPipelineRuns");
  const searchConfigs = table("searchConfigs");
  const agents = table("agents");
  const aiProviders = table("aiProviders");
  const notifications = table("notifications");

  return {
    leads, analyses, outreaches, agentLogs, agentPipelineRuns, searchConfigs, agents, aiProviders, notifications,
    agentSkills: table("agentSkills"),
    db: {
      select: vi.fn(() => makeSelectChain()),
      insert: vi.fn((t: any) => ({
        values: vi.fn((v: any) => {
          if (t.__name === "agentLogs") mockState.logs.push(v);
          if (t.__name === "leads") mockState.insertedLeads.push(v);
          if (t.__name === "analyses") mockState.insertedAnalyses.push(v);
          if (t.__name === "outreaches") mockState.insertedOutreaches.push(v);
          return {
            returning: vi.fn(async () => t.__name === "leads" ? [{ id: `lead-${mockState.insertedLeads.length}` }] : [v]),
          };
        }),
      })),
      update: vi.fn((t: any) => ({
        set: vi.fn((v: any) => {
          mockState.updates.push({ table: t.__name, values: v });
          return { where: vi.fn(async () => []) };
        }),
      })),
    },
  };
});

import { AgentRunner } from "../artifacts/api-server/src/lib/agent-runner.js";

function resetState() {
  mockState.logs = [];
  mockState.insertedLeads = [];
  mockState.insertedAnalyses = [];
  mockState.insertedOutreaches = [];
  mockState.updates = [];
  mockState.leadsById = new Map();
  mockState.analysesByLeadId = new Map();
  analyzeLeadWithGeminiMock.mockReset();
  generateOutreachWithGeminiMock.mockReset();
  smartScrapeMock.mockReset();
}

beforeEach(() => {
  resetState();
  process.env.TAVILY_API_KEY = "tvly-test";
  vi.spyOn(globalThis, "setTimeout").mockImplementation(((cb: (...args: unknown[]) => void) => {
    cb();
    return 0 as unknown as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
});

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.TAVILY_API_KEY;
});

describe("AgentRunner resilience", () => {
  it("does not crash the discovery phase on Tavily network timeouts", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network timeout"));

    const ids = await (new AgentRunner("run-timeout", "ws-1") as any)
      .skillDiscoverWeb("agent-1", "dentists Amsterdam", 3, "user-1", "ws-1");

    expect(ids).toEqual([]);
    expect(mockState.logs.some((l) => l.level === "warn" && l.message.includes("Tavily search failed"))).toBe(true);
    expect(mockState.updates.some((u) => u.table === "agentPipelineRuns" && u.values.leadsFound === 0)).toBe(true);
  });

  it("handles Tavily 429 rate limits without throwing or inserting partial leads", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => "rate limit exceeded",
    } as Response);

    const ids = await (new AgentRunner("run-429", "ws-1") as any)
      .skillDiscoverWeb("agent-1", "law firms Berlin", 5, "user-1", "ws-1");

    expect(ids).toEqual([]);
    expect(mockState.insertedLeads).toHaveLength(0);
    expect(mockState.logs.some((l) => l.level === "warn" && l.message.includes("Tavily returned status 429"))).toBe(true);
  });

  it("retries transient AI analysis failures and succeeds on a later attempt", async () => {
    mockState.leadsById.set("lead-1", {
      id: "lead-1",
      businessName: "Retry Dental",
      city: "Amsterdam",
      website: "https://retry.example",
      email: null,
      phone: null,
    });
    smartScrapeMock.mockResolvedValue({
      url: "https://retry.example",
      reachable: true,
      isHttps: true,
      emailAddresses: [],
      phoneNumbers: [],
      socialLinks: {},
      hasBlog: false,
      hasContactPage: true,
      hasPrivacyPolicy: true,
      hasSocialMedia: false,
    });
    analyzeLeadWithGeminiMock
      .mockRejectedValueOnce(new Error("OpenAI 500"))
      .mockRejectedValueOnce(new Error("OpenAI timeout"))
      .mockResolvedValueOnce({
        score: 62,
        summary: "Verified summary",
        opportunities: ["SEO"],
        weaknesses: ["No blog"],
        recommendations: ["Publish content"],
        emailSubject: "Quick idea",
        digitalMaturity: "medium",
        estimatedRevenueImpact: "€5k",
      });

    await (new AgentRunner("run-retry", "ws-1") as any).skillQualifyAi("agent-2", ["lead-1"], "en");

    expect(analyzeLeadWithGeminiMock).toHaveBeenCalledTimes(3);
    expect(mockState.insertedAnalyses).toHaveLength(1);
    expect(mockState.updates.some((u) => u.table === "leads" && u.values.status === "analyzed" && u.values.leadScore === 62)).toBe(true);
    expect(mockState.updates.some((u) => u.table === "agentPipelineRuns" && u.values.leadsAnalyzed === 1)).toBe(true);
  });

  it("does not crash outreach generation when every retry is rate-limited", async () => {
    mockState.leadsById.set("lead-2", {
      id: "lead-2",
      businessName: "Rate Limited BV",
      city: "Rotterdam",
      website: "https://limited.example",
    });
    mockState.analysesByLeadId.set("lead-2", {
      leadId: "lead-2",
      score: 50,
      findings: { summary: "x", weaknesses: [], recommendations: [], digitalMaturity: "medium" },
      opportunities: ["SEO"],
      createdAt: new Date(),
    });
    generateOutreachWithGeminiMock
      .mockRejectedValueOnce(new Error("OpenAI 429 rate limit"))
      .mockRejectedValueOnce(new Error("OpenAI 429 rate limit"));

    await (new AgentRunner("run-outreach-429", "ws-1") as any).skillGenerateOutreach("agent-3", ["lead-2"], "en");

    expect(generateOutreachWithGeminiMock).toHaveBeenCalledTimes(2);
    expect(mockState.insertedOutreaches).toHaveLength(0);
    expect(mockState.logs.some((l) => l.level === "error" && l.message.includes("Failed outreach"))).toBe(true);
    expect(mockState.updates.some((u) => u.table === "agentPipelineRuns" && u.values.emailsDrafted === 0)).toBe(true);
  });
});
