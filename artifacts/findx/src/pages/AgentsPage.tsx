import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { AgentRunHistory } from "../components/agent-run-history";
import { useLang } from "../lib/lang-context";
import { getAgents, runAgentPipeline, getAgentRuns } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { usePolling } from "../lib/hooks/use-polling";
import type { Agent } from "../lib/types";
import { Zap, Activity, CheckCircle2, Search, BarChart3, Mail, Bot } from "lucide-react";

const AGENT_ICONS: Record<string, typeof Bot> = {
  discovery: Search,
  analysis:  BarChart3,
  outreach:  Mail,
};

function AgentCard({ agent }: { agent: Agent }) {
  const { t } = useLang();
  const Icon = AGENT_ICONS[agent.name] ?? Bot;

  return (
    <div className="card p-5 card-hover">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "var(--brand-subtle)" }}
        >
          <Icon className="w-4.5 h-4.5" style={{ color: "var(--brand)" }} />
        </div>
        <span
          className="badge text-[10px]"
          style={{
            background: "var(--color-success-bg)",
            color: "var(--color-success)",
            border: "1px solid rgba(5,150,105,0.2)",
          }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          {t.agents.active}
        </span>
      </div>
      <h3 className="font-semibold text-sm mb-1" style={{ color: "var(--text)" }}>{agent.displayName}</h3>
      <p className="text-xs leading-relaxed clamp-2" style={{ color: "var(--text-muted)" }}>{agent.description}</p>
      <div
        className="flex items-center justify-between mt-4 pt-3 text-[10px]"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-subtle)" }}
      >
        <span>{t.agents.model}: {agent.model?.split("/").pop()?.split(":")[0] ?? "—"}</span>
        <span>{t.agents.step} {agent.pipelineOrder}</span>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [emailLang, setEmailLang] = useState<"nl" | "en">("nl");
  const [starting, setStarting] = useState(false);

  const { data: agentsData } = useRealtimeData(() => getAgents(), ["agents"], 60_000);
  const { data: runsData, refresh } = usePolling(() => getAgentRuns(), 8_000);

  const agents = (agentsData?.agents ?? []).filter((a) => a.isActive).sort((a, b) => a.pipelineOrder - b.pipelineOrder);
  const runs = runsData?.runs ?? [];
  const activeRun = runs.find((r) => r.status === "running" || r.status === "queued");

  async function handleRun() {
    if (!query.trim()) return;
    setStarting(true);
    try { await runAgentPipeline({ query: query.trim(), maxResults, language: emailLang }); setQuery(""); refresh(); }
    catch {} finally { setStarting(false); }
  }

  return (
    <PageShell title={t.agents.title} subtitle={t.agents.subtitle}>
      {/* Live banner */}
      {activeRun && (
        <div
          className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl animate-fade-in"
          style={{ background: "var(--color-info-bg)", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <Activity className="w-4 h-4 animate-pulse" style={{ color: "var(--color-info)" }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--color-info)" }}>{t.agents.liveBanner}</p>
            <p className="text-xs truncate" style={{ color: "var(--color-info)" }}>"{activeRun.query}"</p>
          </div>
          <span
            className="badge text-[10px] animate-pulse"
            style={{ background: "var(--color-info)", color: "#fff" }}
          >
            LIVE
          </span>
        </div>
      )}

      {/* Run form */}
      <div className="card p-5 mb-7">
        <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
          {t.agents.runPipeline}
        </h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRun()}
            placeholder={t.agents.placeholder}
            className="input"
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: "var(--text-muted)" }}>{t.agents.maxResults}:</label>
              <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="input py-1.5 w-20 text-xs">
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: "var(--text-muted)" }}>{t.agents.emailLang}:</label>
              <select value={emailLang} onChange={(e) => setEmailLang(e.target.value as "nl" | "en")} className="input py-1.5 w-28 text-xs">
                <option value="nl">🇳🇱 {t.agents.dutch}</option>
                <option value="en">🇬🇧 {t.agents.english}</option>
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={handleRun}
              disabled={starting || !query.trim()}
              className="btn btn-primary text-sm px-5 py-2 gap-2"
            >
              {starting ? <Activity className="w-4 h-4 animate-pulse" /> : <Zap className="w-4 h-4" />}
              {starting ? t.agents.starting : t.agents.runPipeline}
            </button>
          </div>
        </div>
      </div>

      {/* Agent cards */}
      {agents.length > 0 && (
        <div className="mb-7">
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
            {t.agents.activeAgents}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent: Agent) => <AgentCard key={agent.id} agent={agent} />)}
          </div>
        </div>
      )}

      {/* Run history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {t.agents.pipelineRuns}
          </h2>
          <span className="text-xs" style={{ color: "var(--text-subtle)" }}>{runs.length} total</span>
        </div>
        {runs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{ border: "2px dashed var(--border)", background: "var(--bg-subtle)" }}
          >
            <Bot className="w-10 h-10 mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{t.agents.noRuns}</p>
            <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>{t.agents.noRunsHint}</p>
          </div>
        ) : (
          <AgentRunHistory runs={runs} onRunSelect={() => {}} />
        )}
      </div>
    </PageShell>
  );
}
