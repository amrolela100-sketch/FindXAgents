import { db, agentPipelineRuns, agentLogs, agents, agentSkills, leads, analyses, outreaches, searchConfigs, aiProviders } from "@workspace/db";
import { eq, sql, and, ilike } from "drizzle-orm";
import { analyzeLeadWithGemini, generateOutreachWithGemini } from "./ai-engine.js";
import { scrapeWebsite, isDirectoryUrl, type ScrapedWebsite } from "./website-scraper.js";
import { logger } from "./logger.js";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
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
  await db.insert(agentLogs).values({ agentId, pipelineRunId: runId, phase, level, message });
}

/**
 * Validate that a business name looks like a real company name and not
 * scraped garbage text from a LinkedIn page, directory, or social profile.
 *
 * Returns true if the name is valid, false if it should be rejected.
 */
function isValidBusinessName(name: string): boolean {
  if (!name || name.length < 3 || name.length > 120) return false;

  // Reject names containing URLs or HTTP
  if (/https?:\/\//i.test(name)) return false;

  // Reject purely numeric names
  if (/^\d+$/.test(name)) return false;

  // Reject LinkedIn / social profile noise
  if (/\bN\/A\b/i.test(name)) return false;
  if (/\b(connections?|followers?|following)\b/i.test(name)) return false;
  if (/^#/.test(name)) return false;  // Markdown headings like "# Wasan Sulaiman"

  // Reject standalone country names / ISO codes that look like "Netherlands, NL"
  const countryOrRegionPattern = /^[A-Z][a-z]+(,\s*[A-Z]{2,3})?$/;
  const knownGeoNoise = /^(Netherlands|Germany|France|Belgium|United Kingdom|United States|Nederland|España|Italia|Polska|Sverige|Danmark|Norge|Suomi|Österreich|Schweiz|Portugal|Türkiye|India|China|Japan|Brazil|Australia|Canada|Mexico|Argentina|Colombia|Chile|Peru|Nigeria|Kenya|South Africa|Egypt|Morocco|Algeria|Tunisia|UAE|Saudi Arabia|Qatar|Kuwait|Bahrain|Jordan|Lebanon|Iraq|Iran|Pakistan|Bangladesh|Sri Lanka|Malaysia|Singapore|Thailand|Vietnam|Philippines|Indonesia|NL|DE|FR|BE|GB|US|ES|IT|PL|SE|DK|NO|FI|AT|CH|PT|TR|IN|CN|JP|BR|AU|CA|MX|AR|CO|CL|PE|NG|KE|ZA|EG|MA|DZ|TN|AE|SA|QA|KW|BH|JO|LB|IQ|IR|PK|BD|LK|MY|SG|TH|VN|PH|ID)\b/i;
  if (knownGeoNoise.test(name.trim())) return false;

  // Reject names that look like social profile metadata
  if (/^\d+\s+(connections?|followers?|views?|likes?|posts?|comments?)$/i.test(name)) return false;

  // Reject single words that are clearly not company names (common LinkedIn noise)
  const socialNoise = /^(About|Experience|Education|Skills|Recommendations|Accomplishments|Following|Followers|Connect|Message|More|Send|View|See|Show|Hide|Like|Share|Comment|Repost|Report|Save|Apply|Easy Apply|LinkedIn|Twitter|Facebook|Instagram|YouTube|TikTok|WhatsApp|Telegram|Email|Phone|Website|Contact|Profile|Page|Group|Event|Job|Article|Post|Photo|Video|Document|Link|Hashtag|Mention|Tag|Location|Date|Time|Year|Month|Day|Hour|Minute|Second)$/i;
  if (socialNoise.test(name.trim())) return false;

  // Must contain at least one letter (not just punctuation/numbers)
  if (!/[a-zA-Z\u0600-\u06FF\u4e00-\u9fff]/.test(name)) return false;

  return true;
}

export class AgentRunner {
  constructor(private runId: string) {}

  async run(query: string, maxResults: number = 10, userId: string | null, language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    try {
      await db.update(agentPipelineRuns)
        .set({ status: "running" })
        .where(eq(agentPipelineRuns.id, this.runId));

      // Load or create agent
      let [agent] = await db.select().from(agents).where(eq(agents.name, "research")).limit(1);
      if (!agent) [agent] = await db.select().from(agents).limit(1);
      if (!agent) {
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
      const pipelineSkills = skills.length > 0
        ? skills.map(s => s.name)
        : ["discover-web", "qualify-ai", "generate-outreach", "stage-pipeline"];

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

    // ── 1. Tavily search ────────────────────────────────────────────────────
    if (tavilyKey) {
      await logToDB(agentId, this.runId, "discover-web", "info", `Searching web via Tavily for: ${query}`);
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: tavilyKey,
            query: `${query} official website contact`,
            search_depth: "advanced",
            max_results: Math.min(maxResults * 3, 30),
            include_domains: [],
            exclude_domains: [],
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const rawResults = data.results || [];
          await logToDB(agentId, this.runId, "discover-web", "info", `Tavily returned ${rawResults.length} raw results`);

          let directCount = 0;

          for (const r of rawResults) {
            if (isDirectoryUrl(r.url)) {
              // Skip directory pages entirely — they produce garbage leads
              directCount++;
              continue;
            }

            // Direct result — real company website
            const title = r.title
              ?.replace(/ - .*$/, "")
              .replace(/ \| .*$/, "")
              .replace(/ – .*$/, "")
              .trim();

            const name = title || getDomain(r.url) || r.url;

            // Validate name before accepting
            if (!isValidBusinessName(name)) {
              await logToDB(agentId, this.runId, "discover-web", "warn",
                `Rejected fake name: "${name}" (from ${r.url})`
              );
              continue;
            }

            items.push({
              businessName: name,
              city: "—",
              website: r.url,
              industry: query,
              tavilyData: r.content?.slice(0, 500),
              source: "tavily",
            });
          }

          await logToDB(agentId, this.runId, "discover-web", "info",
            `Filtered: ${directCount} directory pages skipped. ${items.length} valid direct results. Total: ${items.length}`
          );
        } else {
          const errText = await res.text();
          await logToDB(agentId, this.runId, "discover-web", "warn", `Tavily returned status ${res.status}: ${errText.slice(0, 200)}`);
        }
      } catch (e: any) {
        await logToDB(agentId, this.runId, "discover-web", "warn", `Tavily search failed: ${e.message}`);
      }
    } else {
      await logToDB(agentId, this.runId, "discover-web", "warn", "No Tavily API key found — skipping web search");
    }

    // ── 2. KVK fallback ────────────────────────────────────────────────────
    if (kvkKey && items.length === 0) {
      await logToDB(agentId, this.runId, "discover-web", "info", `Searching KVK for: ${query}`);
      const res = await fetch(
        `https://api.kvk.nl/api/v1/zoeken?handelsnaam=${encodeURIComponent(query)}&type=hoofdvestiging&resultatenPerPagina=${Math.min(maxResults, 100)}`,
        { headers: { "x-api-key": kvkKey } }
      );
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

    // ── 3. Google Places fallback ──────────────────────────────────────────
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

    // ── 4. Deduplicate & save ──────────────────────────────────────────────
    // Final validation pass — reject any remaining garbage names
    items = items.filter(item => isValidBusinessName(item.businessName));

    const insertedIds: string[] = [];
    let added = 0;
    let skippedDuplicates = 0;

    for (const lead of items) {
      if (added >= maxResults) break;
      const domain = getDomain(lead.website);
      const userFilter = userId ? eq(leads.userId, userId) : sql`${leads.userId} IS NULL`;

      const conditions = [];
      if (lead.kvkNumber) conditions.push(eq(leads.kvkNumber, lead.kvkNumber));
      if (domain) conditions.push(ilike(leads.website, `%${domain}%`));

      let exists = false;
      if (conditions.length > 0) {
        const existing = await db.select({ id: leads.id }).from(leads).where(
          and(userFilter, sql`(${conditions[0]} ${conditions[1] ? sql`OR ${conditions[1]}` : sql``})`)
        ).limit(1);
        if (existing.length > 0) exists = true;
      } else {
        const existingByName = await db.select({ id: leads.id }).from(leads).where(
          and(userFilter, ilike(leads.businessName, lead.businessName), ilike(leads.city, lead.city))
        ).limit(1);
        if (existingByName.length > 0) exists = true;
      }

      if (!exists) {
        const [newLead] = await db.insert(leads).values({
          userId,
          ...lead,
          hasWebsite: !!lead.website,
          source: lead.source ?? "web_search",
          status: "discovered",
        }).returning({ id: leads.id });
        insertedIds.push(newLead.id);
        added++;
      } else {
        skippedDuplicates++;
      }
    }

    await logToDB(agentId, this.runId, "discover-web", "info",
      `Results: ${insertedIds.length} new leads saved, ${skippedDuplicates} duplicates skipped out of ${items.length} total`
    );
    await db.update(agentPipelineRuns)
      .set({ leadsFound: insertedIds.length })
      .where(eq(agentPipelineRuns.id, this.runId));

    return insertedIds;
  }

  /**
   * Attempt a Tavily follow-up search to find the official website for a lead
   * that has no website URL. Returns the found URL or null.
   */
  private async findWebsiteForLead(agentId: string, businessName: string, industry?: string | null): Promise<string | null> {
    const tavilyKey = await getTavilyKey();
    if (!tavilyKey) return null;

    try {
      const searchQuery = `"${businessName}" official website${industry ? ` ${industry}` : ""}`;
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: tavilyKey,
          query: searchQuery,
          search_depth: "basic",
          max_results: 5,
        }),
      });

      if (!res.ok) return null;

      const data: any = await res.json();
      const results: any[] = data.results || [];

      for (const r of results) {
        if (!r.url) continue;
        if (isDirectoryUrl(r.url)) continue;

        // Check that the result is likely the company's own site, not news/press
        const domain = getDomain(r.url);
        if (!domain) continue;

        // Skip social media and generic platforms
        const skipDomains = ["linkedin.com", "facebook.com", "twitter.com", "x.com", "instagram.com",
          "youtube.com", "wikipedia.org", "trustpilot.com", "glassdoor.com", "indeed.com",
          "bloomberg.com", "crunchbase.com", "zoominfo.com", "dnb.com"];
        if (skipDomains.some(d => domain.includes(d))) continue;

        await logToDB(agentId, this.runId, "qualify-ai", "info",
          `Follow-up search found website for "${businessName}": ${r.url}`
        );
        return r.url;
      }
    } catch (e: any) {
      await logToDB(agentId, this.runId, "qualify-ai", "warn",
        `Follow-up website search failed for "${businessName}": ${e.message}`
      );
    }

    return null;
  }

  private async skillQualifyAi(agentId: string, leadIds: string[], language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    if (leadIds.length === 0) return;

    await logToDB(agentId, this.runId, "qualify-ai", "info", `Analyzing ${leadIds.length} leads (with real website scraping)...`);
    let analyzedCount = 0;

    for (const id of leadIds) {
      const [lead] = await db.select().from(leads).where(eq(leads.id, id));
      if (!lead) continue;

      // ── Follow-up website search for leads with no URL ───────────────────
      let resolvedWebsite = lead.website;
      if (!resolvedWebsite) {
        await logToDB(agentId, this.runId, "qualify-ai", "info",
          `${lead.businessName} has no website — attempting follow-up search...`
        );
        const found = await this.findWebsiteForLead(agentId, lead.businessName, lead.industry);
        if (found) {
          resolvedWebsite = found;
          // Persist the discovered website back to the lead
          await db.update(leads).set({ website: found, hasWebsite: true, updatedAt: new Date() }).where(eq(leads.id, id));
        } else {
          await logToDB(agentId, this.runId, "qualify-ai", "info",
            `No website found for "${lead.businessName}" — will score as no-website opportunity`
          );
        }
      }

      // ── Real website scrape ──────────────────────────────────────────────
      let scrapedData: ScrapedWebsite | undefined;
      if (resolvedWebsite) {
        try {
          await logToDB(agentId, this.runId, "qualify-ai", "info", `Scraping website: ${resolvedWebsite}`);
          scrapedData = await scrapeWebsite(resolvedWebsite, 10000);
          await logToDB(agentId, this.runId, "qualify-ai", "info",
            `Scraped ${lead.businessName}: reachable=${scrapedData.reachable}, https=${scrapedData.isHttps}, ` +
            `emails=${scrapedData.emailAddresses.length}, phones=${scrapedData.phoneNumbers.length}, ` +
            `social=${Object.keys(scrapedData.socialLinks).length}, loadTime=${scrapedData.loadTimeMs}ms`
          );
        } catch (e: any) {
          await logToDB(agentId, this.runId, "qualify-ai", "warn", `Scrape failed for ${resolvedWebsite}: ${e.message}`);
        }
      }

      try {
        // Pass the resolved website URL (may have been enriched via follow-up search)
        const leadForAnalysis = resolvedWebsite !== lead.website
          ? { ...lead, website: resolvedWebsite }
          : lead;
        const result = await withRetry(() => analyzeLeadWithGemini(leadForAnalysis as any, scrapedData), 3, 1000);

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
            // Store scraping metrics for transparency
            scrapingMetrics: scrapedData ? {
              reachable: scrapedData.reachable,
              isHttps: scrapedData.isHttps,
              loadTimeMs: scrapedData.loadTimeMs,
              emailsFound: scrapedData.emailAddresses.length,
              phonesFound: scrapedData.phoneNumbers.length,
              hasSocialMedia: scrapedData.hasSocialMedia,
              hasBlog: scrapedData.hasBlog,
              hasContactPage: scrapedData.hasContactPage,
              wordCount: scrapedData.wordCount,
            } : null,
          },
          opportunities: result.opportunities,
        });

        // Update lead with enriched data from scraping
        const updatePayload: any = {
          status: "analyzed",
          leadScore: result.score,
          updatedAt: new Date(),
        };

        if (scrapedData) {
          if (scrapedData.emailAddresses.length > 0 && !lead.email) {
            updatePayload.email = scrapedData.emailAddresses[0];
          }
          if (scrapedData.phoneNumbers.length > 0 && !lead.phone) {
            updatePayload.phone = scrapedData.phoneNumbers[0];
          }
        }

        await db.update(leads).set(updatePayload).where(eq(leads.id, lead.id));

        analyzedCount++;
        await logToDB(agentId, this.runId, "qualify-ai", "info",
          `Analyzed ${lead.businessName}: Score ${result.score} (grounded from real scraping)`
        );
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
        await logToDB(agentId, this.runId, "stage-pipeline", "info",
          `${lead.businessName} moved to ${newStatus} (Score: ${lead.leadScore})`
        );
      }
    }
  }

  private async skillGenerateOutreach(agentId: string, leadIds: string[], language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    if (leadIds.length === 0) return;

    await logToDB(agentId, this.runId, "generate-outreach", "info",
      `Generating personalized outreach emails for ${leadIds.length} leads in ${language}...`
    );
    let emailCount = 0;

    for (const id of leadIds) {
      try {
        const [lead] = await db.select().from(leads).where(eq(leads.id, id));
        if (!lead) continue;

        const [analysis] = await db.select().from(analyses)
          .where(eq(analyses.leadId, id))
          .orderBy(analyses.createdAt)
          .limit(1);

        if (!analysis) {
          await logToDB(agentId, this.runId, "generate-outreach", "warn",
            `No analysis found for ${lead.businessName}, skipping outreach`
          );
          continue;
        }

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

        // Reconstruct scrapedData from stored metrics for outreach personalization
        let scrapedSummary: any = null;
        if (findings?.scrapingMetrics) {
          scrapedSummary = {
            url: lead.website ?? "",
            reachable: findings.scrapingMetrics.reachable,
            isHttps: findings.scrapingMetrics.isHttps,
            emailAddresses: findings.scrapingMetrics.emailsFound > 0 ? ["found"] : [],
            phoneNumbers: findings.scrapingMetrics.phonesFound > 0 ? ["found"] : [],
            socialLinks: findings.scrapingMetrics.hasSocialMedia ? { linkedin: "found" } : {},
            hasBlog: findings.scrapingMetrics.hasBlog,
            hasContactPage: findings.scrapingMetrics.hasContactPage,
            hasPrivacyPolicy: false,
            hasSocialMedia: findings.scrapingMetrics.hasSocialMedia,
            loadTimeMs: findings.scrapingMetrics.loadTimeMs,
            wordCount: findings.scrapingMetrics.wordCount,
          };
        }

        const outreach = await withRetry(
          () => generateOutreachWithGemini(lead as any, analysisResult, language, scrapedSummary),
          2,
          1000
        );

        await db.insert(outreaches).values({
          leadId: id,
          subject: outreach.subject,
          body: outreach.body,
          status: "draft",
          personalizedDetails: { language: outreach.language, generatedBy: "pipeline" },
        });

        await db.update(leads).set({ status: "contacting", updatedAt: new Date() }).where(eq(leads.id, id));

        emailCount++;
        await logToDB(agentId, this.runId, "generate-outreach", "info",
          `Generated personalized email for ${lead.businessName}`
        );
      } catch (e: any) {
        await logToDB(agentId, this.runId, "generate-outreach", "error",
          `Failed to generate outreach for lead ${id}: ${e.message}`
        );
      }
    }

    await db.update(agentPipelineRuns)
      .set({ emailsDrafted: emailCount })
      .where(eq(agentPipelineRuns.id, this.runId));

    await logToDB(agentId, this.runId, "generate-outreach", "info",
      `Generated ${emailCount} grounded outreach emails`
    );
  }
}
