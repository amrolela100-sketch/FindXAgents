import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { LeadList } from "../components/lead-list";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { KanbanBoard } from "../components/kanban-board";
import { DashboardCards } from "../components/dashboard-cards";
import type { Lead } from "../lib/types";
import { getLeads, discoverLeads, importLeads, exportLeads, bulkAnalyzeLeads } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { LayoutList, LayoutGrid, Zap, Upload, Download, RefreshCw } from "lucide-react";

type ViewMode = "list" | "kanban";

export default function LeadsPage() {
  const [view, setView] = useState<ViewMode>("list");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);

  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 200 }),
    ["leads"],
    30_000
  );
  const leads = data?.leads ?? [];

  async function handleDiscover() {
    setIsDiscovering(true);
    try {
      await discoverLeads();
      await refresh();
    } catch {
      // error handled in api.ts via toast
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleExport() {
    try {
      const blob = await exportLeads();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // handled in api.ts
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importLeads(text);
      await refresh();
    } catch {
      // handled in api.ts
    }
    e.target.value = "";
  }

  return (
    <PageShell
      title="Leads"
      subtitle={`${data?.total ?? 0} total leads`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-surface-container-high rounded-xl p-1">
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              view === "list"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <LayoutList className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              view === "kanban"
                ? "bg-surface-container-lowest text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Kanban
          </button>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={handleDiscover}
          disabled={isDiscovering}
          className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary-container rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isDiscovering ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          {isDiscovering ? "Discovering..." : "Discover"}
        </button>

        <label className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-variant cursor-pointer transition-colors">
          <Upload className="w-4 h-4" />
          Import CSV
          <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
        </label>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 border border-outline-variant rounded-xl text-sm font-medium text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <DashboardCards />
      </div>

      {/* Main View */}
      {view === "list" ? (
        <LeadList onSelectLead={(lead) => setSelectedLeadId(lead.id)} />
      ) : (
        <KanbanBoard
          leads={leads}
          onSelectLead={(lead) => setSelectedLeadId(lead.id)}
          onLeadMoved={refresh}
        />
      )}

      {/* Detail Panel */}
      <LeadDetailPanel
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}
