-- Migration: race guard for first-login default workspace creation
-- Prevents concurrent /auth/me calls from creating multiple "Default" workspaces
-- for the same owner.

-- Rename legacy duplicate Default workspaces instead of deleting them, so no
-- existing workspace data is lost.
WITH ranked_defaults AS (
  SELECT
    id,
    row_number() OVER (PARTITION BY owner_id ORDER BY created_at ASC, id ASC) AS rn
  FROM workspaces
  WHERE name = 'Default'
)
UPDATE workspaces w
SET name = 'Default (duplicate ' || substring(w.id from 1 for 8) || ')',
    updated_at = now()
FROM ranked_defaults r
WHERE w.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_workspaces_one_default_per_owner
  ON workspaces (owner_id)
  WHERE name = 'Default';
