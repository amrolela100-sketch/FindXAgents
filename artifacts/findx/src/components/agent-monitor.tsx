import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Wrench, Clock, Filter, ChevronDown, Activity } from "lucide-react";
import { getRunLogs } from "../lib/api";
import type { AgentLog } from "../lib/types";

const LEVEL_STYLES: Record<string, { text: string; icon: typeof CheckCircle2 }> = {
  info:    { text: "text-blue-600",   icon: Clock },
  success: { text: "text-emerald-600", icon: CheckCircle2 },
  error:   { text: "text-red-500",    icon: XCircle },
  warn:    { text: "text-amber-600",  icon: Clock },
};

const PHASE_OPTIONS = [
  { key: "all",      label: "All" },
  { key: "research", label: "Research" },
  { key: "analysis", label: "Analysis" },
  { key: "outreach", label: "Outreach" },
];

interface AgentMonitorProps {
  pipelineRunId: string;
  maxHeight?: number;
  status?: string;
}

export function AgentMonitor({ pipelineRunId, maxHeight = 600, status }: AgentMonitorProps) {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [expanded, setExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pipelineRunId) return;

    let cancelled = false;

    async function poll() {
      try {
        const result = await getRunLogs(pipelineRunId);
        if (!cancelled) {
          setLogs(result.logs);
          setLoading(false);

          if (scrollRef.current) {
            const el = scrollRef.current;
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
            if (nearBottom) {
              el.scrollTop = el.scrollHeight;
            }
          }
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    }

    poll();
    let interval: ReturnType<typeof setInterval> | undefined;
    if (status !== "completed" && status !== "failed" && status !== "partial" && status !== "cancelled") {
      interval = setInterval(poll, 3000);
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [pipelineRunId, status]);

  const filteredLogs = phaseFilter === "all"
    ? logs
    : logs.filter((log) => log.phase?.toLowerCase() === phaseFilter);

  const isDone = status === "completed" || status === "failed" || status === "partial" || status === "cancelled";

  return (
    <div className="bg-white rounded-xl border border-[#E5E3D9] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full px-5 py-3.5 flex items-center justify-between hover:bg-[#F7F5F0] transition-colors ${expanded ? "border-b border-[#E5E3D9]" : ""}`}
      >
        <h3 className="text-xs font-semibold text-[#1A1A1A] flex items-center gap-2.5">
          {!pipelineRunId ? (
            <Activity className="w-4 h-4 text-[#BDBDB0]" />
          ) : isDone ? (
            status === "failed" || status === "cancelled" ? (
              <XCircle className="w-4 h-4 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            )
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          )}
          Live Monitor
          <span className="text-[10px] font-normal text-[#BDBDB0] ml-1">{filteredLogs.length} events</span>
        </h3>
        <ChevronDown
          className={`w-4 h-4 text-[#BDBDB0] transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <>
          <div className="flex items-center justify-end px-5 py-2 border-b border-[#E5E3D9]">
            <div className="flex items-center gap-1 bg-[#F0EDE6] rounded-lg p-0.5">
              <Filter className="w-3 h-3 text-[#BDBDB0] mr-1" />
              {PHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPhaseFilter(opt.key)}
                  className={`px-2.5 py-1 text-[10px] font-medium rounded-md transition-all duration-100 ${
                    phaseFilter === opt.key
                      ? "bg-white text-[#1A1A1A] shadow-sm"
                      : "text-[#7A756D] hover:text-[#1A1A1A]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={scrollRef}
            className="overflow-y-auto font-mono text-xs leading-relaxed bg-[#F7F5F0]"
            style={{ maxHeight }}
          >
            {loading && logs.length === 0 ? (
              <div className="px-5 py-10 text-center text-[#7A756D]">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-[#BDBDB0]" />
                <p className="text-xs">Waiting for agent activity...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="px-5 py-10 text-center text-[#7A756D]">
                <p className="text-xs">No events{phaseFilter !== "all" ? ` for ${phaseFilter} phase` : " yet"}</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const style = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info;
                const Icon = style.icon;
                const time = new Date(log.createdAt).toLocaleTimeString();

                return (
                  <div
                    key={log.id}
                    className="px-5 py-2.5 border-b border-[#E5E3D9] hover:bg-white transition-colors"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="text-[#BDBDB0] shrink-0 w-16 text-[10px] mt-0.5">{time}</span>
                      <Icon className={`w-3 h-3 mt-1 shrink-0 ${style.text}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[#7A756D] font-semibold text-[10px] uppercase tracking-wide">
                            {log.phase}
                          </span>
                          <span className="text-[#1A1A1A]">{log.message}</span>
                        </div>

                        {log.toolName && (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                              <Wrench className="w-2.5 h-2.5" />
                              {log.toolName}
                            </span>
                            {log.duration != null && (
                              <span className="text-[10px] text-[#7A756D] bg-white border border-[#E5E3D9] px-1.5 py-0.5 rounded">
                                {log.duration}ms
                              </span>
                            )}
                            {log.tokens != null && (
                              <span className="text-[10px] text-[#7A756D] bg-white border border-[#E5E3D9] px-1.5 py-0.5 rounded">
                                {log.tokens} tokens
                              </span>
                            )}
                          </div>
                        )}

                        {log.toolInput && (
                          <pre className="mt-1.5 text-[10px] text-[#7A756D] whitespace-pre-wrap break-all max-h-20 overflow-hidden bg-white border border-[#E5E3D9] rounded-lg p-2">
                            {JSON.stringify(log.toolInput, null, 2).slice(0, 300)}
                          </pre>
                        )}

                        {log.toolOutput && (
                          <pre className="mt-1.5 text-[10px] text-emerald-700 whitespace-pre-wrap break-all max-h-20 overflow-hidden bg-emerald-50 border border-emerald-100 rounded-lg p-2">
                            {log.toolOutput.slice(0, 300)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
