import { motion } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { DashboardCards } from "../components/dashboard-cards";
import { ActivityFeed } from "../components/activity-feed";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";
import { getDashboardStats, getScoreDistribution, getAgentRuns } from "../lib/api";
import { StatCardSkeleton } from "../components/ui/skeleton-patterns";
import { Link } from "wouter";
import {
  TrendingUp, Zap, ChevronRight, Target, Activity,
  CheckCircle2, AlertCircle, Clock, Award, Flame, Thermometer, Snowflake, Circle, Play, ArrowRight,
} from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const GLASS_STYLE = {
  background: "var(--glass)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid var(--border)",
  boxShadow: "var(--shadow-sm)",
} as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

// ── Donut chart ───────────────────────────────────────────────────────────────
function DonutChart({ hot, warm, cold, unscored, total }: {
  hot: number; warm: number; cold: number; unscored: number; total: number;
}) {
  const SIZE = 100, R = 38, CX = 50, C = 2 * Math.PI * R;
  const segs = [
    { v: hot,      color: "var(--findx-feedback-success)" },
    { v: warm,     color: "var(--findx-feedback-warning)" },
    { v: cold,     color: "var(--findx-accent)" },
    { v: unscored, color: "var(--border-strong)" },
  ];
  let offset = 0;
  const arcs = segs.map(seg => {
    const pct = total > 0 ? seg.v / total : 0;
    const arc = { dash: pct * C, gap: (1 - pct) * C, offset: -offset * C, color: seg.color };
    offset += pct;
    return arc;
  });

  return (
    <div className="relative flex items-center justify-center" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--interactive-hover)" strokeWidth="9" />
        {arcs.map((arc, i) => (
          <motion.circle
            key={i}
            cx={CX} cy={CX} r={R}
            fill="none"
            stroke={arc.color}
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
function ScoreBar({ label, count, total, color, icon: Icon }: {
  label: string; count: number; total: number; color: string; icon: typeof Flame;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px] mb-1.5">
        <div className="flex items-center gap-1.5 text-text-muted">
          <Icon className="w-3 h-3" strokeWidth={1.5} style={{ color }} />
          {label}
        </div>
        <span className="font-semibold font-mono text-text">
          {count}
          <span className="font-normal ml-1 text-text-subtle">({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden bg-interactive-hover">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

// ── Funnel step ───────────────────────────────────────────────────────────────
function FunnelStep({ label, count, total, color }: {
  label: string; count: number; total: number; color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[12px] mb-1">
          <span className="text-text-muted">{label}</span>
          <span className="font-semibold font-mono text-text">{count}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden bg-interactive-hover">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            style={{ background: color }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Run status icon ───────────────────────────────────────────────────────────
function RunStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5 text-success" strokeWidth={1.5} />;
  if (status === "failed")    return <AlertCircle  className="w-3.5 h-3.5 text-danger" strokeWidth={1.5} />;
  if (status === "running")   return <Activity     className="w-3.5 h-3.5 text-primary animate-pulse" strokeWidth={1.5} />;
  return <Clock className="w-3.5 h-3.5 text-warning" strokeWidth={1.5} />;
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: typeof Target; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <motion.div variants={itemVariants} className="rounded-2xl p-5 h-full" style={GLASS_STYLE}>
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
    { label: t.dashboard.hot,      key: "hot"      as const, color: "var(--findx-feedback-success)", icon: Flame       },
    { label: t.dashboard.warm,     key: "warm"     as const, color: "var(--findx-feedback-warning)", icon: Thermometer },
    { label: t.dashboard.cold,     key: "cold"     as const, color: "var(--findx-accent)", icon: Snowflake   },
    { label: t.dashboard.unscored, key: "unscored" as const, color: "var(--text-subtle)", icon: Circle },
  ];

  return (
    <PageShell>
      <div className="px-5 md:px-8 py-6 space-y-6">

        {/* ── Welcome header ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-text">
              {greeting} 👋
            </h1>
            <p className="text-[13.5px] mt-1 text-text-muted">
              {t.dashboard.subtitle}
            </p>
          </div>
          <Link href="/agents">
            <a
              className="btn btn-primary self-start sm:self-auto flex items-center gap-2 font-semibold text-xs"
            >
              <Play className="w-3.5 h-3.5" strokeWidth={2.5} />
              Run Agent
            </a>
          </Link>
        </motion.div>

        {/* ── Active pipeline banner ──────────────────────────────── */}
        {activeRun && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={SPRING}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-md"
          >
            <div className="relative flex-shrink-0">
              <Activity className="w-4 h-4 text-primary" strokeWidth={1.5} />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-primary">
                {t.dashboard.runningPipeline}
              </p>
              <p className="text-[12px] truncate font-mono text-primary/80">
                "{activeRun.query}"
              </p>
            </div>
            <Link href="/agents">
              <a className="text-[12px] font-bold flex items-center gap-1 flex-shrink-0 text-primary">
                {t.dashboard.view} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </a>
            </Link>
          </motion.div>
        )}

        {/* ── KPI cards ───────────────────────────────────────────── */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4" aria-busy="true" aria-label="Loading KPI stats">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
        ) : statsError ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm border border-danger-border bg-danger-bg text-danger"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            <span>Failed to load stats —</span>
            <button
              className="underline font-medium"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <DashboardCards />
        )}

        {/* ── Bento grid ──────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-12 gap-5"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {/* Score distribution — 4 cols */}
          <div className="lg:col-span-4">
            <SectionCard title={t.dashboard.leadScores} icon={Award}>
              {/* Avg score + donut */}
              <div className="flex items-center gap-4 mb-5">
                {scoreDistrib ? (
                  <DonutChart
                    hot={scoreDistrib.hot}
                    warm={scoreDistrib.warm}
                    cold={scoreDistrib.cold}
                    unscored={scoreDistrib.unscored}
                    total={scoreTotal}
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full skeleton flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] mb-1 text-text-subtle">
                    {t.dashboard.avgScore}
                  </p>
                  <motion.p
                    className="text-[36px] font-bold leading-none tracking-tighter text-text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {avgScore.toFixed(0)}
                  </motion.p>
                  <p className="text-[11px] mt-0.5 font-medium text-text-subtle">/ 100</p>
                </div>
              </div>

              {/* Legend bars */}
              {scoreDistrib ? (
                <div className="space-y-3">
                  {scoreBuckets.map(({ label, key, color, icon }) => (
                    <ScoreBar
                      key={key}
                      label={label}
                      count={scoreDistrib[key]}
                      total={scoreTotal}
                      color={color}
                      icon={icon}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i}>
                      <div className="h-3 rounded skeleton mb-1.5 w-3/5" />
                      <div className="h-1.5 rounded-full skeleton" />
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* Conversion funnel — 4 cols */}
          <div className="lg:col-span-4">
            <SectionCard title={t.dashboard.convFunnel} icon={Target}>
              {stats ? (
                <div className="space-y-3.5">
                  <FunnelStep label={t.dashboard.totalLeads} count={stats.totalLeads}     total={stats.totalLeads} color="#60A5FA" />
                  <FunnelStep label={t.dashboard.analyzed}   count={stats.leadsAnalyzed}  total={stats.totalLeads} color="#FBBF24" />
                  <FunnelStep label={t.dashboard.contacted}  count={stats.leadsContacted} total={stats.totalLeads} color="#34D399" />
                  <FunnelStep label="Responded"              count={stats.leadsResponded} total={stats.totalLeads} color="#C084FC" />
                  <FunnelStep label="Won"                    count={stats.leadsWon}       total={stats.totalLeads} color="#34D399" />
                </div>
              ) : (
                <div className="space-y-3.5">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full skeleton" />
                      <div className="flex-1">
                        <div className="h-3 rounded skeleton mb-1.5 w-1/2" />
                        <div className="h-1 rounded-full skeleton" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Conversion rate highlight */}
              {stats && (
                <div
                  className="mt-5 px-4 py-3 rounded-xl flex items-center justify-between border border-border bg-interactive-hover"
                >
                  <span className="text-[12px] text-text-muted">
                    Overall conversion
                  </span>
                  <span
                    className="text-[18px] font-bold font-mono text-success"
                  >
                    {stats.conversionRate}%
                  </span>
                </div>
              )}
            </SectionCard>
          </div>

          {/* Recent runs — 4 cols */}
          <div className="lg:col-span-4">
            <SectionCard
              title={t.dashboard.recentRuns}
              icon={Zap}
              action={
                <Link href="/agents">
                  <a
                    className="text-[12px] flex items-center gap-0.5 transition-opacity hover:opacity-70 text-text-subtle"
                  >
                    {t.dashboard.viewAll} <ChevronRight className="w-3 h-3" strokeWidth={2} />
                  </a>
                </Link>
              }
            >
              {recentRuns.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center mb-3 border border-border bg-interactive-hover"
                  >
                    <Zap className="w-5 h-5 text-primary" strokeWidth={1.5} />
                  </div>
                  <p className="text-[13px] font-medium text-text-muted">
                    {t.dashboard.noRuns}
                  </p>
                  <Link href="/agents">
                    <a
                      className="mt-2.5 text-[12px] font-semibold flex items-center gap-1 text-primary"
                    >
                      {t.dashboard.startFirst} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                    </a>
                  </Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentRuns.map((run, i) => (
                    <motion.div
                      key={run.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ ...SPRING, delay: i * 0.06 }}
                    >
                      <Link href="/agents">
                        <a
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors border border-transparent hover:border-border hover:bg-interactive-hover group"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <RunStatusIcon status={run.status} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate text-text">
                              {run.query}
                            </p>
                            <p className="text-[11px] mt-0.5 font-mono text-text-subtle">
                              {run.leadsFound > 0 && (
                                <span className="text-text-muted">{run.leadsFound} leads · </span>
                              )}
                              {new Date(run.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <ChevronRight
                            className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-30 transition-opacity mt-0.5 text-text-muted"
                          />
                        </a>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </motion.div>

        {/* ── Activity feed ────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.3 }}
          className="rounded-2xl p-5"
          style={GLASS_STYLE}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-text-subtle" strokeWidth={1.5} />
            <h3 className="text-[13.5px] font-semibold tracking-tight text-text">
              {t.dashboard.recentActivity}
            </h3>
          </div>
          <ActivityFeed compact />
        </motion.div>

      </div>
    </PageShell>
  );
}
