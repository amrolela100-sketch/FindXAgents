import { useState, type MouseEvent } from "react";
import { ChevronDown, Square, Loader2 } from "lucide-react";
import { getAgentRuns, cancelAgentRun } from "../lib/api";
import type { AgentPipelineRun, AgentRunStatus } from "../lib/types";
import { usePolling } from "../lib/hooks/use-polling";

const STATUS_DOT_COLOR: Record<AgentRunStatus, string> = {
  completed: "#34D399",
  running:   "#FBBF24",
  failed:    "#F87171",
  partial:   "#FB923C",
  queued:    "#94A3B8",
  cancelled: "#6B7280",
};

function formatDuration(start: string, end: string | null): string | null {
  if (!end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const totalSec = Math.round(ms / 1000);
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, "0")}s`;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full skeleton" />
        <div className="h-3.5 w-20 rounded skeleton" />
        <div className="h-3.5 w-48 rounded skeleton" />
        <div className="ml-auto h-3.5 w-12 rounded skeleton" />
        <div className="h-3.5 w-16 rounded skeleton" />
      </div>
    </div>
  );
}

function RunRow({ run, onCancelled }: { run: AgentPipelineRun; onCancelled?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const duration = formatDuration(run.createdAt, run.completedAt);
  const dotColor = STATUS_DOT_COLOR[run.status];
  const isLive = run.status === "running" || run.status === "queued";

  async function handleCancel(e: MouseEvent) {
    e.stopPropagation();
    setCancelling(true);
    try {
      await cancelAgentRun(run.id);
      onCancelled?.();
    } catch (err) {
      console.error(err);
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors hover:bg-[var(--glass-raised)]"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${isLive ? "animate-pulse" : ""}`}
          style={{
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}80`,
          }}
        />
        <span className="font-mono text-xs" style={{ color: "var(--text-subtle)" }}>
          {run.id.slice(0, 8)}
        </span>
        <span className="text-sm truncate" style={{ color: "var(--text)" }}>
          {run.leadsFound} discovered → {run.leadsAnalyzed} analyzed → {run.emailsDrafted} emailed
        </span>
        <span className="ml-auto text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
          {duration ?? "..."}
        </span>
        <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-subtle)" }}>
          {formatRelativeTime(run.createdAt)}
        </span>
        {isLive && (
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-shrink-0 p-1 rounded-lg transition-colors"
            style={{ color: "#F87171" }}
            title="Cancel run"
          >
            {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5" />}
          </button>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--text-subtle)" }}
        />
      </button>

      {expanded && (
        <div
          className="px-4 py-3"
          style={{
            background: "rgba(0,0,0,0.04)",
            borderBottom: "1px solid var(--glass-border)",
          }}
        >
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <span>Query: <span style={{ color: "var(--text)" }}>{run.query || "N/A"}</span></span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs flex-wrap">
            <span style={{ color: "#34D399" }}>Research: {run.leadsFound} leads</span>
            <span style={{ color: "var(--text-subtle)" }}>→</span>
            <span style={{ color: "#60A5FA" }}>Analysis: {run.leadsAnalyzed} analyzed</span>
            <span style={{ color: "var(--text-subtle)" }}>→</span>
            <span style={{ color: "#FBBF24" }}>Outreach: {run.emailsDrafted} drafted</span>
          </div>
          {run.error && (
            <p className="mt-2 text-xs" style={{ color: "#F87171" }}>Error: {run.error}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: "var(--text-subtle)" }}>
            <span>Status: {run.status}</span>
            {run.completedAt && <span>Completed: {new Date(run.completedAt).toLocaleString()}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AgentRunHistory() {
  const { data, isLoading } = usePolling(() => getAgentRuns(), 5000);
  const runs = data?.runs?.slice(0, 5) ?? [];

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
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <h3 className="text-xs font-semibold" style={{ color: "var(--text)" }}>
          Recent Pipeline Runs
        </h3>
        {data && (
          <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
            {data.runs.length} total
          </span>
        )}
      </div>

      <div className="overflow-y-auto kanban-scroll" style={{ maxHeight: 300 }}>
        {isLoading ? (
          <>{[1,2,3].map(i => <SkeletonRow key={i} />)}</>
        ) : runs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-subtle)" }}>
            No pipeline runs yet
          </div>
        ) : (
          runs.map((run) => <RunRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
