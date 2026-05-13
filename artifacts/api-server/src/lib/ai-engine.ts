import OpenAI from "openai";
import { db } from "@workspace/db";
import { aiProviders } from "@workspace/db";
import { eq, isNull, or } from "drizzle-orm";
import { type ScrapedWebsite, type ScrapyAuditResult, buildExtendedContext, calculateGroundedScore } from "./website-scraper.js";

// ── Prompt Injection Sanitizer ───────────────────────────────────────────────

/**
 * Sanitize untrusted text before embedding it into an AI prompt.
 *
 * Strips patterns commonly used in prompt injection attacks:
 *  - "ignore", "forget", "disregard" followed by "above/previous/all/instructions"
 *  - "system:", "assistant:", "user:" role hijacking prefixes
 *  - Special tokens like <|im_start|>, [INST], <<SYS>>, etc.
 *  - Null bytes and other control characters
 *  - Excessive newlines (collapse to max 2)
 *
 * This does NOT need to be perfect — the score is always enforced from
 * grounded data. This protects summary/weaknesses/recommendations.
 */
function sanitizeForPrompt(value: string | null | undefined, maxLength = 300): string {
  if (!value) return "";

  let s = String(value)
    // Remove null bytes and other dangerous control chars (keep \n \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Collapse excessive whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Remove special LLM tokens (GPT, Llama, Claude, Gemini variants)
  s = s.replace(/<\|im_(start|end|sep)\|>/gi, "")
       .replace(/\[INST\]|\[\/INST\]/gi, "")
       .replace(/<<SYS>>|<\/SYS>/gi, "")
       .replace(/<\|begin_of_text\|>|<\|end_of_text\|>/gi, "")
       .replace(/\{%[-~]?\s*system\s*[-~]?%\}/gi, "");

  // Remove role hijacking patterns
  s = s.replace(/^\s*(system|assistant|user|human|ai)\s*:/gim, "[redacted]:");

  // Remove prompt injection attempts
  // e.g. "ignore all previous instructions", "forget everything above"
  s = s.replace(
    /\b(ignore|forget|disregard|override|bypass|skip)\b.{0,60}\b(above|previous|prior|all|every|instructions?|prompt|context|rules?|constraints?)\b/gi,
    "[redacted]"
  );
  s = s.replace(
    /\b(now\s+)?(act|pretend|behave|respond|answer|reply)\s+(as|like|you are|you're)\b/gi,
    "[redacted]"
  );
  s = s.replace(/\bdo not (follow|obey|respect)\b.{0,40}\b(rules?|instructions?|guidelines?)\b/gi, "[redacted]");

  // Truncate to max length
  return s.slice(0, maxLength);
}

/**
 * Sanitize a lead object's user-supplied fields before using them in prompts.
 * Returns a new object — does not mutate the original.
 */
function sanitizeLead(lead: {
  businessName: string;
  city?: string;
  address?: string | null;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  tavilyData?: string | null;
  [key: string]: any;
}) {
  return {
    ...lead,
    businessName: sanitizeForPrompt(lead.businessName, 120),
    city:         sanitizeForPrompt(lead.city, 80),
    address:      sanitizeForPrompt(lead.address, 150),
    industry:     sanitizeForPrompt(lead.industry, 100),
    website:      lead.website?.slice(0, 200) ?? null,  // URL — no injection risk, just truncate
    phone:        sanitizeForPrompt(lead.phone, 30),
    email:        sanitizeForPrompt(lead.email, 80),
    tavilyData:   sanitizeForPrompt(lead.tavilyData, 500),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

async function getOpenRouterKey(workspaceId?: string | null): Promise<string> {
  function validateKey(key: string): void {
    if (!key.startsWith("sk-or-")) {
      throw new Error(
        `Invalid OpenRouter API key: key starts with "${key.slice(0, 8)}..." but OpenRouter keys must start with "sk-or-". Please update your AI Provider settings with the correct key from https://openrouter.ai/keys`
      );
    }
  }
  try {
    // 1. Workspace-specific provider (highest priority)
    if (workspaceId) {
      const [wsCfg] = await db.select({ apiKey: aiProviders.apiKey })
        .from(aiProviders)
        .where(eq(aiProviders.workspaceId, workspaceId))
        .limit(1);
      if (wsCfg?.apiKey) { validateKey(wsCfg.apiKey); return wsCfg.apiKey; }
    }
    // 2. Global / owner-level provider (workspaceId IS NULL)
    const [globalCfg] = await db.select({ apiKey: aiProviders.apiKey })
      .from(aiProviders)
      .where(isNull(aiProviders.workspaceId))
      .limit(1);
    if (globalCfg?.apiKey) { validateKey(globalCfg.apiKey); return globalCfg.apiKey; }
  } catch (e: any) {
    if (e.message?.includes("Invalid OpenRouter API key")) throw e;
  }
  // 3. Environment variable fallback
  const envKey = process.env.OPENROUTER_API_KEY;
  if (!envKey) throw new Error("OPENROUTER_API_KEY not set and no DB provider found");
  if (!envKey.startsWith("sk-or-")) {
    throw new Error(
      `Invalid OPENROUTER_API_KEY environment variable: must start with "sk-or-". Get your key at https://openrouter.ai/keys`
    );
  }
  return envKey;
}

async function getClient(workspaceId?: string | null) {
  const apiKey = await getOpenRouterKey(workspaceId);
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": "https://findx.app",
      "X-Title": "FindX B2B Prospecting",
    },
  });
}

const MODEL = "google/gemini-2.5-flash";

export interface LeadForAnalysis {
  id: string;
  businessName: string;
  city: string;
  address?: string | null;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  kvkNumber?: string | null;
  tavilyData?: string | null;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  opportunities: string[];
  weaknesses: string[];
  recommendations: string[];
  emailSubject: string;
  digitalMaturity: "low" | "medium" | "high";
  estimatedRevenueImpact: string;
}

export interface OutreachResult {
  subject: string;
  body: string;
  language: string;
}

/**
 * Analyze a lead using GROUNDED data from real website scraping.
 * The AI only comments on things we actually verified — no hallucination.
 * Results are cached in Redis for 6h (see cache.ts).
 */
export async function analyzeLeadWithGemini(
  lead: LeadForAnalysis,
  scrapedData?: ScrapedWebsite | ScrapyAuditResult,
  forceRefresh = false,
  workspaceId?: string | null,
): Promise<AnalysisResult> {
  // ── Cache read ────────────────────────────────────────────────────────────
  if (!forceRefresh && lead.id) {
    const { getCachedAnalysis, setCachedAnalysis } = await import("./cache.js");
    const cached = await getCachedAnalysis<AnalysisResult>(lead.id);
    if (cached) return cached;

    const client = await getClient(workspaceId);
    const result = await _doAnalyze(client, lead, scrapedData);
    await setCachedAnalysis(lead.id, result);
    return result;
  }

  const client = await getClient(workspaceId);
  return _doAnalyze(client, lead, scrapedData);
}

async function _doAnalyze(
  client: OpenAI,
  lead: LeadForAnalysis,
  scrapedData?: ScrapedWebsite | ScrapyAuditResult,
): Promise<AnalysisResult> {

  // Sanitize all untrusted user-supplied fields before embedding in prompt
  const safeLead = sanitizeLead(lead);

  // --- Build grounded score ---
  let groundedScore: number;
  let websiteContext: string;

  if (scrapedData) {
    groundedScore = calculateGroundedScore(scrapedData);
    websiteContext = buildExtendedContext(scrapedData);
  } else if (!safeLead.website) {
    groundedScore = 90; // No website at all = massive opportunity
    websiteContext = "Website: NONE — this business has no website at all.";
  } else {
    groundedScore = 70; // Has website but wasn't scraped
    websiteContext = `Website: ${safeLead.website}\nNote: Website could not be scraped. Basic URL exists.`;
  }

  const prompt = `You are a B2B sales analyst for FindX, a global AI-powered prospecting platform.
Analyze this business lead for digital improvement potential.

IMPORTANT: Base your analysis ONLY on the verified data below. Do NOT invent or assume facts not listed here.

<<<LEAD_DATA>>>
Name: ${safeLead.businessName}
City: ${safeLead.city !== "—" ? safeLead.city : "Unknown"}
Industry: ${safeLead.industry ?? "Unknown"}
<<<END_LEAD_DATA>>>

<<<VERIFIED_WEBSITE_DATA>>>
${websiteContext}
${safeLead.tavilyData ? `Additional Context from Web Search:\n${safeLead.tavilyData}` : ""}
<<<END_VERIFIED_WEBSITE_DATA>>>

The score has been pre-calculated from real metrics: ${groundedScore}/100
You MUST use exactly ${groundedScore} as the score.

Weaknesses you MUST only list things that are actually missing/bad per the verified data above.
Opportunities should be realistic based on what is actually missing.

Respond ONLY with valid JSON, no markdown, no code blocks:
{
  "score": ${groundedScore},
  "summary": "<2 sentences about the business digital situation based on VERIFIED data only>",
  "opportunities": ["<3-4 specific digital improvement opportunities based on what is actually missing>"],
  "weaknesses": ["<2-3 weaknesses that are CONFIRMED by the scraped data above>"],
  "recommendations": ["<3 actionable recommendations for the agency pitch>"],
  "emailSubject": "<compelling email subject line in English>",
  "digitalMaturity": "<low|medium|high>",
  "estimatedRevenueImpact": "<e.g. $5,000-$15,000/year>"
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (response.choices[0]?.message?.content ?? "").trim();
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(cleaned) as AnalysisResult;
  } catch {
    throw new Error(`AI returned invalid JSON. Raw response: ${cleaned.slice(0, 300)}`);
  }
  if (typeof parsed.score !== "number") throw new Error("Invalid AI response: missing score");

  // Always enforce the grounded score — never trust AI score
  parsed.score = groundedScore;

  return parsed;
}

export type SupportedLanguage = "ar" | "en" | "nl" | "fr" | "es" | "de";

const LANG_INSTRUCTIONS: Record<SupportedLanguage, string> = {
  ar: "اكتب بالعربية الفصحى المهنية. استخدم أسلوباً احترافياً ودوداً. ابدأ البريد بتحية مناسبة.",
  en: "Write in professional English. Be direct, friendly, and concise.",
  nl: "Write in professional Dutch (Nederlands). Address them formally as 'u'.",
  fr: "Écrivez en français professionnel. Utilisez 'vous' pour s'adresser formellement.",
  es: "Escribe en español profesional. Usa 'usted' para dirigirte formalmente.",
  de: "Schreiben Sie auf professionellem Deutsch. Verwenden Sie 'Sie' zur formellen Anrede.",
};

export async function generateOutreachWithGemini(
  lead: LeadForAnalysis,
  analysis: AnalysisResult,
  language: SupportedLanguage = "en",
  scrapedData?: ScrapedWebsite | ScrapyAuditResult,
  forceRefresh = false,
  workspaceId?: string | null,
): Promise<OutreachResult> {
  // ── Cache read ────────────────────────────────────────────────────────────
  if (!forceRefresh && lead.id) {
    const { getCachedOutreach, setCachedOutreach } = await import("./cache.js");
    const cached = await getCachedOutreach<OutreachResult>(lead.id, language);
    if (cached) return cached;

    const client = await getClient(workspaceId);
    const result = await _doOutreach(client, lead, analysis, language, scrapedData);
    await setCachedOutreach(lead.id, language, result);
    return result;
  }

  const client = await getClient(workspaceId);
  return _doOutreach(client, lead, analysis, language, scrapedData);
}

async function _doOutreach(
  client: OpenAI,
  lead: LeadForAnalysis,
  analysis: AnalysisResult,
  language: SupportedLanguage,
  scrapedData?: ScrapedWebsite | ScrapyAuditResult,
): Promise<OutreachResult> {

  // Sanitize all untrusted fields before embedding in prompt
  const safeLead = sanitizeLead(lead);

  const langInstruction = LANG_INSTRUCTIONS[language] ?? LANG_INSTRUCTIONS.en;

  // Build specific verified facts to personalize email
  const verifiedFacts: string[] = [];
  if (scrapedData) {
    if (!scrapedData.isHttps) verifiedFacts.push("their website lacks SSL security (HTTP only)");
    if (scrapedData.emailAddresses.length === 0) verifiedFacts.push("their website has no visible contact email");
    if (!scrapedData.hasSocialMedia) verifiedFacts.push("they have no social media presence");
    if (!scrapedData.hasBlog) verifiedFacts.push("they have no blog or content marketing");
    if (scrapedData.loadTimeMs && scrapedData.loadTimeMs > 3000) verifiedFacts.push(`their website is slow (${scrapedData.loadTimeMs}ms load time)`);
    if (scrapedData.wordCount !== undefined && scrapedData.wordCount < 300) verifiedFacts.push("their website has very thin content");

    // Extra insights from Scrapy deep audit
    const deep = scrapedData as ScrapyAuditResult;
    if (deep.isDeepAudit) {
      if (deep.brokenLinksCount > 0) verifiedFacts.push(`${deep.brokenLinksCount} broken links found on their site`);
      if (deep.seoIssues.length > 0) verifiedFacts.push(...deep.seoIssues.slice(0, 2));
      if (deep.technologies.length > 0) verifiedFacts.push(`site is built with ${deep.technologies.slice(0, 3).join(", ")}`);
    }
  } else if (!safeLead.website) {
    verifiedFacts.push("they have no website at all");
  }

  const prompt = `You are a senior B2B sales copywriter for FindX, a global digital marketing platform.
Write a personalized cold outreach email.

<<<LEAD_DATA>>>
Lead: ${safeLead.businessName}, ${safeLead.city !== "—" ? safeLead.city : ""}
Industry: ${safeLead.industry ?? "Business"}
<<<END_LEAD_DATA>>>

Digital score: ${analysis.score}/100
${verifiedFacts.length > 0 ? `VERIFIED facts about their digital presence:\n${verifiedFacts.map(f => `- ${f}`).join("\n")}` : ""}
Key opportunity: ${sanitizeForPrompt(analysis.opportunities[0] ?? "Digital improvement", 200)}

Language instruction: ${langInstruction}
- Keep it under 150 words
- Reference ONE specific verified fact from above to show you actually checked their website
- Be concrete about the benefit (more customers, better visibility, etc.)
- End with a clear, low-commitment CTA (e.g. 15-minute call)
- Do NOT use placeholders like [Name]

Respond ONLY with valid JSON, no markdown:
{
  "subject": "<email subject in the requested language>",
  "body": "<full email body with line breaks as \\n>",
  "language": "${language}"
}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (response.choices[0]?.message?.content ?? "").trim();
  const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(cleaned) as OutreachResult;
  } catch {
    throw new Error(`AI returned invalid JSON for outreach. Raw response: ${cleaned.slice(0, 300)}`);
  }
}
