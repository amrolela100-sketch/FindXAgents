import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { leads, analyses, outreaches } from "@workspace/db";
import { eq, and, ilike, sql, desc, count, isNotNull, isNull, inArray } from "drizzle-orm";
import { z } from "zod";
import { analyzeLeadWithGemini, generateOutreachWithGemini } from "../lib/ai-engine";
import { optionalAuth } from "../middleware/auth";
import { logger } from "../lib/logger.js";
import { aiLimiter, discoveryLimiter } from "../middleware/rate-limit.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(optionalAuth);

// ─── Lead CRUD ────────────────────────────────────────────────────────────────

import { sanitizeString, validateEmail, validateWebsiteUrl } from "../lib/sanitize.js";

const createLeadSchema = z.object({
  businessName: z.string().min(1),
  city: z.string().min(1),
  address: z.string().optional(),
  industry: z.string().optional(),
  website: z.string().optional().or(z.literal("")),
  phone: z.string().optional(),
  email: z.string().optional().or(z.literal("")),
  kvkNumber: z.string().optional(),
  source: z.string().default("manual"),
});

router.post("/leads", async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }
  
  const raw = parsed.data;
  
  // Apply sanitization
  const businessName = sanitizeString(raw.businessName) || raw.businessName;
  const city = sanitizeString(raw.city) || raw.city;
  const address = sanitizeString(raw.address);
  const industry = sanitizeString(raw.industry);
  const website = raw.website && validateWebsiteUrl(raw.website) ? raw.website : undefined;
  const phone = sanitizeString(raw.phone);
  const email = raw.email && validateEmail(raw.email) ? raw.email : undefined;
  const kvkNumber = sanitizeString(raw.kvkNumber);
  
  try {
    const [lead] = await db.insert(leads).values({
      userId: req.user?.sub ?? null,
      businessName,
      city,
      address,
      industry,
      website,
      hasWebsite: !!website,
      phone,
      email,
      kvkNumber,
      source: raw.source,
    }).returning();
    return res.status(201).json({ lead });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/leads", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10));
    const pageSize = Math.min(500, Math.max(1, parseInt(String(req.query.pageSize ?? "25"), 10)));
    const { city, industry, status, source, hasWebsite, search } = req.query as Record<string, string>;

    const conditions: ReturnType<typeof ilike>[] = [];

    if (req.user?.userId) {
      conditions.push(sql`${leads.userId} = ${req.user.userId}` as ReturnType<typeof ilike>);
    }

    if (city) conditions.push(ilike(leads.city, `%${city}%`));
    if (industry) conditions.push(ilike(leads.industry, `%${industry}%`));
    if (status) conditions.push(sql`${leads.status} = ${status}`);
    if (source) conditions.push(ilike(leads.source, `%${source}%`));
    if (hasWebsite !== undefined) conditions.push(sql`${leads.hasWebsite} = ${hasWebsite === "true"}`);
    if (search) {
      conditions.push(
        sql`(${leads.businessName} ILIKE ${"%" + search + "%"} OR ${leads.city} ILIKE ${"%" + search + "%"} OR ${leads.industry} ILIKE ${"%" + search + "%"})`
      );
    }

    const whereClause = conditions.length > 0 ? and(...(conditions as [ReturnType<typeof ilike>, ...ReturnType<typeof ilike>[]])) : undefined;

    const [rows, totalResult] = await Promise.all([
      db.select().from(leads).where(whereClause).orderBy(desc(leads.discoveredAt)).limit(pageSize).offset((page - 1) * pageSize),
      db.select({ count: count() }).from(leads).where(whereClause),
    ]);

    const leadIds = rows.map((l: { id: string }) => l.id);
    const analysisMap = new Map<string, typeof analyses.$inferSelect[]>();
    const outreachMap = new Map<string, typeof outreaches.$inferSelect[]>();

    if (leadIds.length > 0) {
      const [analysisRows, outreachRows] = await Promise.all([
        db.select().from(analyses).where(inArray(analyses.leadId, leadIds)).orderBy(desc(analyses.analyzedAt)),
        db.select().from(outreaches).where(inArray(outreaches.leadId, leadIds)).orderBy(desc(outreaches.createdAt)),
      ]);
      for (const a of analysisRows) {
        if (!analysisMap.has(a.leadId)) analysisMap.set(a.leadId, []);
        analysisMap.get(a.leadId)!.push(a);
      }
      for (const o of outreachRows) {
        if (!outreachMap.has(o.leadId)) outreachMap.set(o.leadId, []);
        outreachMap.get(o.leadId)!.push(o);
      }
    }

    const enrichedLeads = rows.map((l: typeof rows[number]) => ({
      ...l,
      analyses: analysisMap.get(l.id) ?? [],
      outreaches: outreachMap.get(l.id) ?? [],
    }));

    return res.json({ leads: enrichedLeads, total: Number(totalResult[0]?.count ?? 0), page, pageSize });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Static sub-paths MUST be declared BEFORE /:id ───────────────────────────

import { agentPipelineRuns, agentLogs, agents } from "@workspace/db";

async function getOrCreateDiscoveryAgent() {
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

import { searchConfigs } from "@workspace/db";

async function runTavilyEnrichment(leadId: string, businessName: string, city: string) {
  try {
    const [config] = await db.select().from(searchConfigs).where(eq(searchConfigs.id, "default"));
    const apiKey = config?.apiKey || process.env.TAVILY_API_KEY;
    if (!apiKey) return;

    const query = `${businessName} ${city} Netherlands`;
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "advanced",
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      logger.error({ leadId, status: response.status }, "Tavily enrichment failed");
      return;
    }

    const data: any = await response.json();
    
    // Extract website from results if not already set
    const websites = data.results.map((r: any) => r.url).filter((url: string) => !url.includes("linkedin.com") && !url.includes("facebook.com"));
    const primaryWebsite = websites.length > 0 ? websites[0] : null;

    // Store raw data in analysis
    await db.insert(analyses).values({
      leadId,
      type: "tavily_enrichment",
      findings: {
        summary: data.answer || "No answer generated by Tavily.",
        results: data.results,
        query: data.query,
      },
    });

    // Mark as enriched and optionally update website
    const updates: Record<string, any> = { isTavilyEnriched: true, updatedAt: new Date() };
    if (primaryWebsite) {
      // Check if lead already has a website
      const [existingLead] = await db.select({ website: leads.website }).from(leads).where(eq(leads.id, leadId));
      if (!existingLead.website) {
        updates.website = primaryWebsite;
        updates.hasWebsite = true;
      }
    }
    
    await db.update(leads).set(updates).where(eq(leads.id, leadId));

  } catch (error) {
    logger.error({ err: error, leadId }, "Tavily enrichment error");
  }
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

async function runDiscoveryJob(runId: string, query: string, maxResults: number, userId: string | null) {
  const agent = await getOrCreateDiscoveryAgent();
  let leadsFound = 0;

  try {
    const kvkKey = process.env.KVK_API_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;

    let discoveredLeads: Array<{ businessName: string; city: string; kvkNumber?: string; website?: string; address?: string; industry?: string }> = [];

    await db.insert(agentLogs).values({
      agentId: agent.id,
      pipelineRunId: runId,
      phase: "discovery",
      level: "info",
      message: `Starting discovery for query: ${query} (max ${maxResults})`,
    });

    if (kvkKey) {
      await db.insert(agentLogs).values({
        agentId: agent.id,
        pipelineRunId: runId,
        phase: "discovery",
        level: "info",
        message: "Using KVK API for discovery",
      });

      const res = await fetch(`https://api.kvk.nl/api/v1/zoeken?handelsnaam=${encodeURIComponent(query)}&type=hoofdvestiging&resultatenPerPagina=${Math.min(maxResults, 100)}`, {
        headers: { "x-api-key": kvkKey }
      });
      if (res.ok) {
        const data: any = await res.json();
        const items = data.resultaten || [];
        discoveredLeads = items.map((item: any) => {
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
      await db.insert(agentLogs).values({
        agentId: agent.id,
        pipelineRunId: runId,
        phase: "discovery",
        level: "info",
        message: "Using Google Places API for discovery",
      });

      const res = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleKey}`);
      if (res.ok) {
        const data: any = await res.json();
        const items = data.results || [];
        discoveredLeads = items.slice(0, maxResults).map((item: any) => {
          const cityMatch = item.formatted_address?.match(/([^,]+),\s*([^,]+)$/);
          return {
            businessName: item.name,
            city: cityMatch ? cityMatch[1].trim() : "Unknown",
            address: item.formatted_address,
            industry: item.types?.join(", "),
          };
        });
      }
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

    for (const lead of discoveredLeads) {
      if (leadsFound >= maxResults) break;

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
          businessName: lead.businessName,
          city: lead.city,
          kvkNumber: lead.kvkNumber,
          address: lead.address,
          website: lead.website,
          hasWebsite: !!lead.website,
          industry: lead.industry,
          source: kvkKey ? "kvk_api" : "google_places",
          status: "discovered"
        }).returning();
        leadsFound++;
        
        // Fire and forget enrichment
        runTavilyEnrichment(newLead.id, lead.businessName, lead.city).catch((err) => logger.error({ err }, "Tavily enrichment failed"));
      }
    }

    await db.update(agentPipelineRuns).set({
      status: "completed",
      leadsFound,
      completedAt: new Date()
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
      completedAt: new Date()
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

const discoverSchema = z.object({
  query: z.string().min(1),
  maxResults: z.number().min(1).max(100).default(10),
});

router.post("/leads/discover", discoveryLimiter, async (req, res) => {
  const parsed = discoverSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Missing or invalid query", details: parsed.error.flatten() });
  }
  const { query, maxResults } = parsed.data;

  try {
    const [run] = await db.insert(agentPipelineRuns).values({
      userId: req.user?.sub ?? null,
      query,
      status: "running"
    }).returning();

    runDiscoveryJob(run.id, query, maxResults, req.user?.sub ?? null).catch((err) => logger.error({ err }, "Discovery job failed"));

    return res.status(202).json({
      message: "Discovery queued.",
      jobs: [run.id],
      runId: run.id
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/leads/bulk/analyze", aiLimiter, async (req, res) => {
  const schema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "leadIds must be an array of UUIDs (max 100)", details: parsed.error.flatten() });

  const { leadIds } = parsed.data;
  await db.update(leads).set({ status: "analyzing", updatedAt: new Date() }).where(inArray(leads.id, leadIds));
  return res.json({ queued: leadIds.length, message: "Analysis queued. Configure AI provider to run analysis." });
});

router.post("/leads/bulk/outreach", aiLimiter, async (req, res) => {
  const schema = z.object({ leadIds: z.array(z.string().uuid()).min(1).max(100) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "leadIds must be an array of UUIDs (max 100)", details: parsed.error.flatten() });
  return res.json({ queued: parsed.data.leadIds.length, message: "Outreach generation queued. Configure AI provider to run generation." });
});

router.patch("/leads/bulk/status", async (req, res) => {
  const schema = z.object({
    leadIds: z.array(z.string().uuid()).min(1).max(100),
    status: z.enum(["discovered", "analyzing", "analyzed", "contacting", "responded", "qualified", "won", "lost"]),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });

  const { leadIds, status } = parsed.data;
  await db.update(leads).set({ status, updatedAt: new Date() }).where(inArray(leads.id, leadIds));
  return res.json({ updated: leadIds.length, status });
});

router.post("/leads/import", async (req, res) => {
  const { csv: csvText, skipDuplicates = true } = req.body as { csv?: string; skipDuplicates?: boolean };
  if (!csvText || typeof csvText !== "string") {
    return res.status(400).json({ error: "Missing 'csv' field with CSV text content" });
  }

  try {
    const lines = csvText.trim().split("\n");
    if (lines.length < 2) return res.json({ created: 0, skipped: 0, errors: [] });

    const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const created: number[] = [];
    const errors: Array<{ row: number; message: string }> = [];
    let skipped = 0;

    function parseCsvLine(line: string): string[] {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let ci = 0; ci < line.length; ci++) {
        if (line[ci] === '"') {
          inQuotes = !inQuotes;
        } else if (line[ci] === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += line[ci];
        }
      }
      result.push(current.trim());
      return result;
    }

    for (let i = 1; i < lines.length; i++) {
      const parts = parseCsvLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => { row[h] = parts[idx] ?? ""; });

      const rawBusinessName = row.businessName || row.business_name || row.name;
      const rawCity = row.city || row.City;
      if (!rawBusinessName || !rawCity) {
        errors.push({ row: i + 1, message: "Missing businessName or city" });
        continue;
      }
      // Sanitize CSV fields to prevent injection
      const businessName = sanitizeString(rawBusinessName) || rawBusinessName;
      const city = sanitizeString(rawCity) || rawCity;

      try {
        if (skipDuplicates) {
          const userConditions = [ilike(leads.businessName, businessName), ilike(leads.city, city)];
          if (req.user?.userId) userConditions.push(sql`${leads.userId} = ${req.user.userId}` as ReturnType<typeof ilike>);
          const existing = await db.select({ id: leads.id }).from(leads)
            .where(and(...(userConditions as [ReturnType<typeof ilike>, ...ReturnType<typeof ilike>[]])))
            .limit(1);
          if (existing.length > 0) { skipped++; continue; }
        }

        const website = (row.website && validateWebsiteUrl(row.website)) ? row.website : undefined;
        const email = (row.email && validateEmail(row.email)) ? row.email : undefined;
        await db.insert(leads).values({
          userId: req.user?.userId ?? null,
          businessName,
          city,
          address: sanitizeString(row.address),
          industry: sanitizeString(row.industry),
          website,
          hasWebsite: !!website,
          phone: sanitizeString(row.phone),
          email,
          kvkNumber: sanitizeString(row.kvkNumber || row.kvk_number),
          source: sanitizeString(row.source) || "import",
        });
        created.push(i);
      } catch (rowErr) {
        errors.push({ row: i + 1, message: rowErr instanceof Error ? rowErr.message : "Unknown error" });
      }
    }

    return res.json({ created: created.length, skipped, errors });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/leads/export", async (req, res) => {
  try {
    const { city, industry, status, hasWebsite, search } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof ilike>[] = [];

    if (req.user?.userId) {
      conditions.push(sql`${leads.userId} = ${req.user.userId}` as ReturnType<typeof ilike>);
    }

    if (city) conditions.push(ilike(leads.city, `%${city}%`));
    if (industry) conditions.push(ilike(leads.industry, `%${industry}%`));
    if (status) conditions.push(sql`${leads.status} = ${status}`);
    if (hasWebsite) conditions.push(sql`${leads.hasWebsite} = ${hasWebsite === "true"}`);
    if (search) conditions.push(sql`(${leads.businessName} ILIKE ${"%" + search + "%"} OR ${leads.city} ILIKE ${"%" + search + "%"})`);

    const rows = await db.select().from(leads)
      .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof ilike>, ...ReturnType<typeof ilike>[]])) : undefined)
      .orderBy(desc(leads.discoveredAt))
      .limit(500);

    const headers = ["id", "businessName", "city", "industry", "website", "phone", "email", "status", "source", "discoveredAt"];
    // CSV cell sanitizer: prevents formula injection (=, +, -, @) and wraps values with commas/quotes
    const csvCell = (val: unknown): string => {
      let str = val == null ? "" : String(val);
      if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`; // formula injection prevention
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const csv = [
      headers.join(","),
      ...rows.map((l: Record<string, unknown>) => headers.map((h) => csvCell(l[h])).join(",")),
    ].join("\n");

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header("Content-Disposition", "attachment; filename=findx-leads.csv");
    return res.send(csv);
  } catch (err) {
    logger.error(err, "CSV export failed");
    return res.status(500).json({ error: "Export failed" });
  }
});

// ─── Parameterised :id routes ─────────────────────────────────────────────────

/**
 * Check ownership: leads with a userId may only be accessed by the owning user.
 * Legacy leads (userId = null) are accessible to anyone.
 * Returns false and writes a 404 response when access is denied.
 */
function checkLeadOwnership(lead: { userId: string | null }, req: Request, res: Response): boolean {
  if (lead.userId !== null && lead.userId !== (req.user?.userId ?? null)) {
    res.status(404).json({ error: "Lead not found" });
    return false;
  }
  return true;
}

router.get("/leads/:id", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.json({ lead: null });
    if (!checkLeadOwnership(lead, req, res)) return;

    const [leadAnalyses, leadOutreaches] = await Promise.all([
      db.select().from(analyses).where(eq(analyses.leadId, lead.id)).orderBy(desc(analyses.analyzedAt)),
      db.select().from(outreaches).where(eq(outreaches.leadId, lead.id)).orderBy(desc(outreaches.createdAt)),
    ]);

    return res.json({ lead: { ...lead, analyses: leadAnalyses, outreaches: leadOutreaches } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.patch("/leads/:id", async (req, res) => {
  const allowed = ["businessName", "address", "city", "industry", "website", "hasWebsite", "phone", "email", "status", "pipelineStageId", "leadScore"];
  const updateData: Record<string, unknown> = {};
  
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] === "string") {
        if (field === "email") {
           updateData[field] = validateEmail(req.body[field]) ? req.body[field] : undefined;
        } else if (field === "website") {
           updateData[field] = validateWebsiteUrl(req.body[field]) ? req.body[field] : undefined;
        } else {
           updateData[field] = sanitizeString(req.body[field]) ?? req.body[field];
        }
      } else {
        updateData[field] = req.body[field];
      }
    }
  }
  
  if (Object.keys(updateData).length === 0) return res.status(400).json({ error: "No valid fields to update" });
  updateData.updatedAt = new Date();

  try {
    const [existing] = await db.select({ id: leads.id, userId: leads.userId }).from(leads).where(eq(leads.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(existing, req, res)) return;

    const [lead] = await db.update(leads).set(updateData as Partial<typeof leads.$inferInsert>).where(eq(leads.id, req.params.id)).returning();
    return res.json({ lead });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/leads/:id/enrich", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(lead, req, res)) return;

    runTavilyEnrichment(lead.id, lead.businessName, lead.city).catch((err) => logger.error({ err }, "Tavily enrichment failed"));
    
    return res.status(202).json({ message: "Enrichment queued." });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/leads/:id/analyze", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(lead, req, res)) return;

    await db.update(leads).set({ status: "analyzing", updatedAt: new Date() }).where(eq(leads.id, lead.id));

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY not set. Cannot run analysis." });
    }

    let tavilyData = null;
    if (lead.isTavilyEnriched) {
      const [tavilyAnalysis] = await db.select().from(analyses)
        .where(and(eq(analyses.leadId, lead.id), eq(analyses.type, "tavily_enrichment")))
        .limit(1);
      if (tavilyAnalysis) {
        tavilyData = JSON.stringify(tavilyAnalysis.findings);
      }
    }

    const result = await analyzeLeadWithGemini({ ...lead, tavilyData });

    const [analysis] = await db.insert(analyses).values({
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
    }).returning();

    await db.update(leads).set({
      status: "analyzed",
      leadScore: result.score,
      updatedAt: new Date(),
    }).where(eq(leads.id, lead.id));

    return res.json({ analysis, score: result.score, summary: result.summary });
  } catch (err) {
    await db.update(leads).set({ status: "discovered", updatedAt: new Date() }).where(eq(leads.id, req.params.id)).catch((err) => logger.error({ err }, "Failed to reset lead status after analysis error"));
    return safeError(res, err, "Internal server error");
  }
});

router.get("/leads/:id/analyses", async (req, res) => {
  try {
    const [lead] = await db.select({ id: leads.id, userId: leads.userId }).from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(lead, req, res)) return;
    const rows = await db.select().from(analyses).where(eq(analyses.leadId, req.params.id)).orderBy(desc(analyses.analyzedAt));
    return res.json({ analyses: rows });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/leads/:id/outreach/generate", async (req, res) => {
  const { language = "nl" } = req.body as { language?: "nl" | "en" };
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(lead, req, res)) return;

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY not set. Cannot generate outreach." });
    }

    const latestAnalyses = await db.select().from(analyses)
      .where(eq(analyses.leadId, lead.id))
      .orderBy(desc(analyses.analyzedAt))
      .limit(1);

    let analysisContext: {
      score: number;
      opportunities: string[];
      weaknesses: string[];
      summary: string;
      emailSubject: string;
      digitalMaturity: "low" | "medium" | "high";
      estimatedRevenueImpact: string;
      recommendations: string[];
    } = {
      score: lead.leadScore ?? 50,
      opportunities: ["Improve online presence", "Better local SEO", "Modern website design"],
      weaknesses: ["Limited digital presence"],
      summary: `${lead.businessName} is a ${lead.industry ?? "business"} in ${lead.city}.`,
      emailSubject: "",
      digitalMaturity: "medium",
      estimatedRevenueImpact: "€5,000-€15,000/year",
      recommendations: [],
    };

    if (latestAnalyses[0]) {
      const f = latestAnalyses[0].findings as Record<string, unknown>;
      analysisContext = {
        score: latestAnalyses[0].score ?? 50,
        opportunities: (latestAnalyses[0].opportunities as string[]) ?? analysisContext.opportunities,
        weaknesses: (f.weaknesses as string[]) ?? analysisContext.weaknesses,
        summary: (f.summary as string) ?? analysisContext.summary,
        emailSubject: (f.emailSubject as string) ?? "",
        digitalMaturity: (f.digitalMaturity as "low" | "medium" | "high") ?? "medium",
        estimatedRevenueImpact: (f.estimatedRevenueImpact as string) ?? "€5,000-€15,000/year",
        recommendations: (f.recommendations as string[]) ?? [],
      };
    }

    const outreachResult = await generateOutreachWithGemini(lead, analysisContext, language);

    const [outreach] = await db.insert(outreaches).values({
      leadId: lead.id,
      subject: outreachResult.subject,
      body: outreachResult.body,
      status: "draft",
      personalizedDetails: { language: outreachResult.language, generatedBy: "gemini" },
    }).returning();

    await db.update(leads).set({ status: "contacting", updatedAt: new Date() }).where(eq(leads.id, lead.id));

    return res.json({ outreach });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/leads/:id/outreaches", async (req, res) => {
  try {
    const [lead] = await db.select({ id: leads.id, userId: leads.userId }).from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(lead, req, res)) return;
    const rows = await db.select().from(outreaches).where(eq(outreaches.leadId, req.params.id)).orderBy(desc(outreaches.createdAt));
    return res.json({ outreaches: rows });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/leads/:id/outreach/send", async (req, res) => {
  const { outreachId } = req.body as { outreachId?: string };
  if (!outreachId) return res.status(400).json({ error: "outreachId is required" });
  try {
    const [lead] = await db.select({ id: leads.id, userId: leads.userId }).from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(lead, req, res)) return;
    const [outreach] = await db.select().from(outreaches).where(and(eq(outreaches.id, outreachId), eq(outreaches.leadId, req.params.id)));
    if (!outreach) return res.status(404).json({ error: "Outreach not found for this lead" });
    return res.status(202).json({ message: "Send queued. Configure email provider to send outreach.", outreachId });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
