import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { KanbanBoard } from "../components/kanban-board";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { useLang } from "../lib/lang-context";
import type { Lead } from "../lib/types";
import { getLeads, runAgentPipeline, getAgentRun } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { useCompletionSound } from "../lib/hooks/use-completion-sound";
import { dispatchNotification } from "../lib/hooks/use-notifications";
import { Zap, Activity, RefreshCw } from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

const STATUS_BADGES = [
  { key: "discovered", color: "#9CA3AF" },
  { key: "analyzing",  color: "#FBBF24" },
  { key: "analyzed",   color: "#C084FC" },
  { key: "contacting", color: "#60A5FA" },
  { key: "responded",  color: "#F97316" },
  { key: "qualified",  color: "#A78BFA" },
  { key: "won",        color: "#34D399" },
  { key: "lost",       color: "#F87171" },
] as const;

export default function PipelinePage() {
  const { t }   = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery]           = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [lang, setLang]             = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");
  const [running, setRunning]       = useState(false);

  const { play: playChime } = useCompletionSound();
  const activeRunsRef  = useRef<Map<string, string>>(new Map());
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
              query: q,
              leadsFound: run.leadsFound ?? 0,
              emailsDrafted: run.emailsDrafted ?? 0,
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("FindX — Pipeline complete ✨", {
                body: `Found ${run.leadsFound ?? 0} leads for "${q}"`,
                icon: "/favicon.svg",
              });
            }
          } else if (run.status === "failed") {
            activeRunsRef.current.delete(runId);
            refresh();
            await dispatchNotification({
              type: "pipeline_failed",
              title: "Pipeline failed",
              body: `Run for "${q}" encountered an error. ${run.error ?? ""}`.trim(),
              query: q,
            });
          }
        } catch { /* network blip */ }
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
      refresh();
      activeRunsRef.current.set(result.runId, savedQuery);
      startPollInterval();
    } catch {
      /* error handled by fetchApi */
    } finally {
      setRunning(false);
    }
  }

  const statusCounts: Record<string, number> = {};
  leads.forEach((l) => { statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1; });

  const runBar = (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleRun()}
        placeholder={t.pipeline.placeholder}
        className="input text-[12px] py-1.5 w-56"
      />
      <select
        value={maxResults}
        onChange={(e) => setMaxResults(Number(e.target.value))}
        className="input text-[12px] py-1.5 w-20"
      >
        {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as "ar" | "en" | "nl" | "fr" | "es" | "de")}
        className="input text-[12px] py-1.5 w-28"
      >
        <option value="ar">🇸🇦 {t.agents.arabic}</option>
        <option value="en">🇬🇧 {t.agents.english}</option>
        <option value="nl">🇳🇱 {t.agents.dutch}</option>
        <option value="fr">🇫🇷 {t.agents.french}</option>
        <option value="es">🇪🇸 {t.agents.spanish}</option>
        <option value="de">🇩🇪 {t.agents.german}</option>
      </select>
      <button
        onClick={handleRun}
        disabled={running || !query.trim()}
        className="btn btn-primary text-[12px] px-3 py-1.5 gap-1.5 font-semibold"
      >
        {running
          ? <Activity className="w-3.5 h-3.5 animate-pulse" />
          : <Zap className="w-3.5 h-3.5" strokeWidth={2} />}
        {running ? t.pipeline.running : t.pipeline.runPipeline}
      </button>
      <button
        onClick={refresh}
        className="btn btn-ghost px-2 py-1.5"
        title={t.pipeline.refresh}
      >
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <PageShell title={t.pipeline.title} subtitle={`${leads.length} leads`} actions={runBar}>

      {/* ── Status badges ─────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="flex flex-wrap gap-2 mb-6"
      >
        {STATUS_BADGES.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold"
            style={{
              background: `${s.color}15`,
              color: s.color,
              border: `1px solid ${s.color}28`,
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
              style={{ background: s.color, boxShadow: `0 0 4px ${s.color}` }}
            />
            {t.leads.status[s.key]}
            <span
              className="font-bold tabular-nums"
              style={{ color: s.color }}
            >
              {statusCounts[s.key] ?? 0}
            </span>
          </span>
        ))}
      </motion.div>

      {/* ── Board / empty state ───────────────────────────────── */}
      {leads.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{
            border: "2px dashed var(--glass-border-strong)",
            background: "var(--glass-raised)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(251,191,36,0.10)", border: "1px solid rgba(251,191,36,0.20)" }}
          >
            <Zap className="w-7 h-7" style={{ color: "#FBBF24", opacity: 0.6 }} strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
            {t.pipeline.noLeads}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-subtle)" }}>
            {t.pipeline.noLeadsHint}
          </p>
        </motion.div>
      ) : (
        <KanbanBoard
          leads={leads}
          onSelectLead={(l: Lead) => setSelectedId(l.id)}
          onLeadMoved={refresh}
        />
      )}

      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}
