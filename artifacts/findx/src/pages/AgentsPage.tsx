import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { AgentRunHistory } from "../components/agent-run-history";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { getAgents, runAgentPipeline, getAgentRuns } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { usePolling } from "../lib/hooks/use-polling";
import type { Agent } from "../lib/types";
import {
  Zap, Activity, CheckCircle2, XCircle, Clock, ChevronRight,
  Bot, Search, Mail, BarChart3
} from "lucide-react";

const AGENT_ICONS: Record<string, typeof Bot> = {
  discovery: Search,
  analysis: BarChart3,
  outreach: Mail,
};

export default function AgentsPage() {
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [language, setLanguage] = useState<"nl" | "en">("nl");
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data: agentsData } = useRealtimeData(() => getAgents(), ["agents"], 60_000);
  const { data: runsData, refresh: refreshRuns } = usePolling(() => getAgentRuns(), 10_000);

  const agents = agentsData?.agents ?? [];
  const runs = runsData?.runs ?? [];
  const activeRun = runs.find((r) => r.status === "running" || r.status === "queued");

  async function handleRun() {
    if (!query.trim()) return;
    setIsRunning(true);
    try {
      await runAgentPipeline({ query: query.trim(), maxResults, language });
      setQuery("");
      refreshRuns();
    } catch {
      // handled in api.ts
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <PageShell
      title="AI Agents"
      subtitle="Autonomous 3-agent pipeline: Discovery → Analysis → Outreach"
    >
      {/* Active Run Banner */}
      {activeRun && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="relative flex-shrink-0">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">Pipeline running</p>
            <p className="text-xs text-blue-600 truncate">"{activeRun.query}"</p>
          </div>
          <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full">LIVE</span>
        </div>
      )}

      {/* Run Pipeline */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 mb-8">
        <h2 className="font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-4">
          Run New Pipeline
        </h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
            placeholder='Search query — e.g. "IT consultancy Amsterdam" or "Marketing agencies Utrecht"'
            className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-on-surface-variant font-medium">Max results:</label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-on-surface-variant font-medium">Email language:</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as "nl" | "en")}
                className="px-3 py-1.5 bg-surface-container-low border border-outline-variant rounded-lg text-sm text-on-surface focus:outline-none"
              >
                <option value="nl">🇳🇱 Dutch</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={handleRun}
              disabled={isRunning || !query.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {isRunning ? (
                <>
                  <Activity className="w-4 h-4 animate-pulse" />
                  Starting...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      {agents.length > 0 && (
        <div className="mb-8">
          <h2 className="font-semibold text-sm text-on-surface-variant uppercase tracking-wider mb-4">
            Active Agents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents
              .filter((a) => a.isActive)
              .sort((a, b) => a.pipelineOrder - b.pipelineOrder)
              .map((agent: Agent) => {
                const Icon = AGENT_ICONS[agent.name] ?? Bot;
                return (
                  <div
                    key={agent.id}
                    className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 bg-primary-container/30 rounded-xl">
                        <Icon className="w-5 h-5 text-on-primary-container" />
                      </div>
                      <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Active
                      </span>
                    </div>
                    <h3 className="font-semibold text-on-surface mb-1">{agent.displayName}</h3>
                    <p className="text-xs text-on-surface-variant line-clamp-2">{agent.description}</p>
                    <div className="mt-3 pt-3 border-t border-outline-variant flex items-center justify-between">
                      <span className="text-xs text-on-surface-variant">Model: {agent.model?.split("/").pop()?.split(":")[0]}</span>
                      <span className="text-xs text-on-surface-variant">Step {agent.pipelineOrder}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Run History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm text-on-surface-variant uppercase tracking-wider">
            Pipeline Runs
          </h2>
          <span className="text-xs text-on-surface-variant">{runs.length} total</span>
        </div>
        {runs.length === 0 ? (
          <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant rounded-2xl">
            <Bot className="w-10 h-10 text-on-surface-variant mx-auto mb-3 opacity-40" />
            <p className="text-sm font-medium text-on-surface">No pipeline runs yet</p>
            <p className="text-xs text-on-surface-variant mt-1">
              Enter a query above and click "Run Pipeline" to start.
            </p>
          </div>
        ) : (
          <AgentRunHistory
            runs={runs}
            onRunSelect={(runId) => {
              // Handled in run history component
            }}
          />
        )}
      </div>

      <LeadDetailPanel
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={() => {}}
      />
    </PageShell>
  );
}
