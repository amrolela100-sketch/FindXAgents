import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Users, BarChart2, Zap, Shield, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  totalLeads: number;
  totalRuns: number;
  adminEmail: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
  lastSignIn: string | null;
  leadCount: number;
  onboardingCompleted: boolean;
  isAdmin: boolean;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

async function apiGet<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token    = data.session?.access_token;
  const base     = "/api"; // Use Vercel proxy to avoid cross-origin issues
  const res      = await fetch(`${base}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function StatCard({ label, value, children }: {
  label: string;
  value: number | string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2 }}
      className="glass-card rounded-2xl p-5 flex items-center gap-4 border border-border bg-glass backdrop-blur-glass shadow-sm"
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 border border-primary/20 bg-primary/10 text-primary">
        {children}
      </div>
      <div>
        <p className="text-[26px] font-bold leading-none text-text">{value}</p>
        <p className="text-[12px] mt-1 text-text-muted">{label}</p>
      </div>
    </motion.div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const [stats,   setStats]   = useState<AdminStats | null>(null);
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [tab,     setTab]     = useState<"overview" | "users">("overview");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, u] = await Promise.all([
        apiGet<{ stats: AdminStats }>("/admin/stats"),
        apiGet<{ users: AdminUser[] }>("/admin/users"),
      ]);
      setStats(s.stats);
      setUsers(u.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <PageShell title="Admin" subtitle="Platform Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Admin" subtitle="Platform Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Shield className="w-10 h-10 mx-auto text-danger" />
            <p className="font-semibold text-text">{error}</p>
            <button onClick={load} className="text-[13px] underline text-text-muted">Try again</button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Admin" subtitle="Platform Dashboard">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-text-muted" strokeWidth={1.5} />
              <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
                Admin
              </span>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight text-text">
              Platform Dashboard
            </h1>
            <p className="text-[13px] mt-0.5 text-text-muted">
              Internal management page for FindX administrators.
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-[13px] px-3.5 py-2 rounded-full border border-border bg-interactive-hover hover:bg-interactive-hover-active transition-all text-text-muted"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </motion.div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div className="flex gap-1 p-1 rounded-full border border-border bg-interactive-hover w-fit">
          {(["overview", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 rounded-full text-[13px] font-semibold transition-all border",
                tab === t
                  ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                  : "border-transparent text-text-muted hover:text-text"
              )}
            >
              {t === "overview" ? "Overview" : "Users"}
            </button>
          ))}
        </div>

        {/* ── Overview ───────────────────────────────────────── */}
        {tab === "overview" && stats && (
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Registered users"      value={stats.totalUsers}><Users      className="w-5 h-5" strokeWidth={1.5} /></StatCard>
              <StatCard label="Total leads generated" value={stats.totalLeads}><TrendingUp className="w-5 h-5" strokeWidth={1.5} /></StatCard>
              <StatCard label="Agent runs executed"   value={stats.totalRuns}><Zap        className="w-5 h-5" strokeWidth={1.5} /></StatCard>
            </div>

            <motion.div variants={fadeUp} className="rounded-2xl p-5 space-y-4 border border-border bg-glass backdrop-blur-glass shadow-sm">
              <p className="text-[13.5px] font-semibold text-text">
                Platform health
              </p>
              <div className="space-y-0">
                {[
                  { label: "API Server",           ok: true },
                  { label: "Supabase Auth",         ok: true },
                  { label: "Database connection",   ok: true },
                  { label: "Agent system",          ok: stats.totalRuns > 0 },
                ].map(({ label, ok }, i) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center justify-between py-3",
                      i < 3 && "border-b border-border"
                    )}
                  >
                    <span className="text-[13px] text-text-muted">{label}</span>
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[12px] font-bold",
                        ok ? "text-success" : "text-warning"
                      )}
                    >
                      {ok
                        ? <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                        : <XCircle    className="w-3.5 h-3.5" strokeWidth={2} />}
                      {ok ? "Operational" : "Needs attention"}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Users table ────────────────────────────────────── */}
        {tab === "users" && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-2xl overflow-hidden border border-border bg-glass backdrop-blur-glass shadow-sm"
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-border bg-interactive-hover">
              <p className="text-[13.5px] font-semibold text-text">
                {users.length} users
              </p>
              <div className="flex items-center gap-1.5 text-text-muted">
                <BarChart2 className="w-4 h-4" />
                <span className="text-[11px]">sorted by creation date</span>
              </div>
            </div>

            <div>
              {users.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.03 }}
                  className={cn(
                    "flex items-center gap-4 px-5 py-4 hover:bg-interactive-hover transition-colors",
                    i < users.length - 1 && "border-b border-border"
                  )}
                >
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold border border-primary/20 bg-primary/10 text-primary"
                    >
                      {u.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium truncate text-text">
                        {u.name}
                      </p>
                      {u.isAdmin && (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 border border-warning/20 bg-warning/5 text-warning"
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] truncate text-text-muted">{u.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-[12px] flex-shrink-0 text-text-muted">
                    <div className="text-center">
                      <p className="font-semibold text-[13px] text-text">{u.leadCount}</p>
                      <p>leads</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-[13px] text-text">{formatDate(u.createdAt)}</p>
                      <p>joined</p>
                    </div>
                    <div
                      className={cn(
                        "flex items-center gap-1 font-bold",
                        u.onboardingCompleted ? "text-success" : "text-warning"
                      )}
                    >
                      {u.onboardingCompleted
                        ? <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} />
                        : <XCircle    className="w-3.5 h-3.5" strokeWidth={2} />}
                      {u.onboardingCompleted ? "Onboarded" : "In progress"}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </PageShell>
  );
}
