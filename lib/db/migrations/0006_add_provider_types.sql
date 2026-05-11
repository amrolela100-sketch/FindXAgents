-- Migration: add new AI provider types to enum
-- Run after: pnpm --filter @workspace/db run push OR execute manually

ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'openrouter';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'google';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'mistral';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'together';
ALTER TYPE "ai_provider_type" ADD VALUE IF NOT EXISTS 'custom';
