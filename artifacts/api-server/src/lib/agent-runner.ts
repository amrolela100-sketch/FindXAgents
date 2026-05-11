import { db, agentPipelineRuns, agentLogs, agents, agentSkills, leads, analyses, outreaches, searchConfigs, aiProviders } from "@workspace/db";
import { eq, sql, and, ilike } from "drizzle-orm";
import { analyzeLeadWithGemini, generateOutreachWithGemini } from "./ai-engine.js";
import { logger } from "./logger.js";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}

/** Resolve Tavily API key — DB config takes priority over env var */
async function getTavilyKey(): Promise<string | null> {
  try {
    const [cfg] = await db.select({ apiKey: searchConfigs.apiKey })
      .from(searchConfigs)
      .where(eq(searchConfigs.id, "default"))
      .limit(1);
    if (cfg?.apiKey) return cfg.apiKey;
  } catch { /* fall through */ }
  return process.env.TAVILY_API_KEY ?? null;
}

/** Resolve OpenRouter API key — DB config takes priority over env var */
async function getOpenRouterKey(): Promise<string | null> {
  try {
    const [cfg] = await db.select({ apiKey: aiProviders.apiKey })
      .from(aiProviders)
      .where(eq(aiProviders.providerType, "openrouter"))
      .limit(1);
    if (cfg?.apiKey) return cfg.apiKey;
  } catch { /* fall through */ }
  return process.env.OPENROUTER_API_KEY ?? null;
}

function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

async function logToDB(agentId: string, runId: string, phase: string, level: string, message: string) {
  await db.insert(agentLogs).values({
    agentId,
    pipelineRunId: runId,
    phase,
    level,
    message,
  });
}

export class AgentRunner {
  constructor(private runId: string) {}

  async run(query: string, maxResults: number = 10, userId: string | null, language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    try {
      // 1. Mark as running
      await db.update(agentPipelineRuns)
        .set({ status: "running" })
        .where(eq(agentPipelineRuns.id, this.runId));

      // 2. Load agent & skills
      // For business-recruitment, we'll try to find an agent by role or just the first one
      let [agent] = await db.select().from(agents).where(eq(agents.name, "research")).limit(1);
      if (!agent) {
        [agent] = await db.select().from(agents).limit(1);
      }
      if (!agent) {
        // Auto-create a default agent if none exists
        const [created] = await db.insert(agents).values({
          name: "research",
          displayName: "Research Agent",
          description: "Discovers and qualifies business leads",
          role: "research",
          icon: "Search",
          model: "google/gemini-2.5-flash",
          maxIterations: 15,
          maxTokens: 4096,
          systemPrompt: "You are a B2B research agent that discovers and qualifies business leads.",
          toolNames: ["web_search", "kvk_search", "save_lead"],
          pipelineOrder: 1,
          isActive: true,
        }).returning();
        agent = created;
      }

      const skills = await db.select().from(agentSkills).where(eq(agentSkills.agentId, agent.id));
      
      // If no skills are defined, we'll use a hardcoded fallback pipeline for the requirement
      const pipelineSkills = skills.length > 0 ? skills.map(s => s.name) : ["discover-web", "qualify-ai", "generate-outreach", "stage-pipeline"];

      let discoveredLeadIds: string[] = [];

      for (const skill of pipelineSkills) {
        await logToDB(agent.id, this.runId, skill, "info", `Starting skill execution: ${skill}`);

        if (skill === "discover-kvk" || skill === "discover-web") {
          discoveredLeadIds = await this.skillDiscoverWeb(agent.id, query, maxResults, userId);
        } else if (skill === "qualify-ai") {
          await this.skillQualifyAi(agent.id, discoveredLeadIds, language);
        } else if (skill === "generate-outreach") {
          await this.skillGenerateOutreach(agent.id, discoveredLeadIds, language);
        } else if (skill === "stage-pipeline") {
          await this.skillStagePipeline(agent.id, discoveredLeadIds);
        } else {
          await logToDB(agent.id, this.runId, skill, "warn", `Unknown skill: ${skill}. Skipping.`);
        }

        await logToDB(agent.id, this.runId, skill, "info", `Completed skill execution: ${skill}`);
      }

      await db.update(agentPipelineRuns)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(agentPipelineRuns.id, this.runId));

    } catch (err: any) {
      await db.update(agentPipelineRuns)
        .set({ status: "failed", error: err.message, completedAt: new Date() })
        .where(eq(agentPipelineRuns.id, this.runId));
      
      logger.error({ err, runId: this.runId }, "Pipeline run failed");
    }
  }

  private async skillDiscoverWeb(agentId: string, query: string, maxResults: number, userId: string | null): Promise<string[]> {
    const kvkKey = process.env.KVK_API_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const tavilyKey = await getTavilyKey();
    let items: any[] = [];

    // 1. Try Tavily (global, Arabic-friendly web search)
    if (tavilyKey && items.length === 0) {
      await logToDB(agentId, this.runId, "discover-web", "info", `Searching web via Tavily for: ${query}`);
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${query} business contact email phone`,
            search_depth: "basic",
            max_results: Math.min(maxResults * 2, 20),
            include_domains: [],
            exclude_domains: [],
          }),
        });
        if (res.ok) {
          const data: any = await res.json();
          items = (data.results || []).slice(0, maxResults).map((r: any) => {
            // Extract business name from title
            const title = r.title?.replace(/ - .*$/, "").replace(/ \| .*$/, "").trim();
            // Try to extract city from snippet or url
            const urlMatch = r.url?.match(/([a-z]{2,})\.(com|net|org|ae|sa|eg|ma|qa|kw|bh|om)/i);
            return {
              businessName: title || r.url,
              city: "—",
              website: r.url,
              industry: query,
              tavilyData: r.content?.slice(0, 500),
              source: "tavily",
            };
          }).filter((item: any) => item.businessName && item.businessName.length > 2);
        }
      } catch (e: any) {
        await logToDB(agentId, this.runId, "discover-web", "warn", `Tavily search failed: ${e.message}`);
      }
    }

    // 2. Fallback: KVK (Netherlands only)
    if (kvkKey && items.length === 0) {
      await logToDB(agentId, this.runId, "discover-web", "info", `Searching KVK for: ${query}`);
      const res = await fetch(`https://api.kvk.nl/api/v1/zoeken?handelsnaam=${encodeURIComponent(query)}&type=hoofdvestiging&resultatenPerPagina=${Math.min(maxResults, 100)}`, {
        headers: { "x-api-key": kvkKey }
      });
      if (res.ok) {
        const data: any = await res.json();
        items = (data.resultaten || []).map((item: any) => {
          const adres = item.adressen?.[0] || {};
          return {
            businessName: item.handelsnaam || item.naam,
            kvkNumber: item.kvkNummer,
            city: adres.plaats || "Unknown",
            address: adres.straatnaam ? `${adres.straatnaam} ${adres.huisnummer || ""}`.trim() : undefined,
            website: item.websites?.[0],
            industry: item.sbiActiviteiten?.[0]?.sbiOmschrijving,
            source: "kvk_api",
          };
        });
      }
    }

    // 3. Fallback: Google Places
    if (googleKey && items.length === 0) {
      await logToDB(agentId, this.runId, "discover-web", "info", `Searching Google Places for: ${query}`);
      const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleKey}`);
      if (res.ok) {
        const data: any = await res.json();
        items = (data.results || []).slice(0, maxResults).map((item: any) => {
          const cityMatch = item.formatted_address?.match(/([^,]+),\s*([^,]+)$/);
          return {
            businessName: item.name,
            city: cityMatch ? cityMatch[1].trim() : "Unknown",
            address: item.formatted_address,
            industry: item.types?.join(", "),
            source: "google_places",
          };
        });
      }
    }

    const insertedIds: string[] = [];
    let added = 0;

    for (const lead of items) {
      if (added >= maxResults) break;
      const domain = getDomain(lead.website);
      
      const conditions = [];
      if (lead.kvkNumber) conditions.push(eq(leads.kvkNumber, lead.kvkNumber));
      if (domain) conditions.push(ilike(leads.website, `%${domain}%`));
      
      let exists = false;
      if (conditions.length > 0) {
        const existing = await db.select({ id: leads.id }).from(leads).where(sql`${conditions[0]} ${conditions[1] ? sql`OR ${conditions[1]}` : sql``}`).limit(1);
        if (existing.length > 0) exists = true;
      } else {
        const existingByName = await db.select({ id: leads.id }).from(leads).where(and(ilike(leads.businessName, lead.businessName), ilike(leads.city, lead.city))).limit(1);
        if (existingByName.length > 0) exists = true;
      }

      if (!exists) {
        const [newLead] = await db.insert(leads).values({
          userId,
          ...lead,
          hasWebsite: !!lead.website,
          source: lead.source ?? "web_search",
          status: "discovered"
        }).returning({ id: leads.id });
        insertedIds.push(newLead.id);
        added++;
      }
    }

    await db.update(agentPipelineRuns)
      .set({ leadsFound: insertedIds.length })
      .where(eq(agentPipelineRuns.id, this.runId));

    await logToDB(agentId, this.runId, "discover-web", "info", `Discovered and saved ${insertedIds.length} new leads`);
    return insertedIds;
  }

  private async skillQualifyAi(agentId: string, leadIds: string[], language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    if (leadIds.length === 0) return;
    
    await logToDB(agentId, this.runId, "qualify-ai", "info", `Analyzing ${leadIds.length} leads with Gemini...`);
    let analyzedCount = 0;

    for (const id of leadIds) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, id));
      if (!lead) continue;

      try {
        const result = await withRetry(() => analyzeLeadWithGemini(lead), 3, 1000);
        await db.insert(analyses).values({
          leadId: lead.id,
          type: "gemini_digital",
          score: result.score,
          findings: {
            summary: result.summary,
            weaknesses: result.weaknesses,
            recommendations: result.recommendations,
            emailSubject: result.emailSubject,
            digitalMaturity: result.digitalMaturity,
            estimatedRevenueImpact: result.estimatedRevenueImpact,
          },
          opportunities: result.opportunities,
        });

        await db.update(leads).set({
          status: "analyzed",
          leadScore: result.score,
          updatedAt: new Date(),
        }).where(eq(leads.id, lead.id));

        analyzedCount++;
        await logToDB(agentId, this.runId, "qualify-ai", "info", `Analyzed ${lead.businessName}: Score ${result.score}`);
      } catch (e: any) {
        await logToDB(agentId, this.runId, "qualify-ai", "error", `Failed to analyze ${lead.businessName}: ${e.message}`);
      }
    }

    await db.update(agentPipelineRuns)
      .set({ leadsAnalyzed: analyzedCount })
      .where(eq(agentPipelineRuns.id, this.runId));
  }

  private async skillStagePipeline(agentId: string, leadIds: string[]) {
    if (leadIds.length === 0) return;

    await logToDB(agentId, this.runId, "stage-pipeline", "info", `Updating pipeline stages for ${leadIds.length} leads...`);

    for (const id of leadIds) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, id));
      if (!lead || !lead.leadScore) continue;

      let newStatus: any = "analyzed";
      if (lead.leadScore >= 80) newStatus = "qualified";
      else if (lead.leadScore < 30) newStatus = "lost";

      if (newStatus !== lead.status) {
        await db.update(leads).set({ status: newStatus, updatedAt: new Date() }).where(eq(leads.id, id));
        await logToDB(agentId, this.runId, "stage-pipeline", "info", `${lead.businessName} moved to ${newStatus} (Score: ${lead.leadScore})`);
      }
    }
  }

  private async skillGenerateOutreach(agentId: string, leadIds: string[], language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    if (leadIds.length === 0) return;

    await logToDB(agentId, this.runId, "generate-outreach", "info", `Generating outreach emails for ${leadIds.length} leads in ${language}...`);
    let emailCount = 0;

    for (const id of leadIds) {
      try {
        const [lead] = await db.select().from(leads).where(eq(leads.id, id));
        if (!lead) continue;

        // Get the latest analysis
        const [analysis] = await db.select().from(analyses)
          .where(eq(analyses.leadId, id))
          .orderBy(analyses.createdAt)
          .limit(1);

        if (!analysis) {
          await logToDB(agentId, this.runId, "generate-outreach", "warn", `No analysis found for ${lead.businessName}, skipping outreach`);
          continue;
        }

        // Build analysis result object
        const findings = analysis.findings as Record<string, any>;
        const analysisResult = {
          score: analysis.score ?? 50,
          summary: findings?.summary ?? "",
          opportunities: (analysis.opportunities as string[]) ?? [],
          weaknesses: findings?.weaknesses ?? [],
          recommendations: findings?.recommendations ?? [],
          emailSubject: findings?.emailSubject ?? `Partnership opportunity for ${lead.businessName}`,
          digitalMaturity: findings?.digitalMaturity ?? "medium",
          estimatedRevenueImpact: findings?.estimatedRevenueImpact ?? "",
        };

        const outreach = await withRetry(() => generateOutreachWithGemini(lead as any, analysisResult, language), 2, 1000);

        await db.insert(outreaches).values({
          leadId: id,
          subject: outreach.subject,
          body: outreach.body,
          status: "draft",
          personalizedDetails: { language: outreach.language, generatedBy: "pipeline" },
        });

        // Update lead status to contacting
        await db.update(leads).set({ status: "contacting", updatedAt: new Date() }).where(eq(leads.id, id));

        emailCount++;
        await logToDB(agentId, this.runId, "generate-outreach", "info", `Generated email for ${lead.businessName}`);
      } catch (e: any) {
        await logToDB(agentId, this.runId, "generate-outreach", "error", `Failed to generate outreach for lead ${id}: ${e.message}`);
      }
    }

    await db.update(agentPipelineRuns)
      .set({ emailsDrafted: emailCount })
      .where(eq(agentPipelineRuns.id, this.runId));

    await logToDB(agentId, this.runId, "generate-outreach", "info", `Generated ${emailCount} outreach emails`);
  }
}
