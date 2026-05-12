-- ============================================================
--  Migration 0007 — Workspace-based Multi-Tenancy
--  Every settings table + leads/runs get a workspaceId column.
--  Old single-tenant rows are assigned to a "default" workspace
--  that will be created per-user on first login (see app code).
-- ============================================================

-- ─── 1. workspaces table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id"              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "owner_id"        text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"            text NOT NULL,
  "description"     text NOT NULL DEFAULT '',
  "icp"             text NOT NULL DEFAULT '',
  "target_industry" text NOT NULL DEFAULT '',
  "target_city"     text NOT NULL DEFAULT '',
  "created_at"      timestamp NOT NULL DEFAULT now(),
  "updated_at"      timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id" ON "workspaces"("owner_id");

-- ─── 2. workspace_members (optional future sharing) ──────────
CREATE TABLE IF NOT EXISTS "workspace_members" (
  "workspace_id" text NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
  "user_id"      text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role"         text NOT NULL DEFAULT 'member',  -- 'owner' | 'admin' | 'member'
  "joined_at"    timestamp NOT NULL DEFAULT now(),
  PRIMARY KEY ("workspace_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_id" ON "workspace_members"("user_id");

-- ─── 3. Add workspace_id to settings tables ──────────────────

-- telegram_settings
ALTER TABLE "telegram_settings"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_telegram_settings_workspace_id" ON "telegram_settings"("workspace_id");

-- search_configs
ALTER TABLE "search_configs"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_search_configs_workspace_id" ON "search_configs"("workspace_id");

-- resend_configs
ALTER TABLE "resend_configs"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_resend_configs_workspace_id" ON "resend_configs"("workspace_id");

-- smtp_configs
ALTER TABLE "smtp_configs"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_smtp_configs_workspace_id" ON "smtp_configs"("workspace_id");

-- email_settings
ALTER TABLE "email_settings"
  ALTER COLUMN "id" SET DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_email_settings_workspace_id" ON "email_settings"("workspace_id");

-- ai_providers
ALTER TABLE "ai_providers"
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_ai_providers_workspace_id" ON "ai_providers"("workspace_id");

-- ─── 4. Add workspace_id to data tables ──────────────────────

-- leads
ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_leads_workspace_id" ON "leads"("workspace_id");

-- agent_pipeline_runs
ALTER TABLE "agent_pipeline_runs"
  ADD COLUMN IF NOT EXISTS "workspace_id" text REFERENCES "workspaces"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_runs_workspace_id" ON "agent_pipeline_runs"("workspace_id");

-- ─── 5. active_workspace_id on users ─────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "active_workspace_id" text REFERENCES "workspaces"("id") ON DELETE SET NULL;
