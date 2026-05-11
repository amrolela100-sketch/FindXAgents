import { PageShell } from "../components/page-shell";
import { DashboardCards } from "../components/dashboard-cards";
import { ActivityFeed } from "../components/activity-feed";
import { usePolling } from "../lib/hooks/use-polling";
import { getDashboardStats, getScoreDistribution, getAgentRuns } from "../lib/api";
import { Link } from "wouter";
import {
  TrendingUp, Zap, ChevronRight, Award, Target, Activity,
  CheckCircle2, AlertCircle, Clock
} from "lucide-react";

export default function HomePage() {
  const { data: statsData } = usePolling(() => getDashboardStats(), 15_000);
  const { data: scoreData } = usePolling(() => getScoreDistribution(), 30_000);
  const { data: runsData } = usePolling(() => getAgentRuns(), 10_000);

  const stats = statsData?.stats;
  const scoreDistribution = scoreData?.buckets;
  const avgScore = scoreData?.avgScore ?? 0;
  const recentRuns = runsData?.runs?.slice(0, 3) ?? [];
  const activeRun = runsData?.runs?.find((r) => r.status === "running" || r.status === "queued");

  return (
    <PageShell title="Dashboard" subtitle="Overview of your prospecting intelligence">
      {/* Active pipeline banner */}
      {activeRun && (
        <div className="flex items-center gap-3 mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="relative flex-shrink-0">
            <Activity className="w-5 h-5 text-blue-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-800">AI Pipeline is running</p>
            <p className="text-xs text-blue-600 truncate">"{activeRun.query}"</p>
          </div>
          <Link href="/agents">
            <a className="text-xs font-semibold text-blue-700 hover:underline flex items-center gap-1">
              View <ChevronRight className="w-3 h-3" />
            </a>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="mb-8">
        <DashboardCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Score Distribution */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface">Lead Scores</h3>
            <div className="flex items-center gap-1 text-sm font-bold text-on-surface-variant">
              <Award className="w-4 h-4 text-amber-500" />
              Avg: {avgScore.toFixed(0)}
            </div>
          </div>
          {scoreDistribution ? (
            <div className="space-y-3">
              {[
                { label: "🔥 Hot", key: "hot", color: "bg-emerald-500", total: (scoreDistribution.hot + scoreDistribution.warm + scoreDistribution.cold + scoreDistribution.unscored) },
                { label: "🌡️ Warm", key: "warm", color: "bg-amber-400", total: (scoreDistribution.hot + scoreDistribution.warm + scoreDistribution.cold + scoreDistribution.unscored) },
                { label: "❄️ Cold", key: "cold", color: "bg-blue-400", total: (scoreDistribution.hot + scoreDistribution.warm + scoreDistribution.cold + scoreDistribution.unscored) },
                { label: "⬜ Unscored", key: "unscored", color: "bg-slate-300", total: (scoreDistribution.hot + scoreDistribution.warm + scoreDistribution.cold + scoreDistribution.unscored) },
              ].map((item) => {
                const count = scoreDistribution[item.key as keyof typeof scoreDistribution];
                const pct = item.total > 0 ? Math.round((count / item.total) * 100) : 0;
                return (
                  <div key={item.key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant">{item.label}</span>
                      <span className="font-semibold text-on-surface">{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center text-sm text-on-surface-variant">
              No scored leads yet
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface">Conversion Funnel</h3>
            <Target className="w-4 h-4 text-on-surface-variant" />
          </div>
          {stats ? (
            <div className="space-y-2">
              {[
                { label: "Total Leads", count: stats.totalLeads, icon: "🎯" },
                { label: "Analyzed", count: stats.leadsAnalyzed, icon: "🔍" },
                { label: "Contacted", count: stats.leadsContacted, icon: "✉️" },
                { label: "Responded", count: stats.leadsResponded, icon: "💬" },
                { label: "Won", count: stats.leadsWon, icon: "🏆" },
              ].map((item, i, arr) => {
                const pct = i === 0 ? 100 : arr[0].count > 0 ? Math.round((item.count / arr[0].count) * 100) : 0;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-lg w-6">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-on-surface-variant">{item.label}</span>
                        <span className="font-semibold text-on-surface">{item.count}</span>
                      </div>
                      <div className="h-1 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-container rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-24 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Recent Pipeline Runs */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-on-surface">Recent Runs</h3>
            <Link href="/agents">
              <a className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-0.5 transition-colors">
                View all <ChevronRight className="w-3 h-3" />
              </a>
            </Link>
          </div>
          {recentRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="w-8 h-8 text-on-surface-variant opacity-30 mb-2" />
              <p className="text-xs text-on-surface-variant">No pipeline runs yet</p>
              <Link href="/agents">
                <a className="mt-2 text-xs font-semibold text-primary-container hover:underline">
                  Start your first run →
                </a>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-start gap-3 p-3 bg-surface-container-low rounded-xl">
                  <div className="flex-shrink-0 mt-0.5">
                    {run.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : run.status === "failed" ? (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    ) : run.status === "running" ? (
                      <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-on-surface truncate">{run.query}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-on-surface-variant">
                        {run.leadsFound} leads found
                      </span>
                      <span className="text-[10px] text-on-surface-variant">·</span>
                      <span className="text-[10px] text-on-surface-variant">
                        {new Date(run.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-on-surface">Recent Activity</h3>
          <TrendingUp className="w-4 h-4 text-on-surface-variant" />
        </div>
        <ActivityFeed />
      </div>
    </PageShell>
  );
}
