import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { AgentRunHistory } from "../components/agent-run-history";
import { useLang } from "../lib/lang-context";
import { getAgents, runAgentPipeline, getAgentRuns, toastError } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { usePolling } from "../lib/hooks/use-polling";
import type { Agent } from "../lib/types";
import {
  Zap, Activity, CheckCircle2, Search, BarChart3, Mail, Bot,
  Play, ChevronRight, Sparkles, Globe, Clock, TrendingUp,
  Languages, Hash, ArrowRight, Cpu, Network, Layers
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 120, damping: 22 };
const FADE_UP = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...SPRING, delay: i * 0.07 },
  }),
};

const AGENT_META: Record<string, {
  icon: typeof Bot;
  accent: string;
  gradient: string;
  bg: string;
  description: string;
}> = {
  discovery: {
    icon: Search,
    accent: "#60A5FA",
    gradient: "linear-gradient(135deg, #60A5FA22, #3B82F608)",
    bg: "rgba(96,165,250,0.10)",
    description: "Scans the web using Tavily to find real businesses matching your ICP. Filters out directories & aggregators.",
  },
  analysis: {
    icon: BarChart3,
    accent: "#FBBF24",
    gradient: "linear-gradient(135deg, #FBBF2422, #F59E0B08)",
    bg: "rgba(251,191,36,0.10)",
    description: "Visits every lead's website. Extracts emails, SSL, load speed, social links — grounds the AI score in real data.",
  },
  outreach: {
    icon: Mail,
    accent: "#34D399",
    gradient: "linear-gradient(135deg, #34D39922, #10B98108)",
    bg: "rgba(52,211,153,0.10)",
    description: "Writes hyper-personalised cold emails referencing verified facts from the scraped site. No hallucination.",
  },
};

// ─── Pipeline Step Indicator ─────────────────────────────────────────────────

function PipelineFlow({ agents }: { agents: Agent[] }) {
  return (
    <div className="flex items-center gap-0 flex-nowrap overflow-x-auto py-1">
      {agents.map((agent, i) => {
        const meta = AGENT_META[agent.name] ?? { accent: "#C084FC", icon: Bot };
        const Icon = meta.icon;
        return (
          <div key={agent.id} className="flex items-center gap-0 flex-shrink-0">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold"
              style={{
                background: `${meta.accent}15`,
                border: `1px solid ${meta.accent}30`,
                color: meta.accent,
              }}
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                style={{ background: meta.accent, color: "#000" }}
              >
                {i + 1}
              </span>
              <Icon className="w-3 h-3" strokeWidth={2} />
              <span className="capitalize">{agent.name}</span>
            </div>
            {i < agents.length - 1 && (
              <ArrowRight className="w-3.5 h-3.5 mx-1 flex-shrink-0" style={{ color: "var(--text-subtle)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Agent Card ──────────────────────────────────────────────────────────────

function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const meta = AGENT_META[agent.name] ?? {
    icon: Bot,
    accent: "#C084FC",
    gradient: "linear-gradient(135deg, #C084FC22, #A855F708)",
    bg: "rgba(192,132,252,0.10)",
    description: "AI agent handling pipeline tasks.",
  };
  const Icon = meta.icon;

  return (
    <motion.div
      custom={index}
      variants={FADE_UP}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="glass-card glass-card-hover rounded-2xl overflow-hidden flex flex-col cursor-default"
    >
      {/* Accent bar */}
      <div
        className="h-0.5 w-full"
        style={{ background: `linear-gradient(90deg, ${meta.accent}, transparent)` }}
      />

      <div className="p-5 flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: meta.bg,
              border: `1px solid ${meta.accent}28`,
              boxShadow: `0 0 16px ${meta.accent}20`,
            }}
          >
            <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: meta.accent }} />
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#34D399", boxShadow: "0 0 6px #34D399" }}
            />
            <span className="text-[10px] font-semibold" style={{ color: "#34D399" }}>
              Active
            </span>
          </div>
        </div>

        {/* Title & step */}
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[14px] tracking-tight" style={{ color: "var(--text)" }}>
              {agent.displayName}
            </h3>
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: `${meta.accent}18`, color: meta.accent }}
            >
              #{agent.pipelineOrder}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {meta.description}
          </p>
        </div>

        <div className="flex-1" />

        {/* Footer */}
        <div
          className="flex items-center justify-between mt-4 pt-3 text-[11px]"
          style={{ borderTop: "1px solid var(--glass-border)" }}
        >
          <div className="flex items-center gap-1.5" style={{ color: "var(--text-subtle)" }}>
            <Cpu className="w-3 h-3" strokeWidth={1.5} />
            <span className="font-mono">
              {agent.model?.split("/").pop()?.split(":")[0] ?? "—"}
            </span>
          </div>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{
              background: "var(--glass-raised)",
              color: "var(--text-muted)",
              border: "1px solid var(--glass-border)",
            }}
          >
            Step {agent.pipelineOrder} of 3
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stat Pill ───────────────────────────────────────────────────────────────

function StatPill({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Zap;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
      style={{
        background: `${accent}10`,
        border: `1px solid ${accent}22`,
      }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} strokeWidth={1.8} />
      <div>
        <p className="text-[10px] font-medium" style={{ color: `${accent}aa` }}>{label}</p>
        <p className="text-[13px] font-bold leading-none mt-0.5" style={{ color: accent }}>{value}</p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { t } = useLang();
  const [query, setQuery]           = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [emailLang, setEmailLang]   = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");
  const [starting, setStarting]     = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const { data: agentsData } = useRealtimeData(() => getAgents(), ["agents"], 60_000);
  const { data: runsData, refresh } = usePolling(() => getAgentRuns(), 8_000);

  // ── Fallback: show the 3 pipeline agents even if DB hasn't been seeded yet ──
  const FALLBACK_AGENTS: Agent[] = [
    {
      id: "fallback-discovery",
      name: "discovery",
      displayName: "Discovery Agent",
      description: "Scans the web using Tavily to find real businesses matching your ICP.",
      role: "discovery",
      icon: "Search",
      model: "google/gemini-2.5-flash",
      maxIterations: 15,
      maxTokens: 4096,
      temperature: null,
      identityMd: "",
      soulMd: "",
      toolsMd: "",
      systemPrompt: "",
      toolNames: ["web_search", "save_lead"],
      pipelineOrder: 1,
      isActive: true,
      skills: [],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "fallback-analysis",
      name: "analysis",
      displayName: "Analysis Agent",
      description: "Visits every lead's website, extracts emails, SSL status, load speed & scores.",
      role: "analysis",
      icon: "BarChart3",
      model: "google/gemini-2.5-flash",
      maxIterations: 20,
      maxTokens: 8192,
      temperature: null,
      identityMd: "",
      soulMd: "",
      toolsMd: "",
      systemPrompt: "",
      toolNames: ["scrape_page", "check_ssl", "extract_emails"],
      pipelineOrder: 2,
      isActive: true,
      skills: [],
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "fallback-outreach",
      name: "outreach",
      displayName: "Outreach Agent",
      description: "Writes hyper-personalised cold emails referencing verified facts from each site.",
      role: "outreach",
      icon: "Mail",
      model: "google/gemini-2.5-flash",
      maxIterations: 10,
      maxTokens: 4096,
      temperature: null,
      identityMd: "",
      soulMd: "",
      toolsMd: "",
      systemPrompt: "",
      toolNames: ["web_search"],
      pipelineOrder: 3,
      isActive: true,
      skills: [],
      createdAt: "",
      updatedAt: "",
    },
  ];

  const dbAgents = (agentsData?.agents ?? [])
    .filter((a) => a.isActive)
    .sort((a, b) => a.pipelineOrder - b.pipelineOrder);

  // Use DB agents if we have the full pipeline (discovery + analysis + outreach).
  // Otherwise fall back to the static definitions so the UI is never empty.
  const hasFullPipeline =
    dbAgents.some((a) => a.name === "discovery") &&
    dbAgents.some((a) => a.name === "analysis") &&
    dbAgents.some((a) => a.name === "outreach");

  const agents = hasFullPipeline ? dbAgents : FALLBACK_AGENTS;
  const runs      = runsData?.runs ?? [];
  const activeRun = runs.find((r) => r.status === "running" || r.status === "queued");
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r) => r.status === "completed").length;
  const totalLeads = runs.reduce((s, r) => s + (r.leadsFound ?? 0), 0);

  async function handleRun() {
    if (!query.trim()) return;
    setStarting(true);
    try {
      await runAgentPipeline({ query: query.trim(), maxResults, language: emailLang });
      setQuery("");
      refresh();
    } catch (err) {
      toastError(err, "Failed to start pipeline run");
    } finally {
      setStarting(false);
    }
  }

  return (
    <PageShell title={t.agents.title} subtitle={t.agents.subtitle}>

      {/* ── Live Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeRun && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={SPRING}
            className="overflow-hidden mb-5"
          >
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: "rgba(96,165,250,0.08)",
                border: "1px solid rgba(96,165,250,0.20)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(96,165,250,0.15)" }}
                >
                  <Activity className="w-4 h-4 animate-pulse" style={{ color: "#60A5FA" }} />
                </div>
                <span
                  className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2"
                  style={{
                    background: "#60A5FA",
                    borderColor: "var(--bg)",
                    boxShadow: "0 0 6px #60A5FA",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "#60A5FA" }}>
                  Pipeline running…
                </p>
                <p className="text-[11px] truncate font-mono mt-0.5" style={{ color: "#60A5FA", opacity: 0.7 }}>
                  "{activeRun.query}"
                </p>
              </div>
              <span
                className="text-[10px] px-2.5 py-1 rounded-full font-bold animate-pulse"
                style={{ background: "#60A5FA22", color: "#60A5FA", border: "1px solid #60A5FA44" }}
              >
                LIVE
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stats Row ────────────────────────────────────────── */}
      {totalRuns > 0 && (
        <motion.div
          custom={0}
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap gap-3 mb-6"
        >
          <StatPill icon={Network}    label="Total Runs"    value={totalRuns}       accent="#C084FC" />
          <StatPill icon={CheckCircle2} label="Completed"  value={completedRuns}   accent="#34D399" />
          <StatPill icon={TrendingUp} label="Leads Found"  value={totalLeads}      accent="#FBBF24" />
          <StatPill icon={Globe}      label="Agents Active" value={agents.length}  accent="#60A5FA" />
        </motion.div>
      )}

      {/* ── Run Pipeline Card ────────────────────────────────── */}
      <motion.div
        custom={1}
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        className="glass-card rounded-2xl overflow-hidden mb-7"
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}
            >
              <Zap className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                {t.agents.runPipeline}
              </p>
              <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                Discover → Analyze → Outreach
              </p>
            </div>
          </div>
          <PipelineFlow agents={agents} />
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Search input */}
          <div className="relative">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: "var(--text-subtle)" }}
              strokeWidth={1.8}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRun()}
              placeholder={t.agents.placeholder}
              className="input pl-10 text-[13px]"
            />
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Max results */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
            >
              <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
              <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Max results
              </label>
              <select
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
                className="bg-transparent text-[12px] font-semibold outline-none cursor-pointer"
                style={{ color: "var(--text)" }}
              >
                {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>

            {/* Language */}
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
              style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
            >
              <Languages className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
              <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                Email lang
              </label>
              <select
                value={emailLang}
                onChange={(e) => setEmailLang(e.target.value as typeof emailLang)}
                className="bg-transparent text-[12px] font-semibold outline-none cursor-pointer"
                style={{ color: "var(--text)" }}
              >
                <option value="ar">🇸🇦 Arabic</option>
                <option value="en">🇬🇧 English</option>
                <option value="nl">🇳🇱 Dutch</option>
                <option value="fr">🇫🇷 French</option>
                <option value="es">🇪🇸 Spanish</option>
                <option value="de">🇩🇪 German</option>
              </select>
            </div>

            <div className="flex-1" />

            <button
              onClick={handleRun}
              disabled={starting || !query.trim()}
              className="btn btn-primary px-5 py-2.5 text-[13px] font-semibold gap-2"
            >
              {starting ? (
                <>
                  <Activity className="w-4 h-4 animate-spin" />
                  Starting…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" strokeWidth={2.5} />
                  Run Pipeline
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── Agent Cards ──────────────────────────────────────── */}
      <motion.div
        custom={2}
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        className="mb-7"
      >
        <div className="flex items-center justify-between mb-4">
          <h2
            className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <Layers className="w-3.5 h-3.5" strokeWidth={2} />
            {t.agents.activeAgents}
          </h2>
          <span
            className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
            style={{
              background: "var(--glass-raised)",
              color: "var(--text-subtle)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {agents.length} agents
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agents.map((agent, i) => (
            <AgentCard key={agent.id} agent={agent} index={i} />
          ))}
        </div>
      </motion.div>

      {/* ── Pipeline Run History ─────────────────────────────── */}
      <motion.div
        custom={3}
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
      >
        <button
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center justify-between w-full mb-4 group"
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2"
            style={{ color: "var(--text-subtle)" }}
          >
            <Clock className="w-3.5 h-3.5" strokeWidth={2} />
            {t.agents.pipelineRuns}
          </h2>
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] px-2.5 py-0.5 rounded-full font-medium"
              style={{
                background: "var(--glass-raised)",
                color: "var(--text-subtle)",
                border: "1px solid var(--glass-border)",
              }}
            >
              {runs.length} total
            </span>
            <ChevronRight
              className="w-4 h-4 transition-transform"
              style={{
                color: "var(--text-subtle)",
                transform: showHistory ? "rotate(90deg)" : "rotate(0deg)",
              }}
              strokeWidth={1.8}
            />
          </div>
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
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
                    style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.16)" }}
                  >
                    <Sparkles className="w-7 h-7" style={{ color: "#C084FC", opacity: 0.5 }} strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>
                    {t.agents.noRuns}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: "var(--text-subtle)" }}>
                    {t.agents.noRunsHint}
                  </p>
                </div>
              ) : (
                <AgentRunHistory />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </PageShell>
  );
}
