-- Migration 0008: drop global unique on ai_providers.name
-- The old migration 0000 added a global UNIQUE("name") constraint on ai_providers.
-- With workspace multi-tenancy, names only need to be unique per workspace.
-- This migration drops the old constraint and adds a composite (workspace_id, name) one.

-- 1. Drop the old global unique constraint
ALTER TABLE "ai_providers" DROP CONSTRAINT IF EXISTS "ai_providers_name_unique";

-- 2. Add composite unique: same provider name allowed across different workspaces,
--    but not duplicated within the same workspace.
--    We use a partial unique index to allow NULL workspace_id (owner/global providers).
CREATE UNIQUE INDEX IF NOT EXISTS "uq_ai_providers_workspace_name"
  ON "ai_providers" ("workspace_id", "name")
  WHERE "workspace_id" IS NOT NULL;
