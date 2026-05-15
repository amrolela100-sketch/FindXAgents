import {
  pgTable,
  pgEnum,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);

export const leadStatusEnum = pgEnum("lead_status", [
  "discovered",
  "analyzing",
  "analyzed",
  "contacting",
  "responded",
  "qualified",
  "won",
  "lost",
]);

export const outreachStatusEnum = pgEnum("outreach_status", [
  "draft",
  "pending_approval",
  "approved",
  "scheduled",
  "sent",
  "saved",
  "opened",
  "replied",
  "bounced",
  "failed",
]);

export const aiProviderTypeEnum = pgEnum("ai_provider_type", [
  "glm",
  "anthropic",
  "openai",
  "ollama",
  "minimax",
  "kimi",
  "deepseek",
  "groq",
  "gemini",
  "openrouter",
  "google",
  "mistral",
  "together",
  "custom",
]);

export const workspaceMemberRoleEnum = pgEnum("workspace_member_role", [
  "owner",
  "admin",
  "member",
]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id:                  text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email:               text("email").notNull().unique(),
    passwordHash:        text("password_hash"),
    role:                userRoleEnum("role").notNull().default("user"),
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    onboardingData:      jsonb("onboarding_data").default({}),
    metadata:            jsonb("metadata").default({}),
    // ← NEW: fast lookup for the user's currently active workspace
    activeWorkspaceId:   text("active_workspace_id"),
    createdAt:           timestamp("created_at").notNull().defaultNow(),
    updatedAt:           timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("idx_users_email").on(t.email)],
);

// ─── Workspaces ───────────────────────────────────────────────────────────────

/**
 * A Workspace is the top-level multi-tenant boundary.
 * Every user gets a personal "Default" workspace on first login.
 * They can create more workspaces and (in the future) invite members.
 *
 * All settings tables (telegram, search, resend, smtp, ai_providers, …)
 * are scoped to a workspaceId, so each workspace has its own API keys.
 */
export const workspaces = pgTable(
  "workspaces",
  {
    id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    ownerId:        text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name:           text("name").notNull(),
    description:    text("description").notNull().default(""),
    icp:            text("icp").notNull().default(""),
    targetIndustry: text("target_industry").notNull().default(""),
    targetCity:     text("target_city").notNull().default(""),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
    updatedAt:      timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_workspaces_owner_id").on(t.ownerId)],
);

// ─── Workspace Members (future sharing) ──────────────────────────────────────

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
    userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role:        workspaceMemberRoleEnum("role").notNull().default("member"),
    joinedAt:    timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.userId] }),
    index("idx_workspace_members_user_id").on(t.userId),
  ],
);

// ─── Pipeline Stages ─────────────────────────────────────────────────────────

export const pipelineStages = pgTable("pipeline_stages", {
  id:    text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name:  text("name").notNull().unique(),
  order: integer("order").notNull().unique(),
});

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = pgTable(
  "leads",
  {
    id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId:          text("user_id").references(() => users.id, { onDelete: "cascade" }),
    // ← NEW
    workspaceId:     text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    businessName:    text("business_name").notNull(),
    kvkNumber:       text("kvk_number"),
    address:         text("address"),
    city:            text("city").notNull(),
    industry:        text("industry"),
    website:         text("website"),
    hasWebsite:      boolean("has_website").notNull().default(false),
    phone:           text("phone"),
    email:           text("email"),
    source:          text("source").notNull(),
    sourceId:        text("source_id"),
    status:          leadStatusEnum("status").notNull().default("discovered"),
    leadScore:       integer("lead_score"),
    pipelineStageId: text("pipeline_stage_id").references(() => pipelineStages.id),
    isTavilyEnriched: boolean("is_tavily_enriched").notNull().default(false),
    discoveredAt:    timestamp("discovered_at").notNull().defaultNow(),
    createdAt:       timestamp("created_at").notNull().defaultNow(),
    updatedAt:       timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_leads_workspace_id").on(t.workspaceId),
    index("idx_leads_city").on(t.city),
    index("idx_leads_industry").on(t.industry),
    index("idx_leads_status").on(t.status),
    index("idx_leads_source").on(t.source),
    index("idx_leads_has_website").on(t.hasWebsite),
  ],
);

// ─── Analyses ─────────────────────────────────────────────────────────────────

export const analyses = pgTable(
  "analyses",
  {
    id:                  text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    leadId:              text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    type:                text("type").notNull(),
    score:               integer("score"),
    findings:            jsonb("findings").notNull().default({}),
    opportunities:       jsonb("opportunities"),
    socialPresence:      jsonb("social_presence").default({}),
    competitors:         jsonb("competitors").default([]),
    serviceGaps:         jsonb("service_gaps").default([]),
    revenueImpact:       jsonb("revenue_impact").default({}),
    crawlData:           jsonb("crawl_data").default({}),
    structuredData:      jsonb("structured_data").default({}),
    formData:            jsonb("form_data").default({}),
    imageAudit:          jsonb("image_audit").default({}),
    complianceAudit:     jsonb("compliance_audit").default({}),
    contentAudit:        jsonb("content_audit").default({}),
    seoAudit:            jsonb("seo_audit").default({}),
    securityAudit:       jsonb("security_audit").default({}),
    competitorAnalysis:  jsonb("competitor_analysis").default({}),
    integrationData:     jsonb("integration_data").default({}),
    analyzedAt:          timestamp("analyzed_at").notNull().defaultNow(),
    createdAt:           timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("idx_analyses_lead_id").on(t.leadId)],
);

// ─── Outreaches ───────────────────────────────────────────────────────────────

export const outreaches = pgTable(
  "outreaches",
  {
    id:                   text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    leadId:               text("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
    status:               outreachStatusEnum("status").notNull().default("draft"),
    subject:              text("subject").notNull(),
    body:                 text("body").notNull(),
    personalizedDetails:  jsonb("personalized_details").notNull().default({}),
    sentAt:               timestamp("sent_at"),
    openedAt:             timestamp("opened_at"),
    repliedAt:            timestamp("replied_at"),
    scheduledAt:          timestamp("scheduled_at"),
    followUpCount:        integer("follow_up_count").notNull().default(0),
    lastFollowUpAt:       timestamp("last_follow_up_at"),
    createdAt:            timestamp("created_at").notNull().defaultNow(),
    updatedAt:            timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_outreaches_lead_id").on(t.leadId),
    index("idx_outreaches_status").on(t.status),
  ],
);

// ─── Agent Pipeline Runs ──────────────────────────────────────────────────────

export const agentPipelineRuns = pgTable(
  "agent_pipeline_runs",
  {
    id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId:         text("user_id"),
    // ← NEW
    workspaceId:    text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    query:          text("query").notNull(),
    status:         text("status").notNull().default("running"),
    leadsFound:     integer("leads_found").notNull().default(0),
    leadsAnalyzed:  integer("leads_analyzed").notNull().default(0),
    emailsDrafted:  integer("emails_drafted").notNull().default(0),
    error:          text("error"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
    completedAt:    timestamp("completed_at"),
  },
  (t) => [
    index("idx_runs_workspace_id").on(t.workspaceId),
    index("idx_runs_status").on(t.status),
    index("idx_runs_created_at").on(t.createdAt),
  ],
);

// ─── Agents ───────────────────────────────────────────────────────────────────

export const agents = pgTable(
  "agents",
  {
    id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name:           text("name").notNull().unique(),
    displayName:    text("display_name").notNull(),
    description:    text("description").notNull(),
    role:           text("role").notNull(),
    icon:           text("icon").notNull().default("Bot"),
    model:          text("model").notNull().default("claude-sonnet-4-20250514"),
    maxIterations:  integer("max_iterations").notNull().default(15),
    maxTokens:      integer("max_tokens").notNull().default(4096),
    temperature:    text("temperature"),
    identityMd:     text("identity_md").notNull().default(""),
    soulMd:         text("soul_md").notNull().default(""),
    toolsMd:        text("tools_md").notNull().default(""),
    systemPrompt:   text("system_prompt").notNull().default(""),
    toolNames:      jsonb("tool_names").notNull().default([]),
    pipelineOrder:  integer("pipeline_order").notNull().default(0),
    isActive:       boolean("is_active").notNull().default(true),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
    updatedAt:      timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_agents_pipeline_order").on(t.pipelineOrder)],
);

export const agentSkills = pgTable(
  "agent_skills",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    agentId:     text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    name:        text("name").notNull(),
    description: text("description").notNull(),
    toolNames:   jsonb("tool_names").notNull().default([]),
    promptAdd:   text("prompt_add").notNull().default(""),
    isActive:    boolean("is_active").notNull().default(true),
    sortOrder:   integer("sort_order").notNull().default(0),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_agent_skill_name").on(t.agentId, t.name),
    index("idx_agent_skills_agent_id").on(t.agentId),
  ],
);

export const agentLogs = pgTable(
  "agent_logs",
  {
    id:             text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    agentId:        text("agent_id").notNull().references(() => agents.id, { onDelete: "cascade" }),
    pipelineRunId:  text("pipeline_run_id").notNull().references(() => agentPipelineRuns.id, { onDelete: "cascade" }),
    phase:          text("phase").notNull(),
    level:          text("level").notNull().default("info"),
    message:        text("message").notNull(),
    toolName:       text("tool_name"),
    toolInput:      jsonb("tool_input"),
    toolOutput:     text("tool_output"),
    duration:       integer("duration"),
    tokens:         integer("tokens"),
    createdAt:      timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_logs_run_id").on(t.pipelineRunId),
    index("idx_logs_agent_id").on(t.agentId),
    index("idx_logs_created_at").on(t.createdAt),
  ],
);

// ─── AI Providers (per workspace) ────────────────────────────────────────────

export const aiProviders = pgTable(
  "ai_providers",
  {
    id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // ← NEW: null = global/owner fallback; set = workspace-specific key
    workspaceId:  text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    name:         text("name").notNull(),
    providerType: aiProviderTypeEnum("provider_type").notNull(),
    apiKey:       text("api_key"),
    baseUrl:      text("base_url"),
    model:        text("model").notNull(),
    isActive:     boolean("is_active").notNull().default(true),
    isDefault:    boolean("is_default").notNull().default(false),
    temperature:  text("temperature"),
    maxTokens:    integer("max_tokens").notNull().default(4096),
    createdAt:    timestamp("created_at").notNull().defaultNow(),
    updatedAt:    timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_ai_providers_workspace_id").on(t.workspaceId),
    index("idx_ai_providers_type").on(t.providerType),
    index("idx_ai_providers_default").on(t.isDefault),
  ],
);

// ─── Email Provider Tokens ────────────────────────────────────────────────────

export const emailProviderTokens = pgTable("email_provider_tokens", {
  id:           text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  // workspaceId scopes Gmail tokens per workspace — previously global (security fix)
  workspaceId:  text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  provider:     text("provider").notNull(),
  accessToken:  text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  scope:        text("scope").notNull(),
  tokenType:    text("token_type").notNull().default("Bearer"),
  expiryDate:   timestamp("expiry_date"),
  email:        text("email"),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
  updatedAt:    timestamp("updated_at").notNull().defaultNow(),
});

// ─── SMTP Configs (per workspace) ────────────────────────────────────────────

export const smtpConfigs = pgTable(
  "smtp_configs",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // ← NEW (replaces singleton id = "default")
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    host:        text("host").notNull(),
    port:        integer("port").notNull().default(465),
    secure:      boolean("secure").notNull().default(true),
    user:        text("user").notNull(),
    password:    text("password").notNull(),
    fromEmail:   text("from_email").notNull(),
    fromName:    text("from_name").notNull().default("FindX"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_smtp_configs_workspace_id").on(t.workspaceId)],
);

// ─── Email Settings (per workspace) ──────────────────────────────────────────

export const emailSettings = pgTable(
  "email_settings",
  {
    id:              text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // ← NEW
    workspaceId:     text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    defaultProvider: text("default_provider"),
    updatedAt:       timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_email_settings_workspace_id").on(t.workspaceId)],
);

// ─── Telegram Settings (per workspace) ───────────────────────────────────────

export const telegramSettings = pgTable(
  "telegram_settings",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // ← NEW: every workspace can send to its own Telegram bot
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    botToken:    text("bot_token").notNull(),
    chatId:      text("chat_id").notNull(),
    isActive:    boolean("is_active").notNull().default(true),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_telegram_settings_workspace_id").on(t.workspaceId)],
);

// ─── Search Configs (per workspace) ──────────────────────────────────────────

export const searchConfigs = pgTable(
  "search_configs",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // ← NEW
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    provider:    text("provider").notNull().default("tavily"),
    apiKey:      text("api_key").notNull(),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_search_configs_workspace_id").on(t.workspaceId)],
);

// ─── Resend Configs (per workspace) ──────────────────────────────────────────

export const resendConfigs = pgTable(
  "resend_configs",
  {
    id:          text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // ← NEW
    workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    apiKey:      text("api_key").notNull(),
    fromEmail:   text("from_email").notNull().default("FindX <onboarding@resend.dev>"),
    createdAt:   timestamp("created_at").notNull().defaultNow(),
    updatedAt:   timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("idx_resend_configs_workspace_id").on(t.workspaceId)],
);

// ─── Push Tokens ──────────────────────────────────────────────────────────────

export const pushTokens = pgTable(
  "push_tokens",
  {
    id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId:    text("user_id").notNull(),
    token:     text("token").notNull(),
    platform:  text("platform").notNull().default("expo"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("idx_push_tokens_user_token").on(t.userId, t.token),
    index("idx_push_tokens_user_id").on(t.userId),
  ],
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id:        text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type:      text("type").notNull().default("pipeline_complete"),
    title:     text("title").notNull(),
    body:      text("body").notNull().default(""),
    meta:      jsonb("meta").notNull().default({}),
    read:      boolean("read").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_notifications_user_id").on(t.userId),
    index("idx_notifications_created_at").on(t.createdAt),
  ],
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type User              = typeof users.$inferSelect;
export type Workspace         = typeof workspaces.$inferSelect;
export type WorkspaceMember   = typeof workspaceMembers.$inferSelect;
export type Lead              = typeof leads.$inferSelect;
export type Analysis          = typeof analyses.$inferSelect;
export type Outreach          = typeof outreaches.$inferSelect;
export type PipelineStage     = typeof pipelineStages.$inferSelect;
export type AgentPipelineRun  = typeof agentPipelineRuns.$inferSelect;
export type Agent             = typeof agents.$inferSelect;
export type AgentSkill        = typeof agentSkills.$inferSelect;
export type AgentLog          = typeof agentLogs.$inferSelect;
export type AiProvider        = typeof aiProviders.$inferSelect;
export type PushToken         = typeof pushTokens.$inferSelect;
