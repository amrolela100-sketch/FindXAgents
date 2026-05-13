import type {
  PaginatedLeads,
  Lead,
  Analysis,
  Outreach,
  PipelineStage,
  DashboardStats,
  LeadStatus,
  AgentPipelineRun,
  AgentRunEmail,
  Agent,
  AgentLog,
  EmailProviderStatus,
  EmailSettingsResponse,
  SmtpConfigResponse,
  ResendConfigResponse,
  SearchConfigResponse,
  AiProvider,
  AiProviderDefaults,
  AiProviderType,
} from "./types";
import { toast } from "../hooks/use-toast";

// Strategy: always proxy-based — VITE_API_URL is "/api" in production (Vercel proxy)
// and "http://localhost:3000/api" in local dev. Never hardcode "/api".
const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import("./supabase");
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function fetchApi<T>(path: string, init?: RequestInit & { skipAuthRedirect?: boolean }): Promise<T> {
  if (!navigator.onLine) {
    toast({
      title: "No internet connection",
      description: "Please check your network settings.",
      variant: "destructive",
    });
    throw new Error("No internet connection");
  }

  const { skipAuthRedirect, ...fetchInit } = init ?? {};
  const headers: Record<string, string> = { ...fetchInit?.headers } as Record<string, string>;
  if (fetchInit?.body) headers["Content-Type"] = "application/json";

  const token = await getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...fetchInit, headers });
  
  if (!res.ok) {
    if (res.status === 401) {
      // Only redirect to login if not explicitly suppressed and not already there
      if (!skipAuthRedirect) {
        const { supabase } = await import("./supabase");
        await supabase.auth.signOut();
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
      throw new Error("Unauthorized");
    }
    
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After") || "a minute";
      toast({
        title: "Too many requests",
        description: `Please try again after ${retryAfter} seconds.`,
        variant: "destructive",
      });
      throw new Error("Too many requests");
    }
    
    if (res.status >= 500) {
      toast({
        title: "Server error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
    
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}


export function getDashboardStats(opts?: { skipAuthRedirect?: boolean }): Promise<{ stats: DashboardStats }> {
  return fetchApi("/dashboard/stats", opts);
}

export function getPipeline(): Promise<{
  stages: PipelineStage[];
  statusCounts: { status: LeadStatus; _count: number }[];
}> {
  return fetchApi("/pipeline");
}

export interface LeadListParams {
  page?: number;
  pageSize?: number;
  city?: string;
  industry?: string;
  status?: LeadStatus;
  source?: string;
  hasWebsite?: boolean;
  search?: string;
}

export function getLeads(params: LeadListParams = {}): Promise<PaginatedLeads> {
  const q = new URLSearchParams();
  if (params.page) q.set("page", String(params.page));
  if (params.pageSize) q.set("pageSize", String(params.pageSize));
  if (params.city) q.set("city", params.city);
  if (params.industry) q.set("industry", params.industry);
  if (params.status) q.set("status", params.status);
  if (params.source) q.set("source", params.source);
  if (params.hasWebsite !== undefined) q.set("hasWebsite", String(params.hasWebsite));
  if (params.search) q.set("search", params.search);
  return fetchApi(`/leads?${q.toString()}`);
}

export function getLead(id: string): Promise<{ lead: Lead | null }> {
  return fetchApi(`/leads/${id}`);
}

export function createLead(data: {
  businessName: string;
  city: string;
  address?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  kvkNumber?: string;
  source?: string;
}): Promise<{ lead: Lead }> {
  return fetchApi("/leads", { method: "POST", body: JSON.stringify(data) });
}

export function updateLead(id: string, data: Partial<Lead>): Promise<{ lead: Lead }> {
  return fetchApi(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function analyzeLead(id: string): Promise<{ analysis: Analysis; score: number; summary: string }> {
  return fetchApi(`/leads/${id}/analyze`, { method: "POST" });
}

export function generateOutreach(id: string, language: "ar" | "en" | "nl" | "fr" | "es" | "de" = "en"): Promise<{ outreach: Outreach }> {
  return fetchApi(`/leads/${id}/outreach/generate`, { method: "POST", body: JSON.stringify({ language }) });
}

export function updateOutreach(id: string, data: Partial<Outreach>): Promise<{ outreach: Outreach }> {
  return fetchApi(`/outreaches/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function sendOutreach(leadId: string, outreachId: string): Promise<{ message: string; outreachId: string }> {
  return fetchApi(`/leads/${leadId}/outreach/send`, { method: "POST", body: JSON.stringify({ outreachId }) });
}

export function getLeadAnalyses(id: string): Promise<{ analyses: Analysis[] }> {
  return fetchApi(`/leads/${id}/analyses`);
}

export function getLeadOutreaches(id: string): Promise<{ outreaches: Outreach[] }> {
  return fetchApi(`/leads/${id}/outreaches`);
}

export function exportLeads(params: Omit<LeadListParams, "page" | "pageSize"> = {}): Promise<Blob> {
  const q = new URLSearchParams();
  if (params.city) q.set("city", params.city);
  if (params.industry) q.set("industry", params.industry);
  if (params.status) q.set("status", params.status);
  if (params.hasWebsite !== undefined) q.set("hasWebsite", String(params.hasWebsite));
  if (params.search) q.set("search", params.search);
  return fetchApi(`/leads/export?${q.toString()}`);
}

export function importLeads(csv: string, skipDuplicates = true): Promise<{ created: number; skipped: number; errors: unknown[] }> {
  return fetchApi("/leads/import", { method: "POST", body: JSON.stringify({ csv, skipDuplicates }) });
}

export function bulkAnalyzeLeads(leadIds: string[]): Promise<{ queued: number }> {
  return fetchApi("/leads/bulk/analyze", { method: "POST", body: JSON.stringify({ leadIds }) });
}

export function bulkUpdateStatus(leadIds: string[], status: LeadStatus): Promise<{ updated: number }> {
  return fetchApi("/leads/bulk/status", { method: "PATCH", body: JSON.stringify({ leadIds, status }) });
}

export function searchLeads(query: string, maxResults = 20): Promise<{ leads: Lead[]; total: number }> {
  return fetchApi("/search", { method: "POST", body: JSON.stringify({ query, maxResults }) });
}

export function discoverLeads(): Promise<{ message: string; jobs: unknown[] }> {
  return fetchApi("/leads/discover", { method: "POST" });
}

export function getAgents(): Promise<{ agents: Agent[] }> {
  return fetchApi("/agents");
}

export function getAgent(name: string): Promise<{ agent: Agent }> {
  return fetchApi(`/agents/name/${name}`);
}

export function runAgentPipeline(data: {
  query: string;
  sync?: boolean;
  maxResults?: number;
  language?: "ar" | "en" | "nl" | "fr" | "es" | "de";
}): Promise<{ runId: string; status: string; run: AgentPipelineRun }> {
  return fetchApi("/agents/run", { method: "POST", body: JSON.stringify(data) });
}

export function getAgentRuns(): Promise<{ runs: AgentPipelineRun[] }> {
  return fetchApi("/agents/runs");
}

export function getAgentRun(id: string): Promise<{ run: AgentPipelineRun | null }> {
  return fetchApi(`/agents/runs/${id}`);
}

export function getAgentRunLogs(id: string): Promise<{ logs: AgentLog[] }> {
  return fetchApi(`/agents/runs/${id}/logs`);
}

export function getAgentRunEmails(id: string): Promise<{ emails: AgentRunEmail[] }> {
  return fetchApi(`/agents/runs/${id}/emails`);
}

export function getScoreDistribution(): Promise<{
  buckets: { cold: number; warm: number; hot: number; unscored: number };
  avgScore: number;
  totalScored: number;
}> {
  return fetchApi("/leads/score-distribution");
}

export function getEmailProviderStatus(): Promise<EmailProviderStatus> {
  return fetchApi("/email/provider/status");
}

export function getEmailSettings(): Promise<EmailSettingsResponse> {
  return fetchApi("/email/settings");
}

export function updateEmailSettings(data: { defaultProvider?: string }): Promise<EmailSettingsResponse> {
  return fetchApi("/email/settings", { method: "PUT", body: JSON.stringify(data) });
}

export function getSmtpConfig(): Promise<SmtpConfigResponse> {
  return fetchApi("/email/smtp/config");
}

export function saveSmtpConfig(data: {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromEmail: string;
  fromName?: string;
}): Promise<SmtpConfigResponse> {
  return fetchApi("/email/smtp/config", { method: "PUT", body: JSON.stringify(data) });
}

export function deleteSmtpConfig(): Promise<{ deleted: boolean }> {
  return fetchApi("/email/smtp/config", { method: "DELETE" });
}

export function getResendConfig(): Promise<ResendConfigResponse> {
  return fetchApi("/email/resend/config");
}

export function saveResendConfig(data: { apiKey: string; fromEmail: string }): Promise<ResendConfigResponse> {
  return fetchApi("/email/resend/config", { method: "PUT", body: JSON.stringify(data) });
}

export function deleteResendConfig(): Promise<{ deleted: boolean }> {
  return fetchApi("/email/resend/config", { method: "DELETE" });
}

export function testResendConfig(): Promise<{ ok: boolean; message?: string; error?: string }> {
  return fetchApi("/email/resend/test", { method: "POST" });
}

export function setEmailSettings(data: { defaultProvider?: string }): Promise<EmailSettingsResponse> {
  return fetchApi("/email/settings", { method: "PUT", body: JSON.stringify(data) });
}

export function getAiProviders(): Promise<{ providers: AiProvider[] }> {
  return fetchApi("/ai/providers");
}

export function getAiProviderDefaults(): Promise<AiProviderDefaults> {
  return fetchApi("/ai/providers/defaults");
}

export function upsertAiProvider(data: {
  name: string;
  providerType: AiProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  isDefault?: boolean;
  temperature?: string;
  maxTokens?: number;
}): Promise<{ provider: AiProvider }> {
  return fetchApi("/ai/providers", { method: "POST", body: JSON.stringify(data) });
}

export function deleteAiProvider(id: string): Promise<{ success: boolean }> {
  return fetchApi(`/ai/providers/${id}`, { method: "DELETE" });
}

export function createAiProvider(data: {
  name: string;
  providerType: AiProviderType;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  isDefault?: boolean;
  temperature?: string;
  maxTokens?: number;
}): Promise<{ provider: AiProvider }> {
  return upsertAiProvider(data);
}

export function updateAiProvider(id: string, data: Partial<AiProvider>): Promise<{ provider: AiProvider }> {
  return fetchApi(`/ai/providers/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function testAiProvider(id: string): Promise<{ success: boolean; message?: string }> {
  return fetchApi(`/ai/providers/${id}/test`, { method: "POST" });
}

export function setDefaultAiProvider(id: string): Promise<{ success: boolean }> {
  return fetchApi(`/ai/providers/${id}/default`, { method: "POST" });
}

export function clearAllData(): Promise<{ success: boolean; message: string }> {
  return fetchApi("/data/clear-all", { method: "DELETE" });
}

export function getSearchConfig(): Promise<SearchConfigResponse> {
  return fetchApi("/search/config");
}

export function saveSearchConfig(data: { apiKey: string; provider?: string }): Promise<SearchConfigResponse> {
  return fetchApi("/search/config", { method: "PUT", body: JSON.stringify(data) });
}

export function deleteSearchConfig(): Promise<{ deleted: boolean }> {
  return fetchApi("/search/config", { method: "DELETE" });
}

export function testSearchConfig(): Promise<{ ok: boolean; message?: string; error?: string }> {
  return fetchApi("/search/test", { method: "POST" });
}

export function getTelegramSettings(): Promise<{ settings: { botToken?: string; chatId?: string; isActive?: boolean } | null }> {
  return fetchApi("/telegram/settings");
}

export function saveTelegramSettings(data: { botToken: string; chatId: string; isActive?: boolean }): Promise<{ success: boolean }> {
  return fetchApi("/telegram/settings", { method: "POST", body: JSON.stringify(data) });
}

export function testTelegram(data: { botToken: string; chatId: string }): Promise<{ success: boolean; message?: string }> {
  return fetchApi("/telegram/test", { method: "POST", body: JSON.stringify(data) });
}

export function triggerAnalysis(leadId: string, _force?: boolean): Promise<{ analysis: Analysis; score: number; summary: string }> {
  return fetchApi(`/leads/${leadId}/analyze`, { method: "POST" });
}

export function triggerAgentRun(data: {
  query: string;
  sync?: boolean;
  maxResults?: number;
  language?: "ar" | "en" | "nl" | "fr" | "es" | "de";
}): Promise<{ runId: string; status: string; run: AgentPipelineRun }> {
  return runAgentPipeline(data);
}

export function cancelAgentRun(id: string): Promise<{ success: boolean }> {
  return fetchApi(`/agents/runs/${id}/cancel`, { method: "POST" });
}

export function getRunLogs(runId: string): Promise<{ logs: AgentLog[] }> {
  return getAgentRunLogs(runId);
}

export function updateAgent(name: string, data: Partial<Agent>): Promise<{ agent: Agent }> {
  return fetchApi(`/agents/name/${name}`, { method: "PATCH", body: JSON.stringify(data) });
}



// ─── Lead Delete ──────────────────────────────────────────────────────────────

export function deleteLead(id: string): Promise<{ deleted: boolean; id: string }> {
  return fetchApi(`/leads/${id}`, { method: "DELETE" });
}

export function bulkDeleteLeads(leadIds: string[]): Promise<{ deleted: number; skipped: number }> {
  return fetchApi("/leads/bulk/delete", {
    method: "POST",
    body: JSON.stringify({ leadIds }),
  });
}

// ─── Notifications ─────────────────────────────────────────────────────────────

export interface ApiNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  meta: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export function getNotifications(): Promise<{ notifications: ApiNotification[]; unreadCount: number }> {
  return fetchApi("/notifications");
}

export function createNotification(data: {
  type?: string;
  title: string;
  body?: string;
  meta?: Record<string, unknown>;
}): Promise<{ notification: ApiNotification }> {
  return fetchApi("/notifications", { method: "POST", body: JSON.stringify(data) });
}

export function markAllNotificationsRead(): Promise<{ ok: boolean }> {
  return fetchApi("/notifications/read-all", { method: "PATCH" });
}

export function markNotificationRead(id: string): Promise<{ ok: boolean }> {
  return fetchApi(`/notifications/${id}/read`, { method: "PATCH" });
}

export function clearAllNotifications(): Promise<{ ok: boolean }> {
  return fetchApi("/notifications", { method: "DELETE" });
}
