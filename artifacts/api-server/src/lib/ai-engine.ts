import OpenAI from "openai";

function getClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set");
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

export async function analyzeLeadWithGemini(lead: LeadForAnalysis): Promise<AnalysisResult> {
  const client = getClient();

  const prompt = `You are a B2B sales analyst for FindX, a global AI-powered prospecting platform. Analyze this business lead for digital improvement potential.

Business Details:
- Name: ${lead.businessName}
- City: ${lead.city}
- Industry: ${lead.industry ?? "Unknown"}
- Website: ${lead.website ?? "No website"}
- Phone: ${lead.phone ?? "None"}
- Email: ${lead.email ?? "None"}
${lead.kvkNumber ? `- Registration Number: ${lead.kvkNumber}\n` : ""}
${lead.tavilyData ? `Web Research Data:\n${lead.tavilyData}\n` : ""}
Score this lead 0-100 on how much they need digital marketing/web improvement (higher = more opportunity).

Respond ONLY with valid JSON, no markdown, no code blocks:
{
  "score": <0-100 integer>,
  "summary": "<2 sentences about the business and their digital situation>",
  "opportunities": ["<3-4 specific digital improvement opportunities>"],
  "weaknesses": ["<2-3 current digital weaknesses>"],
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
  language: SupportedLanguage = "en"
): Promise<OutreachResult> {
  const client = getClient();

  const langInstruction = LANG_INSTRUCTIONS[language] ?? LANG_INSTRUCTIONS.en;

  const prompt = `You are a senior B2B sales copywriter for FindX, a global digital marketing platform. Write a personalized cold outreach email.

Lead: ${lead.businessName}, ${lead.city}
Industry: ${lead.industry ?? "Business"}
Website: ${lead.website ?? "No website found"}
Digital score: ${analysis.score}/100
Key opportunity: ${analysis.opportunities[0] ?? "Digital improvement"}
Weakness found: ${analysis.weaknesses[0] ?? "Limited online presence"}

Language instruction: ${langInstruction}
- Keep it under 150 words
- Be specific about their business, not generic
- Mention one concrete benefit (more customers, better visibility, etc.)
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
