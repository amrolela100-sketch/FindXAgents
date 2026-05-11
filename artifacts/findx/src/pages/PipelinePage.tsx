import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { KanbanBoard } from "../components/kanban-board";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import type { Lead } from "../lib/types";
import { getLeads, runAgentPipeline } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { Zap, RefreshCw, Activity } from "lucide-react";

export default function PipelinePage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 500 }),
    ["leads", "pipeline"],
    20_000
  );
  const leads = data?.leads ?? [];

  const statusCounts = {
    discovered: leads.filter((l) => l.status === "discovered").length,
    analyzing: leads.filter((l) => l.status === "analyzing").length,
    analyzed: leads.filter((l) => l.status === "analyzed").length,
    contacting: leads.filter((l) => l.status === "contacting").length,
    responded: leads.filter((l) => l.status === "responded").length,
    qualified: leads.filter((l) => l.status === "qualified").length,
    won: leads.filter((l) => l.status === "won").length,
    lost: leads.filter((l) => l.status === "lost").length,
  };

  async function handleRunPipeline() {
    if (!query.trim()) return;
    setIsRunning(true);
    try {
      await runAgentPipeline({ query, maxResults: 20, language: "nl" });
      setQuery("");
      // refresh will pick up changes via polling
    } catch {
      // handled in api.ts
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <PageShell
      title="Pipeline"
      subtitle={`${leads.length} leads across all stages`}
    >
      {/* Pipeline Summary Bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { label: "New", key: "discovered", color: "bg-slate-100 text-slate-700" },
          { label: "Analyzing", key: "analyzing", color: "bg-yellow-100 text-yellow-700" },
          { label: "Analyzed", key: "analyzed", color: "bg-indigo-100 text-indigo-700" },
          { label: "Contacted", key: "contacting", color: "bg-blue-100 text-blue-700" },
          { label: "Responded", key: "responded", color: "bg-amber-100 text-amber-700" },
          { label: "Qualified", key: "qualified", color: "bg-purple-100 text-purple-700" },
          { label: "Won", key: "won", color: "bg-emerald-100 text-emerald-700" },
          { label: "Lost", key: "lost", color: "bg-red-100 text-red-700" },
        ].map((s) => (
          <span
            key={s.key}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${s.color}`}
          >
            {s.label}
            <span className="font-bold">{statusCounts[s.key as keyof typeof statusCounts]}</span>
          </span>
        ))}
      </div>

      {/* Run Pipeline */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleRunPipeline()}
          placeholder='Run AI pipeline — e.g. "IT consultancy Amsterdam"'
          className="flex-1 px-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleRunPipeline}
          disabled={isRunning || !query.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-container text-on-primary-container rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all"
        >
          {isRunning ? (
            <>
              <Activity className="w-4 h-4 animate-pulse" />
              Running...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Run Pipeline
            </>
          )}
        </button>
        <button
          onClick={refresh}
          className="p-2.5 border border-outline-variant rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        leads={leads}
        onSelectLead={(lead: Lead) => setSelectedLeadId(lead.id)}
        onLeadMoved={refresh}
      />

      {/* Detail Panel */}
      <LeadDetailPanel
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}
