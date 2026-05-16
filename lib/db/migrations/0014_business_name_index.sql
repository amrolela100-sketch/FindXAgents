-- Migration: 0014_business_name_index
-- MED-5 fix: Add index on leads.business_name
-- Used in ILIKE searches (GET /leads?search=...) and CSV import duplicate checks.
-- A btree index accelerates prefix/exact ILIKE matches and equality comparisons.

CREATE INDEX IF NOT EXISTS idx_leads_business_name ON leads(business_name);
