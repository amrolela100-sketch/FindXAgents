import { useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { AgentRunHistory } from "../components/agent-run-history";
import { useLang } from "../lib/lang-context";
import { getAgents, runAgentPipeline, getAgentRuns } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { usePolling } from "../lib/hooks/use-polling";
import type { Agent } from "../lib/types";
import { Zap, Activity, CheckCircle2, Search, BarChart3, Mail, Bot } from "lucide-react";

const GLASS = {
  background: "var(--glass)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
} as const;

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

const AGENT_ICONS: Record<string, typeof Bot> = {
  discovery: Search,
  analysis:  BarChart3,
  outreach:  Mail,
};

const AGENT_ACCENTS: Record<string, string> = {
  discovery: "#60A5FA",
  analysis:  "#FBBF24",
  outreach:  "#34D399",
};

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const { t } = useLang();
  const Icon   = AGENT_ICONS[agent.name] ?? Bot;
  const accent = AGENT_ACCENTS[agent.name] ?? "#C084FC";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.06 }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px rgba(0,0,0,0.10), 0 0 0 1px var(--glass-border)` }}
      className="rounded-2xl p-5 flex flex-col cursor-default"
      style={GLASS}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${accent}18`,
            border: `1px solid ${accent}30`,
            boxShadow: `0 0 10px ${accent}30`,
          }}
        >
          <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: accent }} />
        </div>
        <span
          className="badge text-[10px]"
          style={{
            background: "rgba(16,185,129,0.12)",
            color: "#34D399",
            border: "1px solid rgba(16,185,129,0.25)",
          }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" />
          {t.agents.active}
        </span>
      </div>

      <h3 className="font-semibold text-[13.5px] mb-1 tracking-tight" style={{ color: "var(--text)" }}>
        {agent.displayName}
      </h3>
      <p className="text-[12px] leading-relaxed clamp-2 flex-1" style={{ color: "var(--text-muted)" }}>
        {agent.description}
      </p>

      <div
        className="flex items-center justify-between mt-4 pt-3 text-[11px]"
        style={{ borderTop: "1px solid var(--glass-border)", color: "var(--text-subtle)" }}
      >
        <span className="font-mono">{agent.model?.split("/").pop()?.split(":")[0] ?? "—"}</span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
          style={{ background: `${accent}15`, color: accent }}
        >
          Step {agent.pipelineOrder}
        </span>
      </div>
    </motion.div>
  );
}

export default function AgentsPage() {
  const { t } = useLang();
  const [query, setQuery]         = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [emailLang, setEmailLang] = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");
  const [starting, setStarting]   = useState(false);

  const { data: agentsData } = useRealtimeData(() => getAgents(), ["agents"], 60_000);
  const { data: runsData, refresh } = usePolling(() => getAgentRuns(), 8_000);

  const agents    = (agentsData?.agents ?? []).filter((a) => a.isActive).sort((a, b) => a.pipelineOrder - b.pipelineOrder);
  const runs      = runsData?.runs ?? [];
  const activeRun = runs.find((r) => r.status === "running" || r.status === "queued");

  async function handleRun() {
    if (!query.trim()) return;
    setStarting(true);
    try {
      await runAgentPipeline({ query: query.trim(), maxResults, language: emailLang });
      setQuery("");
      refresh();
    } catch {
      /* error handled by fetchApi */
    } finally {
      setStarting(false);
    }
  }

  return (
    <PageShell title={t.agents.title} subtitle={t.agents.subtitle}>

      {/* ── Active run banner ─────────────────────────────────── */}
      {activeRun && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
          style={{
            background: "rgba(96,165,250,0.10)",
            border: "1px solid rgba(96,165,250,0.22)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        >
          <div className="relative flex-shrink-0">
            <Activity className="w-4 h-4 animate-pulse" style={{ color: "#60A5FA" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-dot"
              style={{ background: "#60A5FA", color: "#60A5FA" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold" style={{ color: "#60A5FA" }}>
              {t.agents.liveBanner}
            </p>
            <p className="text-[12px] truncate font-mono" style={{ color: "#60A5FA", opacity: 0.75 }}>
              "{activeRun.query}"
            </p>
          </div>
          <span
            className="badge text-[10px] font-bold animate-pulse"
            style={{ background: "#60A5FA22", color: "#60A5FA", border: "1px solid #60A5FA44" }}
          >
            LIVE
          </span>
        </motion.div>
      )}

      {/* ── Run pipeline form ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="rounded-2xl p-5 mb-7"
        style={GLASS}
      >
        <h2
          className="text-[11px] font-semibold uppercase tracking-widest mb-4"
          style={{ color: "var(--text-muted)" }}
        >
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
              <label className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {t.agents.maxResults}:
              </label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="input py-1.5 w-20 text-[12px]"
              >
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                {t.agents.emailLang}:
              </label>
              <select
                value={emailLang}
                onChange={(e) => setEmailLang(e.target.value as typeof emailLang)}
                className="input py-1.5 w-32 text-[12px]"
              >
                <option value="ar">🇸🇦 {t.agents.arabic}</option>
                <option value="en">🇬🇧 {t.agents.english}</option>
                <option value="nl">🇳🇱 {t.agents.dutch}</option>
                <option value="fr">🇫🇷 {t.agents.french}</option>
                <option value="es">🇪🇸 {t.agents.spanish}</option>
                <option value="de">🇩🇪 {t.agents.german}</option>
              </select>
            </div>
            <div className="flex-1" />
            <button
              onClick={handleRun}
              disabled={starting || !query.trim()}
              className="btn btn-primary text-[13px] px-5 py-2 gap-2 font-semibold"
            >
              {starting
                ? <Activity className="w-4 h-4 animate-pulse" />
                : <Zap className="w-4 h-4" strokeWidth={2} />}
              {starting ? t.agents.starting : t.agents.runPipeline}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Agent cards ───────────────────────────────────────── */}
      {agents.length > 0 && (
        <div className="mb-7">
          <h2
            className="text-[11px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--text-muted)" }}
          >
            {t.agents.activeAgents}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {agents.map((agent: Agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ── Pipeline run history ──────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[11px] font-semibold uppercase tracking-widest"
            style={{ color: "var(--text-muted)" }}
          >
            {t.agents.pipelineRuns}
          </h2>
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            style={{ background: "var(--glass-raised)", color: "var(--text-subtle)", border: "1px solid var(--glass-border)" }}
          >
            {runs.length} total
          </span>
        </div>

        {runs.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-2xl"
            style={{
              border: "2px dashed var(--glass-border-strong)",
              background: "var(--glass-raised)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(192,132,252,0.10)", border: "1px solid rgba(192,132,252,0.20)" }}
            >
              <Bot className="w-7 h-7" style={{ color: "#C084FC", opacity: 0.6 }} strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
              {t.agents.noRuns}
            </p>
            <p className="text-[12px] mt-1" style={{ color: "var(--text-subtle)" }}>
              {t.agents.noRunsHint}
            </p>
          </div>
        ) : (
          <AgentRunHistory />
        )}
      </div>
    </PageShell>
  );
}
