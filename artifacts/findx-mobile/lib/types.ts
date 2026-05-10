export type LeadStatus =
  | "discovered"
  | "analyzing"
  | "analyzed"
  | "contacting"
  | "responded"
  | "qualified"
  | "won"
  | "lost";

export type OutreachStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "sent"
  | "saved"
  | "opened"
  | "replied"
  | "bounced"
  | "failed";

export interface Lead {
  id: string;
  businessName: string;
  kvkNumber: string | null;
  address: string | null;
  city: string;
  industry: string | null;
  website: string | null;
  hasWebsite: boolean;
  phone: string | null;
  email: string | null;
  source: string;
  sourceId: string | null;
  status: LeadStatus;
  leadScore: number | null;
  pipelineStageId: string | null;
  discoveredAt: string;
  createdAt: string;
  updatedAt: string;
  analyses?: Analysis[];
  outreaches?: Outreach[];
  _count?: { analyses: number; outreaches: number };
}

export interface Analysis {
  id: string;
  leadId: string;
  type: string;
  score: number | null;
  findings: Record<string, unknown>;
  opportunities: Record<string, unknown> | null;
  socialPresence: Record<string, unknown> | null;
  competitors: Record<string, unknown> | null;
  serviceGaps: Record<string, unknown> | null;
  revenueImpact: Record<string, unknown> | null;
  analyzedAt: string;
  createdAt: string;
}

export interface Outreach {
  id: string;
  leadId: string;
  status: OutreachStatus;
  subject: string;
  body: string;
  personalizedDetails: Record<string, unknown>;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalLeads: number;
  leadsAnalyzed: number;
  leadsContacted: number;
  leadsResponded: number;
  leadsWon: number;
  leadsThisWeek: number;
  conversionRate: string;
}

export interface PaginatedLeads {
  leads: Lead[];
  total: number;
  page: number;
  pageSize: number;
}

export type AgentRunStatus = "running" | "completed" | "partial" | "failed" | "queued" | "cancelled";

export interface AgentPipelineRun {
  id: string;
  query: string;
  status: AgentRunStatus;
  leadsFound: number;
  leadsAnalyzed: number;
  emailsDrafted: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  leads?: Lead[];
}

export interface Agent {
  id: string;
  name: string;
  displayName: string;
  description: string;
  role: string;
  icon: string;
  model: string;
  maxIterations: number;
  isActive: boolean;
  pipelineOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentLog {
  id: string;
  agentId: string;
  pipelineRunId: string;
  phase: string;
  level: string;
  message: string;
  toolName: string | null;
  duration: number | null;
  createdAt: string;
  agent?: { id: string; name: string; displayName: string };
}

export const STATUS_COLORS: Record<LeadStatus, string> = {
  discovered: "#6B7280",
  analyzing: "#B45309",
  analyzed: "#4338CA",
  contacting: "#1D4ED8",
  responded: "#C2410C",
  qualified: "#7E22CE",
  won: "#047857",
  lost: "#DC2626",
};

export const STATUS_BG: Record<LeadStatus, string> = {
  discovered: "#F3F4F6",
  analyzing: "#FFFBEB",
  analyzed: "#EEF2FF",
  contacting: "#EFF6FF",
  responded: "#FFF7ED",
  qualified: "#FAF5FF",
  won: "#ECFDF5",
  lost: "#FEF2F2",
};

export const STATUS_LABELS: Record<LeadStatus, string> = {
  discovered: "New",
  analyzing: "Analyzing",
  analyzed: "Analyzed",
  contacting: "Contacted",
  responded: "Responded",
  qualified: "Qualified",
  won: "Won",
  lost: "Lost",
};

export const RUN_STATUS_COLORS: Record<AgentRunStatus, string> = {
  running: "#1D4ED8",
  completed: "#047857",
  partial: "#B45309",
  failed: "#DC2626",
  queued: "#7A756D",
  cancelled: "#7A756D",
};

export const RUN_STATUS_BG: Record<AgentRunStatus, string> = {
  running: "#EFF6FF",
  completed: "#ECFDF5",
  partial: "#FFFBEB",
  failed: "#FEF2F2",
  queued: "#F3F4F6",
  cancelled: "#F3F4F6",
};
