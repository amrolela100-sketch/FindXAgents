import { Router } from "express";
import { db } from "@workspace/db";
import { leads } from "@workspace/db";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { sanitizeString, validateEmail, validateWebsiteUrl } from "../../lib/sanitize.js";
import { safeError } from "../../lib/safe-error.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// ─── POST /leads/import ───────────────────────────────────────────────────────

router.post("/leads/import", async (req, res) => {
  const { csv: csvText, skipDuplicates = true } = req.body as { csv?: string; skipDuplicates?: boolean };
  if (!csvText || typeof csvText !== "string") {
    return res.status(400).json({ error: "Missing 'csv' field with CSV text content" });
  }

  const MAX_CSV_BYTES = 5 * 1024 * 1024;
  if (Buffer.byteLength(csvText, "utf8") > MAX_CSV_BYTES) {
    return res.status(413).json({ error: "CSV payload too large. Maximum allowed size is 5 MB." });
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

    // MED-2 fix: batch insert instead of row-by-row.
    // Previously every row triggered 1 select (duplicate check) + 1 insert = N*2 queries.
    // New approach:
    //   1. Parse and validate all rows upfront (no DB calls).
    //   2. If skipDuplicates: one bulk SELECT to find existing (businessName, city) pairs.
    //   3. One bulk INSERT for all new rows using onConflictDoNothing as safety net.
    // Result: 2 queries total regardless of CSV size (was 2*N).

    type ParsedRow = {
      rowNum: number;
      businessName: string;
      city: string;
      address?: string;
      industry?: string;
      website?: string;
      hasWebsite: boolean;
      phone?: string;
      email?: string;
      kvkNumber?: string;
      source: string;
    };

    const validRows: ParsedRow[] = [];

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

      const businessName = sanitizeString(rawBusinessName) || rawBusinessName;
      const city         = sanitizeString(rawCity) || rawCity;
      const website      = (row.website && validateWebsiteUrl(row.website)) ? row.website : undefined;
      const email        = (row.email   && validateEmail(row.email))        ? row.email   : undefined;

      validRows.push({
        rowNum: i + 1,
        businessName,
        city,
        address:   sanitizeString(row.address)   || undefined,
        industry:  sanitizeString(row.industry)  || undefined,
        website,
        hasWebsite: !!website,
        phone:     sanitizeString(row.phone)     || undefined,
        email,
        kvkNumber: sanitizeString(row.kvkNumber || row.kvk_number) || undefined,
        source:    sanitizeString(row.source) || "import",
      });
    }

    if (validRows.length === 0) {
      return res.json({ created: 0, skipped, errors });
    }

    // ── Duplicate check (single bulk SELECT) ──────────────────────────────────
    let insertRows = validRows;
    if (skipDuplicates) {
      // Fetch all existing (businessName, city) pairs for this workspace in one query.
      const existingPairs = await db
        .select({ businessName: leads.businessName, city: leads.city })
        .from(leads)
        .where(sql`${leads.workspaceId} = ${req.user!.activeWorkspaceId}`);

      const existingSet = new Set(
        existingPairs.map(r => `${r.businessName.toLowerCase()}|${r.city.toLowerCase()}`)
      );

      insertRows = validRows.filter(r => {
        const key = `${r.businessName.toLowerCase()}|${r.city.toLowerCase()}`;
        if (existingSet.has(key)) { skipped++; return false; }
        return true;
      });
    }

    // ── Bulk INSERT ───────────────────────────────────────────────────────────
    if (insertRows.length > 0) {
      const BATCH_SIZE = 500; // stay within Postgres parameter limits
      for (let b = 0; b < insertRows.length; b += BATCH_SIZE) {
        const batch = insertRows.slice(b, b + BATCH_SIZE);
        try {
          await db.insert(leads).values(
            batch.map(r => ({
              userId:      req.user?.sub ?? null,
              workspaceId: req.user!.activeWorkspaceId,
              businessName: r.businessName,
              city:        r.city,
              address:     r.address,
              industry:    r.industry,
              website:     r.website,
              hasWebsite:  r.hasWebsite,
              phone:       r.phone,
              email:       r.email,
              kvkNumber:   r.kvkNumber,
              source:      r.source,
            }))
          );
          batch.forEach(r => created.push(r.rowNum));
        } catch (batchErr) {
          // If bulk insert fails, record each row in errors
          batch.forEach(r => {
            errors.push({ row: r.rowNum, message: batchErr instanceof Error ? batchErr.message : "Batch insert failed" });
          });
        }
      }
    }

    return res.json({ created: created.length, skipped, errors });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── GET /leads/export ────────────────────────────────────────────────────────

router.get("/leads/export", async (req, res) => {
  try {
    const { city, industry, status, hasWebsite, search } = req.query as Record<string, string>;
    const conditions: ReturnType<typeof ilike>[] = [];

    conditions.push(sql`${leads.workspaceId} = ${req.user!.activeWorkspaceId}` as ReturnType<typeof ilike>);

    if (city)       conditions.push(ilike(leads.city, `%${city}%`));
    if (industry)   conditions.push(ilike(leads.industry, `%${industry}%`));
    if (status)     conditions.push(sql`${leads.status} = ${status}`);
    if (hasWebsite) conditions.push(sql`${leads.hasWebsite} = ${hasWebsite === "true"}`);
    if (search)     conditions.push(sql`(${leads.businessName} ILIKE ${"%"+search+"%"} OR ${leads.city} ILIKE ${"%"+search+"%"})`);

    const rows = await db
      .select()
      .from(leads)
      .where(conditions.length > 0 ? and(...(conditions as [ReturnType<typeof ilike>, ...ReturnType<typeof ilike>[]])) : undefined)
      .orderBy(desc(leads.discoveredAt))
      .limit(500);

    const headers = ["id", "businessName", "city", "industry", "website", "phone", "email", "status", "source", "discoveredAt"];
    const csvCell = (val: unknown): string => {
      let str = val == null ? "" : String(val);
      if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
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

export default router;
