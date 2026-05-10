import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Users, BarChart2, Zap, Shield, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { supabase } from "../lib/supabase";

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
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] } }),
};

async function apiGet<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = (import.meta.env.VITE_API_URL as string) || "/api";
  const res = await fetch(`${base}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.FC<{ className?: string }>; label: string; value: number | string; color: string }) {
  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#E5E3D9] rounded-2xl p-6 flex items-center gap-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-serif font-bold text-[#1A1A1A]">{value}</p>
        <p className="text-sm text-[#7A756D]">{label}</p>
      </div>
    </motion.div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"overview" | "users">("overview");

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
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-[#7A756D]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="font-semibold text-[#1A1A1A]">{error}</p>
          <button onClick={load} className="text-sm text-[#7A756D] hover:text-[#1A1A1A] underline">Try again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-[#7A756D]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A756D]">Admin</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Platform Dashboard</h1>
            <p className="text-sm text-[#7A756D] mt-0.5">Internal management page for FindX administrators.</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-1.5 text-sm text-[#7A756D] border border-[#E5E3D9] bg-white px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#F0EDE6] p-1 rounded-xl w-fit">
          {(["overview", "users"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white text-[#1A1A1A] shadow-sm" : "text-[#7A756D] hover:text-[#1A1A1A]"}`}
            >
              {t === "overview" ? "Overview" : "Users"}
            </button>
          ))}
        </div>

        {tab === "overview" && stats && (
          <motion.div initial="hidden" animate="visible" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Users} label="Registered users" value={stats.totalUsers} color="bg-blue-50 text-blue-600" />
              <StatCard icon={TrendingUp} label="Total leads generated" value={stats.totalLeads} color="bg-emerald-50 text-emerald-600" />
              <StatCard icon={Zap} label="Agent runs executed" value={stats.totalRuns} color="bg-violet-50 text-violet-600" />
            </div>

            <motion.div variants={fadeUp} className="bg-white border border-[#E5E3D9] rounded-2xl p-6 space-y-4">
              <p className="font-semibold text-[#1A1A1A]">Platform health</p>
              <div className="space-y-3">
                {[
                  { label: "API Server", ok: true },
                  { label: "Supabase Auth", ok: true },
                  { label: "Database connection", ok: true },
                  { label: "Agent system", ok: stats.totalRuns > 0 },
                ].map(({ label, ok }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-[#F0EDE6] last:border-0">
                    <span className="text-sm text-[#4A4540]">{label}</span>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                      {ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {ok ? "Operational" : "Needs attention"}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {tab === "users" && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="bg-white border border-[#E5E3D9] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#F0EDE6] flex items-center justify-between">
              <p className="font-semibold text-[#1A1A1A]">{users.length} users</p>
              <div className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-[#7A756D]" />
                <span className="text-xs text-[#7A756D]">sorted by creation date</span>
              </div>
            </div>
            <div className="divide-y divide-[#F0EDE6]">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAF7] transition">
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-[#E5E3D9] flex-shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-[#F0EDE6] flex items-center justify-center flex-shrink-0 text-xs font-bold text-[#1A1A1A]">
                      {u.name[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[#1A1A1A] truncate">{u.name}</p>
                      {u.isAdmin && (
                        <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Admin</span>
                      )}
                    </div>
                    <p className="text-xs text-[#7A756D] truncate">{u.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-6 text-xs text-[#7A756D] flex-shrink-0">
                    <div className="text-center">
                      <p className="font-semibold text-[#1A1A1A]">{u.leadCount}</p>
                      <p>leads</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-[#1A1A1A]">{formatDate(u.createdAt)}</p>
                      <p>joined</p>
                    </div>
                    <div className={`flex items-center gap-1 ${u.onboardingCompleted ? "text-emerald-600" : "text-amber-500"}`}>
                      {u.onboardingCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {u.onboardingCompleted ? "Onboarded" : "In progress"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
