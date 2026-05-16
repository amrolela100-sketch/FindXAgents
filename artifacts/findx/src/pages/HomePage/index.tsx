import { motion } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { DashboardCards } from "@/components/dashboard-cards";
import { ActivityFeed } from "@/components/activity-feed";
import { usePolling } from "@/lib/hooks/use-polling";
import { useLang } from "@/lib/lang-context";
import { useAuth } from "@/lib/auth-context";
import { getDashboardStats, getScoreDistribution, getAgentRuns } from "@/lib/api";
import { StatCardSkeleton } from "@/components/ui/skeleton-patterns";
import { Link } from "wouter";
import {
  TrendingUp, Zap, ChevronRight, Target, Activity,
  CheckCircle2, AlertCircle, Clock, Award, Flame, Thermometer, Snowflake, Circle, Play, ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { STAGGER_CONTAINER as containerVariants, STAGGER_CHILD as itemVariants } from "@/lib/motion";

const SPRING = { type: "spring", stiffness: 100, damping: 15 };

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ hot, warm, cold, unscored, total }: {
  hot: number; warm: number; cold: number; unscored: number; total: number;
}) {
  const SIZE = 100, R = 38, CX = 50, C = 2 * Math.PI * R;
  const segs = [
    { v: hot,      colorClass: "stroke-success" },
    { v: warm,     colorClass: "stroke-warning" },
    { v: cold,     colorClass: "stroke-info" },
    { v: unscored, colorClass: "stroke-glass-border-strong" },
  ];
  let offset = 0;
  const arcs = segs.map(seg => {
    const pct = total > 0 ? seg.v / total : 0;
    const arc = { dash: pct * C, gap: (1 - pct) * C, offset: -offset * C, colorClass: seg.colorClass };
    offset += pct;
    return arc;
  });

  return (
    <div className="relative flex items-center justify-center w-[100px] h-[100px]">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle cx={CX} cy={CX} r={R} fill="none" className="stroke-glass-raised" strokeWidth="9" />
        {arcs.map((arc, i) => (
          <motion.circle
            key={i}
            cx={CX} cy={CX} r={R}
            fill="none"
            className={arc.colorClass}
            strokeWidth="9"
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.offset}
            initial={{ strokeDasharray: `0 ${C}` }}
            animate={{ strokeDasharray: `${arc.dash} ${arc.gap}` }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: i * 0.1 }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold leading-none text-text">{total}</span>
        <span className="text-[10px] mt-0.5 font-medium text-text-subtle">leads</span>
      </div>
    </div>
  );
}

// ── Score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, count, total, colorClass, icon: Icon }: {
  label: string; count: number; total: number; colorClass: string; icon: any;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1.5">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Icon className={cn("w-3 h-3", colorClass)} strokeWidth={1.5} />
          {label}
        </div>
        <span className="font-semibold font-mono text-text">
          {count}
          <span className="font-normal ml-1 text-text-subtle">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-glass-raised">
        <motion.div
          className={cn("h-full rounded-full", colorClass.replace('text-', 'bg-'))}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </div>
    </div>
  );
}

// ── Funnel step ───────────────────────────────────────────────────────────────
function FunnelStep({ label, count, total, colorClass }: {
  label: string; count: number; total: number; colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className={cn("w-2 h-2 rounded-full flex-shrink-0 shadow-sm", colorClass.replace('text-', 'bg-'))} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[12px] mb-1">
          <span className="text-text-muted">{label}</span>
          <span className="font-semibold font-mono text-text">{count}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden bg-glass-raised">
          <motion.div
            className={cn("h-full rounded-full", colorClass.replace('text-', 'bg-'))}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Run status icon ───────────────────────────────────────────────────────────
function RunStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-4 h-4 text-success" />;
  if (status === "failed")    return <AlertCircle  className="w-4 h-4 text-danger" />;
  if (status === "running")   return <Activity     className="w-4 h-4 text-info animate-pulse" />;
  return <Clock className="w-4 h-4 text-warning" />;
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: any; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <motion.div variants={itemVariants} className="rounded-2xl p-5 h-full bg-glass backdrop-blur-glass border border-glass-border shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-text-subtle" strokeWidth={1.5} />
          <h3 className="text-[13.5px] font-semibold tracking-tight text-text">
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

// ════════════════════════════════════════
// HOME PAGE
// ════════════════════════════════════════
export default function HomePage() {
  const { t }    = useLang();
  const { user } = useAuth();
  const { data: statsData, isLoading: statsLoading, error: statsError } = usePolling(() => getDashboardStats(), 15_000);
  const { data: scoreData } = usePolling(() => getScoreDistribution(), 30_000);
  const { data: runsData  } = usePolling(() => getAgentRuns(), 10_000);

  const stats        = statsData?.stats;
  const scoreDistrib = scoreData?.buckets;
  const avgScore     = scoreData?.avgScore ?? 0;
  const recentRuns   = runsData?.runs?.slice(0, 5) ?? [];
  const activeRun    = runsData?.runs?.find(r => r.status === "running" || r.status === "queued");
  const scoreTotal   = scoreDistrib
    ? scoreDistrib.hot + scoreDistrib.warm + scoreDistrib.cold + scoreDistrib.unscored
    : 0;

  const firstName = user?.email?.split("@")[0]?.split(".")?.[0];
  const greeting  = firstName
    ? `Welcome back, ${firstName.charAt(0).toUpperCase() + firstName.slice(1)}`
    : "Welcome back";

  const scoreBuckets = [
    { label: t.dashboard.hot,      key: "hot"      as const, colorClass: "text-success", icon: Flame       },
    { label: t.dashboard.warm,     key: "warm"     as const, colorClass: "text-warning", icon: Thermometer },
    { label: t.dashboard.cold,     key: "cold"     as const, colorClass: "text-info",    icon: Snowflake   },
    { label: t.dashboard.unscored, key: "unscored" as const, colorClass: "text-text-subtle", icon: Circle },
  ];

  return (
    <PageShell>
      <div className="px-5 md:px-8 py-6 space-y-6">

        {/* Welcome header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">
              {greeting} 👋
            </h1>
            <p className="text-sm mt-1 text-text-muted">
              {t.dashboard.subtitle}
            </p>
          </div>
          <Link href="/agents">
            <button className="btn btn-primary h-10 px-5 flex items-center gap-2 font-bold shadow-glow-brand">
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Agent
            </button>
          </Link>
        </motion.div>

        {/* Active pipeline banner */}
        {activeRun && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-info/10 border border-info/20 backdrop-blur-md"
          >
            <div className="relative">
              <Activity className="w-5 h-5 text-info" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-info animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-info">
                {t.dashboard.runningPipeline}
              </p>
              <p className="text-xs truncate font-mono text-info/70">
                "{activeRun.query}"
              </p>
            </div>
            <Link href="/agents">
              <a className="text-xs font-bold flex items-center gap-1 text-info hover:underline">
                {t.dashboard.view} <ArrowRight className="w-4 h-4" />
              </a>
            </Link>
          </motion.div>
        )}

        {/* KPI cards */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : statsError ? (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm bg-danger/10 border border-danger/20 text-danger">
            <AlertCircle className="w-4 h-4" />
            <span>Failed to load stats</span>
            <button className="underline font-bold ml-auto" onClick={() => window.location.reload()}>Retry</button>
          </div>
        ) : (
          <DashboardCards />
        )}

        {/* Bento grid */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Score distribution */}
          <div className="lg:col-span-4">
            <SectionCard title={t.dashboard.leadScores} icon={Award}>
              <div className="flex items-center gap-6 mb-6">
                {scoreDistrib ? (
                  <DonutChart
                    hot={scoreDistrib.hot}
                    warm={scoreDistrib.warm}
                    cold={scoreDistrib.cold}
                    unscored={scoreDistrib.unscored}
                    total={scoreTotal}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-glass-raised animate-pulse" />
                )}
                <div className="flex flex-col">
                  <p className="text-xs text-text-subtle mb-1">{t.dashboard.avgScore}</p>
                  <div className="text-4xl font-bold tracking-tighter text-primary">
                    {avgScore.toFixed(0)}
                    <span className="text-xs text-text-subtle font-medium ml-1">/ 100</span>
                  </div>
                </div>
              </div>

              {scoreDistrib ? (
                <div className="space-y-4">
                  {scoreBuckets.map(({ label, key, colorClass, icon }) => (
                    <ScoreBar
                      key={key}
                      label={label}
                      count={scoreDistrib[key]}
                      total={scoreTotal}
                      colorClass={colorClass}
                      icon={icon}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                   {[...Array(4)].map((_, i) => <div key={i} className="h-6 bg-glass-raised rounded-lg animate-pulse" />)}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Conversion funnel */}
          <div className="lg:col-span-4">
            <SectionCard title={t.dashboard.convFunnel} icon={Target}>
              {stats ? (
                <div className="space-y-4">
                  <FunnelStep label={t.dashboard.totalLeads} count={stats.totalLeads}     total={stats.totalLeads} colorClass="text-info" />
                  <FunnelStep label={t.dashboard.analyzed}   count={stats.leadsAnalyzed}  total={stats.totalLeads} colorClass="text-warning" />
                  <FunnelStep label={t.dashboard.contacted}  count={stats.leadsContacted} total={stats.totalLeads} colorClass="text-success" />
                  <FunnelStep label="Responded"              count={stats.leadsResponded} total={stats.totalLeads} colorClass="text-primary" />
                  <FunnelStep label="Won"                    count={stats.leadsWon}       total={stats.totalLeads} colorClass="text-success" />
                </div>
              ) : (
                <div className="space-y-4">
                   {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-glass-raised rounded-lg animate-pulse" />)}
                </div>
              )}

              {stats && (
                <div className="mt-8 p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted uppercase tracking-wider">Overall conversion</span>
                  <span className="text-2xl font-bold text-primary font-mono">{stats.conversionRate}%</span>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Recent runs */}
          <div className="lg:col-span-4">
            <SectionCard
              title={t.dashboard.recentRuns}
              icon={Zap}
              action={
                <Link href="/agents">
                  <a className="text-xs font-bold text-text-subtle hover:text-primary transition-colors flex items-center gap-0.5">
                    {t.dashboard.viewAll} <ChevronRight className="w-4 h-4" />
                  </a>
                </Link>
              }
            >
              {recentRuns.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center text-primary mb-4">
                    <Zap className="w-6 h-6 fill-current" />
                  </div>
                  <p className="text-sm font-bold text-text-muted">{t.dashboard.noRuns}</p>
                  <Link href="/agents">
                    <button className="mt-4 btn btn-ghost text-xs font-bold text-primary">
                      {t.dashboard.startFirst}
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentRuns.map((run, i) => (
                    <Link key={run.id} href="/agents">
                      <a className="flex items-start gap-3 p-3 rounded-xl bg-glass-raised border border-transparent hover:border-glass-border hover:bg-glass-overlay transition-all group">
                        <RunStatusIcon status={run.status} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">{run.query}</p>
                          <p className="text-[10px] mt-1 text-text-subtle font-bold uppercase tracking-tighter">
                            {run.leadsFound > 0 && <span>{run.leadsFound} leads • </span>}
                            {new Date(run.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </Link>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </motion.div>

        {/* Activity feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.3 }}
          className="rounded-2xl p-6 bg-glass backdrop-blur-glass border border-glass-border shadow-sm"
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-text-subtle" />
            <h3 className="text-sm font-bold tracking-tight text-text uppercase tracking-widest">
              {t.dashboard.recentActivity}
            </h3>
          </div>
          <ActivityFeed compact />
        </motion.div>

      </div>
    </PageShell>
  );
}
