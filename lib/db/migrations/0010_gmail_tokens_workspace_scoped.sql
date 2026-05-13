-- Migration: scope Gmail tokens per workspace
-- Previously email_provider_tokens had a UNIQUE constraint on provider (global singleton).
-- Now each workspace can have its own Gmail token.

-- 1. Drop the global unique constraint on provider
ALTER TABLE email_provider_tokens DROP CONSTRAINT IF EXISTS email_provider_tokens_provider_unique;
ALTER TABLE email_provider_tokens DROP CONSTRAINT IF EXISTS email_provider_tokens_provider_key;

-- 2. Add workspace_id column (nullable for backward compat with existing global tokens)
ALTER TABLE email_provider_tokens
  ADD COLUMN IF NOT EXISTS workspace_id text REFERENCES workspaces(id) ON DELETE CASCADE;

-- 3. Add a composite unique constraint: one token per provider per workspace
--    NULL workspace_id (global legacy) is still allowed but there should only be one.
CREATE UNIQUE INDEX IF NOT EXISTS email_provider_tokens_workspace_provider_unique
  ON email_provider_tokens (workspace_id, provider)
  WHERE workspace_id IS NOT NULL;
