import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Activity, Building2, CheckCircle, Clock3, Loader2, RefreshCw,
  Shield, TrendingUp, Users, Zap, Lock, LogOut, BarChart2,
  UserCheck, UserX, Crown, Bot, Search,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLang } from "../lib/lang-context";

// ─── Types ────────────────────────────────────────────────────────────────────

type OwnerStats = {
  totalUsers: number;
  totalLeads: number;
  totalRuns: number;
  leadsThisWeek: number;
  leadsAnalyzed: number;
  leadsContacted: number;
  leadsWon: number;
  conversionRate: number;
  onboardingCompleted: number;
  activeWorkspaces: number;
  recentRuns: OwnerRun[];
  recentWorkspaces: unknown[];
  health: { api: boolean; auth: boolean; database: boolean; agents: boolean };
};

type OwnerUser = {
  id: string;
  email: string;
  role: string;
  isAdmin: boolean;
  isOwner: boolean;
  onboardingCompleted: boolean;
  leadCount: number;
  runCount: number;
  createdAt: string;
  lastActiveAt: string | null;
};

type OwnerRun = {
  id: string;
  userId: string | null;
  query: string;
  status: string;
  leadsFound: number | null;
  createdAt: string;
  completedAt: string | null;
};

// ─── Animations ───────────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = (import.meta.env.VITE_API_URL as string) || "/api";
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Small components ─────────────────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, color = "bg-[var(--glass-raised)] text-[var(--text)]",
}: {
  icon: typeof Users; label: string; value: number | string; sub?: string; color?: string;
}) {
  return (
    <motion.div variants={fadeUp} className="glass-card rounded-2xl p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-3xl font-serif font-bold text-[var(--text)]">{value}</p>
      <p className="text-sm text-[var(--text-muted)] mt-1">{label}</p>
      {sub && <p className="text-xs text-emerald-600 font-medium mt-2">{sub}</p>}
    </motion.div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-50 text-emerald-700",
  running:   "bg-blue-50 text-blue-700",
  queued:    "bg-amber-50 text-amber-700",
  failed:    "bg-red-50 text-red-700",
  cancelled: "bg-[var(--glass-raised)] text-[var(--text-muted)]",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-[var(--glass-raised)] text-[var(--text-muted)]";
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${cls}`}>{status}</span>
  );
}

function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// ─── Main page ────────────────────────────────────────────────────────────────

type Tab = "overview" | "users" | "runs";

export default function OwnerDashboardPage() {
  const { t } = useLang();

  const [unlocked, setUnlocked] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("owner_unlocked") === "true",
  );
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

  // ── load data ──────────────────────────────────────────────────────────────

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u, r] = await Promise.all([
        apiFetch<OwnerStats>("/owner/dashboard"),
        apiFetch<{ users: OwnerUser[] }>("/owner/users"),
        apiFetch<{ runs: OwnerRun[] }>("/owner/runs?pageSize=50"),
      ]);
      setStats(s);
      setUsers(u.users);
      setRuns(r.runs);
    } catch (err) {
      if (err instanceof Error && err.message.includes("401")) {
        setUnlocked(false);
        localStorage.removeItem("owner_unlocked");
      }
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (unlocked) loadAll();
  }, [unlocked]);

  // ── unlock ─────────────────────────────────────────────────────────────────

  const handleUnlock = async () => {
    if (!password) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      await apiFetch<{ unlocked: boolean }>("/owner/unlock", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setUnlocked(true);
      localStorage.setItem("owner_unlocked", "true");
      setPassword("");
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : "Unlock failed");
    } finally {
      setUnlocking(false);
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    localStorage.removeItem("owner_unlocked");
    setPassword("");
    setStats(null);
    setUsers([]);
    setRuns([]);
  };

  // ── lock screen ────────────────────────────────────────────────────────────

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm glass-card rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[var(--glass-raised)]">
              <Lock className="w-4 h-4 text-[var(--text)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Owner Access</p>
              <p className="text-xs text-[var(--text-muted)]">Full platform control</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)]">
            This area is restricted to the platform owner. Enter your owner password to continue.
          </p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Owner password"
            className="w-full px-3 py-2.5 border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
          />
          <button
            onClick={handleUnlock}
            disabled={unlocking || !password}
            className="w-full bg-[#1A1A1A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#2A2A2A] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {unlocking && <Loader2 className="w-4 h-4 animate-spin" />}
            Unlock
          </button>
          {unlockError && <p className="text-xs text-red-600">{unlockError}</p>}
        </motion.div>
      </div>
    );
  }

  // ── loading / error ────────────────────────────────────────────────────────

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="font-semibold text-[var(--text)]">{error}</p>
          <button onClick={loadAll} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ── filtered users ─────────────────────────────────────────────────────────

  const filteredUsers = users.filter(
    (u) => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()),
  );

  // ── main UI ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ── Header ── */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Owner Dashboard
              </span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[var(--text)]">Platform Overview</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">Full control and visibility across all users and activity.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAll}
              disabled={loading}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 rounded-xl hover:bg-[var(--bg)] transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={handleLock}
              className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] border-[var(--glass-border)] bg-[var(--glass)] px-3 py-2 rounded-xl hover:bg-[var(--bg)] transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Lock
            </button>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-[var(--glass-raised)] p-1 rounded-xl w-fit">
          {(["overview", "users", "runs"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                tab === tb ? "bg-[var(--glass)] text-[var(--text)] shadow-sm" : "text-[var(--text-muted)] hover:text-[var(--text)]"
              }`}
            >
              {tb === "overview" && <BarChart2 className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {tb === "users" && <Users className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {tb === "runs" && <Bot className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />}
              {tb.charAt(0).toUpperCase() + tb.slice(1)}
            </button>
          ))}
        </div>

        {/* ════════════════════ OVERVIEW TAB ════════════════════ */}
        {tab === "overview" && stats && (
          <motion.div initial="hidden" animate="visible" className="space-y-6">

            {/* Stat grid */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard icon={Users}     label="Total users"      value={stats.totalUsers}
                sub={`${stats.onboardingCompleted} onboarded`}
                color="bg-blue-50 text-blue-600" />
              <StatCard icon={TrendingUp} label="Total leads"     value={stats.totalLeads}
                sub={`${stats.leadsThisWeek} this week`}
                color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={Zap}        label="Agent runs"      value={stats.totalRuns}
                sub={`${stats.leadsContacted} contacted`}
                color="bg-violet-50 text-violet-600" />
              <StatCard icon={Activity}  label="Conversion rate"  value={`${stats.conversionRate}%`}
                sub={`${stats.leadsWon} won`}
                color="bg-amber-50 text-amber-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Health */}
              <motion.div variants={fadeUp} className="glass-card rounded-2xl p-6 space-y-3">
                <p className="font-semibold text-[var(--text)]">Platform Health</p>
                {(["api", "auth", "database", "agents"] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-[#F0EDE6] last:border-0">
                    <span className="text-sm text-[#4A4540] capitalize">{key}</span>
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${stats.health[key] ? "text-emerald-600" : "text-amber-600"}`}>
                      {stats.health[key]
                        ? <><CheckCircle className="w-4 h-4" /> Operational</>
                        : <><Clock3 className="w-4 h-4" /> Needs attention</>}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* Funnel */}
              <motion.div variants={fadeUp} className="glass-card rounded-2xl p-6 space-y-3">
                <p className="font-semibold text-[var(--text)]">Lead Funnel</p>
                {[
                  { label: "Discovered",  value: stats.totalLeads,     color: "bg-[#1A1A1A]" },
                  { label: "Analyzed",    value: stats.leadsAnalyzed,   color: "bg-blue-500" },
                  { label: "Contacted",   value: stats.leadsContacted,  color: "bg-violet-500" },
                  { label: "Won",         value: stats.leadsWon,        color: "bg-emerald-500" },
                ].map(({ label, value, color }) => {
                  const pct = stats.totalLeads > 0 ? Math.round((value / stats.totalLeads) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#4A4540]">{label}</span>
                        <span className="font-medium text-[var(--text)]">{value} <span className="text-[var(--text-muted)] font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-2 bg-[var(--glass-raised)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            </div>

            {/* Recent runs */}
            <motion.div variants={fadeUp} className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F0EDE6]">
                <p className="font-semibold text-[var(--text)]">Latest Pipeline Runs</p>
              </div>
              <div className="divide-y divide-[#F0EDE6]">
                {stats.recentRuns.length === 0 && (
                  <p className="px-6 py-8 text-sm text-center text-[var(--text-muted)]">No runs yet.</p>
                )}
                {stats.recentRuns.map((run) => (
                  <div key={run.id} className="px-6 py-4 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">{run.query}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        {fmt(run.createdAt)} · {run.leadsFound ?? 0} leads found
                      </p>
                    </div>
                    <StatusBadge status={run.status} />
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ════════════════════ USERS TAB ════════════════════ */}
        {tab === "users" && (
          <motion.div initial="hidden" animate="visible" className="space-y-4">

            {/* Search + summary */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search by email…"
                  className="w-full pl-9 pr-3 py-2 border-[var(--glass-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 bg-[var(--glass)]"
                />
              </div>
              <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1"><UserCheck className="w-4 h-4 text-emerald-500" /> {users.filter(u => u.onboardingCompleted).length} onboarded</span>
                <span className="flex items-center gap-1"><UserX className="w-4 h-4 text-amber-500" /> {users.filter(u => !u.onboardingCompleted).length} pending</span>
              </div>
            </div>

            <motion.div variants={fadeUp} className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#F0EDE6] flex items-center justify-between">
                <p className="font-semibold text-[var(--text)]">{filteredUsers.length} users</p>
                <span className="text-xs text-[var(--text-muted)]">sorted by registration date</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#F0EDE6] bg-[#FAFAF7]">
                      <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Leads</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Runs</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Onboarded</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Registered</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Last active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EDE6]">
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-[var(--text-muted)]">No users found.</td></tr>
                    )}
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-[#FAFAF7] transition-colors">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[var(--glass-raised)] flex items-center justify-center text-xs font-semibold text-[var(--text)] flex-shrink-0">
                              {u.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[var(--text)] text-xs leading-tight truncate max-w-[200px]">{u.email}</p>
                              <p className="text-[10px] text-[var(--text-subtle)] font-mono">{u.id.slice(0, 8)}…</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.isOwner && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                <Crown className="w-3 h-3" /> Owner
                              </span>
                            )}
                            {u.isAdmin && !u.isOwner && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
                                <Shield className="w-3 h-3" /> Admin
                              </span>
                            )}
                            {!u.isOwner && !u.isAdmin && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--glass-raised)] text-[var(--text-muted)]">User</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-[var(--text)]">{u.leadCount}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-[var(--text)]">{u.runCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          {u.onboardingCompleted
                            ? <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium"><CheckCircle className="w-3.5 h-3.5" /> Yes</span>
                            : <span className="flex items-center gap-1 text-xs text-amber-600 font-medium"><Clock3 className="w-3.5 h-3.5" /> Pending</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{fmt(u.createdAt)}</td>
                        <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{fmt(u.lastActiveAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ════════════════════ RUNS TAB ════════════════════ */}
        {tab === "runs" && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp}
            className="glass-card rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F0EDE6] flex items-center justify-between">
              <p className="font-semibold text-[var(--text)]">{runs.length} pipeline runs</p>
              <span className="text-xs text-[var(--text-muted)]">All users · latest 50</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F0EDE6] bg-[#FAFAF7]">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Query</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Leads</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Started</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Completed</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">User ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EDE6]">
                  {runs.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-[var(--text-muted)]">No runs yet.</td></tr>
                  )}
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-[#FAFAF7] transition-colors">
                      <td className="px-6 py-3">
                        <p className="font-medium text-[var(--text)] truncate max-w-[260px]">{run.query}</p>
                        <p className="text-[10px] text-[var(--text-subtle)] font-mono mt-0.5">{run.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={run.status} /></td>
                      <td className="px-4 py-3 text-center font-semibold text-[var(--text)]">{run.leadsFound ?? 0}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{fmt(run.createdAt)}</td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">{fmt(run.completedAt)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-[var(--text-subtle)]">{run.userId ? run.userId.slice(0, 8) + "…" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
