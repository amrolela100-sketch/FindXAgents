import { useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { LeadList } from "../components/lead-list";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { KanbanBoard } from "../components/kanban-board";
import { DashboardCards } from "../components/dashboard-cards";
import { useLang } from "../lib/lang-context";
import type { Lead } from "../lib/types";
import { getLeads, discoverLeads, importLeads, exportLeads, toastError } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { LayoutList, LayoutGrid, Zap, Upload, Download, RefreshCw } from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

type View = "list" | "kanban";

export default function LeadsPage() {
  const { t } = useLang();
  const [view, setView]             = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 200 }),
    ["leads"],
    30_000,
  );
  const leads = data?.leads ?? [];
  const total = data?.total ?? 0;

  async function handleDiscover() {
    setDiscovering(true);
    try {
      await discoverLeads();
      await refresh();
    } catch (err) {
      toastError(err, t.leads.discoverError ?? "Failed to discover leads");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleExport() {
    try {
      const blob = await exportLeads();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err, t.leads.exportError ?? "Failed to export leads");
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      await importLeads(text);
      await refresh();
    } catch (err) {
      toastError(err, t.leads.importError ?? "Failed to import leads");
    }
    e.target.value = "";
  }

  const toolbar = (
    <div className="flex items-center gap-2">
      {/* View toggle */}
      <div
        className="flex items-center rounded-xl p-0.5"
        style={{
          background: "var(--glass-raised)",
          border: "1px solid var(--glass-border)",
          backdropFilter: "blur(12px)",
        }}
      >
        {([
          ["list",   LayoutList, t.leads.list],
          ["kanban", LayoutGrid, t.leads.kanban],
        ] as const).map(([v, Icon, label]) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all"
            style={{
              background: view === v
                ? "var(--glass)"
                : "transparent",
              color:      view === v ? "var(--text)" : "var(--text-muted)",
              boxShadow:  view === v ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
              border:     view === v ? "1px solid var(--glass-border)" : "1px solid transparent",
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
        className="btn btn-primary text-[12px] px-3 py-1.5 gap-1.5 font-semibold"
      >
        {discovering
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Zap className="w-3.5 h-3.5" strokeWidth={2} />}
        {discovering ? t.leads.discovering : t.leads.discover}
      </button>

      <label className="btn btn-ghost text-[12px] px-3 py-1.5 gap-1.5 cursor-pointer"
        style={{ border: "1px solid var(--glass-border)" }}>
        <Upload className="w-3.5 h-3.5" />
        {t.leads.importCsv}
        <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
      </label>

      <button
        onClick={handleExport}
        className="btn btn-ghost text-[12px] px-3 py-1.5 gap-1.5"
        style={{ border: "1px solid var(--glass-border)" }}
      >
        <Download className="w-3.5 h-3.5" />
        {t.leads.export}
      </button>
    </div>
  );

  return (
    <PageShell title={t.leads.title} subtitle={`${total} total`} actions={toolbar}>

      {/* ── KPI cards ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="mb-6"
      >
        <DashboardCards />
      </motion.div>

      {/* ── Content ───────────────────────────────────────────── */}
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
      >
        {view === "list" ? (
          <LeadList onSelectLead={(lead) => setSelectedId(lead.id)} />
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
