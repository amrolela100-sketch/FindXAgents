import { Router } from "express";
import { db } from "@workspace/db";
import { leads, analyses, outreaches } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { sanitizeString, validateEmail, validateWebsiteUrl } from "../../lib/sanitize.js";
import { invalidateLeadCache } from "../../lib/cache.js";
import { safeError } from "../../lib/safe-error.js";
import { checkLeadOwnership, isAdminUser } from "../../services/leads.service.js";

const router = Router();

// ─── Schemas ──────────────────────────────────────────────────────────────────

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

// ─── POST /leads ──────────────────────────────────────────────────────────────

router.post("/leads", async (req, res) => {
  const parsed = createLeadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const raw = parsed.data;
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
      workspaceId: req.user?.activeWorkspaceId ?? null,
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

// ─── GET /leads/:id ───────────────────────────────────────────────────────────

router.get("/leads/:id", async (req, res) => {
  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, req.params.id));
    if (!lead) return res.json({ lead: null });
    if (!checkLeadOwnership({ workspaceId: lead.workspaceId ?? null, userId: lead.userId ?? null }, req, res)) return;

    const [leadAnalyses, leadOutreaches] = await Promise.all([
      db.select().from(analyses).where(eq(analyses.leadId, lead.id)).orderBy(desc(analyses.analyzedAt)),
      db.select().from(outreaches).where(eq(outreaches.leadId, lead.id)).orderBy(desc(outreaches.createdAt)),
    ]);

    return res.json({ lead: { ...lead, analyses: leadAnalyses, outreaches: leadOutreaches } });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── PATCH /leads/:id ─────────────────────────────────────────────────────────

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
    const [existing] = await db
      .select({ id: leads.id, workspaceId: leads.workspaceId, userId: leads.userId })
      .from(leads)
      .where(eq(leads.id, req.params.id));
    if (!existing) return res.status(404).json({ error: "Lead not found" });
    if (!checkLeadOwnership(existing, req, res)) return;

    const [lead] = await db
      .update(leads)
      .set(updateData as Partial<typeof leads.$inferInsert>)
      .where(eq(leads.id, req.params.id))
      .returning();

    const websiteChanged = "website" in updateData;
    await invalidateLeadCache(lead.id, websiteChanged ? (lead.website ?? undefined) : undefined);

    return res.json({ lead });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── DELETE /leads/:id ────────────────────────────────────────────────────────

router.delete("/leads/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [lead] = await db
      .select({ id: leads.id, workspaceId: leads.workspaceId, userId: leads.userId })
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!lead) return res.status(404).json({ error: "Lead not found" });

    const admin = isAdminUser(req);
    if (!admin && lead.workspaceId !== req.user!.activeWorkspaceId) {
      return res.status(403).json({ error: "Forbidden — not your lead" });
    }

    await db.transaction(async (tx) => {
      await tx.delete(outreaches).where(eq(outreaches.leadId, id));
      await tx.delete(analyses).where(eq(analyses.leadId, id));
      await tx.delete(leads).where(eq(leads.id, id));
    });

    return res.json({ deleted: true, id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
