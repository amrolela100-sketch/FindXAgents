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

  // Track active run IDs so we can poll them for completion
  const activeRunsRef = useRef<Map<string, string>>(new Map()); // runId → query
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 500 }),
    ["leads", "pipeline"],
    20_000,
  );
  const leads = data?.leads ?? [];

  // Poll active runs every 4 seconds until complete/failed
  useEffect(() => {
    function startPolling() {
      if (pollIntervalRef.current) return;
      pollIntervalRef.current = setInterval(async () => {
        if (activeRunsRef.current.size === 0) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          return;
        }

        const entries = Array.from(activeRunsRef.current.entries());
        for (const [runId, savedQuery] of entries) {
          try {
            const { run } = await getAgentRun(runId);
            if (!run) {
              activeRunsRef.current.delete(runId);
              continue;
            }

            if (run.status === "completed") {
              activeRunsRef.current.delete(runId);
              refresh();

              // 🔔 Play completion chime
              playChime();

              // 🔔 Dispatch in-app notification
              dispatchNotification({
                id: runId,
                type: "pipeline_complete",
                title: "Pipeline complete ✨",
                body: `Found ${run.leadsFound ?? 0} leads · ${run.emailsDrafted ?? 0} emails drafted for "${savedQuery}"`,
                query: savedQuery,
                leadsFound: run.leadsFound ?? 0,
                emailsDrafted: run.emailsDrafted ?? 0,
                createdAt: new Date().toISOString(),
              });

              // 🔔 Browser notification (if permission granted)
              if (Notification.permission === "granted") {
                new Notification("FindX — Pipeline complete ✨", {
                  body: `Found ${run.leadsFound ?? 0} leads for "${savedQuery}"`,
                  icon: "/favicon.svg",
                });
              }

            } else if (run.status === "failed") {
              activeRunsRef.current.delete(runId);
              refresh();

              dispatchNotification({
                id: runId,
                type: "pipeline_failed",
                title: "Pipeline failed",
                body: `Run for "${savedQuery}" encountered an error. ${run.error ?? ""}`.trim(),
                query: savedQuery,
                createdAt: new Date().toISOString(),
              });
            }
          } catch {
            // network blip — try again next tick
          }
        }
      }, 4_000);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleRun() {
    if (!query.trim()) return;
    setRunning(true);

    // Ask for browser notification permission on first run
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    try {
      const savedQuery = query.trim();
      const result = await runAgentPipeline({
        query: savedQuery,
        maxResults,
        language: lang,
      });
      setQuery("");
      refresh();

      // Register the run for polling
      activeRunsRef.current.set(result.runId, savedQuery);

      // Start the poll interval if not already running
      if (!pollIntervalRef.current) {
        pollIntervalRef.current = setInterval(async () => {
          if (activeRunsRef.current.size === 0) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            return;
          }
          const entries = Array.from(activeRunsRef.current.entries());
          for (const [runId, q] of entries) {
            try {
              const { run } = await getAgentRun(runId);
              if (!run) { activeRunsRef.current.delete(runId); continue; }

              if (run.status === "completed") {
                activeRunsRef.current.delete(runId);
                refresh();
                playChime();
                dispatchNotification({
                  id: runId,
                  type: "pipeline_complete",
                  title: "Pipeline complete ✨",
                  body: `Found ${run.leadsFound ?? 0} leads · ${run.emailsDrafted ?? 0} emails drafted for "${q}"`,
                  query: q,
                  leadsFound: run.leadsFound ?? 0,
                  emailsDrafted: run.emailsDrafted ?? 0,
                  createdAt: new Date().toISOString(),
                });
                if (Notification.permission === "granted") {
                  new Notification("FindX — Pipeline complete ✨", {
                    body: `Found ${run.leadsFound ?? 0} leads for "${q}"`,
                    icon: "/favicon.svg",
                  });
                }
              } else if (run.status === "failed") {
                activeRunsRef.current.delete(runId);
                refresh();
                dispatchNotification({
                  id: runId,
                  type: "pipeline_failed",
                  title: "Pipeline failed",
                  body: `Run for "${q}" encountered an error. ${run.error ?? ""}`.trim(),
                  query: q,
                  createdAt: new Date().toISOString(),
                });
              }
            } catch { /* network blip */ }
          }
        }, 4_000);
      }

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
      <select
        value={maxResults}
        onChange={(e) => setMaxResults(Number(e.target.value))}
        className="input text-xs py-1.5 w-20"
      >
        {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value as "ar" | "en" | "nl" | "fr" | "es" | "de")}
        className="input text-xs py-1.5 w-28"
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
        className="btn btn-primary text-xs px-3 py-1.5 gap-1.5"
      >
        {running
          ? <Activity className="w-3.5 h-3.5 animate-pulse" />
          : <Zap className="w-3.5 h-3.5" />}
        {running ? t.pipeline.running : t.pipeline.runPipeline}
      </button>
      <button onClick={refresh} className="btn btn-ghost px-2 py-1.5" title={t.pipeline.refresh}>
        <RefreshCw className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <PageShell title={t.pipeline.title} subtitle={`${leads.length} leads`} actions={runBar}>
      {/* Status summary */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_BADGES.map((s) => (
          <span
            key={s.key}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              background: `${s.color}18`,
              color: s.color,
              border: `1px solid ${s.color}30`,
            }}
          >
            {s.label}
            <span className="font-bold">{statusCounts[s.key] ?? 0}</span>
          </span>
        ))}
      </div>

      {/* Kanban */}
      {leads.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "2px dashed var(--border)", background: "var(--bg-subtle)" }}
        >
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
