/**
 * Mobile API helpers — thin wrappers over lib/api.ts that:
 * 1. Unwrap { data: ... } shapes into plain objects
 * 2. Add paginated variants for lists
 * 3. Provide missing API stubs used by the design-system screens
 */

import {
  getDashboardStats as _getDashboardStats,
  getLeads as _getLeads,
  getLead as _getLead,
  getAgentRuns as _getAgentRuns,
  getAgentRun as _getAgentRun,
  getAgents as _getAgents,
  getRunLogs as _getRunLogs,
  triggerAgentRun as _triggerAgentRun,
  cancelAgentRun as _cancelAgentRun,
  updateOutreach as _updateOutreach,
  getSearchConfig,
  getResendConfig,
  type LeadListParams,
} from "./api";

import type {
  DashboardStats,
  Lead,
  Agent,
  AgentPipelineRun,
  AgentLog,
} from "./types";

// ── Dashboard ──────────────────────────────────────────────────────────────

export async function getDashboardStatsM(): Promise<DashboardStats> {
  const res = await _getDashboardStats();
  return (res as { stats: DashboardStats }).stats ?? (res as unknown as DashboardStats);
}

// ── Leads (paginated for infinite scroll) ─────────────────────────────────

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export async function getLeadsM(params?: LeadListParams): Promise<{ leads: Lead[]; total: number; page: number; pageSize: number }> {
  const res = await _getLeads(params);
  return res;
}

export async function getLeadM(id: string): Promise<Lead | null> {
  const res = await _getLead(id);
  if ("lead" in res) return (res as { lead: Lead | null }).lead;
  return res as unknown as Lead;
}

// ── Runs (paginated wrapper) ───────────────────────────────────────────────

export async function getAgentRunsM(params?: { page?: number; pageSize?: number }): Promise<{ runs: AgentPipelineRun[]; total: number; page: number; pageSize: number }> {
  const res = await _getAgentRuns();
  const allRuns: AgentPipelineRun[] = "runs" in (res as object)
    ? (res as { runs: AgentPipelineRun[] }).runs
    : (res as unknown as AgentPipelineRun[]);

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 15;
  const start = (page - 1) * pageSize;
  const paginated = allRuns.slice(start, start + pageSize);

  return { runs: paginated, total: allRuns.length, page, pageSize };
}

export async function getAgentRunM(id: string): Promise<(AgentPipelineRun & { leads?: Lead[] }) | null> {
  const res = await _getAgentRun(id);
  if ("run" in (res as object)) return (res as { run: (AgentPipelineRun & { leads?: Lead[] }) | null }).run;
  return res as unknown as AgentPipelineRun & { leads?: Lead[] };
}

export async function startAgentRun(query: string): Promise<AgentPipelineRun> {
  const res = await _triggerAgentRun(query);
  // May return { runId, status } or full AgentPipelineRun
  return res as unknown as AgentPipelineRun;
}

export async function cancelRunM(runId: string): Promise<void> {
  await _cancelAgentRun(runId);
}

// ── Agents ─────────────────────────────────────────────────────────────────

export async function getAgentsM(): Promise<Agent[]> {
  const res = await _getAgents();
  if ("agents" in (res as object)) return (res as { agents: Agent[] }).agents;
  return res as unknown as Agent[];
}

// ── Logs ──────────────────────────────────────────────────────────────────

export async function getAgentLogsM(runId: string): Promise<AgentLog[]> {
  const res = await _getRunLogs(runId);
  if ("logs" in (res as object)) return (res as { logs: AgentLog[] }).logs;
  return res as unknown as AgentLog[];
}

// ── Outreach helpers ───────────────────────────────────────────────────────

export async function approveDraftEmail(outreachId: string) {
  return _updateOutreach(outreachId, { status: "approved" });
}

export async function sendEmail(outreachId: string) {
  return _updateOutreach(outreachId, { status: "sent" });
}

// ── Workspaces (stub — backend endpoint may not exist yet) ─────────────────

export interface Workspace {
  id: string;
  name: string;
  role: string;
}

export async function getWorkspaces(): Promise<Workspace[]> {
  try {
    const { fetchApi } = await import("./api") as unknown as { fetchApi: unknown };
    return [] as Workspace[];
  } catch (err) {
    console.warn("[mobile] failed to load workspaces", err);
    return [];
  }
}

// ── API Keys helper ────────────────────────────────────────────────────────

export interface ApiKeysSummary {
  tavily: string | null;
  resend: string | null;
}

export async function getApiKeys(): Promise<ApiKeysSummary> {
  try {
    const [search, resend] = await Promise.all([getSearchConfig(), getResendConfig()]);
    return {
      tavily: search.configured ? "configured" : null,
      resend: resend.configured ? resend.fromEmail ?? "configured" : null,
    };
  } catch (err) {
    console.warn("[mobile] failed to load API key summary", err);
    return { tavily: null, resend: null };
  }
}

// ── Onboarding ─────────────────────────────────────────────────────────────

export async function markOnboardingComplete(): Promise<void> {
  // Store locally; server endpoint may not exist
  try {
    const AsyncStorage = await import("@react-native-async-storage/async-storage");
    await (AsyncStorage.default ?? AsyncStorage).setItem("onboarding_complete", "1");
  } catch (err) {
    console.warn("[mobile] failed to save onboarding status", err);
  }
}

export async function getOnboardingStatusM(): Promise<boolean> {
  try {
    const AsyncStorage = await import("@react-native-async-storage/async-storage");
    const val = await (AsyncStorage.default ?? AsyncStorage).getItem("onboarding_complete");
    return val === "1";
  } catch (err) {
    console.warn("[mobile] failed to read onboarding status", err);
    return false;
  }
}
