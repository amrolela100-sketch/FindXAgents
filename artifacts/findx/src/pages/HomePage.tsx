import { motion } from "framer-motion";
import { PageShell } from "../components/page-shell";
import { DashboardCards } from "../components/dashboard-cards";
import { ActivityFeed } from "../components/activity-feed";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";
import { getDashboardStats, getScoreDistribution, getAgentRuns } from "../lib/api";
import { Link } from "wouter";
import {
  TrendingUp, Zap, ChevronRight, Target, Activity,
  CheckCircle2, AlertCircle, Clock, Award, Flame, Thermometer, Snowflake, Circle,
} from "lucide-react";

/* ─── Spring config ─── */
const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

/* ─── Score bar ─── */
function ScoreBar({
  label,
  count,
  total,
  color,
  icon: Icon,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
  icon: typeof Flame;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between items-center text-xs mb-1.5">
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

/* ─── Section card ─── */
function SectionCard({
  title,
  icon: Icon,
  children,
  action,
}: {
  title: string;
  icon: typeof Target;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <motion.div
      variants={cardVariants}
      className="rounded-2xl p-5 h-full"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--text-subtle)" }} />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

/* ─── Run status icon ─── */
function RunStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--color-success)" }} />;
  if (status === "failed")    return <AlertCircle  className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--color-danger)" }} />;
  if (status === "running")   return <Activity     className="w-3.5 h-3.5 animate-pulse" strokeWidth={1.5} style={{ color: "var(--color-info)" }} />;
  return <Clock className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: "var(--color-warning)" }} />;
}

/* ════════════════════════════════════════
   HOME PAGE
════════════════════════════════════════ */
export default function HomePage() {
  const { t } = useLang();
  const { data: statsData }  = usePolling(() => getDashboardStats(), 15_000);
  const { data: scoreData }  = usePolling(() => getScoreDistribution(), 30_000);
  const { data: runsData }   = usePolling(() => getAgentRuns(), 10_000);

  const stats        = statsData?.stats;
  const scoreDistrib = scoreData?.buckets;
  const avgScore     = scoreData?.avgScore ?? 0;
  const recentRuns   = runsData?.runs?.slice(0, 4) ?? [];
  const activeRun    = runsData?.runs?.find((r) => r.status === "running" || r.status === "queued");

  const scoreTotal = scoreDistrib
    ? scoreDistrib.hot + scoreDistrib.warm + scoreDistrib.cold + scoreDistrib.unscored
    : 0;

  const scoreBuckets = [
    { label: t.dashboard.hot,      key: "hot"      as const, color: "#34D399", icon: Flame },
    { label: t.dashboard.warm,     key: "warm"     as const, color: "#FBBF24", icon: Thermometer },
    { label: t.dashboard.cold,     key: "cold"     as const, color: "#60A5FA", icon: Snowflake },
    { label: t.dashboard.unscored, key: "unscored" as const, color: "var(--text-subtle)", icon: Circle },
  ];

  return (
    <PageShell title={t.dashboard.title} subtitle={t.dashboard.subtitle}>

      {/* Active pipeline banner */}
      {activeRun && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl"
          style={{
            background: "var(--color-info-bg)",
            border: "1px solid var(--color-info-border)",
          }}
        >
          <div className="relative flex-shrink-0">
            <Activity className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--color-info)" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-dot"
              style={{ background: "var(--color-info)", color: "var(--color-info)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--color-info)" }}>
              {t.dashboard.runningPipeline}
            </p>
            <p className="text-xs truncate font-mono" style={{ color: "var(--color-info)", opacity: 0.8 }}>
              "{activeRun.query}"
            </p>
          </div>
          <Link href="/agents">
            <a className="text-xs font-semibold flex items-center gap-1 shrink-0" style={{ color: "var(--color-info)" }}>
              {t.dashboard.view}
              <ChevronRight className="w-3 h-3" strokeWidth={2} />
            </a>
          </Link>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="mb-6">
        <DashboardCards />
      </div>

      {/* Bento grid — staggered */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        {/* Score Distribution */}
        <SectionCard
          title={t.dashboard.leadScores}
          icon={Award}
        >
          <div className="flex items-baseline justify-between mb-5">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t.dashboard.avgScore}
            </span>
            <span
              className="text-3xl font-bold tracking-tighter font-mono gradient-brand-text"
            >
              {avgScore.toFixed(0)}
            </span>
          </div>
          {scoreDistrib ? (
            <div className="space-y-3.5">
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

        {/* Conversion Funnel */}
        <SectionCard title={t.dashboard.convFunnel} icon={Target}>
          {stats ? (
            <div className="space-y-3">
              {[
                { label: t.dashboard.totalLeads, count: stats.totalLeads,     color: "#60A5FA" },
                { label: t.dashboard.analyzed,   count: stats.leadsAnalyzed,  color: "#FBBF24" },
                { label: t.dashboard.contacted,  count: stats.leadsContacted, color: "#34D399" },
                { label: "Responded",            count: stats.leadsResponded, color: "#C084FC" },
                { label: "Won",                  count: stats.leadsWon,       color: "#34D399" },
              ].map((item) => {
                const pct = stats.totalLeads > 0 ? Math.round((item.count / stats.totalLeads) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: item.color, boxShadow: `0 0 6px ${item.color}60` }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                        <span className="font-semibold font-mono" style={{ color: "var(--text)" }}>
                          {item.count}
                        </span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--glass-raised)" }}>
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
                          style={{ background: item.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full skeleton" />
                  <div className="flex-1">
                    <div className="h-3 rounded skeleton mb-1 w-1/2" />
                    <div className="h-1 rounded-full skeleton" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Runs */}
        <SectionCard
          title={t.dashboard.recentRuns}
          icon={Zap}
          action={
            <Link href="/agents">
              <a
                className="text-xs flex items-center gap-0.5 transition-colors"
                style={{ color: "var(--text-subtle)" }}
              >
                {t.dashboard.viewAll}
                <ChevronRight className="w-3 h-3" strokeWidth={2} />
              </a>
            </Link>
          }
        >
          {recentRuns.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
              >
                <Zap className="w-5 h-5" strokeWidth={1.5} style={{ color: "var(--text-subtle)" }} />
              </div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.dashboard.noRuns}</p>
              <Link href="/agents">
                <a className="mt-2 text-xs font-semibold" style={{ color: "var(--brand)" }}>
                  {t.dashboard.startFirst}
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run, i) => (
                <motion.div
                  key={run.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ ...SPRING, delay: i * 0.06 }}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "var(--glass-raised)" }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <RunStatusIcon status={run.status} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                      {run.query}
                    </p>
                    <p className="text-[10px] mt-0.5 font-mono" style={{ color: "var(--text-subtle)" }}>
                      {run.leadsFound} leads · {new Date(run.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>
      </motion.div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...SPRING, delay: 0.3 }}
        className="rounded-2xl p-5"
        style={{
          background: "var(--glass)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid var(--glass-border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--text-subtle)" }} />
          <h3 className="text-sm font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            {t.dashboard.recentActivity}
          </h3>
        </div>
        <ActivityFeed />
      </motion.div>
    </PageShell>
  );
}
