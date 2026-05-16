/**
 * AgentsPage — Thin Wrapper
 * Before: 25KB single file → After: ~5KB wrapper + 2 modular files
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { AgentRunHistory } from "@/components/agent-run-history";
import { useLang } from "@/lib/lang-context";
import { getAgents, runAgentPipeline, getAgentRuns, toastError } from "@/lib/api";
import { useRealtimeData } from "@/lib/hooks/use-realtime-data";
import { AgentCardSkeleton } from "@/components/ui/skeleton-patterns";
import { usePolling } from "@/lib/hooks/use-polling";
import { Zap, Search, Play, Activity, Clock, ChevronRight, Sparkles, Hash, Languages, Layers } from "lucide-react";
import { FADE_UP } from "@/lib/motion";
import { FALLBACK_AGENTS } from "./agent-meta";
import { PipelineFlow, AgentCard, StatPill } from "./AgentCard";

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
    try { await runAgentPipeline({ query, maxResults, emailLang }); await refresh(); setQuery(""); }
    catch (err) { toastError(err, "Pipeline failed"); }
    finally { setStarting(false); }
  }

  return (
    <PageShell>
      {/* Stats */}
      {totalRuns > 0 && (
        <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible" className="flex flex-wrap gap-3 mb-6">
          <StatPill icon={Network} label="Total Runs" value={totalRuns} accent="#C084FC" />
          <StatPill icon={Zap} label="Completed" value={completedRuns} accent="#34D399" />
          <StatPill icon={Search} label="Leads Found" value={totalLeads} accent="#FBBF24" />
          <StatPill icon={Layers} label="Agents Active" value={agents.length} accent="#60A5FA" />
        </motion.div>
      )}

      {/* Run Pipeline Card */}
      <motion.div custom={1} variants={FADE_UP} initial="hidden" animate="visible" className="glass-card rounded-2xl overflow-hidden mb-7">
        <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "var(--brand)" }} strokeWidth={2.5} />
            </div>
            <div><p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{t.agents.runPipeline}</p><p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Discover → Analyze → Outreach</p></div>
          </div>
          <PipelineFlow agents={agents} />
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRun()} placeholder={t.agents.placeholder} className="input pl-10 text-[13px]" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}>
              <Hash className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
              <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Max results</label>
              <select value={maxResults} onChange={(e) => setMaxResults(Number(e.target.value))} className="bg-transparent text-[12px] font-semibold outline-none cursor-pointer" style={{ color: "var(--text)" }}>
                {[5,10,20,50].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}>
              <Languages className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
              <label className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>Email lang</label>
              <select value={emailLang} onChange={(e) => setEmailLang(e.target.value as typeof emailLang)} className="bg-transparent text-[12px] font-semibold outline-none cursor-pointer" style={{ color: "var(--text)" }}>
                <option value="ar">🇸🇦 Arabic</option><option value="en">🇬🇧 English</option><option value="nl">🇳🇱 Dutch</option><option value="fr">🇫🇷 French</option><option value="es">🇪🇸 Spanish</option><option value="de">🇩🇪 German</option>
              </select>
            </div>
            <div className="flex-1" />
            <button onClick={handleRun} disabled={starting || !query.trim()} aria-label={starting ? "Starting pipeline..." : t.agents.runPipeline} aria-busy={starting} className="btn btn-primary px-5 py-2.5 text-[13px] font-semibold gap-2">
              {starting ? <><Activity className="w-4 h-4 animate-spin" />Starting…</> : <><Play className="w-4 h-4" strokeWidth={2.5} />Run Pipeline</>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Agent Cards */}
      <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="mb-7">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-subtle)" }}><Layers className="w-3.5 h-3.5" strokeWidth={2} />{t.agents.activeAgents}</h2>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium" style={{ background: "var(--glass-raised)", color: "var(--text-subtle)", border: "1px solid var(--glass-border)" }} aria-live="polite">{agentsLoading ? "…" : `${agents.length} agents`}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy={agentsLoading} aria-label="Agent cards">
          {agentsLoading ? Array.from({length: 3}).map((_, i) => <AgentCardSkeleton key={`agent-sk-${i}`} />) : agents.map((agent: any, i: number) => <AgentCard key={agent.id} agent={agent} index={i} />)}
        </div>
      </motion.div>

      {/* Run History */}
      <motion.div custom={3} variants={FADE_UP} initial="hidden" animate="visible">
        <button onClick={() => setShowHistory((v) => !v)} className="flex items-center justify-between w-full mb-4 group">
          <h2 className="text-[11px] font-bold uppercase tracking-widest flex items-center gap-2" style={{ color: "var(--text-subtle)" }}><Clock className="w-3.5 h-3.5" strokeWidth={2} />{t.agents.pipelineRuns}</h2>
          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium" style={{ background: "var(--glass-raised)", color: "var(--text-subtle)", border: "1px solid var(--glass-border)" }}>{runs.length} total</span>
            <ChevronRight className="w-4 h-4 transition-transform" style={{ color: "var(--text-subtle)", transform: showHistory ? "rotate(90deg)" : "rotate(0deg)" }} strokeWidth={1.8} />
          </div>
        </button>
        <AnimatePresence>
          {showHistory && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
              {runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 rounded-2xl" style={{ border: "2px dashed var(--glass-border-strong)", background: "var(--glass-raised)" }}>
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(192,132,252,0.08)", border: "1px solid rgba(192,132,252,0.16)" }}><Sparkles className="w-7 h-7" style={{ color: "#C084FC", opacity: 0.5 }} strokeWidth={1.5} /></div>
                  <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>{t.agents.noRuns}</p>
                  <p className="text-[12px] mt-1" style={{ color: "var(--text-subtle)" }}>{t.agents.noRunsHint}</p>
                </div>
              ) : <AgentRunHistory />}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </PageShell>
  );
}
