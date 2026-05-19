/**
 * OwnerDashboardPage — Thin Wrapper
 * Before: 29KB single file → After: ~2KB shared + index
 */

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity, CheckCircle, Clock3, Loader2, RefreshCw,
  Shield, TrendingUp, Users, Zap, Lock, LogOut, BarChart2,
  UserCheck, UserX, Crown, Bot, Search,
} from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { PageShell } from "@/components/page-shell";
import { FADE_UP_STAGGER } from "@/lib/motion";
import { apiFetch, StatCard, StatusBadge, fmt } from "./shared";
import type { OwnerStats, OwnerUser, OwnerRun, Tab } from "./shared";
import { cn } from "@/lib/utils";

export default function OwnerDashboardPage() {
  const { t } = useLang();

  const [unlocked, setUnlocked] = useState(() => typeof window !== "undefined" && localStorage.getItem("owner_unlocked") === "true");
  const [password, setPassword] = useState("");
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<OwnerStats | null>(null);
  const [users, setUsers] = useState<OwnerUser[]>([]);
  const [runs, setRuns] = useState<OwnerRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState("");

  const loadAll = async () => {
    setLoading(true); setError(null);
    try {
      const [s, u, r] = await Promise.all([
        apiFetch<OwnerStats>("/owner/dashboard"),
        apiFetch<{ users: OwnerUser[] }>("/owner/users"),
        apiFetch<{ runs: OwnerRun[] }>("/owner/runs?pageSize=50"),
      ]);
      setStats(s); setUsers(u.users); setRuns(r.runs);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) { setUnlocked(false); localStorage.removeItem("owner_unlocked"); }
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally { setLoading(false); }
  };

  useEffect(() => { if (unlocked) loadAll(); }, [unlocked]);

  const handleUnlock = async () => {
    if (!password) return;
    setUnlocking(true); setUnlockError(null);
    try { await apiFetch<{ unlocked: boolean }>("/owner/unlock", { method: "POST", body: JSON.stringify({ password }) }); setUnlocked(true); localStorage.setItem("owner_unlocked", "true"); setPassword(""); }
    catch (err) { setUnlockError(err instanceof Error ? err.message : "Unlock failed"); }
    finally { setUnlocking(false); }
  };

  const handleLock = () => { setUnlocked(false); localStorage.removeItem("owner_unlocked"); setPassword(""); setStats(null); setUsers([]); setRuns([]); };

  // Lock screen
  if (!unlocked) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm glass-card rounded-2xl p-6 space-y-4 border border-border bg-glass backdrop-blur-glass shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full border border-border bg-interactive-hover"><Lock className="w-4 h-4 text-primary" /></div>
            <div><p className="text-sm font-bold text-text">Owner Access</p><p className="text-xs text-text-muted">Full platform control</p></div>
          </div>
          <p className="text-sm text-text-muted">This area is restricted to the platform owner. Enter your owner password to continue.</p>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleUnlock()} placeholder="Owner password" className="input" />
          <button onClick={handleUnlock} disabled={unlocking || !password} className="w-full btn btn-primary py-2.5 text-sm font-semibold gap-2 rounded-full">
            {unlocking && <Loader2 className="w-4 h-4 animate-spin" />} Unlock
          </button>
          {unlockError && <p className="text-xs font-bold text-danger">{unlockError}</p>}
        </motion.div>
      </div>
    );
  }

  if (loading && !stats) return <div className="min-h-[100dvh] flex items-center justify-center bg-bg"><Loader2 className="w-6 h-6 animate-spin text-text-muted" /></div>;
  if (error && !stats) return <div className="min-h-[100dvh] flex items-center justify-center bg-bg"><div className="text-center space-y-3"><Shield className="w-10 h-10 text-danger mx-auto" /><p className="font-semibold text-text">{error}</p><button onClick={loadAll} className="text-sm text-text-muted hover:text-text underline">Try again</button></div></div>;

  const filteredUsers = users.filter((u) => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <PageShell title="Owner Dashboard" subtitle="Full platform control">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={FADE_UP_STAGGER} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-amber-500" /><span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Owner Dashboard</span></div>
            <h1 className="text-2xl font-bold text-text">Platform Overview</h1>
            <p className="text-sm text-text-muted mt-0.5">Full control and visibility across all users and activity.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} disabled={loading} className="btn btn-secondary text-sm gap-1.5 disabled:opacity-50 rounded-full"><RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />Refresh</button>
            <button onClick={handleLock} className="btn btn-secondary text-sm gap-1.5 rounded-full"><LogOut className="w-3.5 h-3.5" />Lock</button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-full border border-border bg-interactive-hover w-fit">
          {(["overview", "users", "runs"] as Tab[]).map((tb) => (
            <button key={tb} onClick={() => setTab(tb)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-semibold transition-all border capitalize",
                tab === tb
                  ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                  : "border-transparent text-text-muted hover:text-text"
              )}>
              {tb === "overview" && <BarChart2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {tb === "users" && <Users className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {tb === "runs" && <Bot className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {tb}
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB */}
        {tab === "overview" && stats && (
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total users" value={stats.totalUsers} sub={`${stats.onboardingCompleted} onboarded`} accent="#60A5FA" />
              <StatCard icon={TrendingUp} label="Total leads" value={stats.totalLeads} sub={`${stats.leadsThisWeek} this week`} accent="#34D399" />
              <StatCard icon={Zap} label="Agent runs" value={stats.totalRuns} sub={`${stats.leadsContacted} contacted`} accent="#C084FC" />
              <StatCard icon={Activity} label="Conversion rate" value={`${stats.conversionRate}%`} sub={`${stats.leadsWon} won`} accent="#FBBF24" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Health */}
              <motion.div variants={FADE_UP_STAGGER} className="glass-card rounded-2xl p-6 space-y-3 border border-border bg-glass backdrop-blur-glass shadow-sm">
                <p className="font-semibold text-text">Platform Health</p>
                {(["api", "auth", "database", "agents"] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                    <span className="text-sm text-text-muted">{key}</span>
                    <span className={cn("text-xs font-bold flex items-center gap-1.5", stats.health[key] ? "text-success" : "text-warning")}>
                      {stats.health[key] ? <><CheckCircle className="w-4 h-4" /> Operational</> : <><Clock3 className="w-4 h-4" /> Needs attention</>}
                    </span>
                  </div>
                ))}
              </motion.div>
              {/* Funnel */}
              <motion.div variants={FADE_UP_STAGGER} className="glass-card rounded-2xl p-6 space-y-3 border border-border bg-glass backdrop-blur-glass shadow-sm">
                <p className="font-semibold text-text">Lead Funnel</p>
                {[
                  { label: "Discovered", value: stats.totalLeads, color: "bg-amber-400" },
                  { label: "Analyzed", value: stats.leadsAnalyzed, color: "bg-blue-500" },
                  { label: "Contacted", value: stats.leadsContacted, color: "bg-violet-500" },
                  { label: "Won", value: stats.leadsWon, color: "bg-emerald-500" },
                ].map(({ label, value, color }) => {
                  const pct = stats.totalLeads > 0 ? Math.round((value / stats.totalLeads) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-muted">{label}</span>
                        <span className="font-medium text-text">{value} <span className="text-text-muted font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-interactive-hover border border-border rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </div>
            {/* Recent runs */}
            <motion.div variants={FADE_UP_STAGGER} className="glass-card rounded-2xl overflow-hidden border border-border bg-glass backdrop-blur-glass shadow-sm">
              <div className="px-6 py-4 border-b border-border bg-interactive-hover"><p className="font-semibold text-text">Latest Pipeline Runs</p></div>
              <div className="divide-y divide-border">
                {stats.recentRuns.length === 0 && <p className="px-6 py-8 text-sm text-center text-text-muted">No runs yet.</p>}
                {stats.recentRuns.map((run) => (
                  <div key={run.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0"><p className="text-sm font-semibold text-text truncate">{run.query}</p><p className="text-xs text-text-muted mt-0.5">{fmt(run.createdAt)} · {run.leadsFound ?? 0} leads found</p></div>
                    <StatusBadge status={run.status} />
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <motion.div initial="hidden" animate="visible" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search by email…" className="input pl-9" />
              </div>
              <div className="flex items-center gap-3 text-sm text-text-muted font-semibold">
                <span className="flex items-center gap-1 text-success"><UserCheck className="w-4 h-4" /> {users.filter(u => u.onboardingCompleted).length} onboarded</span>
                <span className="flex items-center gap-1 text-warning"><UserX className="w-4 h-4" /> {users.filter(u => !u.onboardingCompleted).length} pending</span>
              </div>
            </div>
            <motion.div variants={FADE_UP_STAGGER} className="glass-card rounded-2xl overflow-hidden border border-border bg-glass backdrop-blur-glass shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-interactive-hover">
                <p className="font-semibold text-text">{filteredUsers.length} users</p>
                <span className="text-xs text-text-muted">sorted by registration date</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-interactive-hover text-text-muted">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Leads</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Runs</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Onboarded</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Registered</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Last active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.length === 0 && <tr><td colSpan={7} className="px-6 py-10 text-center text-text-muted">No users found.</td></tr>}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-interactive-hover transition-colors">
                        <td className="px-6 py-3"><div className="flex items-center gap-2.5"><div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border border-primary/20 bg-primary/10 text-primary flex-shrink-0">{u.email[0].toUpperCase()}</div><div><p className="font-semibold text-text text-xs leading-tight truncate max-w-[200px]">{u.email}</p><p className="text-[10px] text-text-subtle font-mono">{u.id.slice(0, 8)}…</p></div></div></td>
                        <td className="px-4 py-3"><div className="flex flex-wrap gap-1">
                          {u.isOwner && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-warning/20 bg-warning/5 text-warning"><Crown className="w-3 h-3" /> Owner</span>}
                          {u.isAdmin && !u.isOwner && <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 bg-primary/5 text-primary"><Shield className="w-3 h-3" /> Admin</span>}
                          {!u.isOwner && !u.isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border bg-interactive-hover text-text-muted">User</span>}
                        </div></td>
                        <td className="px-4 py-3 text-center"><span className="font-semibold text-text">{u.leadCount}</span></td>
                        <td className="px-4 py-3 text-center"><span className="font-semibold text-text">{u.runCount}</span></td>
                        <td className="px-4 py-3">{u.onboardingCompleted ? <span className="flex items-center gap-1 text-xs font-bold text-success"><CheckCircle className="w-3.5 h-3.5" /> Yes</span> : <span className="flex items-center gap-1 text-xs font-bold text-warning"><Clock3 className="w-3.5 h-3.5" /> Pending</span>}</td>
                        <td className="px-4 py-3 text-xs text-text-muted">{fmt(u.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-text-muted">{fmt(u.lastActiveAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* RUNS TAB */}
        {tab === "runs" && (
          <motion.div initial="hidden" animate="visible" variants={FADE_UP_STAGGER} className="glass-card rounded-2xl overflow-hidden border border-border bg-glass backdrop-blur-glass shadow-sm">
            <div className="px-6 py-4 flex items-center justify-between border-b border-border bg-interactive-hover">
              <p className="font-semibold text-text">{runs.length} pipeline runs</p>
              <span className="text-xs text-text-muted">All users · latest 50</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-interactive-hover text-text-muted">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider">Query</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {runs.length === 0 && <tr><td colSpan={6} className="px-6 py-10 text-center text-text-muted">No runs yet.</td></tr>}
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-interactive-hover transition-colors">
                      <td className="px-6 py-3"><p className="font-semibold text-text truncate max-w-[260px]">{run.query}</p><p className="text-[10px] text-text-subtle font-mono mt-0.5">{run.id.slice(0, 8)}…</p></td>
                      <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                      <td className="px-4 py-3 text-center font-semibold text-text">{run.leadsFound ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{fmt(run.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-text-muted">{fmt(run.completedAt)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-text-subtle">{run.userId ? run.userId.slice(0, 8) + "…" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </PageShell>
  );
}
