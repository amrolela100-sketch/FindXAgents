import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { KanbanBoard } from "../components/kanban-board";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { useLang } from "../lib/lang-context";
import type { Lead } from "../lib/types";
import { getLeads, runAgentPipeline, getAgentRun, toastError } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { useCompletionSound } from "../lib/hooks/use-completion-sound";
import { dispatchNotification } from "../lib/hooks/use-notifications";
import {
  Zap, Activity, RefreshCw, Search, Languages, Hash,
  Play, TrendingUp, Users, CheckCircle2, Star, Filter,
  GitBranch, Circle, ArrowUpRight, SlidersHorizontal
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 120, damping: 22 };
const FADE_UP = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...SPRING, delay: i * 0.05 },
  }),
};

const STATUS_META = [
  { key: "discovered", label: "New",       color: "#94A3B8", icon: Circle },
  { key: "analyzing",  label: "Analyzing", color: "#FBBF24", icon: Activity },
  { key: "analyzed",   label: "Analyzed",  color: "#C084FC", icon: Star },
  { key: "contacting", label: "Contacted", color: "#60A5FA", icon: ArrowUpRight },
  { key: "responded",  label: "Responded", color: "#F97316", icon: TrendingUp },
  { key: "qualified",  label: "Qualified", color: "#A78BFA", icon: CheckCircle2 },
  { key: "won",        label: "Won",       color: "#34D399", icon: Star },
  { key: "lost",       label: "Lost",      color: "#F87171", icon: Circle },
] as const;

// ─── Status Chip ─────────────────────────────────────────────────────────────

function StatusChip({
  label,
  color,
  count,
  icon: Icon,
}: {
  label: string;
  color: string;
  count: number;
  icon: typeof Circle;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -1 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-default select-none"
      style={{
        background: `${color}12`,
        border: `1px solid ${color}25`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
        style={{ background: color, boxShadow: `0 0 5px ${color}` }}
      />
      <span className="text-[12px] font-medium" style={{ color }}>
        {label}
      </span>
      <span
        className="text-[11px] font-bold tabular-nums px-1.5 py-0 rounded-full"
        style={{ background: `${color}20`, color }}
      >
        {count}
      </span>
    </motion.div>
  );
}

// ─── Pipeline Summary Card ────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  accent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent: string;
  icon: typeof Zap;
}) {
  return (
    <div
      className="glass-card rounded-2xl p-4 flex items-center gap-3"
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-[11px] font-medium" style={{ color: "var(--text-subtle)" }}>{label}</p>
        <p className="text-[18px] font-bold leading-tight" style={{ color: "var(--text)" }}>{value}</p>
        {sub && <p className="text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PipelinePage() {
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery]           = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [lang, setLang]             = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");
  const [running, setRunning]       = useState(false);
  const [showForm, setShowForm]     = useState(false);

  const { play: playChime } = useCompletionSound();
  const activeRunsRef   = useRef<Map<string, string>>(new Map());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 500 }),
    ["leads", "pipeline"],
    20_000,
  );
  const leads = data?.leads ?? [];

  useEffect(() => {
    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, []);

  function startPollInterval() {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      if (activeRunsRef.current.size === 0) {
        clearInterval(pollIntervalRef.current!);
        pollIntervalRef.current = null;
        return;
      }
      for (const [runId, q] of Array.from(activeRunsRef.current.entries())) {
        try {
          const { run } = await getAgentRun(runId);
          if (!run) { activeRunsRef.current.delete(runId); continue; }
          if (run.status === "completed") {
            activeRunsRef.current.delete(runId);
            refresh();
            playChime();
            await dispatchNotification({
              type: "pipeline_complete",
              title: "Pipeline complete ✨",
              body: `Found ${run.leadsFound ?? 0} leads · ${run.emailsDrafted ?? 0} emails drafted for "${q}"`,
              query: q, leadsFound: run.leadsFound ?? 0, emailsDrafted: run.emailsDrafted ?? 0,
            });
          } else if (run.status === "failed") {
            activeRunsRef.current.delete(runId);
            refresh();
          }
        } catch (err) {
          // Log transient poll errors — don't toast since this runs every 4s
          console.warn("[pipeline poll] error:", err instanceof Error ? err.message : err);
        }
      }
    }, 4_000);
  }

  async function handleRun() {
    if (!query.trim()) return;
    setRunning(true);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
    try {
      const savedQuery = query.trim();
      const result = await runAgentPipeline({ query: savedQuery, maxResults, language: lang });
      setQuery("");
      setShowForm(false);
      refresh();
      activeRunsRef.current.set(result.runId, savedQuery);
      startPollInterval();
    } catch (err) {
      toastError(err, "Failed to start pipeline run");
    } finally {
      setRunning(false);
    }
  }

  // Compute counts
  const statusCounts: Record<string, number> = {};
  leads.forEach((l) => { statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1; });

  const wonCount    = statusCounts["won"] ?? 0;
  const analyzedCount = statusCounts["analyzed"] ?? 0;
  const contactedCount = statusCounts["contacting"] ?? 0;
  const convRate    = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  // Actions slot in PageShell top bar
  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={refresh}
        className="btn btn-ghost px-2.5 py-2"
        title={t.pipeline.refresh}
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={() => setShowForm((v) => !v)}
        className={`btn gap-2 px-4 py-2 text-[12px] font-semibold ${showForm ? "btn-secondary" : "btn-primary"}`}
      >
        <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
        {showForm ? "Close" : t.pipeline.runPipeline}
      </button>
    </div>
  );

  return (
    <PageShell title={t.pipeline.title} subtitle={`${leads.length} leads`} actions={headerActions}>

      {/* ── Summary Cards ────────────────────────────────────── */}
      <motion.div
        custom={0}
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5"
      >
        <SummaryCard icon={Users}        label="Total Leads"  value={leads.length}     accent="#60A5FA" />
        <SummaryCard icon={Star}         label="Analyzed"     value={analyzedCount}    accent="#C084FC" />
        <SummaryCard icon={ArrowUpRight} label="Contacted"    value={contactedCount}   accent="#F97316" />
        <SummaryCard icon={TrendingUp}   label="Conversion"   value={`${convRate}%`}   accent="#34D399" sub={`${wonCount} won`} />
      </motion.div>

      {/* ── Run Pipeline Form ────────────────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden mb-5"
          >
            <div className="glass-card rounded-2xl overflow-hidden">
              <div
                className="flex items-center gap-2.5 px-5 py-3.5"
                style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}
              >
                <GitBranch className="w-4 h-4" style={{ color: "var(--brand)" }} strokeWidth={2} />
                <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                  Launch AI Pipeline
                </p>
                <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                  · Discovery → Analysis → Outreach
                </p>
              </div>

              <div className="p-5 flex flex-col gap-3">
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
                    placeholder={t.pipeline.placeholder}
                    className="input pl-10 text-[13px]"
                    autoFocus
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
                  >
                    <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
                    <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                      Max
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

                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
                    style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
                  >
                    <Languages className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as typeof lang)}
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
                    disabled={running || !query.trim()}
                    className="btn btn-primary px-5 py-2 text-[13px] font-semibold gap-2"
                  >
                    {running ? (
                      <><Activity className="w-4 h-4 animate-spin" /> Running…</>
                    ) : (
                      <><Play className="w-4 h-4" strokeWidth={2.5} /> Run Pipeline</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Strip ─────────────────────────────────────── */}
      {leads.length > 0 && (
        <motion.div
          custom={1}
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          className="flex flex-wrap items-center gap-2 mb-5"
        >
          <div className="flex items-center gap-1.5 mr-1" style={{ color: "var(--text-subtle)" }}>
            <Filter className="w-3.5 h-3.5" strokeWidth={1.8} />
            <span className="text-[11px] font-medium">Status</span>
          </div>
          {STATUS_META.map((s) => (
            <StatusChip
              key={s.key}
              label={s.label}
              color={s.color}
              count={statusCounts[s.key] ?? 0}
              icon={s.icon}
            />
          ))}
        </motion.div>
      )}

      {/* ── Kanban Board / Empty ──────────────────────────────── */}
      <motion.div
        custom={2}
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
      >
        {leads.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-28 rounded-2xl"
            style={{
              border: "2px dashed var(--glass-border-strong)",
              background: "var(--glass-raised)",
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)" }}
            >
              <GitBranch className="w-8 h-8" style={{ color: "#FBBF24", opacity: 0.7 }} strokeWidth={1.5} />
            </motion.div>
            <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              {t.pipeline.noLeads}
            </p>
            <p className="text-[13px] mb-5" style={{ color: "var(--text-subtle)" }}>
              {t.pipeline.noLeadsHint}
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-primary px-5 py-2.5 text-[13px] font-semibold gap-2"
            >
              <Zap className="w-4 h-4" strokeWidth={2.5} />
              Launch Pipeline
            </button>
          </div>
        ) : (
          <KanbanBoard
            leads={leads}
            onSelectLead={(l: Lead) => setSelectedId(l.id)}
            onLeadMoved={refresh}
          />
        )}
      </motion.div>

      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}
