import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { LeadList } from "../components/lead-list";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { KanbanBoard } from "../components/kanban-board";
import { DashboardCards } from "../components/dashboard-cards";
import { useLang } from "../lib/lang-context";
import type { Lead } from "../lib/types";
import { getLeads, discoverLeads, importLeads, exportLeads } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { LayoutList, LayoutGrid, Zap, Upload, Download, RefreshCw } from "lucide-react";

type View = "list" | "kanban";

export default function LeadsPage() {
  const { t } = useLang();
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const { data, refresh } = useRealtimeData(() => getLeads({ pageSize: 200 }), ["leads"], 30_000);
  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;

  async function handleDiscover() {
    setDiscovering(true);
    try { await discoverLeads(); await refresh(); } catch {} finally { setDiscovering(false); }
  }

  async function handleExport() {
    try {
      const blob = await exportLeads();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try { await importLeads(text); await refresh(); } catch {}
    e.target.value = "";
  }

  const toolbar = (
    <div className="flex items-center gap-2">
      {/* View toggle */}
      <div
        className="flex items-center rounded-lg p-0.5"
        style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
      >
        {([["list", LayoutList, t.leads.list], ["kanban", LayoutGrid, t.leads.kanban]] as const).map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all"
            style={{
              background: view === v ? "var(--surface)" : "transparent",
              color: view === v ? "var(--text)" : "var(--text-muted)",
              boxShadow: view === v ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      <button
        onClick={handleDiscover}
        disabled={discovering}
        className="btn btn-primary text-xs px-3 py-1.5 gap-1.5"
      >
        {discovering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
        {discovering ? t.leads.discovering : t.leads.discover}
      </button>

      <label className="btn btn-secondary text-xs px-3 py-1.5 gap-1.5 cursor-pointer">
        <Upload className="w-3.5 h-3.5" />
        {t.leads.importCsv}
        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
      </label>

      <button onClick={handleExport} className="btn btn-secondary text-xs px-3 py-1.5 gap-1.5">
        <Download className="w-3.5 h-3.5" />
        {t.leads.export}
      </button>
    </div>
  );

  return (
    <PageShell title={t.leads.title} subtitle={`${total} total`} actions={toolbar}>
      {/* Stats */}
      <div className="mb-6">
        <DashboardCards />
      </div>

      {/* Content */}
      {view === "list" ? (
        <LeadList onSelectLead={(lead) => setSelectedId(lead.id)} />
      ) : (
        <KanbanBoard leads={leads} onSelectLead={(l: Lead) => setSelectedId(l.id)} onLeadMoved={refresh} />
      )}

      <LeadDetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} onLeadUpdated={refresh} />
    </PageShell>
  );
}
