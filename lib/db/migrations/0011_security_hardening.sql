-- Migration: critical security and DB integrity hardening
-- 1) Make workspace-owned data cascade on workspace deletion.
-- 2) Add missing foreign keys for users.active_workspace_id and leads.user_id.
-- 3) Clean legacy orphan references before constraints are added.

-- Cleanup legacy orphan references so new FKs can be applied safely.
UPDATE users u
SET active_workspace_id = NULL
WHERE active_workspace_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = u.active_workspace_id);

UPDATE leads l
SET workspace_id = NULL
WHERE workspace_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = l.workspace_id);

UPDATE leads l
SET user_id = NULL
WHERE user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = l.user_id);

UPDATE agent_pipeline_runs r
SET workspace_id = NULL
WHERE workspace_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM workspaces w WHERE w.id = r.workspace_id);

-- leads.workspace_id: SET NULL -> CASCADE
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_workspace_id_workspaces_id_fk;
ALTER TABLE leads
  ADD CONSTRAINT leads_workspace_id_workspaces_id_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- agent_pipeline_runs.workspace_id: SET NULL -> CASCADE
ALTER TABLE agent_pipeline_runs DROP CONSTRAINT IF EXISTS agent_pipeline_runs_workspace_id_workspaces_id_fk;
ALTER TABLE agent_pipeline_runs
  ADD CONSTRAINT agent_pipeline_runs_workspace_id_workspaces_id_fk
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- users.active_workspace_id -> workspaces.id
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_active_workspace_id_workspaces_id_fk;
ALTER TABLE users
  ADD CONSTRAINT users_active_workspace_id_workspaces_id_fk
  FOREIGN KEY (active_workspace_id) REFERENCES workspaces(id) ON DELETE SET NULL;

-- leads.user_id -> users.id
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_user_id_users_id_fk;
ALTER TABLE leads
  ADD CONSTRAINT leads_user_id_users_id_fk
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
