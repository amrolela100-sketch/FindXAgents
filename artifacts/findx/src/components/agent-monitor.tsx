import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Wrench, Clock, Filter, ChevronDown, Activity } from "lucide-react";
import { getRunLogs, toastError } from "../lib/api";
import type { AgentLog } from "../lib/types";
import { cn } from "@/lib/utils";

const LEVEL_CONFIG: Record<string, { colorClass: string; bgClass: string; borderClass: string; icon: any }> = {
  info:    { colorClass: "text-info",    bgClass: "bg-info-bg",    borderClass: "border-info-border",    icon: Clock },
  success: { colorClass: "text-success", bgClass: "bg-success-bg", borderClass: "border-success-border", icon: CheckCircle2 },
  error:   { colorClass: "text-danger",  bgClass: "bg-danger-bg",  borderClass: "border-danger-border",  icon: XCircle },
  warn:    { colorClass: "text-warning", bgClass: "bg-warning-bg", borderClass: "border-warning-border", icon: Clock },
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
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 100) {
              el.scrollTop = el.scrollHeight;
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
          toastError(err, "Failed to load agent logs");
        }
      }
    }

    poll();
    let interval: ReturnType<typeof setInterval> | undefined;
    if (!["completed","failed","partial","cancelled"].includes(status ?? "")) {
      interval = setInterval(poll, 3000);
    }
    return () => { cancelled = true; if (interval) clearInterval(interval); };
  }, [pipelineRunId, status]);

  const filteredLogs = phaseFilter === "all" ? logs : logs.filter((l) => l.phase?.toLowerCase() === phaseFilter);
  const isDone = ["completed","failed","partial","cancelled"].includes(status ?? "");

  return (
    <div className="rounded-2xl overflow-hidden bg-glass backdrop-blur-glass border border-glass-border shadow-lg">
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full px-5 py-3.5 flex items-center justify-between transition-colors hover:bg-glass-raised",
          expanded && "border-b border-glass-border"
        )}
      >
        <h3 className="text-xs font-semibold flex items-center gap-2.5 text-text">
          {!pipelineRunId ? (
            <Activity className="w-4 h-4 text-text-subtle" />
          ) : isDone ? (
            status === "failed" || status === "cancelled" ? (
              <XCircle className="w-4 h-4 text-danger" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-success" />
            )
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-info" />
          )}
          Live Monitor
          <span className="text-[10px] font-normal ml-1 text-text-subtle">
            {filteredLogs.length} events
          </span>
        </h3>
        <ChevronDown
          className={cn("w-4 h-4 transition-transform duration-150 text-text-subtle", expanded && "rotate-180")}
        />
      </button>

      {expanded && (
        <>
          {/* Phase filter */}
          <div className="flex items-center justify-end px-5 py-2 border-b border-glass-border bg-glass-raised/30">
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-glass-raised border border-glass-border">
              <Filter className="w-3 h-3 ml-1 text-text-subtle" />
              {PHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPhaseFilter(opt.key)}
                  className={cn(
                    "px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all duration-100",
                    phaseFilter === opt.key
                      ? "bg-primary text-primary-foreground shadow-glow-brand"
                      : "text-text-muted hover:text-text"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Log list */}
          <div
            ref={scrollRef}
            className="overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin bg-black/5 dark:bg-white/5"
            style={{ maxHeight }}
          >
            {loading && logs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3 text-text-subtle" />
                <p className="text-xs text-text-muted">Waiting for agent activity...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-xs text-text-subtle">
                  No events{phaseFilter !== "all" ? ` for ${phaseFilter} phase` : " yet"}
                </p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => {
                const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
                const Icon = cfg.icon;
                const time = new Date(log.createdAt).toLocaleTimeString();

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "px-5 py-2.5 transition-colors hover:bg-glass",
                      idx !== filteredLogs.length - 1 && "border-b border-glass-border"
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-14 text-[10px] mt-0.5 text-text-subtle">
                        {time}
                      </span>
                      <Icon className={cn("w-3 h-3 mt-1 shrink-0", cfg.colorClass)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                            {log.phase}
                          </span>
                          <span className="text-text">{log.message}</span>
                        </div>

                        {log.toolName && (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-info-bg text-info border border-info-border">
                              <Wrench className="w-2.5 h-2.5" />
                              {log.toolName}
                            </span>
                            {log.duration != null && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md text-text-muted bg-glass border border-glass-border">
                                {log.duration}ms
                              </span>
                            )}
                            {log.tokens != null && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md text-text-muted bg-glass border border-glass-border">
                                {log.tokens} tokens
                              </span>
                            )}
                          </div>
                        )}

                        {log.toolInput && (
                          <pre className="mt-1.5 text-[10px] whitespace-pre-wrap break-all max-h-20 overflow-hidden rounded-lg p-2 text-text-muted bg-glass border border-glass-border">
                            {JSON.stringify(log.toolInput, null, 2).slice(0, 300)}
                          </pre>
                        )}

                        {log.toolOutput && (
                          <pre className="mt-1.5 text-[10px] whitespace-pre-wrap break-all max-h-20 overflow-hidden rounded-lg p-2 text-success bg-success-bg/30 border border-success-border">
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
