/**
 * tests/migration-hygiene.test.ts
 *
 * Validates the integrity of the Drizzle migration history without touching
 * a live database.  Runs entirely from the filesystem.
 *
 * Checks:
 * 1. _journal.json is valid JSON and has the expected structure
 * 2. Every SQL file in migrations/ has a matching journal entry
 * 3. Every journal entry has a matching SQL file
 * 4. Every journal entry (except idx=0) has a matching snapshot file
 * 5. Snapshot idx chain is intact (id → prevId)
 * 6. No duplicate idx values in the journal
 * 7. Journal entries are ordered by idx without gaps
 * 8. 0005_snapshot reflects the same schema state as 0004 (known no-op migration)
 * 9. 0010_snapshot exists and includes workspace_id on email_provider_tokens
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

const MIGRATIONS_DIR = path.resolve(__dirname, "../lib/db/migrations");
const META_DIR       = path.join(MIGRATIONS_DIR, "meta");
const JOURNAL_PATH   = path.join(META_DIR, "_journal.json");

interface JournalEntry {
  idx:         number;
  version:     string;
  when:        number;
  tag:         string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

function loadJournal(): Journal {
  const raw = fs.readFileSync(JOURNAL_PATH, "utf-8");
  return JSON.parse(raw) as Journal;
}

function loadSnapshot(idx: number): Record<string, unknown> {
  const p = path.join(META_DIR, `${String(idx).padStart(4, "0")}_snapshot.json`);
  const raw = fs.readFileSync(p, "utf-8");
  return JSON.parse(raw);
}

function sqlFilesInDir(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

// =============================================================================
describe("Migration Hygiene", () => {

  // ── 1. Journal structure ────────────────────────────────────────────────────
  describe("_journal.json structure", () => {
    it("exists and is valid JSON", () => {
      expect(fs.existsSync(JOURNAL_PATH)).toBe(true);
      expect(() => loadJournal()).not.toThrow();
    });

    it("has required top-level fields", () => {
      const j = loadJournal();
      expect(j).toHaveProperty("version");
      expect(j).toHaveProperty("dialect", "postgresql");
      expect(j).toHaveProperty("entries");
      expect(Array.isArray(j.entries)).toBe(true);
    });

    it("has no duplicate idx values", () => {
      const j = loadJournal();
      const idxes = j.entries.map((e) => e.idx);
      const unique = new Set(idxes);
      expect(unique.size).toBe(idxes.length);
    });

    it("entries are ordered by idx without gaps", () => {
      const j = loadJournal();
      j.entries.forEach((e, i) => {
        expect(e.idx).toBe(i);
      });
    });

    it("each entry has required fields", () => {
      const j = loadJournal();
      for (const entry of j.entries) {
        expect(typeof entry.idx).toBe("number");
        expect(typeof entry.tag).toBe("string");
        expect(entry.tag.length).toBeGreaterThan(0);
        expect(typeof entry.when).toBe("number");
        expect(entry.when).toBeGreaterThan(0);
      }
    });
  });

  // ── 2. SQL files ↔ journal entries ─────────────────────────────────────────
  describe("SQL files ↔ journal bidirectional check", () => {
    it("every SQL file has a matching journal entry", () => {
      const j = loadJournal();
      const tags = new Set(j.entries.map((e) => e.tag));
      const sqlFiles = sqlFilesInDir();
      for (const file of sqlFiles) {
        const tag = file.replace(".sql", "");
        expect(tags.has(tag), `SQL file ${file} missing from journal`).toBe(true);
      }
    });

    it("every journal entry has a matching SQL file", () => {
      const j = loadJournal();
      const sqlFiles = new Set(sqlFilesInDir().map((f) => f.replace(".sql", "")));
      for (const entry of j.entries) {
        expect(
          sqlFiles.has(entry.tag),
          `Journal entry ${entry.tag} has no SQL file`
        ).toBe(true);
      }
    });
  });

  // ── 3. Snapshot files exist ─────────────────────────────────────────────────
  describe("Snapshot files", () => {
    it("every journal entry (idx 0..n) has a snapshot file", () => {
      const j = loadJournal();
      for (const entry of j.entries) {
        const snapPath = path.join(META_DIR, `${String(entry.idx).padStart(4, "0")}_snapshot.json`);
        expect(
          fs.existsSync(snapPath),
          `Missing snapshot for idx=${entry.idx} (${entry.tag})`
        ).toBe(true);
      }
    });

    it("all snapshot files are valid JSON", () => {
      const j = loadJournal();
      for (const entry of j.entries) {
        expect(() => loadSnapshot(entry.idx), `Invalid JSON in snapshot ${entry.idx}`).not.toThrow();
      }
    });
  });

  // ── 4. Snapshot id chain ────────────────────────────────────────────────────
  describe("Snapshot id → prevId chain", () => {
    it("each snapshot's prevId matches the previous snapshot's id", () => {
      const j = loadJournal();
      for (let i = 1; i < j.entries.length; i++) {
        const prev = loadSnapshot(i - 1) as { id: string };
        const curr = loadSnapshot(i) as { prevId: string };
        expect(
          curr.prevId,
          `Snapshot ${i} prevId should equal snapshot ${i - 1} id`
        ).toBe(prev.id);
      }
    });

    it("no two snapshots share the same id", () => {
      const j = loadJournal();
      const ids = j.entries.map((e) => (loadSnapshot(e.idx) as { id: string }).id);
      const unique = new Set(ids);
      expect(unique.size).toBe(ids.length);
    });
  });

  // ── 5. Migration-specific content checks ────────────────────────────────────
  describe("Known migration content", () => {
    it("0005_add_onboarding is a no-op: snapshot 0005 equals snapshot 0004 (schema-wise)", () => {
      const s4 = loadSnapshot(4) as { tables: Record<string, unknown> };
      const s5 = loadSnapshot(5) as { tables: Record<string, unknown> };
      // Tables and enums should be identical — only id/prevId differ
      expect(JSON.stringify(s4.tables)).toBe(JSON.stringify(s5.tables));
    });

    it("0010_snapshot has workspace_id column on email_provider_tokens", () => {
      const s10 = loadSnapshot(10) as { tables: Record<string, { columns: Record<string, unknown> }> };
      const ept = s10.tables["public.email_provider_tokens"];
      expect(ept).toBeDefined();
      expect(ept.columns).toHaveProperty("workspace_id");
    });

    it("0010_snapshot email_provider_tokens has workspace FK", () => {
      const s10 = loadSnapshot(10) as {
        tables: Record<string, { foreignKeys: Record<string, unknown> }>;
      };
      const ept = s10.tables["public.email_provider_tokens"];
      expect(ept.foreignKeys).toHaveProperty(
        "email_provider_tokens_workspace_id_workspaces_id_fk"
      );
    });

    it("0010_snapshot email_provider_tokens has conditional unique index", () => {
      const s10 = loadSnapshot(10) as {
        tables: Record<string, { indexes: Record<string, { isUnique: boolean; where?: string }> }>;
      };
      const ept = s10.tables["public.email_provider_tokens"];
      const idx = ept.indexes["email_provider_tokens_workspace_provider_unique"];
      expect(idx).toBeDefined();
      expect(idx.isUnique).toBe(true);
      expect(idx.where).toContain("workspace_id");
    });

    it("0010_snapshot email_provider_tokens has no global provider unique constraint", () => {
      const s10 = loadSnapshot(10) as {
        tables: Record<string, { uniqueConstraints: Record<string, unknown> }>;
      };
      const ept = s10.tables["public.email_provider_tokens"];
      // Old single-column unique on provider should be gone
      expect(ept.uniqueConstraints).not.toHaveProperty("email_provider_tokens_provider_unique");
    });

    it("0010 SQL uses IF NOT EXISTS / DROP CONSTRAINT IF EXISTS guards", () => {
      const sql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, "0010_gmail_tokens_workspace_scoped.sql"),
        "utf-8"
      );
      expect(sql).toMatch(/DROP CONSTRAINT IF EXISTS/i);
      expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS/i);
      expect(sql).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS/i);
    });
  });

  // ── 6. package.json scripts ─────────────────────────────────────────────────
  describe("DB package.json scripts", () => {
    it("has generate, migrate, push, and check scripts", () => {
      const pkg = JSON.parse(
        fs.readFileSync(path.resolve(__dirname, "../lib/db/package.json"), "utf-8")
      );
      expect(pkg.scripts).toHaveProperty("generate");
      expect(pkg.scripts).toHaveProperty("migrate");
      expect(pkg.scripts).toHaveProperty("push");
      expect(pkg.scripts).toHaveProperty("check");
    });
  });
});
