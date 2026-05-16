import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BarChart2, Zap, Shield, CheckCircle, XCircle, Loader2, RefreshCw, TrendingUp } from "lucide-react";
import { PageShell } from "../components/page-shell";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
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

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

async function apiGet<T>(path: string): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token    = data.session?.access_token;
  const base     = "/api";
  const res      = await fetch(`${base}${path}`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function StatCard({ label, value, colorClass, bgClass, borderClass, icon: Icon }: {
  label: string; value: number | string; colorClass: string; bgClass: string; borderClass: string; icon: any;
}) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={cn("rounded-2xl p-6 border bg-glass shadow-sm flex items-center gap-5", borderClass)}
    >
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-white/10 shadow-inner shrink-0", colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-3xl font-bold tracking-tighter text-text leading-none">{value}</p>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest mt-2">{label}</p>
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
      setError(err instanceof Error ? err.message : "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <PageShell title="Admin" subtitle="System Administration" actions={
      <Button variant="outline" size="sm" onClick={load} className="gap-2 font-bold h-9">
        <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
        Refresh
      </Button>
    }>
      <div className="max-w-6xl mx-auto space-y-8 px-5 md:px-8 py-6">

        {/* Tab Navigation */}
        <div className="flex gap-1.5 p-1.5 rounded-2xl bg-glass border border-glass-border w-fit shadow-sm">
          <Button 
            variant={tab === "overview" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setTab("overview")}
            className={cn("h-9 px-6 font-bold uppercase tracking-widest text-[10px]", tab !== "overview" && "text-text-muted")}
          >
            Overview
          </Button>
          <Button 
            variant={tab === "users" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setTab("users")}
            className={cn("h-9 px-6 font-bold uppercase tracking-widest text-[10px]", tab !== "users" && "text-text-muted")}
          >
            Users Management
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {loading && !stats ? (
             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm font-bold text-text-muted uppercase tracking-widest">Loading Analytics...</p>
             </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center text-danger border border-danger/20">
                <Shield className="w-8 h-8" />
              </div>
              <p className="font-bold text-text">{error}</p>
              <Button variant="outline" onClick={load}>Try again</Button>
            </motion.div>
          ) : tab === "overview" && stats ? (
            <motion.div key="overview" initial="hidden" animate="visible" variants={fadeUp} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label="Registered Users" value={stats.totalUsers} colorClass="text-info" bgClass="bg-info/10" borderClass="border-info-border" icon={Users} />
                <StatCard label="Leads Generated" value={stats.totalLeads} colorClass="text-success" bgClass="bg-success/10" borderClass="border-success-border" icon={TrendingUp} />
                <StatCard label="Pipeline Executions" value={stats.totalRuns} colorClass="text-primary" bgClass="bg-primary/10" borderClass="border-primary-border" icon={Zap} />
              </div>

              <div className="rounded-2xl bg-glass border border-glass-border overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-glass-border bg-glass-raised/50">
                   <h3 className="text-sm font-bold text-text uppercase tracking-widest flex items-center gap-2">
                     <Shield className="w-4 h-4 text-primary" />
                     Platform Health Status
                   </h3>
                </div>
                <div className="divide-y divide-glass-border">
                  {[
                    { label: "Core API Infrastructure", ok: true },
                    { label: "Identity & Authentication (Supabase)", ok: true },
                    { label: "Primary Storage Layer (PostgreSQL)", ok: true },
                    { label: "Agent Orchestration Engine", ok: stats.totalRuns > 0 },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-glass-raised/30">
                      <span className="text-sm font-medium text-text-muted">{s.label}</span>
                      <div className={cn("flex items-center gap-2 text-xs font-bold uppercase tracking-wider", s.ok ? "text-success" : "text-warning")}>
                        {s.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {s.ok ? "Operational" : "Degraded Performance"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="users" initial="hidden" animate="visible" variants={fadeUp} className="rounded-2xl border border-glass-border bg-glass overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-glass-border bg-glass-raised/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-text uppercase tracking-widest">Registered Userbase</h3>
                <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20">{users.length} TOTAL USERS</span>
              </div>
              
              <div className="divide-y divide-glass-border">
                {users.map((u, i) => (
                  <div key={u.id} className="flex flex-wrap items-center gap-4 px-6 py-5 transition-all hover:bg-glass-raised group">
                    <div className="relative">
                      {u.avatar ? (
                        <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-xl object-cover border border-glass-border" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 text-sm font-bold">
                          {u.name[0]?.toUpperCase()}
                        </div>
                      )}
                      {u.isAdmin && <div className="absolute -top-1 -right-1 w-4 h-4 bg-warning rounded-full border-2 border-background flex items-center justify-center shadow-sm" title="Admin User"><Shield className="w-2.5 h-2.5 text-white" /></div>}
                    </div>

                    <div className="flex-1 min-w-[200px]">
                      <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">{u.name}</p>
                      <p className="text-xs text-text-subtle font-medium">{u.email}</p>
                    </div>

                    <div className="flex items-center gap-8 text-[11px] uppercase tracking-tighter font-bold">
                      <div className="flex flex-col items-center">
                        <span className="text-text text-sm font-mono">{u.leadCount}</span>
                        <span className="text-text-subtle">Leads</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-text text-sm font-mono">{formatDate(u.createdAt)}</span>
                        <span className="text-text-subtle">Joined</span>
                      </div>
                      <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-lg border", u.onboardingCompleted ? "bg-success/5 border-success/20 text-success" : "bg-warning/5 border-warning/20 text-warning")}>
                        {u.onboardingCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        {u.onboardingCompleted ? "Active" : "Onboarding"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageShell>
  );
}
