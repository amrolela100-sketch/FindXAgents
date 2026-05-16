import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { KanbanCardSkeleton } from "../components/ui/skeleton-patterns";
import { Button } from "../components/ui/button";
import { cn } from "@/lib/utils";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

type View = "list" | "kanban";

export default function LeadsPage() {
  const { t } = useLang();
  const [view, setView]             = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  const { data, isLoading, refresh } = useRealtimeData(
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
    if (file.size > 5 * 1024 * 1024) {
      toastError(null, "File too large (max 5 MB)");
      return;
    }
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
    <div className="flex flex-wrap items-center gap-2">
      {/* View toggle */}
      <div className="flex items-center rounded-xl p-1 bg-glass-raised border border-glass-border backdrop-blur-md">
        <Button
          variant={view === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("list")}
          className={cn("gap-1.5 h-8", view !== "list" && "text-text-muted hover:text-text")}
        >
          <LayoutList className="w-3.5 h-3.5" />
          {t.leads.list}
        </Button>
        <Button
          variant={view === "kanban" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("kanban")}
          className={cn("gap-1.5 h-8", view !== "kanban" && "text-text-muted hover:text-text")}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {t.leads.kanban}
        </Button>
      </div>

      <div className="h-6 w-px bg-glass-border mx-1 hidden sm:block" />

      <Button
        variant="default"
        size="sm"
        onClick={handleDiscover}
        disabled={discovering}
        className="gap-1.5 h-9 font-bold shadow-glow-brand"
      >
        {discovering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
        {discovering ? t.leads.discovering : t.leads.discover}
      </Button>

      <label className="flex items-center">
        <Button variant="outline" size="sm" asChild className="gap-1.5 h-9 font-bold cursor-pointer">
          <span>
            <Upload className="w-3.5 h-3.5" />
            {t.leads.importCsv}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} />
          </span>
        </Button>
      </label>

      <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-9 font-bold">
        <Download className="w-3.5 h-3.5" />
        {t.leads.export}
      </Button>
    </div>
  );

  return (
    <PageShell title={t.leads.title} subtitle={`${total} total leads found`} actions={toolbar}>

      {/* KPI stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={SPRING}
        className="mb-8"
      >
        <DashboardCards />
      </motion.div>

      {/* Main Content Area */}
      <div className="relative min-h-[600px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === "list" ? (
              <div className="rounded-2xl border border-glass-border bg-glass overflow-hidden shadow-sm">
                <LeadList onSelectLead={(lead) => setSelectedId(lead.id)} />
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <KanbanCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <KanbanBoard
                leads={leads}
                onSelectLead={(l: Lead) => setSelectedId(l.id)}
                onLeadMoved={refresh}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}
