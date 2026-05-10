import type {
  PaginatedLeads,
  Lead,
  Analysis,
  Outreach,
  DashboardStats,
  AgentPipelineRun,
  Agent,
  AgentLog,
} from "./types";
import { getAuthToken } from "./authStore";

/**
 * Resolve the base API URL.
 *
 * Priority order:
 *  1. EXPO_PUBLIC_API_URL  — full URL, e.g. https://xxx.replit.dev/api
 *  2. EXPO_PUBLIC_DOMAIN   — Replit dev domain, constructs https://<domain>/api
 *  3. /api                 — relative path (web preview / same-origin)
 */
function getBase(): string {
  const direct = process.env.EXPO_PUBLIC_API_URL;
  if (direct) return direct.replace(/\/$/, "");

  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;

  return "/api";
}

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string>),
  };

  if (init?.body) {
    headers["Content-Type"] = "application/json";
  }

  const token = await getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${getBase()}${path}`, { ...init, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export function getDashboardStats(): Promise<{ stats: DashboardStats }> {
  return fetchApi("/dashboard/stats");
}

export interface LeadListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  city?: string;
  industry?: string;
  source?: string;
  hasWebsite?: boolean;
}

export function getLeads(params?: LeadListParams): Promise<PaginatedLeads> {
  const sp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") sp.set(k, String(v));
    }
  }
  return fetchApi(`/leads?${sp.toString()}`);
}

export function getLead(id: string): Promise<{ lead: Lead | null }> {
  return fetchApi(`/leads/${id}`);
}

export function updateLead(
  id: string,
  data: Partial<Pick<Lead, "status" | "businessName" | "industry" | "website" | "phone" | "email">>,
): Promise<{ lead: Lead }> {
  return fetchApi(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export function getAnalyses(leadId: string): Promise<{ analyses: Analysis[] }> {
  return fetchApi(`/leads/${leadId}/analyses`);
}

export function getOutreaches(leadId: string): Promise<{ outreaches: Outreach[] }> {
  return fetchApi(`/leads/${leadId}/outreaches`);
}

export function getScoreDistribution(): Promise<{
  buckets: { cold: number; warm: number; hot: number; unscored: number };
  avgScore: number;
  totalScored: number;
}> {
  return fetchApi("/leads/score-distribution");
}

export function triggerAgentRun(
  query: string,
  opts?: { maxResults?: number; language?: "en" | "nl" | "ar" },
): Promise<{ runId: string; status: string } | AgentPipelineRun> {
  return fetchApi("/agents/run", {
    method: "POST",
    body: JSON.stringify({ query, ...opts }),
  });
}

export function cancelAgentRun(runId: string): Promise<{ run: AgentPipelineRun }> {
  return fetchApi(`/agents/runs/${runId}/cancel`, { method: "POST" });
}

export function getAgentRuns(): Promise<{ runs: AgentPipelineRun[] }> {
  return fetchApi("/agents/runs");
}

export function getAgentRun(id: string): Promise<{ run: (AgentPipelineRun & { leads?: Lead[] }) | null }> {
  return fetchApi(`/agents/runs/${id}`);
}

export function getRunLogs(runId: string): Promise<{ logs: AgentLog[] }> {
  return fetchApi(`/agents/runs/${runId}/logs`);
}

export function getAgents(): Promise<{ agents: Agent[] }> {
  return fetchApi("/agents");
}

export interface SearchConfigResponse {
  configured: boolean;
  provider?: string;
  source?: "db" | "env" | null;
}

export interface ResendConfigResponse {
  configured: boolean;
  fromEmail?: string;
  source?: "db" | "env";
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

export function getResendConfig(): Promise<ResendConfigResponse> {
  return fetchApi("/email/resend/config");
}

export function saveResendConfig(data: { apiKey: string; fromEmail: string }): Promise<ResendConfigResponse> {
  return fetchApi("/email/resend/config", { method: "PUT", body: JSON.stringify(data) });
}

export function deleteResendConfig(): Promise<{ deleted: boolean }> {
  return fetchApi("/email/resend/config", { method: "DELETE" });
}

export function updateOutreach(
  outreachId: string,
  data: { status: string },
): Promise<{ outreach: Outreach }> {
  return fetchApi(`/outreaches/${outreachId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function registerPushToken(
  token: string,
  platform?: string,
): Promise<{ registered: boolean }> {
  return fetchApi("/notifications/register", {
    method: "POST",
    body: JSON.stringify({ token, platform: platform ?? "expo" }),
  });
}

export function unregisterPushToken(
  token: string,
): Promise<{ unregistered: boolean }> {
  return fetchApi("/notifications/unregister", {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

// ─── Onboarding ────────────────────────────────────────────────

export function getOnboardingStatus(): Promise<{ completed: boolean; data: Record<string, unknown> | null }> {
  return fetchApi("/onboarding/status");
}

export function completeOnboarding(data: Record<string, unknown>): Promise<{ completed: boolean }> {
  return fetchApi("/onboarding/complete", { method: "POST", body: JSON.stringify(data) });
}

// ─── Workspaces ────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icp: string;
  targetIndustry: string;
  targetCity: string;
  createdAt: string;
}

export function getWorkspaces(): Promise<{ workspaces: Workspace[]; activeId: string | null }> {
  return fetchApi("/workspaces");
}

export function createWorkspace(data: Partial<Workspace>): Promise<{ workspace: Workspace; activeId: string }> {
  return fetchApi("/workspaces", { method: "POST", body: JSON.stringify(data) });
}

export function updateWorkspace(id: string, data: Partial<Workspace>): Promise<{ workspace: Workspace }> {
  return fetchApi(`/workspaces/${id}`, { method: "PUT", body: JSON.stringify(data) });
}

export function switchWorkspace(id: string): Promise<{ activeId: string; workspace: Workspace }> {
  return fetchApi(`/workspaces/${id}/switch`, { method: "POST" });
}

export function deleteWorkspace(id: string): Promise<{ deleted: boolean; activeId: string | null }> {
  return fetchApi(`/workspaces/${id}`, { method: "DELETE" });
}

// ─── Admin ─────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number;
  totalLeads: number;
  totalRuns: number;
  adminEmail: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  lastSignIn: string | null;
  leadCount: number;
  onboardingCompleted: boolean;
  isAdmin: boolean;
}

export function getAdminStats(): Promise<{ stats: AdminStats }> {
  return fetchApi("/admin/stats");
}

export function getAdminUsers(): Promise<{ users: AdminUser[] }> {
  return fetchApi("/admin/users");
}
