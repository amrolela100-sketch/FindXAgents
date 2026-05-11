import OpenAI from "openai";
import { db } from "@workspace/db";
import { aiProviders } from "@workspace/db";
import { eq } from "drizzle-orm";
import { type ScrapedWebsite, buildScrapedContext, calculateGroundedScore } from "./website-scraper.js";

async function getOpenRouterKey(): Promise<string> {
  try {
    const [cfg] = await db.select({ apiKey: aiProviders.apiKey, model: aiProviders.model })
      .from(aiProviders)
      .where(eq(aiProviders.providerType, "openrouter"))
      .limit(1);
    if (cfg?.apiKey) {
      if (!cfg.apiKey.startsWith("sk-or-")) {
        throw new Error(
          `Invalid OpenRouter API key: key starts with "${cfg.apiKey.slice(0, 8)}..." but OpenRouter keys must start with "sk-or-". Please update your AI Provider settings with the correct key from https://openrouter.ai/keys`
        );
      }
      return cfg.apiKey;
    }
  } catch (e: any) {
    if (e.message?.includes("Invalid OpenRouter API key")) throw e;
  }
  const envKey = process.env.OPENROUTER_API_KEY;
  if (!envKey) throw new Error("OPENROUTER_API_KEY not set and no DB provider found");
  if (!envKey.startsWith("sk-or-")) {
    throw new Error(
      `Invalid OPENROUTER_API_KEY environment variable: must start with "sk-or-". Get your key at https://openrouter.ai/keys`
    );
  }
  return envKey;
}

async function getClient() {
  const apiKey = await getOpenRouterKey();
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
 */
export async function analyzeLeadWithGemini(
  lead: LeadForAnalysis,
  scrapedData?: ScrapedWebsite
): Promise<AnalysisResult> {
  const client = await getClient();

  // --- Build grounded score ---
  let groundedScore: number;
  let websiteContext: string;

  if (scrapedData) {
    groundedScore = calculateGroundedScore(scrapedData);
    websiteContext = buildScrapedContext(scrapedData);
  } else if (!lead.website) {
    groundedScore = 90; // No website at all = massive opportunity
    websiteContext = "Website: NONE — this business has no website at all.";
  } else {
    groundedScore = 70; // Has website but wasn't scraped
    websiteContext = `Website: ${lead.website}\nNote: Website could not be scraped. Basic URL exists.`;
  }

  const prompt = `You are a B2B sales analyst for FindX, a global AI-powered prospecting platform.
Analyze this business lead for digital improvement potential.

IMPORTANT: Base your analysis ONLY on the verified data below. Do NOT invent or assume facts not listed here.

Business Details:
- Name: ${lead.businessName}
- City: ${lead.city !== "—" ? lead.city : "Unknown"}
- Industry: ${lead.industry ?? "Unknown"}

VERIFIED Website Data (scraped in real-time):
${websiteContext}
${lead.tavilyData ? `\nAdditional Context from Web Search:\n${lead.tavilyData.slice(0, 300)}` : ""}

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

type SupportedLanguage = "ar" | "en" | "nl" | "fr" | "es" | "de";

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
  scrapedData?: ScrapedWebsite
): Promise<OutreachResult> {
  const client = await getClient();

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
  } else if (!lead.website) {
    verifiedFacts.push("they have no website at all");
  }

  const prompt = `You are a senior B2B sales copywriter for FindX, a global digital marketing platform.
Write a personalized cold outreach email.

Lead: ${lead.businessName}, ${lead.city !== "—" ? lead.city : ""}
Industry: ${lead.industry ?? "Business"}
Digital score: ${analysis.score}/100
${verifiedFacts.length > 0 ? `VERIFIED facts about their digital presence:\n${verifiedFacts.map(f => `- ${f}`).join("\n")}` : ""}
Key opportunity: ${analysis.opportunities[0] ?? "Digital improvement"}

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
