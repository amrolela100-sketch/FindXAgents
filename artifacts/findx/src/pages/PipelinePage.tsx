import { useState, useRef, useEffect } from "react";
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

export default function PipelinePage() {
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [lang, setLang] = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");
  const [running, setRunning] = useState(false);

  const { play: playChime } = useCompletionSound();
  const activeRunsRef = useRef<Map<string, string>>(new Map());
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
              title: "Pipeline complete \u2728",
              body: `Found ${run.leadsFound ?? 0} leads \u00b7 ${run.emailsDrafted ?? 0} emails drafted for "${q}"`,
              query: q,
              leadsFound: run.leadsFound ?? 0,
              emailsDrafted: run.emailsDrafted ?? 0,
            });
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification("FindX \u2014 Pipeline complete \u2728", {
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
      // error toast already shown by fetchApi
    } finally {
      setRunning(false);
    }
  }

  const statusCounts: Record<string, number> = {};
  leads.forEach((l) => { statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1; });

  const STATUS_BADGES = [
    { key: "discovered", label: t.leads.status.discovered, color: "#6B7280" },
    { key: "analyzing",  label: t.leads.status.analyzing,  color: "#D97706" },
    { key: "analyzed",   label: t.leads.status.analyzed,   color: "#6366F1" },
    { key: "contacting", label: t.leads.status.contacting, color: "#2563EB" },
    { key: "responded",  label: t.leads.status.responded,  color: "#F59E0B" },
    { key: "qualified",  label: t.leads.status.qualified,  color: "#9333EA" },
    { key: "won",        label: t.leads.status.won,        color: "#059669" },
    { key: "lost",       label: t.leads.status.lost,       color: "#DC2626" },
  ];

  const runBar = (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleRun()}
        placeholder={t.pipeline.placeholder}
        className="input text-xs py-1.5 w-56"
      />
      <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="input text-xs py-1.5 w-20">
        {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select value={lang} onChange={(e) => setLang(e.target.value as "ar" | "en" | "nl" | "fr" | "es" | "de")} className="input text-xs py-1.5 w-28">
        <option value="ar">\u{1f1f8}\u{1f1e6} {t.agents.arabic}</option>
        <option value="en">\u{1f1ec}\u{1f1e7} {t.agents.english}</option>
        <option value="nl">\u{1f1f3}\u{1f1f1} {t.agents.dutch}</option>
        <option value="fr">\u{1f1eb}\u{1f1f7} {t.agents.french}</option>
        <option value="es">\u{1f1ea}\u{1f1f8} {t.agents.spanish}</option>
        <option value="de">\u{1f1e9}\u{1f1ea} {t.agents.german}</option>
      </select>
      <button onClick={handleRun} disabled={running || !query.trim()} className="btn btn-primary text-xs px-3 py-1.5 gap-1.5">
        {running ? <Activity className="w-3.5 h-3.5 animate-pulse" /> : <Zap className="w-3.5 h-3.5" />}
        {running ? t.pipeline.running : t.pipeline.runPipeline}
      </button>
      <button onClick={refresh} className="btn btn-ghost px-2 py-1.5" title={t.pipeline.refresh}>
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <PageShell title={t.pipeline.title} subtitle={`${leads.length} leads`} actions={runBar}>
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_BADGES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{ background: `${s.color}18`, color: s.color, border: `1px solid ${s.color}30` }}>
            {s.label}
            <span className="font-bold">{statusCounts[s.key] ?? 0}</span>
          </span>
        ))}
      </div>
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "2px dashed var(--border)", background: "var(--bg-subtle)" }}>
          <Zap className="w-10 h-10 mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{t.pipeline.noLeads}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>{t.pipeline.noLeadsHint}</p>
        </div>
      ) : (
        <KanbanBoard leads={leads} onSelectLead={(l: Lead) => setSelectedId(l.id)} onLeadMoved={refresh} />
      )}
      <LeadDetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} onLeadUpdated={refresh} />
    </PageShell>
  );
}
