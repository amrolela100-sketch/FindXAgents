import { useState, useEffect, useRef } from "react";
import { Loader2, CheckCircle2, XCircle, Wrench, Clock, Filter, ChevronDown, Activity } from "lucide-react";
import { getRunLogs } from "../lib/api";
import type { AgentLog } from "../lib/types";

const LEVEL_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
  info:    { color: "#60A5FA", bg: "rgba(59,130,246,0.08)",  border: "rgba(59,130,246,0.20)",  icon: Clock },
  success: { color: "#34D399", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.20)", icon: CheckCircle2 },
  error:   { color: "#F87171", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.20)",  icon: XCircle },
  warn:    { color: "#FBBF24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.20)", icon: Clock },
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
      } catch {
        if (!cancelled) setLoading(false);
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
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      {/* Header / toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-3.5 flex items-center justify-between transition-colors hover:bg-[var(--glass-raised)]"
        style={{ borderBottom: expanded ? "1px solid var(--glass-border)" : undefined }}
      >
        <h3 className="text-xs font-semibold flex items-center gap-2.5" style={{ color: "var(--text)" }}>
          {!pipelineRunId ? (
            <Activity className="w-4 h-4" style={{ color: "var(--text-subtle)" }} />
          ) : isDone ? (
            status === "failed" || status === "cancelled" ? (
              <XCircle className="w-4 h-4" style={{ color: "#F87171" }} />
            ) : (
              <CheckCircle2 className="w-4 h-4" style={{ color: "#34D399" }} />
            )
          ) : (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#60A5FA" }} />
          )}
          Live Monitor
          <span className="text-[10px] font-normal ml-1" style={{ color: "var(--text-subtle)" }}>
            {filteredLogs.length} events
          </span>
        </h3>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-150 ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {expanded && (
        <>
          {/* Phase filter */}
          <div
            className="flex items-center justify-end px-5 py-2"
            style={{ borderBottom: "1px solid var(--glass-border)" }}
          >
            <div
              className="flex items-center gap-1 p-0.5 rounded-xl"
              style={{
                background: "var(--glass-raised)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <Filter className="w-3 h-3 ml-1" style={{ color: "var(--text-subtle)" }} />
              {PHASE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setPhaseFilter(opt.key)}
                  className="px-2.5 py-1 text-[10px] font-medium rounded-lg transition-all duration-100"
                  style={
                    phaseFilter === opt.key
                      ? {
                          background: "var(--brand)",
                          color: "#fff",
                          boxShadow: "0 2px 6px var(--brand-glow)",
                        }
                      : { color: "var(--text-muted)" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Log list */}
          <div
            ref={scrollRef}
            className="overflow-y-auto font-mono text-xs leading-relaxed kanban-scroll"
            style={{
              maxHeight,
              background: "rgba(0,0,0,0.04)",
            }}
          >
            {loading && logs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-3" style={{ color: "var(--text-subtle)" }} />
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>Waiting for agent activity...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-xs" style={{ color: "var(--text-subtle)" }}>
                  No events{phaseFilter !== "all" ? ` for ${phaseFilter} phase` : " yet"}
                </p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                const cfg = LEVEL_CONFIG[log.level] ?? LEVEL_CONFIG.info;
                const Icon = cfg.icon;
                const time = new Date(log.createdAt).toLocaleTimeString();

                return (
                  <div
                    key={log.id}
                    className="px-5 py-2.5 transition-colors hover:bg-[var(--glass)]"
                    style={{ borderBottom: "1px solid var(--glass-border)" }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="shrink-0 w-14 text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
                        {time}
                      </span>
                      <Icon className="w-3 h-3 mt-1 shrink-0" style={{ color: cfg.color }} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wide"
                            style={{ color: "var(--text-muted)" }}
                          >
                            {log.phase}
                          </span>
                          <span style={{ color: "var(--text)" }}>{log.message}</span>
                        </div>

                        {log.toolName && (
                          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md"
                              style={{
                                background: "rgba(59,130,246,0.10)",
                                color: "#60A5FA",
                                border: "1px solid rgba(59,130,246,0.20)",
                              }}
                            >
                              <Wrench className="w-2.5 h-2.5" />
                              {log.toolName}
                            </span>
                            {log.duration != null && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{
                                  color: "var(--text-muted)",
                                  background: "var(--glass)",
                                  border: "1px solid var(--glass-border)",
                                }}
                              >
                                {log.duration}ms
                              </span>
                            )}
                            {log.tokens != null && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-md"
                                style={{
                                  color: "var(--text-muted)",
                                  background: "var(--glass)",
                                  border: "1px solid var(--glass-border)",
                                }}
                              >
                                {log.tokens} tokens
                              </span>
                            )}
                          </div>
                        )}

                        {log.toolInput && (
                          <pre
                            className="mt-1.5 text-[10px] whitespace-pre-wrap break-all max-h-20 overflow-hidden rounded-lg p-2"
                            style={{
                              color: "var(--text-muted)",
                              background: "var(--glass)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
                            {JSON.stringify(log.toolInput, null, 2).slice(0, 300)}
                          </pre>
                        )}

                        {log.toolOutput && (
                          <pre
                            className="mt-1.5 text-[10px] whitespace-pre-wrap break-all max-h-20 overflow-hidden rounded-lg p-2"
                            style={{
                              color: "#34D399",
                              background: "rgba(16,185,129,0.06)",
                              border: "1px solid rgba(16,185,129,0.18)",
                            }}
                          >
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
