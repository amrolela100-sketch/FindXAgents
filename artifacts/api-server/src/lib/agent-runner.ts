import { db, agentPipelineRuns, agentLogs, agents, agentSkills, leads, analyses } from "@workspace/db";
import { eq, sql, and, ilike } from "drizzle-orm";
import { analyzeLeadWithGemini } from "./ai-engine.js";
import { logger } from "./logger.js";

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

  async run(query: string, maxResults: number = 10, userId: string | null) {
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
      if (!agent) throw new Error("No agent available to run pipeline");

      const skills = await db.select().from(agentSkills).where(eq(agentSkills.agentId, agent.id));
      
      // If no skills are defined, we'll use a hardcoded fallback pipeline for the requirement
      const pipelineSkills = skills.length > 0 ? skills.map(s => s.name) : ["discover-kvk", "qualify-ai", "stage-pipeline"];

      let discoveredLeadIds: string[] = [];

      for (const skill of pipelineSkills) {
        await logToDB(agent.id, this.runId, skill, "info", `Starting skill execution: ${skill}`);

        if (skill === "discover-kvk") {
          discoveredLeadIds = await this.skillDiscoverKvk(agent.id, query, maxResults, userId);
        } else if (skill === "qualify-ai") {
          await this.skillQualifyAi(agent.id, discoveredLeadIds);
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

  private async skillDiscoverKvk(agentId: string, query: string, maxResults: number, userId: string | null): Promise<string[]> {
    const kvkKey = process.env.KVK_API_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    let items: any[] = [];

    if (kvkKey) {
      await logToDB(agentId, this.runId, "discover-kvk", "info", `Searching KVK for: ${query}`);
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
          };
        });
      }
    } else if (googleKey) {
      await logToDB(agentId, this.runId, "discover-kvk", "info", `Searching Google Places for: ${query}`);
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
          source: kvkKey ? "kvk_api" : "google_places",
          status: "discovered"
        }).returning({ id: leads.id });
        insertedIds.push(newLead.id);
        added++;
      }
    }

    await db.update(agentPipelineRuns)
      .set({ leadsFound: insertedIds.length })
      .where(eq(agentPipelineRuns.id, this.runId));

    await logToDB(agentId, this.runId, "discover-kvk", "info", `Discovered and saved ${insertedIds.length} new leads`);
    return insertedIds;
  }

  private async skillQualifyAi(agentId: string, leadIds: string[]) {
    if (leadIds.length === 0) return;
    
    await logToDB(agentId, this.runId, "qualify-ai", "info", `Analyzing ${leadIds.length} leads with Gemini...`);
    let analyzedCount = 0;

    for (const id of leadIds) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, id));
      if (!lead) continue;

      try {
        const result = await analyzeLeadWithGemini(lead);
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
}
