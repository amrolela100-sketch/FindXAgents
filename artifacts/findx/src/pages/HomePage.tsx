import { PageShell } from "../components/page-shell";
import { DashboardCards } from "../components/dashboard-cards";
import { ActivityFeed } from "../components/activity-feed";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";
import { getDashboardStats, getScoreDistribution, getAgentRuns } from "../lib/api";
import { Link } from "wouter";
import {
  TrendingUp, Zap, ChevronRight, Target, Activity,
  CheckCircle2, AlertCircle, Clock, Award
} from "lucide-react";

function ScoreBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span style={{ color: "var(--text-muted)" }}>{label}</span>
        <span className="font-semibold" style={{ color: "var(--text)" }}>{count} <span style={{ color: "var(--text-subtle)" }}>({pct}%)</span></span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--bg-inset)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: typeof Target; children: React.ReactNode }) {
  return (
    <div className="card p-5 h-full">
      <div className="flex items-center gap-2 mb-5">
        <Icon className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
        <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function HomePage() {
  const { t } = useLang();
  const { data: statsData } = usePolling(() => getDashboardStats(), 15_000);
  const { data: scoreData } = usePolling(() => getScoreDistribution(), 30_000);
  const { data: runsData } = usePolling(() => getAgentRuns(), 10_000);

  const stats = statsData?.stats;
  const scoreDistrib = scoreData?.buckets;
  const avgScore = scoreData?.avgScore ?? 0;
  const recentRuns = runsData?.runs?.slice(0, 4) ?? [];
  const activeRun = runsData?.runs?.find((r) => r.status === "running" || r.status === "queued");

  const scoreTotal = scoreDistrib
    ? scoreDistrib.hot + scoreDistrib.warm + scoreDistrib.cold + scoreDistrib.unscored
    : 0;

  return (
    <PageShell title={t.dashboard.title} subtitle={t.dashboard.subtitle}>
      {/* Active pipeline banner */}
      {activeRun && (
        <div
          className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl animate-fade-in"
          style={{ background: "var(--color-info-bg)", border: "1px solid rgba(37,99,235,0.2)" }}
        >
          <div className="relative flex-shrink-0">
            <Activity className="w-4 h-4" style={{ color: "var(--color-info)" }} />
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full pulse-dot"
              style={{ background: "var(--color-info)", color: "var(--color-info)" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: "var(--color-info)" }}>
              {t.dashboard.runningPipeline}
            </p>
            <p className="text-xs truncate" style={{ color: "var(--color-info)" }}>
              "{activeRun.query}"
            </p>
          </div>
          <Link href="/agents">
            <a className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--color-info)" }}>
              {t.dashboard.view} <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-6">
        <DashboardCards />
      </div>

      {/* Bento grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Score Distribution */}
        <SectionCard title={t.dashboard.leadScores} icon={Award}>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {t.dashboard.avgScore}
            </span>
            <span className="text-2xl font-bold gradient-text-brand">
              {avgScore.toFixed(0)}
            </span>
          </div>
          {scoreDistrib ? (
            <div className="space-y-3">
              <ScoreBar label={`🔥 ${t.dashboard.hot}`}     count={scoreDistrib.hot}     total={scoreTotal} color="var(--color-success)" />
              <ScoreBar label={`🌡 ${t.dashboard.warm}`}    count={scoreDistrib.warm}    total={scoreTotal} color="var(--brand)" />
              <ScoreBar label={`❄️ ${t.dashboard.cold}`}    count={scoreDistrib.cold}    total={scoreTotal} color="var(--color-info)" />
              <ScoreBar label={`⬜ ${t.dashboard.unscored}` } count={scoreDistrib.unscored} total={scoreTotal} color="var(--border-strong)" />
            </div>
          ) : (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-3 rounded skeleton mb-1.5" style={{ width: "60%" }} />
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
                { emoji: "🎯", label: t.dashboard.totalLeads, count: stats.totalLeads },
                { emoji: "🔍", label: t.dashboard.analyzed,   count: stats.leadsAnalyzed },
                { emoji: "✉️",  label: t.dashboard.contacted,  count: stats.leadsContacted },
                { emoji: "💬", label: "Responded",             count: stats.leadsResponded },
                { emoji: "🏆", label: "Won",                   count: stats.leadsWon },
              ].map((item) => {
                const pct = stats.totalLeads > 0 ? Math.round((item.count / stats.totalLeads) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-base w-5 flex-shrink-0">{item.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: "var(--text-muted)" }}>{item.label}</span>
                        <span className="font-semibold" style={{ color: "var(--text)" }}>{item.count}</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-inset)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: "var(--brand)" }}
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
                  <div className="w-5 h-5 rounded skeleton" />
                  <div className="flex-1">
                    <div className="h-3 rounded skeleton mb-1" style={{ width: "50%" }} />
                    <div className="h-1 rounded-full skeleton" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Recent Runs */}
        <SectionCard title={t.dashboard.recentRuns} icon={Zap}>
          <div className="flex items-center justify-between mb-4">
            <span />
            <Link href="/agents">
              <a className="text-xs flex items-center gap-0.5 transition-colors" style={{ color: "var(--text-muted)" }}>
                {t.dashboard.viewAll} <ChevronRight className="w-3 h-3" />
              </a>
            </Link>
          </div>

          {recentRuns.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Zap className="w-8 h-8 mb-2 opacity-20" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t.dashboard.noRuns}</p>
              <Link href="/agents">
                <a className="mt-2 text-xs font-medium" style={{ color: "var(--brand)" }}>
                  {t.dashboard.startFirst}
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "var(--bg-subtle)" }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {run.status === "completed" ? (
                      <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "var(--color-success)" }} />
                    ) : run.status === "failed" ? (
                      <AlertCircle className="w-3.5 h-3.5" style={{ color: "var(--color-danger)" }} />
                    ) : run.status === "running" ? (
                      <Activity className="w-3.5 h-3.5 animate-pulse" style={{ color: "var(--color-info)" }} />
                    ) : (
                      <Clock className="w-3.5 h-3.5" style={{ color: "var(--color-warning)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{run.query}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
                      {run.leadsFound} leads · {new Date(run.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Activity Feed */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t.dashboard.recentActivity}
          </h3>
        </div>
        <ActivityFeed />
      </div>
    </PageShell>
  );
}
