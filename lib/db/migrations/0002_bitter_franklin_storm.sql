ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_data" jsonb DEFAULT '{}'::jsonb;