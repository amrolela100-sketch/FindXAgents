import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Users, BarChart2, Zap, Shield, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/lib/supabase";

const GLASS = {
  background: "var(--glass)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
} as const;

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

// ── Stat card ─────────────────────────────────────────────────────────────────
type StatCardAccent = { accent: string; glow: string };

const STAT_ACCENTS: StatCardAccent[] = [
  { accent: "#60A5FA", glow: "rgba(59,130,246,0.25)" },
  { accent: "#34D399", glow: "rgba(16,185,129,0.25)" },
  { accent: "#C084FC", glow: "rgba(168,85,247,0.25)" },
];

function StatCardIcon({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}
    >
      {children}
    </div>
  );
}

function StatCard({ label, value, accent, glow, children }: {
  label: string;
  value: number | string;
  accent: string;
  glow: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${glow}, 0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.12)` }}
      className="rounded-2xl p-5 flex items-center gap-4"
      style={GLASS}
    >
      <StatCardIcon accent={accent}>{children}</StatCardIcon>
      <div>
        <p className="text-[26px] font-bold leading-none" style={{ color: "var(--text)" }}>{value}</p>
        <p className="text-[12px] mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
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
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--text-muted)" }} />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title="Admin" subtitle="Platform Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <Shield className="w-10 h-10 mx-auto" style={{ color: "#F87171" }} />
            <p className="font-semibold" style={{ color: "var(--text)" }}>{error}</p>
            <button onClick={load} className="text-[13px] underline" style={{ color: "var(--text-muted)" }}>Try again</button>
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
              <Shield className="w-4 h-4" strokeWidth={1.5} style={{ color: "var(--text-muted)" }} />
              <span
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "var(--text-muted)" }}
              >
                Admin
              </span>
            </div>
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Platform Dashboard
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--text-muted)" }}>
              Internal management page for FindX administrators.
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-[13px] px-3 py-2 rounded-xl transition-all"
            style={GLASS}
          >
            <RefreshCw className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
            <span style={{ color: "var(--text-muted)" }}>Refresh</span>
          </button>
        </motion.div>

        {/* ── Tabs ───────────────────────────────────────────── */}
        <div
          className="flex gap-1 p-1 rounded-xl w-fit"
          style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
        >
          {(["overview", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: tab === t ? "var(--glass)" : "transparent",
                color:      tab === t ? "var(--text)" : "var(--text-muted)",
                boxShadow:  tab === t ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                border:     tab === t ? "1px solid var(--glass-border)" : "1px solid transparent",
              }}
            >
              {t === "overview" ? "Overview" : "Users"}
            </button>
          ))}
        </div>

        {/* ── Overview ───────────────────────────────────────── */}
        {tab === "overview" && stats && (
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard label="Registered users"      value={stats.totalUsers} {...STAT_ACCENTS[0]}><Users      className="w-5 h-5" strokeWidth={1.5} /></StatCard>
              <StatCard label="Total leads generated" value={stats.totalLeads} {...STAT_ACCENTS[1]}><TrendingUp className="w-5 h-5" strokeWidth={1.5} /></StatCard>
              <StatCard label="Agent runs executed"   value={stats.totalRuns}  {...STAT_ACCENTS[2]}><Zap        className="w-5 h-5" strokeWidth={1.5} /></StatCard>
            </div>

            <motion.div variants={fadeUp} className="rounded-2xl p-5 space-y-4" style={GLASS}>
              <p className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
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
                    className="flex items-center justify-between py-3"
                    style={{
                      borderBottom: i < 3 ? "1px solid var(--glass-border)" : "none",
                    }}
                  >
                    <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{label}</span>
                    <div
                      className="flex items-center gap-1.5 text-[12px] font-semibold"
                      style={{ color: ok ? "#34D399" : "#FBBF24" }}
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
            className="rounded-2xl overflow-hidden"
            style={GLASS}
          >
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <p className="text-[13.5px] font-semibold" style={{ color: "var(--text)" }}>
                {users.length} users
              </p>
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>sorted by creation date</span>
              </div>
            </div>

            <div>
              {users.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.03 }}
                  className="flex items-center gap-4 px-5 py-4 transition-colors"
                  style={{
                    borderBottom: i < users.length - 1 ? "1px solid var(--glass-border)" : "none",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--glass-raised)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  {u.avatar ? (
                    <img
                      src={u.avatar}
                      alt={u.name}
                      className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                      style={{ border: "1px solid var(--glass-border)" }}
                    />
                  ) : (
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[12px] font-bold"
                      style={{
                        background: "rgba(96,165,250,0.15)",
                        color: "#60A5FA",
                        border: "1px solid rgba(96,165,250,0.25)",
                      }}
                    >
                      {u.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium truncate" style={{ color: "var(--text)" }}>
                        {u.name}
                      </p>
                      {u.isAdmin && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: "rgba(251,191,36,0.15)",
                            color: "#FBBF24",
                            border: "1px solid rgba(251,191,36,0.25)",
                          }}
                        >
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{u.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-[12px] flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                    <div className="text-center">
                      <p className="font-semibold text-[13px]" style={{ color: "var(--text)" }}>{u.leadCount}</p>
                      <p>leads</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-[13px]" style={{ color: "var(--text)" }}>{formatDate(u.createdAt)}</p>
                      <p>joined</p>
                    </div>
                    <div
                      className="flex items-center gap-1 font-semibold"
                      style={{ color: u.onboardingCompleted ? "#34D399" : "#FBBF24" }}
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
