# Database — Schema Lifecycle

This document is the single source of truth for how the FindX database schema
is managed.  Read it before touching any file in `lib/db/`.

---

## The Golden Rule

| Environment | Command | When |
|---|---|---|
| **Production / Staging** | `pnpm run migrate` | Every deploy |
| **Local dev (rapid iteration)** | `pnpm run push` | Prototyping only |
| **Generate new migration** | `pnpm run generate` | After editing schema |
| **Check for drift** | `pnpm run check` | CI / before deploy |

> **Never run `push` against a shared or production database.**  
> It will silently drop columns that exist in the DB but not in the schema.

---

## How Migrations Work

```
lib/db/
├── src/schema/index.ts          ← Source of truth (TypeScript)
├── migrations/
│   ├── 0000_*.sql               ← Ordered DDL scripts
│   ├── 0001_*.sql
│   └── meta/
│       ├── _journal.json        ← Drizzle migration registry
│       ├── 0000_snapshot.json   ← Schema state AFTER migration 0000
│       └── 0001_snapshot.json   ← Schema state AFTER migration 0001
└── src/migrate.ts               ← Migration runner (used by api-server on startup)
```

### `_journal.json`

The journal is Drizzle's registry of applied migrations.  It must stay in sync
with the SQL files:

- Every SQL file → must have a journal entry
- Every journal entry → must have a SQL file
- `idx` values → must be 0, 1, 2, … with no gaps

### Snapshots

Each `NNNN_snapshot.json` records the full schema state *after* migration `N`
was applied.  Drizzle uses them to generate diffs for `generate`.

- `snapshot[N].prevId` must equal `snapshot[N-1].id`
- A snapshot is identical to the previous one when a migration is a no-op
  (e.g. `0005` — adds columns that already existed)

---

## Adding a New Migration

```bash
# 1. Edit lib/db/src/schema/index.ts
# 2. Generate the migration file + snapshot
pnpm run generate

# 3. Review the generated SQL file — never commit without reviewing it
# 4. Apply locally
pnpm run migrate

# 5. Verify no drift
pnpm run check
```

The generated file will be named `NNNN_<random_words>.sql`.  Rename it to
something meaningful (e.g. `0011_add_campaign_table.sql`) and update
`_journal.json` with the new tag.

---

## Running on a Fresh Database

```bash
# From scratch — no existing tables
DATABASE_URL=postgresql://... pnpm run migrate
```

The runner applies all migrations in order.  On a brand-new database it will
create every table in one pass.

---

## Error Handling in `migrate.ts`

| Error | Behaviour |
|---|---|
| `42P07` duplicate_table | WARN + skip — object already exists |
| `42701` duplicate_column | WARN + skip — object already exists |
| `42710` duplicate_object | WARN + skip — object already exists |
| `40P01` deadlock | WARN + retry once after 5 s |
| Anything else | ERROR + crash — investigate immediately |

The "safe duplicate" codes appear when a migration uses `IF NOT EXISTS` guards
but the object was created by an earlier migration that Drizzle already recorded.
This is expected on databases that were bootstrapped with an older version of the
schema.  If you see these warnings on a **fresh** database, that is a bug in the
migration ordering — investigate before continuing.

---

## Migration History

| # | File | What it does |
|---|---|---|
| 0000 | sweet_mattie_franklin | Initial schema (all tables) |
| 0001 | parched_namor | Add `is_tavily_enriched` to leads |
| 0002 | bitter_franklin_storm | Add `onboarding_completed` + `onboarding_data` to users |
| 0003 | clear_cerise | Add `metadata` to users |
| 0004 | watery_chameleon | Drop NOT NULL on `password_hash` |
| 0005 | add_onboarding | No-op — columns already added in 0002 (IF NOT EXISTS guard) |
| 0006 | add_notifications | Add `notifications` + `push_tokens` tables |
| 0007 | add_provider_types | Expand `ai_provider_type` enum |
| 0008 | workspace_multitenancy | Add `workspaces`, `workspace_members`, workspace FKs |
| 0009 | drop_ai_providers_name_unique | Remove global unique on `ai_providers.name` |
| 0010 | gmail_tokens_workspace_scoped | Add `workspace_id` to `email_provider_tokens`, scoped unique index |
