-- Migration 0007: add new AI provider types to enum
-- (was 0006_add_provider_types — renumbered for correct sequence after 0006_add_notifications)

ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'openrouter';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'google';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'mistral';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'together';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'custom';
