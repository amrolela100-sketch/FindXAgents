import { db } from "@workspace/db";
import { leads, analyses, agents, agentPipelineRuns, agentLogs, searchConfigs } from "@workspace/db";
import { eq, ilike, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { decryptSecret } from "../lib/secret-crypto.js";

export type DiscoveredLead = {
  businessName: string;
  city: string;
  kvkNumber?: string;
  website?: string;
  address?: string;
  industry?: string;
};

export function getDomain(url?: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

export async function getOrCreateDiscoveryAgent() {
  let [agent] = await db.select().from(agents).where(eq(agents.name, "discovery_bot")).limit(1);
  if (!agent) {
    [agent] = await db.insert(agents).values({
      name: "discovery_bot",
      displayName: "Discovery Bot",
      description: "Automated Lead Discovery",
      role: "search",
    }).returning();
  }
  return agent;
}

export async function fetchLeadsFromKVK(query: string, maxResults: number, apiKey: string): Promise<DiscoveredLead[]> {
  const res = await fetch(
    `https://api.kvk.nl/api/v1/zoeken?handelsnaam=${encodeURIComponent(query)}&type=hoofdvestiging&resultatenPerPagina=${Math.min(maxResults, 100)}`,
    { headers: { "x-api-key": apiKey } }
  );
  if (!res.ok) return [];
  const data: any = await res.json();
  return (data.resultaten || []).map((item: any) => {
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

export async function fetchLeadsFromGoogle(query: string, maxResults: number, apiKey: string): Promise<DiscoveredLead[]> {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
  );
  if (!res.ok) return [];
  const data: any = await res.json();
  return (data.results || []).slice(0, maxResults).map((item: any) => {
    const cityMatch = item.formatted_address?.match(/([^,]+),\s*([^,]+)$/);
    return {
      businessName: item.name,
      city: cityMatch ? cityMatch[1].trim() : "Unknown",
      address: item.formatted_address,
      industry: item.types?.join(", "),
    };
  });
}

export async function deduplicateLead(
  lead: DiscoveredLead,
  workspaceId: string | null
): Promise<boolean> {
  const domain = getDomain(lead.website);
  const conditions = [];
  if (lead.kvkNumber) conditions.push(eq(leads.kvkNumber, lead.kvkNumber));
  if (domain) conditions.push(ilike(leads.website, `%${domain}%`));

  const wsFilter = workspaceId
    ? eq(leads.workspaceId, workspaceId)
    : sql`${leads.workspaceId} IS NULL`;

  if (conditions.length > 0) {
    const existing = await db.select({ id: leads.id }).from(leads).where(
      and(wsFilter, sql`(${conditions[0]} ${conditions[1] ? sql`OR ${conditions[1]}` : sql``})`)
    ).limit(1);
    if (existing.length > 0) return true;
  } else {
    const existingByName = await db.select({ id: leads.id }).from(leads).where(
      and(wsFilter, ilike(leads.businessName, lead.businessName), ilike(leads.city, lead.city))
    ).limit(1);
    if (existingByName.length > 0) return true;
  }
  return false;
}

export async function runDiscoveryJob(
  runId: string,
  query: string,
  maxResults: number,
  userId: string | null,
  workspaceId: string | null = null
) {
  const agent = await getOrCreateDiscoveryAgent();
  let leadsFound = 0;

  try {
    const kvkKey = process.env.KVK_API_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;

    await db.insert(agentLogs).values({
      agentId: agent.id,
      pipelineRunId: runId,
      phase: "discovery",
      level: "info",
      message: `Starting discovery for query: ${query} (max ${maxResults})`,
    });

    let discoveredLeads: DiscoveredLead[] = [];

    if (kvkKey) {
      await db.insert(agentLogs).values({
        agentId: agent.id,
        pipelineRunId: runId,
        phase: "discovery",
        level: "info",
        message: "Using KVK API for discovery",
      });
      discoveredLeads = await fetchLeadsFromKVK(query, maxResults, kvkKey);
    } else if (googleKey) {
      await db.insert(agentLogs).values({
        agentId: agent.id,
        pipelineRunId: runId,
        phase: "discovery",
        level: "info",
        message: "Using Google Places API for discovery",
      });
      discoveredLeads = await fetchLeadsFromGoogle(query, maxResults, googleKey);
    } else {
      throw new Error("No API keys configured for KVK or Google Places");
    }

    await db.insert(agentLogs).values({
      agentId: agent.id,
      pipelineRunId: runId,
      phase: "discovery",
      level: "info",
      message: `Found ${discoveredLeads.length} potential leads. Deduplicating...`,
    });

    // Import enrichment lazily to avoid circular deps
    const { runTavilyEnrichment } = await import("./enrichment.service.js");

    for (const lead of discoveredLeads) {
      if (leadsFound >= maxResults) break;

      const isDuplicate = await deduplicateLead(lead, workspaceId);
      if (!isDuplicate) {
        const [newLead] = await db.insert(leads).values({
          userId,
          workspaceId,
          businessName: lead.businessName,
          city: lead.city,
          kvkNumber: lead.kvkNumber,
          address: lead.address,
          website: lead.website,
          hasWebsite: !!lead.website,
          industry: lead.industry,
          source: kvkKey ? "kvk_api" : "google_places",
          status: "discovered",
        }).returning();
        leadsFound++;
        // HIGH-2 fix: pass workspaceId so enrichment resolves the correct Tavily key
        runTavilyEnrichment(newLead.id, lead.businessName, lead.city, workspaceId)
          .catch((err) => logger.error({ err }, "Tavily enrichment failed"));
      }
    }

    await db.update(agentPipelineRuns).set({
      status: "completed",
      leadsFound,
      completedAt: new Date(),
    }).where(eq(agentPipelineRuns.id, runId));

    await db.insert(agentLogs).values({
      agentId: agent.id,
      pipelineRunId: runId,
      phase: "discovery",
      level: "info",
      message: `Discovery complete. Added ${leadsFound} new leads.`,
    });

  } catch (err: any) {
    await db.update(agentPipelineRuns).set({
      status: "failed",
      error: err.message,
      completedAt: new Date(),
    }).where(eq(agentPipelineRuns.id, runId));

    await db.insert(agentLogs).values({
      agentId: agent.id,
      pipelineRunId: runId,
      phase: "discovery",
      level: "error",
      message: `Discovery failed: ${err.message}`,
    });
  }
}
