import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { getAgentRuns } from "../lib/api";
import type { AgentPipelineRun, AgentRunStatus } from "../lib/types";
import { usePolling } from "../lib/hooks/use-polling";

const STATUS_DOT: Record<AgentRunStatus, string> = {
  completed: "bg-emerald-500",
  running: "bg-amber-400 animate-pulse",
  failed: "bg-red-500",
  partial: "bg-orange-400",
  queued: "bg-gray-400",
  cancelled: "bg-gray-300",
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
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

function SkeletonRow() {
  return (
    <div className="px-4 py-3 border-b border-[#E5E3D9]">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 rounded-full bg-[#E5E3D9] animate-pulse" />
        <div className="h-3.5 w-20 rounded bg-[#E5E3D9] animate-pulse" />
        <div className="h-3.5 w-48 rounded bg-[#E5E3D9] animate-pulse" />
        <div className="ml-auto h-3.5 w-12 rounded bg-[#E5E3D9] animate-pulse" />
        <div className="h-3.5 w-16 rounded bg-[#E5E3D9] animate-pulse" />
      </div>
    </div>
  );
}

function RunRow({ run }: { run: AgentPipelineRun }) {
  const [expanded, setExpanded] = useState(false);
  const duration = formatDuration(run.createdAt, run.completedAt);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 border-b border-[#E5E3D9] hover:bg-[#F7F5F0] transition-colors flex items-center gap-3"
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[run.status]}`}
        />
        <span className="font-mono text-sm text-[#7A756D]">
          {run.id.slice(0, 8)}
        </span>
        <span className="text-sm text-[#1A1A1A]">
          {run.leadsFound} discovered &rarr; {run.leadsAnalyzed} analyzed &rarr;{" "}
          {run.emailsDrafted} emailed
        </span>
        <span className="ml-auto text-xs text-[#7A756D] whitespace-nowrap">
          {duration ?? "..."}
        </span>
        <span className="text-xs text-[#BDBDB0] whitespace-nowrap">
          {formatRelativeTime(run.createdAt)}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#BDBDB0] transition-transform shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 py-3 bg-[#F7F5F0] border-b border-[#E5E3D9]">
          <div className="flex items-center gap-4 text-xs text-[#7A756D]">
            <span>
              Query:{" "}
              <span className="text-[#1A1A1A]">{run.query || "N/A"}</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs">
            <span className="text-emerald-600">Research: {run.leadsFound} leads</span>
            <span className="text-[#BDBDB0]">&rarr;</span>
            <span className="text-blue-600">Analysis: {run.leadsAnalyzed} analyzed</span>
            <span className="text-[#BDBDB0]">&rarr;</span>
            <span className="text-amber-600">Outreach: {run.emailsDrafted} drafted</span>
          </div>
          {run.error && (
            <p className="mt-2 text-xs text-red-500">Error: {run.error}</p>
          )}
          <div className="mt-2 flex items-center gap-3 text-[10px] text-[#BDBDB0]">
            <span>Status: {run.status}</span>
            {run.completedAt && (
              <span>Completed: {new Date(run.completedAt).toLocaleString()}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AgentRunHistory() {
  const { data, isLoading } = usePolling(
    () => getAgentRuns(),
    5000,
  );

  const runs = data?.runs?.slice(0, 5) ?? [];

  return (
    <div className="bg-white rounded-xl border border-[#E5E3D9] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#E5E3D9] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#1A1A1A]">
          Recent Pipeline Runs
        </h3>
        {data && (
          <span className="text-[10px] text-[#BDBDB0]">
            {data.runs.length} total
          </span>
        )}
      </div>

      <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
        {isLoading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : runs.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[#7A756D]">
            No pipeline runs yet
          </div>
        ) : (
          runs.map((run) => <RunRow key={run.id} run={run} />)
        )}
      </div>
    </div>
  );
}
