import { Router } from "express";
import { db } from "@workspace/db";
import { leads, analyses, outreaches } from "@workspace/db";
import { eq, ilike, and, sql, desc, count, inArray } from "drizzle-orm";
import { z } from "zod";
import { safeError } from "../../lib/safe-error.js";

const router = Router();

// ─── Schema ───────────────────────────────────────────────────────────────────

const leadsQuerySchema = z.object({
  page:       z.coerce.number().int().positive().default(1),
  pageSize:   z.coerce.number().int().min(1).max(500).default(25),
  city:       z.string().max(200).optional(),
  industry:   z.string().max(200).optional(),
  status:     z.enum(["discovered", "analyzing", "analyzed", "contacting", "qualified", "won", "lost"]).optional(),
  source:     z.string().max(100).optional(),
  hasWebsite: z.enum(["true", "false"]).transform(v => v === "true").optional(),
  search:     z.string().max(200).optional(),
});

// ─── GET /leads ───────────────────────────────────────────────────────────────

router.get("/leads", async (req, res) => {
  const queryParsed = leadsQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({ error: "Invalid query parameters", details: queryParsed.error.flatten() });
  }
  const { page, pageSize, city, industry, status, source, hasWebsite, search } = queryParsed.data;

  try {
    const conditions: ReturnType<typeof ilike>[] = [];

    conditions.push(sql`${leads.workspaceId} = ${req.user!.activeWorkspaceId}` as ReturnType<typeof ilike>);

    if (city)       conditions.push(ilike(leads.city, `%${city}%`));
    if (industry)   conditions.push(ilike(leads.industry, `%${industry}%`));
    if (status)     conditions.push(sql`${leads.status} = ${status}`);
    if (source)     conditions.push(ilike(leads.source, `%${source}%`));
    if (hasWebsite !== undefined) conditions.push(sql`${leads.hasWebsite} = ${hasWebsite}`);
    if (search) {
      conditions.push(
        sql`(${leads.businessName} ILIKE ${"%"+search+"%"} OR ${leads.city} ILIKE ${"%"+search+"%"} OR ${leads.industry} ILIKE ${"%"+search+"%"})`
      );
    }

    const whereClause = conditions.length > 0
      ? and(...(conditions as [ReturnType<typeof ilike>, ...ReturnType<typeof ilike>[]]))
      : undefined;

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

export default router;
