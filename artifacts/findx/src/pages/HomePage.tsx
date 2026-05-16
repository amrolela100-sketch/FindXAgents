import { motion } from "framer-motion";
import { StatCardSkeleton } from "../components/ui/skeleton-patterns";
import { PageShell } from "../components/page-shell";
import { DashboardCards } from "../components/dashboard-cards";
import { ActivityFeed } from "../components/activity-feed";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";
import { getDashboardStats, getScoreDistribution, getAgentRuns } from "../lib/api";
import { Link } from "wouter";
import {
  TrendingUp, Zap, ChevronRight, Target, Activity,
  CheckCircle2, AlertCircle, Clock, Award, Flame, Thermometer, Snowflake, Circle, Play, ArrowRight,
} from "lucide-react";

const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const GLASS_STYLE = {
  background: "var(--glass)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
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
    { v: hot,      color: "#34D399" },
    { v: warm,     color: "#FBBF24" },
    { v: cold,     color: "#60A5FA" },
    { v: unscored, color: "var(--glass-border-strong)" },
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
        <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--glass-raised)" strokeWidth="9" />
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
        <span className="text-lg font-bold leading-none" style={{ color: "var(--text)" }}>{total}</span>
        <span className="text-[10px] mt-0.5 font-medium" style={{ color: "var(--text-subtle)" }}>leads</span>
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
        <div className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <Icon className="w-3 h-3" strokeWidth={1.5} style={{ color }} />
          {label}
        </div>
        <span className="font-semibold font-mono" style={{ color: "var(--text)" }}>
          {count}
          <span className="font-normal ml-1" style={{ color: "var(--text-subtle)" }}>({pct}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-raised)" }}>
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
        style={{ background: color, boxShadow: `0 0 6px ${color}80` }}
      />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[12px] mb-1">
          <span style={{ color: "var(--text-muted)" }}>{label}</span>
          <span className="font-semibold font-mono" style={{ color: "var(--text)" }}>{count}</span>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-raised)" }}>
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
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "#34D399" }} />;
  if (status === "failed")    return <AlertCircle  className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "#F87171" }} />;
  if (status === "running")   return <Activity     className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.5} style={{ color: "#60A5FA" }} />;
  return <Clock className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "#FBBF24" }} />;
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, children, action }: {
  title: string; icon: typeof Target; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <motion.div variants={itemVariants} className="rounded-2xl p-5 h-full" style={GLASS_STYLE}>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--text-subtle)" }} />
          <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
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
    { label: t.dashboard.hot,      key: "hot"      as const, color: "#34D399", icon: Flame       },
    { label: t.dashboard.warm,     key: "warm"     as const, color: "#FBBF24", icon: Thermometer },
    { label: t.dashboard.cold,     key: "cold"     as const, color: "#60A5FA", icon: Snowflake   },
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
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {greeting} 👋
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: "var(--text-muted)" }}>
              {t.dashboard.subtitle}
            </p>
          </div>
          <Link href="/agents">
            <a
              className="btn btn-primary self-start sm:self-auto flex items-center gap-2 font-semibold"
              style={{ background: "var(--brand)", color: "var(--brand-fg)" }}
              aria-label="Run discovery agent pipeline"
            >
              <Play className="w-3.5 h-3.5" strokeWidth={2.5} aria-hidden="true" />
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
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{
              background: "rgba(96,165,250,0.10)",
              border: "1px solid rgba(96,165,250,0.22)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="relative flex-shrink-0">
              <Activity className="w-4 h-4" strokeWidth={1.5} style={{ color: "#60A5FA" }} />
              <span
                className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-dot"
                style={{ background: "#60A5FA", color: "#60A5FA" }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "#60A5FA" }}>
                {t.dashboard.runningPipeline}
              </p>
              <p className="text-[12px] truncate font-mono" style={{ color: "#60A5FA", opacity: 0.75 }}>
                "{activeRun.query}"
              </p>
            </div>
            <Link href="/agents">
              <a className="text-[12px] font-bold flex items-center gap-1 flex-shrink-0" style={{ color: "#60A5FA" }}>
                {t.dashboard.view} <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              </a>
            </Link>
          </motion.div>
        )}

        {/* ── KPI cards ───────────────────────────────────────────── */}
        {statsError ? (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl text-sm"
            style={{
              background: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.20)",
            }}
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: "#F87171" }} aria-hidden="true" />
            <span style={{ color: "#F87171" }}>Failed to load stats. </span>
            <button
              className="underline text-xs"
              style={{ color: "#F87171" }}
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : statsLoading ? (
          <div
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
            aria-busy="true"
            aria-label="Loading KPI statistics"
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={`stat-sk-${i}`} />
            ))}
          </div>
        ) : (
          <DashboardCards />
        )}

        {/* ── Bento grid ──────────────────────────────────────────── */}
        {/* aria-label provided via section wrappers below */
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
                  <p className="text-[11px] mb-1" style={{ color: "var(--text-subtle)" }}>
                    {t.dashboard.avgScore}
                  </p>
                  <motion.p
                    className="text-[36px] font-bold leading-none tracking-tighter"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{
                      background: "linear-gradient(135deg, #FBBF24, #F59E0B)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {avgScore.toFixed(0)}
                  </motion.p>
                  <p className="text-[11px] mt-0.5 font-medium" style={{ color: "var(--text-subtle)" }}>/ 100</p>
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
                  className="mt-5 px-4 py-3 rounded-xl flex items-center justify-between"
                  style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
                >
                  <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    Overall conversion
                  </span>
                  <span
                    className="text-[18px] font-bold font-mono"
                    style={{
                      background: "linear-gradient(135deg, #34D399, #10B981)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
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
                    className="text-[12px] flex items-center gap-0.5 transition-opacity hover:opacity-70"
                    style={{ color: "var(--text-subtle)" }}
                  >
                    {t.dashboard.viewAll} <ChevronRight className="w-3 h-3" strokeWidth={2} />
                  </a>
                </Link>
              }
            >
              {recentRuns.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3"
                    style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.22)" }}
                  >
                    <Zap className="w-5 h-5" strokeWidth={1.5} style={{ color: "#C084FC" }} />
                  </div>
                  <p className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
                    {t.dashboard.noRuns}
                  </p>
                  <Link href="/agents">
                    <a
                      className="mt-2.5 text-[12px] font-semibold flex items-center gap-1"
                      style={{ color: "var(--brand)" }}
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
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl transition-colors group"
                          style={{ background: "var(--glass-raised)" }}
                          onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-overlay)")}
                          onMouseLeave={e => (e.currentTarget.style.background = "var(--glass-raised)")}
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            <RunStatusIcon status={run.status} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                              {run.query}
                            </p>
                            <p className="text-[11px] mt-0.5 font-mono" style={{ color: "var(--text-subtle)" }}>
                              {run.leadsFound > 0 && (
                                <span style={{ color: "var(--text-muted)" }}>{run.leadsFound} leads · </span>
                              )}
                              {new Date(run.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                          <ChevronRight
                            className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover:opacity-30 transition-opacity mt-0.5"
                            style={{ color: "var(--text-muted)" }}
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
            <TrendingUp className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--text-subtle)" }} />
            <h3 className="text-[13.5px] font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              {t.dashboard.recentActivity}
            </h3>
          </div>
          <ActivityFeed compact />
        </motion.div>

      </div>
    </PageShell>
  );
}
}
