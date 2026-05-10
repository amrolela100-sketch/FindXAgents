ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_completed" boolean DEFAULT false NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_data" jsonb DEFAULT '{}'::jsonb;
