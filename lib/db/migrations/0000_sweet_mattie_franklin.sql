DO $$ BEGIN
  CREATE TYPE "public"."ai_provider_type" AS ENUM('glm', 'anthropic', 'openai', 'ollama', 'minimax', 'kimi', 'deepseek', 'groq', 'gemini');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."lead_status" AS ENUM('discovered', 'analyzing', 'analyzed', 'contacting', 'responded', 'qualified', 'won', 'lost');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."outreach_status" AS ENUM('draft', 'pending_approval', 'approved', 'scheduled', 'sent', 'saved', 'opened', 'replied', 'bounced', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE "agent_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"pipeline_run_id" text NOT NULL,
	"phase" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"tool_name" text,
	"tool_input" jsonb,
	"tool_output" text,
	"duration" integer,
	"tokens" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_pipeline_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"query" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"leads_found" integer DEFAULT 0 NOT NULL,
	"leads_analyzed" integer DEFAULT 0 NOT NULL,
	"emails_drafted" integer DEFAULT 0 NOT NULL,
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tool_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prompt_add" text DEFAULT '' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"role" text NOT NULL,
	"icon" text DEFAULT 'Bot' NOT NULL,
	"model" text DEFAULT 'claude-sonnet-4-20250514' NOT NULL,
	"max_iterations" integer DEFAULT 15 NOT NULL,
	"max_tokens" integer DEFAULT 4096 NOT NULL,
	"temperature" text,
	"identity_md" text DEFAULT '' NOT NULL,
	"soul_md" text DEFAULT '' NOT NULL,
	"tools_md" text DEFAULT '' NOT NULL,
	"system_prompt" text DEFAULT '' NOT NULL,
	"tool_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pipeline_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agents_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "ai_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider_type" "ai_provider_type" NOT NULL,
	"api_key" text,
	"base_url" text,
	"model" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"temperature" text,
	"max_tokens" integer DEFAULT 4096 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"type" text NOT NULL,
	"score" integer,
	"findings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opportunities" jsonb,
	"social_presence" jsonb DEFAULT '{}'::jsonb,
	"competitors" jsonb DEFAULT '[]'::jsonb,
	"service_gaps" jsonb DEFAULT '[]'::jsonb,
	"revenue_impact" jsonb DEFAULT '{}'::jsonb,
	"crawl_data" jsonb DEFAULT '{}'::jsonb,
	"structured_data" jsonb DEFAULT '{}'::jsonb,
	"form_data" jsonb DEFAULT '{}'::jsonb,
	"image_audit" jsonb DEFAULT '{}'::jsonb,
	"compliance_audit" jsonb DEFAULT '{}'::jsonb,
	"content_audit" jsonb DEFAULT '{}'::jsonb,
	"seo_audit" jsonb DEFAULT '{}'::jsonb,
	"security_audit" jsonb DEFAULT '{}'::jsonb,
	"competitor_analysis" jsonb DEFAULT '{}'::jsonb,
	"integration_data" jsonb DEFAULT '{}'::jsonb,
	"analyzed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_provider_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"scope" text NOT NULL,
	"token_type" text DEFAULT 'Bearer' NOT NULL,
	"expiry_date" timestamp,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "email_provider_tokens_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"default_provider" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"business_name" text NOT NULL,
	"kvk_number" text,
	"address" text,
	"city" text NOT NULL,
	"industry" text,
	"website" text,
	"has_website" boolean DEFAULT false NOT NULL,
	"phone" text,
	"email" text,
	"source" text NOT NULL,
	"source_id" text,
	"status" "lead_status" DEFAULT 'discovered' NOT NULL,
	"lead_score" integer,
	"pipeline_stage_id" text,
	"discovered_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreaches" (
	"id" text PRIMARY KEY NOT NULL,
	"lead_id" text NOT NULL,
	"status" "outreach_status" DEFAULT 'draft' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"personalized_details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"sent_at" timestamp,
	"opened_at" timestamp,
	"replied_at" timestamp,
	"scheduled_at" timestamp,
	"follow_up_count" integer DEFAULT 0 NOT NULL,
	"last_follow_up_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "pipeline_stages_name_unique" UNIQUE("name"),
	CONSTRAINT "pipeline_stages_order_unique" UNIQUE("order")
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"platform" text DEFAULT 'expo' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resend_configs" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"api_key" text NOT NULL,
	"from_email" text DEFAULT 'FindX <onboarding@resend.dev>' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_configs" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"provider" text DEFAULT 'tavily' NOT NULL,
	"api_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smtp_configs" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"host" text NOT NULL,
	"port" integer DEFAULT 465 NOT NULL,
	"secure" boolean DEFAULT true NOT NULL,
	"user" text NOT NULL,
	"password" text NOT NULL,
	"from_email" text NOT NULL,
	"from_name" text DEFAULT 'FindX' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "telegram_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"bot_token" text NOT NULL,
	"chat_id" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_logs" ADD CONSTRAINT "agent_logs_pipeline_run_id_agent_pipeline_runs_id_fk" FOREIGN KEY ("pipeline_run_id") REFERENCES "public"."agent_pipeline_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_skills" ADD CONSTRAINT "agent_skills_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_pipeline_stage_id_pipeline_stages_id_fk" FOREIGN KEY ("pipeline_stage_id") REFERENCES "public"."pipeline_stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outreaches" ADD CONSTRAINT "outreaches_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_logs_run_id" ON "agent_logs" USING btree ("pipeline_run_id");--> statement-breakpoint
CREATE INDEX "idx_logs_agent_id" ON "agent_logs" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_logs_created_at" ON "agent_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_runs_status" ON "agent_pipeline_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_runs_created_at" ON "agent_pipeline_runs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_agent_skill_name" ON "agent_skills" USING btree ("agent_id","name");--> statement-breakpoint
CREATE INDEX "idx_agent_skills_agent_id" ON "agent_skills" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "idx_agents_pipeline_order" ON "agents" USING btree ("pipeline_order");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_type" ON "ai_providers" USING btree ("provider_type");--> statement-breakpoint
CREATE INDEX "idx_ai_providers_default" ON "ai_providers" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "idx_analyses_lead_id" ON "analyses" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_leads_city" ON "leads" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_leads_industry" ON "leads" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "idx_leads_status" ON "leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_leads_source" ON "leads" USING btree ("source");--> statement-breakpoint
CREATE INDEX "idx_leads_has_website" ON "leads" USING btree ("has_website");--> statement-breakpoint
CREATE INDEX "idx_outreaches_lead_id" ON "outreaches" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "idx_outreaches_status" ON "outreaches" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_push_tokens_user_token" ON "push_tokens" USING btree ("user_id","token");--> statement-breakpoint
CREATE INDEX "idx_push_tokens_user_id" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_email" ON "users" USING btree ("email");