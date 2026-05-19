import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { KanbanBoard } from "@/components/kanban-board";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { useLang } from "@/lib/lang-context";
import type { Lead } from "@/lib/types";
import { getLeads, runAgentPipeline, getAgentRun, toastError } from "@/lib/api";
import { useRealtimeData } from "@/lib/hooks/use-realtime-data";
import { KanbanCardSkeleton } from "@/components/ui/skeleton-patterns";
import { useCompletionSound } from "@/lib/hooks/use-completion-sound";
import { dispatchNotification } from "@/lib/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Zap, Activity, RefreshCw, Search, Languages, Hash,
  Play, TrendingUp, Users, CheckCircle2, Star, Filter,
  GitBranch, Circle, ArrowUpRight
} from "lucide-react";

import { FADE_UP, SPRING } from "@/lib/motion";

const STATUS_META = [
  { key: "discovered", label: "New",       colorClass: "text-text-subtle", bgClass: "bg-glass-raised", borderClass: "border-glass-border", icon: Circle },
  { key: "analyzing",  label: "Analyzing", colorClass: "text-warning", bgClass: "bg-warning/10", borderClass: "border-warning/20", icon: Activity },
  { key: "analyzed",   label: "Analyzed",  colorClass: "text-primary", bgClass: "bg-primary/10", borderClass: "border-primary/20", icon: Star },
  { key: "contacting", label: "Contacted", colorClass: "text-info", bgClass: "bg-info/10", borderClass: "border-info/20", icon: ArrowUpRight },
  { key: "responded",  label: "Responded", colorClass: "text-orange-500", bgClass: "bg-orange-500/10", borderClass: "border-orange-500/20", icon: TrendingUp },
  { key: "qualified",  label: "Qualified", colorClass: "text-indigo-500", bgClass: "bg-indigo-500/10", borderClass: "border-indigo-500/20", icon: CheckCircle2 },
  { key: "won",        label: "Won",       colorClass: "text-success", bgClass: "bg-success/10", borderClass: "border-success/20", icon: Star },
  { key: "lost",       label: "Lost",      colorClass: "text-danger", bgClass: "bg-danger/10", borderClass: "border-danger/20", icon: Circle },
] as const;

function StatusChip({ label, colorClass, bgClass, borderClass, count, icon: Icon }: {
  label: string; colorClass: string; bgClass: string; borderClass: string; count: number; icon: any;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -1 }}
      className={cn("flex items-center gap-2 px-3 py-1.5 rounded-xl border cursor-default transition-all shadow-sm", bgClass, borderClass, colorClass)}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-lg bg-white/20", colorClass)}>{count}</span>
    </motion.div>
  );
}

function SummaryCard({ label, value, sub, colorClass, bgClass, borderClass, icon: Icon }: {
  label: string; value: string | number; sub?: string; colorClass: string; bgClass: string; borderClass: string; icon: any;
}) {
  return (
    <div className="rounded-2xl p-4 bg-glass border border-glass-border shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center border shrink-0", bgClass, borderClass, colorClass)}>
        <Icon className="w-6 h-6" strokeWidth={1.8} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className="text-xl font-bold text-text leading-tight">{value}</p>
        {sub && <p className="text-[10px] font-medium text-success uppercase mt-0.5 tracking-tighter">{sub}</p>}
      </div>
    </div>
  );
}

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

  const { data, isLoading, refresh } = useRealtimeData(
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
            });
          } else if (run.status === "failed") {
            activeRunsRef.current.delete(runId);
            refresh();
          }
        } catch (err) { console.warn("[pipeline poll] error:", err); }
      }
    }, 4_000);
  }

  async function handleRun() {
    if (!query.trim()) return;
    setRunning(true);
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

  const statusCounts: Record<string, number> = {};
  leads.forEach((l) => { statusCounts[l.status] = (statusCounts[l.status] ?? 0) + 1; });

  const wonCount = statusCounts["won"] ?? 0;
  const analyzedCount = statusCounts["analyzed"] ?? 0;
  const contactedCount = statusCounts["contacting"] ?? 0;
  const convRate = leads.length > 0 ? Math.round((wonCount / leads.length) * 100) : 0;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={refresh} title={t.pipeline.refresh}>
        <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
      </Button>
      <Button 
        variant={showForm ? "secondary" : "default"} 
        onClick={() => setShowForm((v) => !v)}
        className="gap-2 h-9 font-bold shadow-sm"
      >
        <Zap className="w-3.5 h-3.5 fill-current" />
        {showForm ? "Close Form" : t.pipeline.runPipeline}
      </Button>
    </div>
  );

  return (
    <PageShell title={t.pipeline.title} subtitle={`${leads.length} leads in funnel`} actions={headerActions}>
      <div className="px-5 md:px-8 py-6 space-y-8">

        {/* Summary Statistics */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard icon={Users} label="Total Leads" value={leads.length} colorClass="text-info" bgClass="bg-info/10" borderClass="border-info/20" />
          <SummaryCard icon={Star} label="Analyzed" value={analyzedCount} colorClass="text-primary" bgClass="bg-primary/10" borderClass="border-primary/20" />
          <SummaryCard icon={ArrowUpRight} label="Contacted" value={contactedCount} colorClass="text-warning" bgClass="bg-warning/10" borderClass="border-warning/20" />
          <SummaryCard icon={TrendingUp} label="Conversion" value={`${convRate}%`} sub={`${wonCount} deals won`} colorClass="text-success" bgClass="bg-success/10" borderClass="border-success/20" />
        </motion.div>

        {/* Pipeline Launcher Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="rounded-2xl overflow-hidden bg-glass border border-glass-border shadow-xl"
            >
              <div className="flex items-center gap-3 px-6 py-4 border-b border-glass-border bg-glass-raised/50">
                <GitBranch className="w-5 h-5 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-text uppercase tracking-widest">Launch Smart Pipeline</h3>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter mt-0.5">Discovery • Analysis • Smart Outreach</p>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
                  <Input 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)} 
                    onKeyDown={(e) => e.key === "Enter" && handleRun()}
                    placeholder={t.pipeline.placeholder}
                    className="pl-12"
                    autoFocus
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-glass-raised border border-glass-border">
                    <Hash className="w-4 h-4 text-text-subtle" />
                    <span className="text-xs font-bold text-text-muted uppercase">Limit</span>
                    <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="bg-transparent text-sm font-bold text-text outline-none cursor-pointer">
                      {[5, 10, 20, 50].map((n) => <option key={n} value={n} className="bg-background">{n}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-glass-raised border border-glass-border">
                    <Languages className="w-4 h-4 text-text-subtle" />
                    <select value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} className="bg-transparent text-sm font-bold text-text outline-none cursor-pointer">
                      <option value="ar" className="bg-background">🇸🇦 Arabic</option>
                      <option value="en" className="bg-background">🇬🇧 English</option>
                      <option value="nl" className="bg-background">🇳🇱 Dutch</option>
                      <option value="fr" className="bg-background">🇫🇷 French</option>
                      <option value="es" className="bg-background">🇪🇸 Spanish</option>
                      <option value="de" className="bg-background">🇩🇪 German</option>
                    </select>
                  </div>

                  <div className="flex-1" />

                  <Button onClick={handleRun} disabled={running || !query.trim()} className="h-11 px-8 font-bold gap-2 shadow-sm">
                    {running ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    {running ? "Running..." : "Launch Pipeline"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pipeline Stages Filters */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-text-subtle" />
            <h2 className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em]">Funnel Stages</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {STATUS_META.map((s) => {
              const { key: statusKey, ...rest } = s;
              return <StatusChip key={statusKey} count={statusCounts[statusKey] ?? 0} {...rest} />;
            })}
          </div>
        </motion.div>

        {/* Kanban Board Area */}
        <div className="min-h-[500px]">
          {leads.length === 0 && !isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 rounded-3xl border-2 border-dashed border-glass-border bg-glass-raised/20">
              <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ repeat: Infinity, duration: 2.5 }} className="w-20 h-20 rounded-2xl flex items-center justify-center bg-glass-raised border border-glass-border mb-6 shadow-sm">
                <GitBranch className="w-10 h-10 text-text" strokeWidth={1.5} />
              </motion.div>
              <h3 className="text-lg font-bold text-text">{t.pipeline.noLeads}</h3>
              <p className="text-sm text-text-muted mt-2 mb-8">{t.pipeline.noLeadsHint}</p>
              <Button onClick={() => setShowForm(true)} className="h-12 px-10 font-bold gap-2 shadow-sm">
                <Zap className="w-4 h-4 fill-current" />
                Start First Pipeline
              </Button>
            </div>
          ) : isLoading && leads.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <KanbanCardSkeleton key={i} />)}
            </div>
          ) : (
            <KanbanBoard leads={leads} onSelectLead={(l: Lead) => setSelectedId(l.id)} onLeadMoved={refresh} />
          )}
        </div>
      </div>

      <LeadDetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} onLeadUpdated={refresh} />
    </PageShell>
  );
}
