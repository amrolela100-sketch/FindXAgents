import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { AgentRunHistory } from "@/components/agent-run-history";
import { useLang } from "@/lib/lang-context";
import { getAgents, runAgentPipeline, getAgentRuns, toastError } from "@/lib/api";
import { useRealtimeData } from "@/lib/hooks/use-realtime-data";
import { AgentCardSkeleton } from "@/components/ui/skeleton-patterns";
import { usePolling } from "@/lib/hooks/use-polling";
import { Zap, Search, Play, Activity, Clock, ChevronRight, Sparkles, Hash, Languages, Layers, Network } from "lucide-react";
import { FADE_UP } from "@/lib/motion";
import { FALLBACK_AGENTS } from "./agent-meta";
import { PipelineFlow, AgentCard, StatPill } from "./AgentCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function AgentsPage() {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(10);
  const [emailLang, setEmailLang] = useState<"ar"|"en"|"nl"|"fr"|"es"|"de">("en");
  const [starting, setStarting] = useState(false);
  const [showHistory, setShowHistory] = useState(true);

  const { data: agentsData, isLoading: agentsLoading } = useRealtimeData(() => getAgents(), ["agents"], 60_000);
  const { data: runsData, refresh } = usePolling(() => getAgentRuns(), 8_000);

  const agents = (agentsData?.agents?.length ? agentsData.agents : FALLBACK_AGENTS);
  const runs = runsData?.runs ?? [];
  const totalRuns = runs.length;
  const completedRuns = runs.filter((r: any) => r.status === "completed").length;
  const totalLeads = runs.reduce((acc: number, r: any) => acc + (r.leadsFound ?? 0), 0);

  async function handleRun() {
    if (!query.trim()) return;
    setStarting(true);
    try { await runAgentPipeline({ query, maxResults, language: emailLang }); await refresh(); setQuery(""); }
    catch (err) { toastError(err, "Pipeline failed"); }
    finally { setStarting(false); }
  }

  return (
    <PageShell>
      <div className="px-5 md:px-8 py-6 space-y-8">
        
        {/* Statistics Bar */}
        <AnimatePresence>
          {totalRuns > 0 && (
            <motion.div variants={FADE_UP} initial="hidden" animate="visible" className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatPill icon={Network} label="Total Runs" value={totalRuns} colorClass="text-primary" bgClass="bg-primary/10" borderClass="border-primary/20" />
              <StatPill icon={Zap} label="Completed" value={completedRuns} colorClass="text-success" bgClass="bg-success/10" borderClass="border-success/20" />
              <StatPill icon={Search} label="Leads Found" value={totalLeads} colorClass="text-warning" bgClass="bg-warning/10" borderClass="border-warning/20" />
              <StatPill icon={Layers} label="Agents Active" value={agents.length} colorClass="text-info" bgClass="bg-info/10" borderClass="border-info/20" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pipeline Control Center */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" className="rounded-2xl overflow-hidden bg-glass border border-glass-border shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 gap-4 border-b border-glass-border bg-glass-raised/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 border border-primary/20 shadow-glow-brand">
                <Zap className="w-5 h-5 text-primary fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text uppercase tracking-widest">{t.agents.runPipeline}</h3>
                <p className="text-xs text-text-muted font-medium">Auto-Discovery → Intelligent Analysis → Smart Outreach</p>
              </div>
            </div>
            <PipelineFlow agents={agents} />
          </div>

          <div className="p-6 space-y-5">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted pointer-events-none" />
              <input 
                type="text" 
                value={query} 
                onChange={(e) => setQuery(e.target.value)} 
                onKeyDown={(e) => e.key === "Enter" && handleRun()} 
                placeholder={t.agents.placeholder} 
                className="w-full h-14 pl-12 pr-6 rounded-2xl bg-glass-raised border border-glass-border text-sm font-medium text-text placeholder:text-text-subtle focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-inner" 
              />
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-glass-raised border border-glass-border">
                <Hash className="w-4 h-4 text-text-subtle" />
                <span className="text-xs font-bold text-text-muted uppercase">Max results</span>
                <select 
                  value={maxResults} 
                  onChange={(e) => setMaxResults(Number(e.target.value))} 
                  className="bg-transparent text-sm font-bold text-text outline-none cursor-pointer"
                >
                  {[5,10,20,50].map((n) => <option key={n} value={n} className="bg-background">{n}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-glass-raised border border-glass-border">
                <Languages className="w-4 h-4 text-text-subtle" />
                <span className="text-xs font-bold text-text-muted uppercase">Language</span>
                <select 
                  value={emailLang} 
                  onChange={(e) => setEmailLang(e.target.value as typeof emailLang)} 
                  className="bg-transparent text-sm font-bold text-text outline-none cursor-pointer"
                >
                  <option value="ar" className="bg-background">🇸🇦 Arabic</option>
                  <option value="en" className="bg-background">🇬🇧 English</option>
                  <option value="nl" className="bg-background">🇳🇱 Dutch</option>
                  <option value="fr" className="bg-background">🇫🇷 French</option>
                  <option value="es" className="bg-background">🇪🇸 Spanish</option>
                  <option value="de" className="bg-background">🇩🇪 German</option>
                </select>
              </div>

              <div className="flex-1" />

              <Button 
                onClick={handleRun} 
                disabled={starting || !query.trim()} 
                className="h-12 px-8 font-bold gap-2 shadow-glow-brand"
              >
                {starting ? <Activity className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                {starting ? "Starting..." : "Run Pipeline"}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Active Agents Section */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-[0.2em] flex items-center gap-2">
              <Layers className="w-4 h-4" />
              {t.agents.activeAgents}
            </h2>
            <div className="px-3 py-1 rounded-full bg-glass-raised border border-glass-border text-[10px] font-bold text-text-subtle uppercase">
              {agentsLoading ? "Loading..." : `${agents.length} AGENTS READY`}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {agentsLoading 
              ? Array.from({length: 3}).map((_, i) => <AgentCardSkeleton key={i} />) 
              : agents.map((agent: any, i: number) => <AgentCard key={agent.id} agent={agent} index={i} />)
            }
          </div>
        </motion.div>

        {/* Pipeline Run History */}
        <motion.div variants={FADE_UP} initial="hidden" animate="visible" className="pt-8">
          <button 
            onClick={() => setShowHistory((v) => !v)} 
            className="flex items-center justify-between w-full p-2 group"
          >
            <h2 className="text-xs font-bold text-text-subtle uppercase tracking-[0.2em] flex items-center gap-2 group-hover:text-text transition-colors">
              <Clock className="w-4 h-4" />
              {t.agents.pipelineRuns}
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-text-subtle uppercase px-2.5 py-1 rounded-lg bg-glass-raised border border-glass-border">
                {runs.length} TOTAL
              </span>
              <ChevronRight className={cn("w-4 h-4 text-text-muted transition-transform duration-300", showHistory && "rotate-90")} />
            </div>
          </button>
          
          <AnimatePresence>
            {showHistory && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: -10 }} 
                className="mt-6"
              >
                {runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 rounded-3xl border-2 border-dashed border-glass-border bg-glass-raised/20">
                    <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-4 border border-primary/10">
                      <Sparkles className="w-8 h-8 text-primary/40" />
                    </div>
                    <p className="text-sm font-bold text-text-muted">{t.agents.noRuns}</p>
                    <p className="text-xs text-text-subtle mt-1">{t.agents.noRunsHint}</p>
                  </div>
                ) : <AgentRunHistory />}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </PageShell>
  );
}
