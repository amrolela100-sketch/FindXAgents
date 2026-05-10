import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import {
  Bot, Search, Loader2, AlertTriangle, CheckCircle2, Mail,
  ExternalLink, Send, Eye, XCircle,
  ChevronRight, Sparkles, Play, ArrowDown, Users, BarChart3, Clock,
} from "lucide-react";
import { triggerAgentRun, getAgentRuns, getAgentRunEmails, getAgents, cancelAgentRun } from "../lib/api";
import type { AgentPipelineRun, AgentRunEmail, AgentRunStatus, Agent } from "../lib/types";
import { AgentMonitor } from "../components/agent-monitor";

const STATUS_STYLES: Record<AgentRunStatus, { bg: string; text: string; border: string; label: string; dot: string }> = {
  running:   { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200", label: "Running...", dot: "bg-amber-500" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", label: "Completed", dot: "bg-emerald-500" },
  partial:   { bg: "bg-orange-50", text: "text-orange-700",  border: "border-orange-200", label: "Partial", dot: "bg-orange-400" },
  failed:    { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-200",   label: "Failed", dot: "bg-red-500" },
  queued:    { bg: "bg-gray-50",   text: "text-gray-600",   border: "border-gray-200",  label: "Queued", dot: "bg-gray-400" },
  cancelled: { bg: "bg-gray-50",   text: "text-gray-500",   border: "border-gray-200",  label: "Cancelled", dot: "bg-gray-300" },
};

const AGENT_STEPS = [
  { key: "research",  label: "Research",  description: "Finding businesses", icon: Search, color: "bg-emerald-100 text-emerald-700" },
  { key: "analysis",  label: "Analysis",  description: "Scoring & reviewing", icon: Eye,    color: "bg-indigo-100 text-indigo-700" },
  { key: "outreach",  label: "Outreach",  description: "Drafting emails",     icon: Mail,   color: "bg-amber-100 text-amber-700" },
];

const inputCls = "w-full px-3 py-2.5 border border-[#E5E3D9] rounded-xl text-sm bg-white text-[#1A1A1A] placeholder:text-[#BDBDB0] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#C4C0B8]";

type Tab = "pipeline" | "agents";

export default function AgentsPage() {
  const [tab, setTab] = useState<Tab>("pipeline");
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState<string>("5");
  const [language, setLanguage] = useState<"en" | "nl" | "ar">("en");
  const [running, setRunning] = useState(false);
  const [runs, setRuns] = useState<AgentPipelineRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [emails, setEmails] = useState<AgentRunEmail[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const loadRuns = useCallback(async () => {
    try {
      const result = await getAgentRuns();
      setRuns(result.runs);
    } catch { /* ignore */ }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      const result = await getAgents();
      setAgents(result.agents);
    } catch {
      setAgents([]);
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    loadRuns().then(() => setInitialLoad(false));
    loadAgents();
  }, [loadRuns, loadAgents]);

  useEffect(() => {
    if (initialLoad || runs.length === 0 || selectedRunId) return;
    setSelectedRunId(runs[0].id);
  }, [runs, initialLoad, selectedRunId]);

  useEffect(() => {
    if (!running || !selectedRunId) return;
    const interval = setInterval(async () => {
      await loadRuns();
      if (selectedRunId) {
        try {
          const result = await getAgentRunEmails(selectedRunId);
          setEmails(result.emails);
        } catch { /* ignore */ }
      }
    }, 3000);
    pollRef.current = interval;
    return () => { clearInterval(interval); pollRef.current = null; };
  }, [running, selectedRunId, loadRuns]);

  useEffect(() => {
    if (!running) { setActiveStep(0); return; }
    const interval = setInterval(() => { setActiveStep((prev) => (prev + 1) % 3); }, 3000);
    return () => clearInterval(interval);
  }, [running]);

  useEffect(() => {
    if (!selectedRunId || running) { setEmails([]); return; }
    let cancelled = false;
    setLoadingEmails(true);
    getAgentRunEmails(selectedRunId)
      .then((result) => { if (!cancelled) setEmails(result.emails); })
      .catch(() => { if (!cancelled) setEmails([]); })
      .finally(() => { if (!cancelled) setLoadingEmails(false); });
    return () => { cancelled = true; };
  }, [selectedRunId, running]);

  useEffect(() => {
    if (!running || !selectedRunId) return;
    const currentRun = runs.find((r) => r.id === selectedRunId);
    if (currentRun && (currentRun.status === "completed" || currentRun.status === "failed" || currentRun.status === "partial" || currentRun.status === "cancelled")) {
      setRunning(false);
      getAgentRunEmails(selectedRunId).then((result) => setEmails(result.emails)).catch(() => {});
      setTimeout(() => { resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 500);
    }
  }, [runs, running, selectedRunId]);

  async function handleRun() {
    if (!query.trim()) return;
    setRunning(true);
    setError(null);
    setActiveStep(0);
    setEmails([]);
    const limit = maxResults ? parseInt(maxResults, 10) : undefined;
    try {
      const result = await triggerAgentRun({ query: query.trim(), sync: false, maxResults: limit && limit > 0 ? limit : undefined, language });
      const runId = (result as any).runId ?? (result as any).id;
      if (runId) setSelectedRunId(runId);
      setQuery("");
      await loadRuns();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pipeline failed");
      setRunning(false);
    }
  }

  async function handleCancel() {
    if (!selectedRunId) return;
    try { await cancelAgentRun(selectedRunId); } catch { /* ignore */ }
    setRunning(false);
    loadRuns();
  }

  async function handleCancelRun(runId: string) {
    try { await cancelAgentRun(runId); } catch { /* ignore */ }
    if (runId === selectedRunId) setRunning(false);
    loadRuns();
  }

  const selectedRun = runs.find((r) => r.id === selectedRunId);
  const sortedAgents = [...agents].sort((a, b) => a.pipelineOrder - b.pipelineOrder);
  const isCompleted = selectedRun?.status === "completed" || selectedRun?.status === "partial";

  return (
    <div className="p-8 space-y-6 bg-[#F7F5F0] min-h-screen">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Agent Pipeline</h1>
        <p className="text-sm text-[#7A756D] mt-0.5">Run your AI prospecting pipeline or manage individual agents</p>
      </div>

      <div className="flex items-center bg-white border border-[#E5E3D9] rounded-lg p-1 w-fit">
        {(["pipeline", "agents"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150 ${tab === t ? "bg-[#1A1A1A] text-white" : "text-[#7A756D] hover:text-[#1A1A1A]"}`}>
            {t === "pipeline" ? <Sparkles className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            {t === "pipeline" ? "Pipeline" : "Agents"}
          </button>
        ))}
      </div>

      {tab === "pipeline" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E3D9] p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#BDBDB0]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleRun(); }}
                  placeholder="e.g. restaurants in Amsterdam, dentistry in Rotterdam"
                  className={`pl-10 pr-3 ${inputCls}`}
                />
              </div>
              <div className="relative w-28">
                <input type="number" min="1" max="500" value={maxResults} onChange={(e) => setMaxResults(e.target.value)} placeholder="No limit"
                  className={`text-center ${inputCls}`} />
                <span className="absolute -top-2 left-2 px-1 text-[10px] text-[#7A756D] bg-white font-medium">Max results</span>
              </div>
              <div className="relative w-28">
                <select value={language} onChange={(e) => setLanguage(e.target.value as "en" | "nl" | "ar")}
                  className={`text-center appearance-none ${inputCls}`}>
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                  <option value="ar">العربية</option>
                </select>
                <span className="absolute -top-2 left-2 px-1 text-[10px] text-[#7A756D] bg-white font-medium">Language</span>
              </div>
              {!running ? (
                <button onClick={handleRun} disabled={!query.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#1A1A1A] text-white rounded-xl text-sm font-medium hover:bg-[#333] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150">
                  <Play className="w-4 h-4" />
                  Run Pipeline
                </button>
              ) : (
                <button onClick={handleCancel}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              )}
            </div>
            <p className="text-xs text-[#7A756D]">Describe the businesses you want to find. The pipeline will research, analyze, and generate outreach emails.</p>
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm mt-4">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {AGENT_STEPS.map((step, i) => {
              const StepIcon = step.icon;
              const isActive = running && activeStep === i;
              const isDone = running && activeStep > i;
              return (
                <div key={step.key} className="flex items-center">
                  <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border transition-all duration-500 ${
                    isActive ? "bg-white border-[#1A1A1A]/20 shadow-sm scale-105" : "bg-white border-[#E5E3D9]"
                  }`}>
                    <div className={`w-8 h-8 rounded-lg ${step.color} flex items-center justify-center transition-all duration-300 ${isActive ? "scale-110" : ""}`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className={`text-xs font-semibold block leading-tight ${isActive ? "text-[#1A1A1A]" : "text-[#7A756D]"}`}>{step.label}</span>
                      <span className="text-[10px] text-[#BDBDB0]">{isActive ? step.description : `Step ${i + 1}`}</span>
                    </div>
                    {isActive && <Loader2 className="w-4 h-4 text-[#7A756D] animate-spin ml-1" />}
                    {isDone && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-1" />}
                  </div>
                  {i < AGENT_STEPS.length - 1 && (
                    <ChevronRight className={`w-4 h-4 mx-1 ${running && activeStep > i ? "text-emerald-500" : "text-[#E5E3D9]"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {isCompleted && selectedRun && !running && (
            <div ref={resultsRef} className="bg-white rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A]">Pipeline Complete</h3>
                  <p className="text-xs text-[#7A756D]">{selectedRun.query}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { icon: Search,    label: "Found",    value: selectedRun.leadsFound,    sub: "businesses", color: "text-emerald-600 bg-emerald-50" },
                  { icon: BarChart3, label: "Analyzed", value: selectedRun.leadsAnalyzed, sub: "websites",   color: "text-indigo-600 bg-indigo-50" },
                  { icon: Mail,      label: "Emails",   value: selectedRun.emailsDrafted, sub: "drafted",    color: "text-amber-600 bg-amber-50" },
                  { icon: Users,     label: "Agents",   value: "3/3",                     sub: "completed",  color: "text-purple-600 bg-purple-50" },
                ].map(({ icon: Icon, label, value, sub, color }) => (
                  <div key={label} className="bg-[#F7F5F0] rounded-xl p-3 border border-[#E5E3D9]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${color}`}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] font-medium text-[#7A756D] uppercase tracking-wider">{label}</span>
                    </div>
                    <p className="text-xl font-serif font-bold text-[#1A1A1A]">{value}</p>
                    <p className="text-[10px] text-[#BDBDB0]">{sub}</p>
                  </div>
                ))}
              </div>
              {emails.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-blue-600">
                  <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
                  <span className="font-medium">Scroll down to see {emails.length} email draft{emails.length > 1 ? "s" : ""} and monitor</span>
                </div>
              )}
            </div>
          )}

          {selectedRun?.status === "failed" && !running && (
            <div ref={resultsRef} className="bg-red-50 rounded-xl border border-red-200 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-700">Pipeline Failed</h3>
                  <p className="text-xs text-red-500">{selectedRun.error || "Unknown error occurred"}</p>
                </div>
              </div>
            </div>
          )}

          {selectedRunId && (
            <div className="space-y-1">
              {running && (
                <div className="flex items-center gap-2 text-xs text-[#7A756D] font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Pipeline running — agents are working in real-time
                </div>
              )}
              <AgentMonitor pipelineRunId={selectedRunId} status={selectedRun?.status} />
            </div>
          )}

          {selectedRunId && !running && (
            <div className="bg-white rounded-xl border border-[#E5E3D9] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#E5E3D9] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#1A1A1A] flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#7A756D]" /> Email Drafts
                  {emails.length > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{emails.length}</span>}
                </h2>
                {selectedRun && <span className="text-xs text-[#7A756D] max-w-[200px] truncate">{selectedRun.query}</span>}
              </div>
              {loadingEmails ? (
                <div className="px-6 py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-[#BDBDB0] mx-auto" /></div>
              ) : emails.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <Mail className="w-8 h-8 text-[#E5E3D9] mx-auto mb-3" />
                  <p className="text-sm text-[#7A756D]">No email drafts for this run</p>
                  <p className="text-xs text-[#BDBDB0] mt-1">The outreach agent will create drafts when leads have valid email addresses</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E3D9]">
                  {emails.map((email) => (
                    <div key={email.id} className="px-6 py-4 flex items-start gap-4 hover:bg-[#F7F5F0] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-[#1A1A1A]">{email.lead.businessName}</span>
                          {email.lead.industry && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#F0EDE6] text-[#7A756D]">{email.lead.industry}</span>}
                          {email.lead.website && (
                            <a href={email.lead.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs font-medium text-[#1A1A1A] mb-0.5">{email.subject}</p>
                        <p className="text-xs text-[#7A756D] line-clamp-3">{email.body}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${
                          email.status === "sent"    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : email.status === "opened" ? "bg-blue-50 text-blue-700 ring-blue-200"
                          : email.status === "draft"  ? "bg-amber-50 text-amber-700 ring-amber-200"
                          : "bg-gray-50 text-gray-600 ring-gray-200"
                        }`}>
                          {email.status === "sent"   && <Send className="w-2.5 h-2.5" />}
                          {email.status === "opened" && <Mail className="w-2.5 h-2.5" />}
                          {email.status === "draft"  && <Sparkles className="w-2.5 h-2.5" />}
                          {email.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E5E3D9]">
            <div className="px-6 py-4 border-b border-[#E5E3D9] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#1A1A1A]">Pipeline Runs</h2>
              {runs.length > 0 && <span className="text-xs text-[#7A756D]">{runs.length} runs</span>}
            </div>
            {runs.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#F0EDE6] flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-6 h-6 text-[#BDBDB0]" />
                </div>
                <p className="text-sm font-medium text-[#7A756D]">No runs yet</p>
                <p className="text-xs text-[#BDBDB0] mt-1">Enter a search query above to start your first pipeline run</p>
              </div>
            ) : (
              <ul className="divide-y divide-[#E5E3D9]">
                {runs.map((run) => {
                  const style = STATUS_STYLES[run.status as AgentRunStatus] ?? STATUS_STYLES.queued;
                  const isSelected = run.id === selectedRunId;
                  return (
                    <li key={run.id} onClick={() => { if (!running) setSelectedRunId(isSelected ? null : run.id); }}
                      className={`px-6 py-4 cursor-pointer hover:bg-[#F7F5F0] transition-all duration-150 border-l-[3px] ${isSelected ? "border-l-[#1A1A1A] bg-[#F0EDE6]" : "border-l-transparent"} ${running && run.status === "running" ? "border-l-amber-400 bg-amber-50/50" : ""}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#1A1A1A] truncate">{run.query}</span>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-[#7A756D]">{new Date(run.createdAt).toLocaleString()}</span>
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ring-1 ring-inset ${style.bg} ${style.text} ${style.border}`}>
                            {run.status === "running"   && <Loader2 className="w-3 h-3 animate-spin" />}
                            {run.status === "completed" && <CheckCircle2 className="w-3 h-3" />}
                            {run.status === "failed"    && <AlertTriangle className="w-3 h-3" />}
                            {style.label}
                          </span>
                          {run.status === "running" && (
                            <button onClick={(e) => { e.stopPropagation(); handleCancelRun(run.id); }}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                              <XCircle className="w-3 h-3" />
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F0EDE6] text-[#7A756D]">{run.leadsFound} found</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{run.leadsAnalyzed} analyzed</span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">{run.emailsDrafted} emailed</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-[#BDBDB0]">
                          <Clock className="w-3 h-3" />
                          {new Date(run.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "agents" && (
        <div className="space-y-4">
          {loadingAgents ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="block bg-white border border-[#E5E3D9] rounded-xl p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F0EDE6] animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-[#F0EDE6] rounded animate-pulse" />
                        <div className="h-3 w-20 bg-[#F0EDE6] rounded animate-pulse" />
                      </div>
                    </div>
                    <div className="h-5 w-16 bg-[#F0EDE6] rounded-full animate-pulse" />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="h-3 w-3/4 bg-[#F0EDE6] rounded animate-pulse" />
                    <div className="h-3 w-1/2 bg-[#F0EDE6] rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedAgents.length === 0 ? (
            <div className="text-center py-16 text-[#7A756D]">
              <Bot className="w-10 h-10 mx-auto mb-3 text-[#BDBDB0]" />
              <p className="text-sm">No agents configured</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sortedAgents.map((agent) => (
                <Link key={agent.id} href={`/agents/${agent.name}`}
                  className="block bg-white border border-[#E5E3D9] rounded-xl p-5 hover:border-[#C4C0B8] transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F0EDE6] flex items-center justify-center group-hover:bg-[#E8E4DC] transition-colors">
                        <Bot className="w-5 h-5 text-[#1A1A1A]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-[#1A1A1A]">{agent.name}</h3>
                        <p className="text-xs text-[#7A756D]">Order: {agent.pipelineOrder}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${agent.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {agent.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {agent.description && (
                    <p className="mt-3 text-xs text-[#7A756D]">{agent.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
