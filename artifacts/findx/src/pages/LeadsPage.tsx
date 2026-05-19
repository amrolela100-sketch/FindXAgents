import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { PageShell } from "../components/page-shell";
import { LeadList } from "../components/lead-list";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { KanbanBoard } from "../components/kanban-board";
import { DashboardCards } from "../components/dashboard-cards";
import { useLang } from "../lib/lang-context";
import type { Lead, LeadStatus } from "../lib/types";
import { STATUS_LABELS } from "../lib/types";
import {
  getLeads, discoverLeads, importLeads, exportLeads,
  bulkAnalyzeLeads, bulkUpdateStatus, bulkDeleteLeads, toastError,
} from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import {
  LayoutList, LayoutGrid, Zap, Upload, Download, RefreshCw,
  Search, X, CheckSquare, Square, Trash2, BarChart2,
  MoveHorizontal, ChevronDown, SlidersHorizontal, ArrowUpDown,
  AlertTriangle,
} from "lucide-react";
import { KanbanCardSkeleton } from "../components/ui/skeleton-patterns";
import { Button } from "../components/ui/button";
import { SPRING, FADE_UP } from "@/lib/motion";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type View   = "list" | "kanban";
type SortBy = "score_desc" | "date_desc" | "name_asc";

const SORT_LABELS: Record<SortBy, string> = {
  score_desc: "Lead Score ↓",
  date_desc:  "Date ↓",
  name_asc:   "Name A–Z",
};

const STATUS_FILTER_ITEMS: { key: LeadStatus | "all"; label: string }[] = [
  { key: "all",         label: "All" },
  { key: "discovered",  label: STATUS_LABELS.discovered },
  { key: "analyzing",   label: STATUS_LABELS.analyzing },
  { key: "analyzed",    label: STATUS_LABELS.analyzed },
  { key: "contacting",  label: STATUS_LABELS.contacting },
  { key: "responded",   label: STATUS_LABELS.responded },
  { key: "qualified",   label: STATUS_LABELS.qualified },
  { key: "won",         label: STATUS_LABELS.won },
  { key: "lost",        label: STATUS_LABELS.lost },
];

// ─── Import Preview Modal ──────────────────────────────────────────────────────

function ImportPreviewModal({
  rows,
  onConfirm,
  onCancel,
  importing,
}: {
  rows: string[][];
  onConfirm: () => void;
  onCancel: () => void;
  importing: boolean;
}) {
  const headers = rows[0] ?? [];
  const preview = rows.slice(1, 6);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={SPRING}
        className="w-full max-w-2xl rounded-2xl border border-border bg-glass backdrop-blur-glass shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-text">Import Preview</h2>
          <button onClick={onCancel} className="text-text-muted hover:text-text">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-4">
          <p className="text-sm mb-3 text-text-muted">
            First {preview.length} rows of your CSV:
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-interactive-hover">
                  {headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-semibold text-text border-b border-border">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, ri) => (
                  <tr key={ri} className="border-b border-border last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-text-muted truncate max-w-[150px]">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs mt-3 text-text-subtle">
            {rows.length - 1} total rows detected.
          </p>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={importing}>
            Cancel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onConfirm}
            disabled={importing}
            className="gap-2 font-bold shadow-sm"
          >
            {importing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {importing ? "Importing…" : `Import ${rows.length - 1} leads`}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Delete Confirm Modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  count,
  onConfirm,
  onCancel,
  deleting,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={SPRING}
        className="w-full max-w-sm rounded-2xl border border-border bg-glass backdrop-blur-glass shadow-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-danger/5 border border-danger/20">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <h2 className="font-bold text-text">Delete {count} lead{count !== 1 ? "s" : ""}?</h2>
        </div>
        <p className="text-sm mb-6 text-text-muted">
          This will permanently delete {count} lead{count !== 1 ? "s" : ""} and all their analysis and outreach data. This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" size="sm" className="flex-1" onClick={onCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-2 bg-danger text-danger-foreground hover:bg-danger/90 font-bold"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Bulk Action Bar ───────────────────────────────────────────────────────────

function BulkActionBar({
  selectedIds,
  leads,
  onClear,
  onAnalyze,
  onDelete,
  onMoveStage,
  onExportSelected,
}: {
  selectedIds: Set<string>;
  leads: Lead[];
  onClear: () => void;
  onAnalyze: () => void;
  onDelete: () => void;
  onMoveStage: (status: LeadStatus) => void;
  onExportSelected: () => void;
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const count = selectedIds.size;

  const STAGES: { key: LeadStatus; label: string }[] = [
    { key: "discovered",  label: "New" },
    { key: "analyzing",   label: "Analyzing" },
    { key: "analyzed",    label: "Analyzed" },
    { key: "contacting",  label: "Contacted" },
    { key: "responded",   label: "Responded" },
    { key: "qualified",   label: "Qualified" },
    { key: "won",         label: "Won" },
    { key: "lost",        label: "Lost" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={SPRING}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 rounded-full border border-border bg-glass backdrop-blur-glass shadow-2xl"
    >
      {/* Count */}
      <span className="text-sm font-bold text-text px-2">
        {count} selected
      </span>
      <div className="w-px h-5 bg-border" />

      {/* Analyze */}
      <Button size="sm" variant="outline" onClick={onAnalyze} className="gap-1.5 h-8 text-xs rounded-full">
        <BarChart2 className="w-3.5 h-3.5" />
        Analyze
      </Button>

      {/* Move to stage dropdown */}
      <div className="relative">
        <Button
          size="sm" variant="outline"
          onClick={() => setStageOpen(v => !v)}
          className="gap-1.5 h-8 text-xs rounded-full"
        >
          <MoveHorizontal className="w-3.5 h-3.5" />
          Move to
          <ChevronDown className="w-3 h-3" />
        </Button>
        <AnimatePresence>
          {stageOpen && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute bottom-full mb-2 left-0 w-40 rounded-xl border border-border bg-glass backdrop-blur-glass shadow-xl overflow-hidden z-10"
            >
              {STAGES.map(s => (
                <button
                  key={s.key}
                  onClick={() => { onMoveStage(s.key); setStageOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-interactive-hover text-text-muted hover:text-text transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export selected */}
      <Button size="sm" variant="outline" onClick={onExportSelected} className="gap-1.5 h-8 text-xs rounded-full">
        <Download className="w-3.5 h-3.5" />
        Export
      </Button>

      {/* Delete */}
      <Button
        size="sm" variant="outline"
        onClick={onDelete}
        className="gap-1.5 h-8 text-xs text-danger border-danger/30 hover:bg-danger/10 hover:border-danger/60 rounded-full"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Delete
      </Button>

      <div className="w-px h-5 bg-border" />

      {/* Clear */}
      <button onClick={onClear} className="text-text-muted hover:text-text transition-colors p-1">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const { t } = useLang();
  const [location, setLocation] = useLocation();

  // ── URL state ───────────────────────────────────────────────────────────────
  const searchParams = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const [searchQ,    setSearchQ]    = useState(searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">(
    (searchParams.get("status") as LeadStatus | "all") ?? "all"
  );
  const [sortBy,     setSortBy]     = useState<SortBy>(
    (searchParams.get("sort") as SortBy) ?? "date_desc"
  );

  // Sync URL params
  useEffect(() => {
    const p = new URLSearchParams();
    if (searchQ) p.set("q", searchQ);
    if (statusFilter !== "all") p.set("status", statusFilter);
    if (sortBy !== "date_desc") p.set("sort", sortBy);
    const qs = p.toString();
    const newPath = qs ? `/leads?${qs}` : "/leads";
    if (window.location.pathname + window.location.search !== newPath) {
      window.history.replaceState(null, "", newPath);
    }
  }, [searchQ, statusFilter, sortBy]);

  // ── Core state ──────────────────────────────────────────────────────────────
  const [view,       setView]       = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [discovering, setDiscovering] = useState(false);

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction]   = useState<"analyzing" | "deleting" | "moving" | null>(null);

  // ── Import state ─────────────────────────────────────────────────────────────
  const [importRows,    setImportRows]    = useState<string[][] | null>(null);
  const [importCsvText, setImportCsvText] = useState("");
  const [importing,     setImporting]     = useState(false);

  // ── Delete confirm ──────────────────────────────────────────────────────────
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ── Sort dropdown ──────────────────────────────────────────────────────────
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data, isLoading, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 500 }),
    ["leads"],
    30_000,
  );
  const allLeads = data?.leads ?? [];
  const total    = data?.total ?? 0;

  // ── Filtering + sorting (client-side) ──────────────────────────────────────
  const filteredLeads = useMemo(() => {
    let list = [...allLeads];

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter(l => l.status === statusFilter);
    }

    // Search filter — businessName, city, industry
    if (searchQ.trim()) {
      const q = searchQ.trim().toLowerCase();
      list = list.filter(l =>
        l.businessName.toLowerCase().includes(q) ||
        (l.city ?? "").toLowerCase().includes(q) ||
        (l.industry ?? "").toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "score_desc":
        list.sort((a, b) => (b.leadScore ?? -1) - (a.leadScore ?? -1));
        break;
      case "date_desc":
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "name_asc":
        list.sort((a, b) => a.businessName.localeCompare(b.businessName));
        break;
    }

    return list;
  }, [allLeads, searchQ, statusFilter, sortBy]);

  // ── Handlers ────────────────────────────────────────────────────────────────

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

  async function handleExportSelected() {
    try {
      const blob = await exportLeads({ ids: [...selectedIds] } as any);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `leads-selected-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toastError(err, "Failed to export selected leads");
    }
  }

  function handleImportFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toastError(null, "File too large (max 5 MB)");
      return;
    }
    file.text().then(text => {
      setImportCsvText(text);
      // Parse first 6 rows for preview
      const rows = text.split("\n")
        .slice(0, 7)
        .filter(r => r.trim())
        .map(r => r.split(",").map(cell => cell.replace(/^"|"$/g, "").trim()));
      setImportRows(rows);
    });
    e.target.value = "";
  }

  async function handleImportConfirm() {
    setImporting(true);
    try {
      await importLeads(importCsvText);
      await refresh();
      setImportRows(null);
      setImportCsvText("");
    } catch (err) {
      toastError(err, t.leads.importError ?? "Failed to import leads");
    } finally {
      setImporting(false);
    }
  }

  // ── Bulk handlers ────────────────────────────────────────────────────────────

  function toggleSelectAll() {
    if (selectedIds.size === filteredLeads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleBulkAnalyze() {
    setBulkAction("analyzing");
    try {
      await bulkAnalyzeLeads([...selectedIds]);
      await refresh();
      setSelectedIds(new Set());
    } catch (err) {
      toastError(err, "Failed to queue analysis");
    } finally {
      setBulkAction(null);
    }
  }

  async function handleBulkMoveStage(status: LeadStatus) {
    setBulkAction("moving");
    try {
      await bulkUpdateStatus([...selectedIds], status);
      await refresh();
      setSelectedIds(new Set());
    } catch (err) {
      toastError(err, "Failed to update status");
    } finally {
      setBulkAction(null);
    }
  }

  async function handleBulkDelete() {
    setDeleting(true);
    try {
      await bulkDeleteLeads([...selectedIds]);
      await refresh();
      setSelectedIds(new Set());
      setShowDeleteConfirm(false);
    } catch (err) {
      toastError(err, "Failed to delete leads");
    } finally {
      setDeleting(false);
    }
  }

  const allSelected = filteredLeads.length > 0 && selectedIds.size === filteredLeads.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredLeads.length;

  // ── Toolbar ──────────────────────────────────────────────────────────────────

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {/* View toggle */}
      <div className="flex items-center rounded-full p-1 bg-interactive-hover border border-border backdrop-blur-md">
        <Button
          variant={view === "list" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("list")}
          className={cn("gap-1.5 h-8 rounded-full", view !== "list" && "text-text-muted hover:text-text")}
        >
          <LayoutList className="w-3.5 h-3.5" />
          {t.leads.list}
        </Button>
        <Button
          variant={view === "kanban" ? "default" : "ghost"}
          size="sm"
          onClick={() => setView("kanban")}
          className={cn("gap-1.5 h-8 rounded-full", view !== "kanban" && "text-text-muted hover:text-text")}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {t.leads.kanban}
        </Button>
      </div>

      <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

      <Button
        variant="default"
        size="sm"
        onClick={handleDiscover}
        disabled={discovering}
        className="gap-1.5 h-9 font-bold shadow-sm rounded-full"
      >
        {discovering
          ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          : <Zap className="w-3.5 h-3.5 fill-current" />}
        {discovering ? t.leads.discovering : t.leads.discover}
      </Button>

      {/* Import */}
      <label className="flex items-center">
        <Button variant="outline" size="sm" asChild className="gap-1.5 h-9 font-bold cursor-pointer rounded-full">
          <span>
            <Upload className="w-3.5 h-3.5" />
            {t.leads.importCsv}
            <input type="file" accept=".csv" className="hidden" onChange={handleImportFileChange} />
          </span>
        </Button>
      </label>

      {/* Export all */}
      <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-9 font-bold rounded-full">
        <Download className="w-3.5 h-3.5" />
        {t.leads.export}
      </Button>
    </div>
  );

  return (
    <PageShell
      title={t.leads.title}
      subtitle={`${filteredLeads.length} / ${total} leads`}
      actions={toolbar}
    >
      {/* KPI stats */}
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={0}
        className="mb-6"
      >
        <DashboardCards />
      </motion.div>

      {/* ── Search + Filter bar ──────────────────────────────────────────────── */}
      <motion.div
        variants={FADE_UP}
        initial="hidden"
        animate="visible"
        custom={1}
        className="flex flex-wrap items-center gap-3 mb-4"
      >
        {/* Search input */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <input
            type="text"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Search leads…"
            className="input pl-8 pr-8 text-sm"
          />
          {searchQ && (
            <button
              onClick={() => setSearchQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTER_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                statusFilter === item.key
                  ? "text-primary-foreground border-primary bg-primary shadow-sm"
                  : "text-text-muted hover:text-text border-border bg-interactive-hover",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Sort dropdown */}
        <div className="relative ml-auto" ref={sortRef}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOpen(v => !v)}
            className="gap-1.5 h-8 text-xs rounded-full"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {SORT_LABELS[sortBy]}
            <ChevronDown className="w-3 h-3" />
          </Button>
          <AnimatePresence>
            {sortOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-border bg-glass backdrop-blur-glass shadow-xl overflow-hidden z-20"
              >
                {(Object.entries(SORT_LABELS) as [SortBy, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => { setSortBy(key); setSortOpen(false); }}
                    className={cn(
                      "w-full text-left px-3 py-2.5 text-xs transition-colors",
                      sortBy === key
                        ? "font-bold text-primary bg-primary/5"
                        : "text-text-muted hover:bg-interactive-hover hover:text-text"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ── Select-all row (only in list view) ──────────────────────────────── */}
      {view === "list" && (
        <motion.div
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          custom={2}
          className="flex items-center gap-3 mb-3 px-1"
        >
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-xs text-text-muted hover:text-text transition-colors"
          >
            {allSelected
              ? <CheckSquare className="w-4 h-4 text-primary" />
              : someSelected
              ? <CheckSquare className="w-4 h-4 text-text-muted" />
              : <Square className="w-4 h-4" />}
            {allSelected ? "Deselect all" : `Select all (${filteredLeads.length})`}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-xs font-medium text-primary">
              {selectedIds.size} selected
            </span>
          )}
        </motion.div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
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
              <div className="rounded-2xl border border-border bg-glass overflow-hidden shadow-sm">
                <LeadList
                  leads={filteredLeads}
                  selectedIds={selectedIds}
                  onToggleSelect={toggleSelect}
                  onSelectLead={(lead) => setSelectedId(lead.id)}
                />
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <KanbanCardSkeleton key={i} />
                ))}
              </div>
            ) : (
              <KanbanBoard
                leads={filteredLeads}
                onSelectLead={(l: Lead) => setSelectedId(l.id)}
                onLeadMoved={refresh}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Lead Detail Panel */}
      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onLeadUpdated={refresh}
      />

      {/* ── Bulk Action Bar ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <BulkActionBar
            selectedIds={selectedIds}
            leads={filteredLeads}
            onClear={() => setSelectedIds(new Set())}
            onAnalyze={handleBulkAnalyze}
            onDelete={() => setShowDeleteConfirm(true)}
            onMoveStage={handleBulkMoveStage}
            onExportSelected={handleExportSelected}
          />
        )}
      </AnimatePresence>

      {/* ── Import Preview Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {importRows && (
          <ImportPreviewModal
            rows={importRows}
            onConfirm={handleImportConfirm}
            onCancel={() => { setImportRows(null); setImportCsvText(""); }}
            importing={importing}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmModal
            count={selectedIds.size}
            onConfirm={handleBulkDelete}
            onCancel={() => setShowDeleteConfirm(false)}
            deleting={deleting}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}
