/**
 * OwnerDashboardPage — Types, API helpers, Shared Components
 */

import { motion } from "framer-motion";
import { FADE_UP_STAGGER } from "@/lib/motion";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

export type OwnerStats = {
  totalUsers: number; totalLeads: number; totalRuns: number;
  leadsThisWeek: number; leadsAnalyzed: number; leadsContacted: number; leadsWon: number;
  conversionRate: number; onboardingCompleted: number; activeWorkspaces: number;
  recentRuns: OwnerRun[]; recentWorkspaces: unknown[];
  health: { api: boolean; auth: boolean; database: boolean; agents: boolean };
};

export type OwnerUser = {
  id: string; email: string; role: string; isAdmin: boolean; isOwner: boolean;
  onboardingCompleted: boolean; leadCount: number; runCount: number;
  createdAt: string; lastActiveAt: string | null;
};

export type OwnerRun = {
  id: string; userId: string | null; query: string; status: string;
  leadsFound: number | null; createdAt: string; completedAt: string | null;
};

export type Tab = "overview" | "users" | "runs";

// ─── API helper ───────────────────────────────────────────────────────────────

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ─── Shared Components ────────────────────────────────────────────────────────

export function StatCard({ icon: Icon, label, value, sub, accent = "#94A3B8" }: {
  icon: typeof import("lucide-react").Users; label: string; value: number | string; sub?: string; accent?: string;
}) {
  return (
    <motion.div variants={FADE_UP_STAGGER} className="glass-card rounded-2xl p-5">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}>
        <Icon className="w-4 h-4" />
      </div>
      <p className="text-3xl font-bold" style={{ color: "var(--text)" }}>{value}</p>
      <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{label}</p>
      {sub && <p className="text-xs font-medium mt-2" style={{ color: "var(--text-subtle)" }}>{sub}</p>}
    </motion.div>
  );
}

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  completed: { bg: "rgba(16,185,129,0.12)", color: "#34D399", border: "rgba(16,185,129,0.28)" },
  running:   { bg: "rgba(59,130,246,0.12)", color: "#60A5FA", border: "rgba(59,130,246,0.28)" },
  queued:    { bg: "rgba(245,158,11,0.12)", color: "#FBBF24", border: "rgba(245,158,11,0.28)" },
  failed:    { bg: "rgba(239,68,68,0.12)",  color: "#F87171", border: "rgba(239,68,68,0.28)" },
  cancelled: { bg: "var(--glass-raised)",    color: "var(--text-muted)", border: "var(--glass-border)" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.cancelled;
  return <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>{status}</span>;
}

export function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
