import { db, agentPipelineRuns, agentLogs, agents, agentSkills, leads, analyses, outreaches, searchConfigs, aiProviders, notifications } from "@workspace/db";
import { eq, sql, and, ilike, isNull } from "drizzle-orm";
import { analyzeLeadWithGemini, generateOutreachWithGemini } from "./ai-engine.js";
import { smartScrape, isDirectoryUrl, buildExtendedContext, type ScrapedWebsite, type ScrapyAuditResult } from "./website-scraper.js";
import { logger } from "./logger.js";
import { notifyPipelineComplete, notifyPipelineFailed } from "./telegram.js";
import pLimit from "p-limit";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        // Jitter prevents thundering herd when multiple retries fire at once
        const jitter = Math.random() * 0.3 * delayMs;
        await new Promise(resolve => setTimeout(resolve, delayMs * attempt + jitter));
      }
    }
  }
  throw lastError;
}

/** Resolve Tavily API key — DB config takes priority over env var */
async function getTavilyKey(workspaceId?: string | null): Promise<string | null> {
  try {
    const [cfg] = await db.select({ apiKey: searchConfigs.apiKey })
      .from(searchConfigs)
      .where(isNull(searchConfigs.workspaceId))
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
  constructor(private runId: string, private workspaceId: string | null = null) {}

  async run(query: string, maxResults: number = 10, userId: string | null, language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en") {
    try {
      await db.update(agentPipelineRuns)
        .set({ status: "running" })
        .where(eq(agentPipelineRuns.id, this.runId));

      // ── Load pipeline agents from DB ─────────────────────────────────────
      // Prefer dedicated agents by role; fall back to "research" for legacy setups.
      const loadAgent = async (name: string, fallbackName?: string) => {
        let [a] = await db.select().from(agents).where(eq(agents.name, name)).limit(1);
        if (!a && fallbackName) {
          [a] = await db.select().from(agents).where(eq(agents.name, fallbackName)).limit(1);
        }
        if (!a) {
          // Last resort: any active agent
          [a] = await db.select().from(agents).where(eq(agents.isActive, true)).limit(1);
        }
        return a;
      };

      const discoveryAgent = await loadAgent("discovery", "research");
      const analysisAgent  = await loadAgent("analysis",  "research");
      const outreachAgent  = await loadAgent("outreach",  "research");

      // Guard: at least one agent must exist
      if (!discoveryAgent) {
        throw new Error("No active agents found in database. Run the seed script or create agents via the Admin panel.");
      }

      let discoveredLeadIds: string[] = [];
      const startTime = Date.now();

      // ── Phase 1: Discovery ───────────────────────────────────────────────
      await logToDB(discoveryAgent.id, this.runId, "discover-web", "info", `🔍 Discovery phase started — query: "${query}"`);
      discoveredLeadIds = await this.skillDiscoverWeb(discoveryAgent.id, query, maxResults, userId, this.workspaceId);
      await logToDB(discoveryAgent.id, this.runId, "discover-web", "info", `🔍 Discovery complete — ${discoveredLeadIds.length} leads found`);

      // ── Phase 2: Analysis ────────────────────────────────────────────────
      await logToDB(analysisAgent.id, this.runId, "qualify-ai", "info", `🧠 Analysis phase started — ${discoveredLeadIds.length} leads to analyze`);
      await this.skillQualifyAi(analysisAgent.id, discoveredLeadIds, language);
      await logToDB(analysisAgent.id, this.runId, "qualify-ai", "info", `🧠 Analysis phase complete`);

      // ── Phase 3: Outreach ────────────────────────────────────────────────
      await logToDB(outreachAgent.id, this.runId, "generate-outreach", "info", `✉️ Outreach phase started`);
      await this.skillGenerateOutreach(outreachAgent.id, discoveredLeadIds, language);
      await logToDB(outreachAgent.id, this.runId, "generate-outreach", "info", `✉️ Outreach phase complete`);

      // ── Phase 4: Stage pipeline ──────────────────────────────────────────
      await this.skillStagePipeline(discoveryAgent.id, discoveredLeadIds);

      await db.update(agentPipelineRuns)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(agentPipelineRuns.id, this.runId));

      // ── Telegram notification on success ─────────────────────────────────
      const [finalRun] = await db
        .select({ leadsFound: agentPipelineRuns.leadsFound, leadsAnalyzed: agentPipelineRuns.leadsAnalyzed, emailsDrafted: agentPipelineRuns.emailsDrafted })
        .from(agentPipelineRuns)
        .where(eq(agentPipelineRuns.id, this.runId));

      notifyPipelineComplete({
        query,
        leadsFound:    finalRun?.leadsFound    ?? discoveredLeadIds.length,
        leadsAnalyzed: finalRun?.leadsAnalyzed ?? 0,
        emailsDrafted: finalRun?.emailsDrafted ?? 0,
        durationMs:    Date.now() - startTime,
      }).catch(() => {}); // fire-and-forget

      // ── In-app notification on success ───────────────────────────────────
      if (userId) {
        const found    = finalRun?.leadsFound    ?? discoveredLeadIds.length;
        const analyzed = finalRun?.leadsAnalyzed ?? 0;
        const emailed  = finalRun?.emailsDrafted ?? 0;
        await db.insert(notifications).values({
          userId,
          type:  "pipeline_complete",
          title: "✅ Agent run completed",
          body:  `"${query}" — ${found} leads found, ${analyzed} analyzed, ${emailed} emails drafted`,
          meta:  { runId: this.runId, query, leadsFound: found, leadsAnalyzed: analyzed, emailsDrafted: emailed },
        }).catch(() => {});
      }

    } catch (err: any) {
      await db.update(agentPipelineRuns)
        .set({ status: "failed", error: err.message, completedAt: new Date() })
        .where(eq(agentPipelineRuns.id, this.runId));
      logger.error({ err, runId: this.runId }, "Pipeline run failed");

      // ── Telegram notification on failure ─────────────────────────────────
      notifyPipelineFailed({
        query,
        error:      err.message ?? "Unknown error",
        durationMs: Date.now() - (Date.now()), // best effort
      }).catch(() => {});

      // ── In-app notification on failure ───────────────────────────────────
      if (userId) {
        await db.insert(notifications).values({
          userId,
          type:  "pipeline_failed",
          title: "❌ Agent run failed",
          body:  `"${query}" — ${err.message ?? "Unknown error"}`,
          meta:  { runId: this.runId, query, error: err.message },
        }).catch(() => {});
      }
    }
  }

  private async skillDiscoverWeb(agentId: string, query: string, maxResults: number, userId: string | null, workspaceId: string | null = null): Promise<string[]> {
    const kvkKey = process.env.KVK_API_KEY;
    const googleKey = process.env.GOOGLE_MAPS_API_KEY;
    const tavilyKey = await getTavilyKey(workspaceId);
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
            // "company site" intent → Tavily returns homepages, not articles or directories
            query: `${query} company official website`,
            search_depth: "advanced",
            max_results: Math.min(maxResults * 4, 40),
            include_domains: [],
            exclude_domains: [
              // Hard-exclude noisiest aggregators at the API level
              "clutch.co", "sortlist.com", "designrush.com", "goodfirms.co",
              "bark.com", "trustpilot.com", "yelp.com", "yellowpages.com",
              "capterra.com", "g2.com", "techbehemoths.com",
              "linkedin.com", "facebook.com", "instagram.com", "twitter.com",
              "medium.com", "reddit.com", "quora.com",
            ],
          }),
        });

        if (res.ok) {
          const data: any = await res.json();
          const rawResults = data.results || [];
          await logToDB(agentId, this.runId, "discover-web", "info", `Tavily returned ${rawResults.length} raw results`);

          let directCount = 0;
          // One result per domain per run
          const seenDomains = new Set<string>();

          for (const rawEntry of rawResults) {
            let r = { ...rawEntry }; // mutable copy — allows URL normalization below
            if (isDirectoryUrl(r.url)) {
              // Skip directory pages entirely — they produce garbage leads
              directCount++;
              continue;
            }

            // Skip article / list / search-result URLs that slipped past the domain filter
            {
              const lowerUrl = r.url.toLowerCase();
              const isArticleUrl = (
                /\/20[0-9]{2}\//.test(lowerUrl) ||
                /[?&](q|query|search|s)=/i.test(lowerUrl) ||
                /\/(tag|category|author)\//.test(lowerUrl) ||
                /\/p=\d+/.test(lowerUrl) ||
                /\/(top|best|how|why|what|when|where|who)[-_]/.test(lowerUrl) ||
                /\/\d{4,}-[a-z]/.test(lowerUrl)
              );
              if (isArticleUrl) { directCount++; continue; }
            }

            // Direct result — real company website
            const title = r.title
              ?.replace(/ - .*$/, "")
              .replace(/ \| .*$/, "")
              .replace(/ – .*$/, "")
              .trim();

            const name = title || getDomain(r.url) || r.url;

            // Reject article / listicle titles — NOT company names
            {
              const isArticleTitle = (
                /^(top|best|worst|most|least)\b/i.test(name) ||
                /\b\d+\s+(best|top|free|paid|cheap)/i.test(name) ||
                /^how\s+to\b/i.test(name) ||
                /^(what|why|when|where|who)\s+/i.test(name) ||
                /\b(guide|tutorial|tips|tricks)\b/i.test(name) ||
                /\bvs\.?\s/i.test(name) ||
                /\breview[s]?\b/i.test(name) ||
                /\b20[0-9]{2}\b/.test(name)
              );
              if (isArticleTitle) {
                await logToDB(agentId, this.runId, "discover-web", "warn",
                  `Rejected article title: "${name}" (from ${r.url})`);
                directCount++;
                continue;
              }
            }

            // Validate name before accepting
            if (!isValidBusinessName(name)) {
              await logToDB(agentId, this.runId, "discover-web", "warn",
                `Rejected fake name: "${name}" (from ${r.url})`
              );
              continue;
            }

            // One result per domain — no same company twice
            {
              const d = getDomain(r.url);
              if (d && seenDomains.has(d)) { directCount++; continue; }
              if (d) seenDomains.add(d);
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

    await logToDB(agentId, this.runId, "qualify-ai", "info",
      `Analyzing ${leadIds.length} leads in parallel (max 5 concurrent)...`
    );

    // ── Concurrency: 5 parallel scrapes + AI calls ───────────────────────────
    // Scrapy deep audit takes ~30-90s per site. With p-limit(5):
    //   10 leads × 60s avg / 5 concurrency ≈ ~2 min instead of ~10 min
    // Gemini calls are fast (~2-5s) so they don't need separate limiting.
    const scrapeLimit = pLimit(5);
    const aiLimit     = pLimit(8); // Gemini rate limit: generous, but cap anyway

    let analyzedCount = 0;

    const tasks = leadIds.map(id =>
      scrapeLimit(async () => {
        const [lead] = await db.select().from(leads).where(eq(leads.id, id));
        if (!lead) return;

        // ── Follow-up website search for leads with no URL ─────────────────
        let resolvedWebsite = lead.website;
        if (!resolvedWebsite) {
          await logToDB(agentId, this.runId, "qualify-ai", "info",
            `${lead.businessName} has no website — attempting follow-up search...`
          );
          const found = await this.findWebsiteForLead(agentId, lead.businessName, lead.industry);
          if (found) {
            resolvedWebsite = found;
            await db.update(leads).set({ website: found, hasWebsite: true, updatedAt: new Date() }).where(eq(leads.id, id));
          } else {
            await logToDB(agentId, this.runId, "qualify-ai", "info",
              `No website found for "${lead.businessName}" — scoring as no-website opportunity`
            );
          }
        }

        // ── Smart scrape (Scrapy deep audit → fallback to built-in) ──────────
        let scrapedData: ScrapedWebsite | ScrapyAuditResult | undefined;
        if (resolvedWebsite) {
          try {
            await logToDB(agentId, this.runId, "qualify-ai", "info", `Scraping: ${resolvedWebsite}`);
            scrapedData = await smartScrape(resolvedWebsite, 10_000);

            const isDeep = (scrapedData as ScrapyAuditResult).isDeepAudit;
            if (isDeep) {
              const d = scrapedData as ScrapyAuditResult;
              await logToDB(agentId, this.runId, "qualify-ai", "info",
                `✅ Deep audit — ${lead.businessName}: ${d.pagesCrawled} pages, ` +
                `score=${d.deepScore}, grade=${d.grade}, ` +
                `emails=${d.emailAddresses.length}, broken=${d.brokenLinksCount}, ` +
                `techs=${d.technologies.slice(0, 3).join(", ")}`
              );
            } else {
              await logToDB(agentId, this.runId, "qualify-ai", "info",
                `✅ Quick scrape — ${lead.businessName}: reachable=${scrapedData.reachable}, ` +
                `https=${scrapedData.isHttps}, emails=${scrapedData.emailAddresses.length}, ` +
                `loadTime=${scrapedData.loadTimeMs}ms`
              );
            }
          } catch (e: any) {
            await logToDB(agentId, this.runId, "qualify-ai", "warn",
              `Scrape failed for ${resolvedWebsite}: ${e.message}`
            );
          }
        }

        // ── AI analysis (separate concurrency limit) ──────────────────────
        await aiLimit(async () => {
          try {
            const leadForAnalysis = resolvedWebsite !== lead.website
              ? { ...lead, website: resolvedWebsite }
              : lead;
            const result = await withRetry(() => analyzeLeadWithGemini(leadForAnalysis as any, scrapedData), 3, 1_000);

            const deepAudit = scrapedData ? (scrapedData as ScrapyAuditResult) : null;

            await db.insert(analyses).values({
              leadId: lead.id,
              type: "gemini_digital",
              score: result.score,
              findings: {
                summary:               result.summary,
                weaknesses:            result.weaknesses,
                recommendations:       result.recommendations,
                emailSubject:          result.emailSubject,
                digitalMaturity:       result.digitalMaturity,
                estimatedRevenueImpact: result.estimatedRevenueImpact,
                ...(deepAudit?.isDeepAudit ? {
                  deepAudit: {
                    deepScore:              deepAudit.deepScore,
                    grade:                  deepAudit.grade,
                    pagesCrawled:           deepAudit.pagesCrawled,
                    technologies:           deepAudit.technologies,
                    brokenLinksCount:       deepAudit.brokenLinksCount,
                    securityHeadersPresent: deepAudit.securityHeadersPresent,
                    seoIssues:              deepAudit.seoIssues,
                    issues:                 deepAudit.issues,
                    strengths:              deepAudit.strengths,
                    breakdown:              deepAudit.breakdown,
                  },
                } : {}),
                scrapingMetrics: scrapedData ? {
                  reachable:      scrapedData.reachable,
                  isHttps:        scrapedData.isHttps,
                  loadTimeMs:     scrapedData.loadTimeMs,
                  emailsFound:    scrapedData.emailAddresses.length,
                  phonesFound:    scrapedData.phoneNumbers.length,
                  hasSocialMedia: scrapedData.hasSocialMedia,
                  hasBlog:        scrapedData.hasBlog,
                  hasContactPage: scrapedData.hasContactPage,
                  wordCount:      scrapedData.wordCount,
                } : null,
              },
              opportunities: result.opportunities,
            });

            const updatePayload: any = {
              status: "analyzed",
              leadScore: result.score,
              updatedAt: new Date(),
            };
            if (scrapedData) {
              if (scrapedData.emailAddresses.length > 0 && !lead.email)
                updatePayload.email = scrapedData.emailAddresses[0];
              if (scrapedData.phoneNumbers.length > 0 && !lead.phone)
                updatePayload.phone = scrapedData.phoneNumbers[0];
            }
            await db.update(leads).set(updatePayload).where(eq(leads.id, lead.id));

            analyzedCount++;
            await logToDB(agentId, this.runId, "qualify-ai", "info",
              `✅ ${lead.businessName}: Score=${result.score}, Maturity=${result.digitalMaturity}`
            );
          } catch (e: any) {
            await logToDB(agentId, this.runId, "qualify-ai", "error",
              `Failed to analyze ${lead.businessName}: ${e.message}`
            );
          }
        });
      })
    );

    await Promise.allSettled(tasks);

    await db.update(agentPipelineRuns)
      .set({ leadsAnalyzed: analyzedCount })
      .where(eq(agentPipelineRuns.id, this.runId));

    await logToDB(agentId, this.runId, "qualify-ai", "info",
      `Parallel analysis complete: ${analyzedCount}/${leadIds.length} leads analyzed`
    );
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
      `Generating outreach emails for ${leadIds.length} leads in parallel (max 6 concurrent)...`
    );

    // 6 concurrent Gemini calls — fast enough, stays within API rate limits
    const limit = pLimit(6);
    let emailCount = 0;

    const tasks = leadIds.map(id =>
      limit(async () => {
        try {
          const [lead] = await db.select().from(leads).where(eq(leads.id, id));
          if (!lead) return;

          const [analysis] = await db.select().from(analyses)
            .where(eq(analyses.leadId, id))
            .orderBy(analyses.createdAt)
            .limit(1);

          if (!analysis) {
            await logToDB(agentId, this.runId, "generate-outreach", "warn",
              `No analysis for ${lead.businessName} — skipping`
            );
            return;
          }

          const findings = analysis.findings as Record<string, any>;
          const analysisResult = {
            score:                  analysis.score ?? 50,
            summary:                findings?.summary ?? "",
            opportunities:          (analysis.opportunities as string[]) ?? [],
            weaknesses:             findings?.weaknesses ?? [],
            recommendations:        findings?.recommendations ?? [],
            emailSubject:           findings?.emailSubject ?? `Partnership opportunity for ${lead.businessName}`,
            digitalMaturity:        findings?.digitalMaturity ?? "medium",
            estimatedRevenueImpact: findings?.estimatedRevenueImpact ?? "",
          };

          // Reconstruct scraped context from stored metrics
          let scrapedSummary: any = null;
          if (findings?.scrapingMetrics) {
            const m = findings.scrapingMetrics;
            scrapedSummary = {
              url:             lead.website ?? "",
              reachable:       m.reachable,
              isHttps:         m.isHttps,
              emailAddresses:  m.emailsFound > 0 ? ["found"] : [],
              phoneNumbers:    m.phonesFound > 0 ? ["found"] : [],
              socialLinks:     m.hasSocialMedia ? { linkedin: "found" } : {},
              hasBlog:         m.hasBlog,
              hasContactPage:  m.hasContactPage,
              hasPrivacyPolicy: false,
              hasSocialMedia:  m.hasSocialMedia,
              loadTimeMs:      m.loadTimeMs,
              wordCount:       m.wordCount,
            };
          }
          // Also pass deep audit issues if available
          if (findings?.deepAudit) {
            scrapedSummary = {
              ...scrapedSummary,
              isDeepAudit:        true,
              technologies:       findings.deepAudit.technologies ?? [],
              brokenLinksCount:   findings.deepAudit.brokenLinksCount ?? 0,
              seoIssues:          findings.deepAudit.seoIssues ?? [],
            };
          }

          const outreach = await withRetry(
            () => generateOutreachWithGemini(lead as any, analysisResult, language, scrapedSummary),
            2,
            1_000
          );

          await db.insert(outreaches).values({
            leadId: id,
            subject: outreach.subject,
            body: outreach.body,
            status: "draft",
            personalizedDetails: { language: outreach.language, generatedBy: "pipeline" },
          });

          await db.update(leads)
            .set({ status: "contacting", updatedAt: new Date() })
            .where(eq(leads.id, id));

          emailCount++;
          await logToDB(agentId, this.runId, "generate-outreach", "info",
            `✅ Email for ${lead.businessName}`
          );
        } catch (e: any) {
          await logToDB(agentId, this.runId, "generate-outreach", "error",
            `Failed outreach for lead ${id}: ${e.message}`
          );
        }
      })
    );

    await Promise.allSettled(tasks);

    await db.update(agentPipelineRuns)
      .set({ emailsDrafted: emailCount })
      .where(eq(agentPipelineRuns.id, this.runId));

    await logToDB(agentId, this.runId, "generate-outreach", "info",
      `Parallel outreach complete: ${emailCount}/${leadIds.length} emails generated`
    );
  }
}
