import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Activity, Building2, CheckCircle, Clock3, Loader2, RefreshCw, Shield, TrendingUp, Users, Zap, Lock, LogOut } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useLang } from "../lib/lang-context";

type OwnerStats = {
  totalUsers: number;
  totalLeads: number;
  totalRuns: number;
  leadsThisWeek: number;
  leadsAnalyzed: number;
  leadsContacted: number;
  leadsWon: number;
  conversionRate: number;
  activeWorkspaces: number;
  onboardingCompleted: number;
  recentRuns: Array<{
    id: string;
    query: string;
    status: string;
    createdAt: string;
    leadsFound: number;
  }>;
  recentWorkspaces: Array<{
    id: string;
    name: string;
    targetIndustry: string | null;
    targetCity: string | null;
    createdAt: string;
  }>;
  health: {
    api: boolean;
    auth: boolean;
    database: boolean;
    agents: boolean;
  };
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] } }),
};

async function apiGet<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = (import.meta.env.VITE_API_URL as string) || "/api";
  const res = await fetch(`${base}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const base = (import.meta.env.VITE_API_URL as string) || "/api";
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json() as Promise<T>;
}

function StatCard({ icon: Icon, label, value, trend }: { icon: typeof Users; label: string; value: number | string; trend: string }) {
  return (
    <motion.div variants={fadeUp} className="bg-white border border-[#E5E3D9] rounded-2xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-[#F0EDE6]">
          <Icon className="w-5 h-5 text-[#1A1A1A]" />
        </div>
      </div>
      <p className="text-3xl font-serif font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-sm text-[#7A756D] mt-1">{label}</p>
      <p className="text-xs text-emerald-600 font-medium mt-3">{trend}</p>
    </motion.div>
  );
}

export default function OwnerDashboardPage() {
  const { t } = useLang();
  const [data, setData] = useState<OwnerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(() => localStorage.getItem("owner_unlocked") === "true");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await apiGet<OwnerStats>("/owner/dashboard");
      setData(stats);
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
    if (unlocked) load();
  }, [unlocked]);

  const handleUnlock = async () => {
    setError(null);
    try {
      await apiPost<{ unlocked: boolean }>("/owner/unlock", { password });
      setUnlocked(true);
      localStorage.setItem("owner_unlocked", "true");
      setPassword("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unlock failed");
    }
  };

  const handleLock = () => {
    setUnlocked(false);
    localStorage.removeItem("owner_unlocked");
    setPassword("");
    setData(null);
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border border-[#E5E3D9] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#7A756D]" />
            <p className="text-sm font-semibold text-[#1A1A1A]">{t("ownerAccess")}</p>
          </div>
          <p className="text-sm text-[#7A756D]">{t("ownerPageNote")}</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder={t("password")}
            className="w-full px-3 py-2.5 border border-[#E5E3D9] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10"
          />
          <button
            onClick={handleUnlock}
            className="w-full bg-[#1A1A1A] text-white rounded-xl py-2.5 text-sm font-medium hover:bg-[#2A2A2A] transition"
          >
            {t("unlock")}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#7A756D]" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-red-400 mx-auto" />
          <p className="font-semibold text-[#1A1A1A]">{error ?? t("noData")}</p>
          <button onClick={() => load()} className="text-sm text-[#7A756D] hover:text-[#1A1A1A] underline">
            {t("tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] p-4 sm:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-[#7A756D]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A756D]">{t("ownerDashboard")}</span>
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">{t("projectOverview")}</h1>
            <p className="text-sm text-[#7A756D] mt-0.5">{t("allDetails")}</p>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-sm text-[#7A756D] border border-[#E5E3D9] bg-white px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition">
            <RefreshCw className="w-3.5 h-3.5" />
            {t("refresh")}
          </button>
        </motion.div>

        <button
          onClick={handleLock}
          className="inline-flex items-center gap-2 text-sm text-[#7A756D] border border-[#E5E3D9] bg-white px-3 py-2 rounded-xl hover:bg-[#F7F5F0] transition w-fit"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("lockOwnerAccess")}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard icon={Users} label={t("users")} value={data.totalUsers} trend={`${data.onboardingCompleted} ${t("onboarded")}`} />
          <StatCard icon={TrendingUp} label={t("leads")} value={data.totalLeads} trend={`${data.leadsThisWeek} ${t("thisWeek")}`} />
          <StatCard icon={Zap} label={t("runs")} value={data.totalRuns} trend={`${data.leadsContacted} ${t("contacted")}`} />
          <StatCard icon={Activity} label={t("conversion")} value={`${data.conversionRate}%`} trend={`${data.leadsWon} ${t("wins")}`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div variants={fadeUp} className="lg:col-span-2 bg-white border border-[#E5E3D9] rounded-2xl p-6 space-y-4">
            <p className="font-semibold text-[#1A1A1A]">{t("platformHealth")}</p>
            {[
              ["API", data.health.api],
              ["Auth", data.health.auth],
              ["Database", data.health.database],
              ["Agents", data.health.agents],
            ].map(([label, ok]) => (
              <div key={String(label)} className="flex items-center justify-between py-2 border-b border-[#F0EDE6] last:border-0">
                <span className="text-sm text-[#4A4540]">{label}</span>
                <span className={`text-xs font-medium flex items-center gap-1.5 ${ok ? "text-emerald-600" : "text-amber-600"}`}>
                  {ok ? <CheckCircle className="w-4 h-4" /> : <Clock3 className="w-4 h-4" />}
                  {ok ? "OK" : t("needsAttention")}
                </span>
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="bg-white border border-[#E5E3D9] rounded-2xl p-6 space-y-4">
            <p className="font-semibold text-[#1A1A1A]">{t("recentWorkspaces")}</p>
            <div className="space-y-3">
              {data.recentWorkspaces.map((ws) => (
                <div key={ws.id} className="border border-[#F0EDE6] rounded-xl p-3">
                  <p className="text-sm font-medium text-[#1A1A1A]">{ws.name}</p>
                  <p className="text-xs text-[#7A756D] mt-1">{ws.targetIndustry ?? t("allIndustries")} · {ws.targetCity ?? t("allNL")}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="bg-white border border-[#E5E3D9] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#F0EDE6] flex items-center justify-between">
            <p className="font-semibold text-[#1A1A1A]">{t("recentRuns")}</p>
            <span className="text-xs text-[#7A756D]">{t("latestPipelineActivity")}</span>
          </div>
          <div className="divide-y divide-[#F0EDE6]">
            {data.recentRuns.map((run) => (
              <div key={run.id} className="px-6 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{run.query}</p>
                  <p className="text-xs text-[#7A756D]">{new Date(run.createdAt).toLocaleString()} · {run.leadsFound} {t("leads")}</p>
                </div>
                <span className="text-xs font-medium text-[#7A756D] border border-[#E5E3D9] rounded-full px-2.5 py-1">{run.status}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
