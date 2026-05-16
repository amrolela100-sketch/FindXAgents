-- Migration: 0013_performance_indexes
-- PERF-2 fix: Add missing indexes on FK and frequently-queried columns
-- These indexes prevent full-table scans in leads, pipeline runs, outreaches, and notifications

-- Leads table
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_workspace_id ON leads(workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_discovered_at ON leads(discovered_at DESC);

-- Agent pipeline runs
CREATE INDEX IF NOT EXISTS idx_agent_pipeline_runs_workspace_id ON agent_pipeline_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_pipeline_runs_user_id ON agent_pipeline_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_pipeline_runs_status ON agent_pipeline_runs(status);

-- Agent logs
CREATE INDEX IF NOT EXISTS idx_agent_logs_pipeline_run_id ON agent_logs(pipeline_run_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_id ON agent_logs(agent_id);

-- Outreaches (compound index for lead_id + status lookup)
CREATE INDEX IF NOT EXISTS idx_outreaches_lead_id_status ON outreaches(lead_id, status);
CREATE INDEX IF NOT EXISTS idx_outreaches_workspace_id ON outreaches(workspace_id);

-- Notifications (compound index for user_id + created_at for ordered inbox)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- Analyses
CREATE INDEX IF NOT EXISTS idx_analyses_lead_id ON analyses(lead_id);
