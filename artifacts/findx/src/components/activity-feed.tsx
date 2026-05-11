import { useMemo } from "react";
import { getLeads, getAgentRuns } from "../lib/api";
import type { Lead, AgentPipelineRun } from "../lib/types";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";

type ActivityItem = {
  id: string;
  icon: string;
  description: string;
  timestamp: string;
};

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  if (diffMs < 0) return "just now";
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function buildActivityItems(leads: Lead[], runs: AgentPipelineRun[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const lead of leads) {
    items.push({
      id: `lead-${lead.id}`,
      icon: "🟢",
      description: `New lead: ${lead.businessName} in ${lead.city}`,
      timestamp: lead.discoveredAt ?? lead.createdAt,
    });
    if (Array.isArray(lead.analyses)) {
      for (const a of lead.analyses) {
        items.push({
          id: `analysis-${a.id}`,
          icon: "🔍",
          description: `Analysis complete for ${lead.businessName} (score: ${a.score ?? "N/A"})`,
          timestamp: a.analyzedAt,
        });
      }
    }
    if (Array.isArray(lead.outreaches)) {
      for (const o of lead.outreaches) {
        const label = o.status === "sent" ? "sent" : o.status === "draft" ? "drafted" : o.status;
        items.push({
          id: `outreach-${o.id}`,
          icon: o.status === "sent" ? "📧" : "✉️",
          description: `Email ${label} for ${lead.businessName}`,
          timestamp: o.sentAt ?? o.createdAt,
        });
      }
    }
  }

  for (const run of runs) {
    const isFailed = run.status === "failed";
    items.push({
      id: `run-${run.id}`,
      icon: isFailed ? "⚠️" : "🤖",
      description: isFailed
        ? `Agent pipeline failed: ${run.error ?? "unknown error"}`
        : `Agent pipeline run ${run.status}`,
      timestamp: run.completedAt ?? run.createdAt,
    });
  }

  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return items.slice(0, 10);
}

function SkeletonItems() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-5 h-5 rounded-md skeleton shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 skeleton rounded-md w-3/4" />
            <div className="h-2 skeleton rounded-md w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed() {
  const { data: leadsData, isLoading: leadsLoading } = useRealtimeData(
    () => getLeads({ pageSize: 10 }),
    ["leads"],
    30_000,
  );
  const { data: runsData, isLoading: runsLoading } = useRealtimeData(
    () => getAgentRuns(),
    ["agent_pipeline_runs"],
    30_000,
  );

  const items = useMemo<ActivityItem[]>(() => {
    if (!leadsData && !runsData) return [];
    return buildActivityItems(leadsData?.leads ?? [], runsData?.runs ?? []);
  }, [leadsData, runsData]);

  const isLoading = leadsLoading || runsLoading;

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
        className="px-4 py-3"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Recent Activity
        </h3>
      </div>

      <div className="overflow-y-auto max-h-[400px] kanban-scroll">
        {isLoading && items.length === 0 ? (
          <SkeletonItems />
        ) : items.length === 0 ? (
          <div
            className="flex items-center justify-center py-12 text-sm"
            style={{ color: "var(--text-subtle)" }}
          >
            No recent activity
          </div>
        ) : (
          <ul>
            {items.map((item, idx) => (
              <li
                key={item.id}
                className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-[var(--glass-raised)]"
                style={{
                  borderBottom: idx < items.length - 1 ? "1px solid var(--glass-border)" : undefined,
                }}
              >
                <span className="text-base shrink-0 mt-0.5 leading-none">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: "var(--text)" }}>
                    {item.description}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>
                    {formatRelativeTime(item.timestamp)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
