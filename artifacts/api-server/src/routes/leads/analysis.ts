import { Router } from "express";
import { db } from "@workspace/db";
import { leads, analyses, outreaches } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { languageSchema } from "../../lib/constants.js";
import { analyzeLeadWithGemini, generateOutreachWithGemini } from "../../lib/ai-engine.js";
import { aiLimiter } from "../../middleware/rate-limit.js";
import { safeError } from "../../lib/safe-error.js";
import { logger } from "../../lib/logger.js";
import { checkLeadOwnership, hasOpenRouterKey } from "../../services/leads.service.js";

const router = Router();

// ─── POST /leads/:id/analyze ──────────────────────────────────────────────────

router.post("/leads/:id/analyze", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    await db.update(leads).set({ status: "analyzing", updatedAt: new Date() }).where(eq(leads.id, lead.id));

    if (!await hasOpenRouterKey()) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY not set. Cannot run analysis." });
    }

    let tavilyData = null;
    if (lead.isTavilyEnriched) {
      const [tavilyAnalysis] = await db
        .select()
        .from(analyses)
        .where(and(eq(analyses.leadId, lead.id), eq(analyses.type, "tavily_enrichment")))
        .limit(1);
      if (tavilyAnalysis) tavilyData = JSON.stringify(tavilyAnalysis.findings);
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
    await db
      .update(leads)
      .set({ status: "discovered", updatedAt: new Date() })
      .where(eq(leads.id, req.params.id))
      .catch((e) => logger.error({ err: e }, "Failed to reset lead status after analysis error"));
    return safeError(res, err, "Internal server error");
  }
});

// ─── GET /leads/:id/analyses ──────────────────────────────────────────────────

router.get("/leads/:id/analyses", async (req, res) => {
  try {
    const [lead] = await db
      .select({ id: leads.id, workspaceId: leads.workspaceId, userId: leads.userId })
      .from(leads)
      .where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    const rows = await db
      .select()
      .from(analyses)
      .where(eq(analyses.leadId, req.params.id))
      .orderBy(desc(analyses.analyzedAt));
    return res.json({ analyses: rows });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── POST /leads/:id/outreach/generate ───────────────────────────────────────

router.post("/leads/:id/outreach/generate", async (req, res) => {
  const bodySchema = z.object({ language: languageSchema });
  const bodyParsed = bodySchema.safeParse(req.body);
  if (!bodyParsed.success) {
    return res.status(400).json({ error: "Validation failed", details: bodyParsed.error.flatten() });
  }
  const { language } = bodyParsed.data;

  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    if (!await hasOpenRouterKey()) {
      return res.status(503).json({ error: "OPENROUTER_API_KEY not set. Cannot generate outreach." });
    }

    const latestAnalyses = await db
      .select()
      .from(analyses)
      .where(eq(analyses.leadId, lead.id))
      .orderBy(desc(analyses.analyzedAt))
      .limit(1);

    let analysisContext = {
      score: lead.leadScore ?? 50,
      opportunities: ["Improve online presence", "Better local SEO", "Modern website design"],
      weaknesses: ["Limited digital presence"],
      summary: `${lead.businessName} is a ${lead.industry ?? "business"} in ${lead.city}.`,
      emailSubject: "",
      digitalMaturity: "medium" as "low" | "medium" | "high",
      estimatedRevenueImpact: "€5,000-€15,000/year",
      recommendations: [] as string[],
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

// ─── GET /leads/:id/outreaches ────────────────────────────────────────────────

router.get("/leads/:id/outreaches", async (req, res) => {
  try {
    const [lead] = await db
      .select({ id: leads.id, workspaceId: leads.workspaceId, userId: leads.userId })
      .from(leads)
      .where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    const rows = await db
      .select()
      .from(outreaches)
      .where(eq(outreaches.leadId, req.params.id))
      .orderBy(desc(outreaches.createdAt));
    return res.json({ outreaches: rows });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── POST /leads/:id/outreach/send ────────────────────────────────────────────

router.post("/leads/:id/outreach/send", async (req, res) => {
  const { outreachId } = req.body as { outreachId?: string };
  if (!outreachId) return res.status(400).json({ error: "outreachId is required" });

  try {
    const [lead] = await db
      .select({ id: leads.id, workspaceId: leads.workspaceId, userId: leads.userId })
      .from(leads)
      .where(eq(leads.id, req.params.id));
    if (!lead) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    const [outreach] = await db
      .select()
      .from(outreaches)
      .where(and(eq(outreaches.id, outreachId), eq(outreaches.leadId, req.params.id)));
    if (!outreach) return res.status(404).json({ error: "Outreach not found for this lead" });

    return res.status(202).json({ message: "Send queued. Configure email provider to send outreach.", outreachId });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
