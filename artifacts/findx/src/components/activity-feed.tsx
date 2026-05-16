import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getLeads, getAgentRuns } from "../lib/api";
import type { Lead, AgentPipelineRun } from "../lib/types";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { UserPlus, Search, Mail, Bot, AlertTriangle } from "lucide-react";

type ActivityType = "lead" | "analysis" | "outreach" | "run" | "run_failed";

type ActivityItem = {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
};

/* ─── Mapping Activity to Semantic Tokens ───────────────────────────────────── */
const TYPE_CONFIG: Record<ActivityType, { icon: React.ReactNode; colorClass: string; bgClass: string; borderClass: string; glowClass: string }> = {
  lead: { 
    icon: <UserPlus className="w-3.5 h-3.5" />, 
    colorClass: "text-info", 
    bgClass: "bg-info-bg", 
    borderClass: "border-info-border",
    glowClass: "shadow-glow-info"
  },
  analysis: { 
    icon: <Search className="w-3.5 h-3.5" />, 
    colorClass: "text-warning", 
    bgClass: "bg-warning-bg", 
    borderClass: "border-warning-border",
    glowClass: "shadow-glow-warning"
  },
  outreach: { 
    icon: <Mail className="w-3.5 h-3.5" />, 
    colorClass: "text-success", 
    bgClass: "bg-success-bg", 
    borderClass: "border-success-border",
    glowClass: "shadow-glow-success"
  },
  run: { 
    icon: <Bot className="w-3.5 h-3.5" />, 
    colorClass: "text-primary", 
    bgClass: "bg-primary/10", 
    borderClass: "border-primary/20",
    glowClass: "shadow-glow-brand"
  },
  run_failed: { 
    icon: <AlertTriangle className="w-3.5 h-3.5" />, 
    colorClass: "text-danger", 
    bgClass: "bg-danger-bg", 
    borderClass: "border-danger-border",
    glowClass: "shadow-glow-danger"
  },
};

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 0) return "just now";
  const s = Math.floor(diffMs / 1000);
  if (s < 60)   return "just now";
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30)   return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildActivityItems(leads: Lead[], runs: AgentPipelineRun[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const lead of leads) {
    items.push({
      id: `lead-${lead.id}`,
      type: "lead",
      description: `New lead discovered: ${lead.businessName}${lead.city && lead.city !== "—" ? ` · ${lead.city}` : ""}`,
      timestamp: lead.discoveredAt ?? lead.createdAt,
    });
    if (Array.isArray((lead as any).analyses)) {
      for (const a of (lead as any).analyses) {
        items.push({
          id: `analysis-${a.id}`,
          type: "analysis",
          description: `Analyzed ${lead.businessName}${a.score != null ? ` — score ${a.score}/100` : ""}`,
          timestamp: a.analyzedAt,
        });
      }
    }
    if (Array.isArray((lead as any).outreaches)) {
      for (const o of (lead as any).outreaches) {
        items.push({
          id: `outreach-${o.id}`,
          type: "outreach",
          description: `${o.status === "sent" ? "Email sent to" : "Email drafted for"} ${lead.businessName}`,
          timestamp: o.sentAt ?? o.createdAt,
        });
      }
    }
  }

  for (const run of runs) {
    items.push({
      id: `run-${run.id}`,
      type: run.status === "failed" ? "run_failed" : "run",
      description: run.status === "failed"
        ? `Pipeline failed: "${run.query}"`
        : `Pipeline ${run.status}: "${run.query}"`,
      timestamp: run.completedAt ?? run.createdAt,
    });
  }

  return items
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 12);
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonRow({ w }: { w: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-7 h-7 rounded-xl bg-muted/20 skeleton flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 rounded bg-muted/30 skeleton" style={{ width: w }} />
        <div className="h-2 rounded bg-muted/10 skeleton w-20" />
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export function ActivityFeed({ compact = false }: { compact?: boolean }) {
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

  const items = useMemo(() => {
    if (!leadsData && !runsData) return [];
    return buildActivityItems(leadsData?.leads ?? [], runsData?.runs ?? []);
  }, [leadsData, runsData]);

  const isLoading = leadsLoading || runsLoading;
  const limit = compact ? 8 : 12;

  if (isLoading && items.length === 0) {
    return (
      <div className="space-y-0 divide-y border-glass-border">
        {["70%", "55%", "65%", "50%", "60%"].map((w, i) => (
          <SkeletonRow key={i} w={w} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl bg-glass-raised border border-glass-border">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-primary/10 border border-primary/20 text-primary">
          <Bot className="w-5 h-5" strokeWidth={1.5} />
        </div>
        <p className="text-[13px] font-medium text-text-muted">
          No recent activity yet
        </p>
        <p className="text-[12px] mt-1 text-text-subtle">
          Run an agent pipeline to start discovering leads
        </p>
      </div>
    );
  }

  return (
    <div
      className="overflow-y-auto scrollbar-thin"
      style={{ maxHeight: compact ? "320px" : "420px" }}
    >
      <div className="relative">
        {/* Vertical line with gradient fade */}
        <div className="absolute left-[13px] top-3 bottom-3 w-px bg-gradient-to-b from-transparent via-glass-border to-transparent" />

        <AnimatePresence initial={false}>
          <ul className="space-y-0">
            {items.slice(0, limit).map((item, idx) => {
              const cfg = TYPE_CONFIG[item.type];
              return (
                <motion.li
                  key={item.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 120, damping: 20, delay: idx * 0.03 }}
                  className="flex items-start gap-3 group"
                >
                  {/* Timeline node with semantic coloring and glow */}
                  <div className={`
                    relative z-10 w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-2
                    border ${cfg.borderClass} ${cfg.bgClass} ${cfg.colorClass} ${cfg.glowClass}
                    transition-all duration-300
                  `}>
                    {cfg.icon}
                  </div>

                  {/* Content row */}
                  <div className={`
                    flex-1 flex items-start justify-between gap-3 py-2.5 border-b
                    ${idx === items.length - 1 ? "border-transparent" : "border-glass-border"}
                  `}>
                    <p className="text-[13px] leading-snug text-text">
                      {item.description}
                    </p>
                    <span className="text-[11px] flex-shrink-0 tabular-nums font-mono mt-0.5 text-text-subtle">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </AnimatePresence>
      </div>
    </div>
  );
}
