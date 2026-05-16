/**
 * HomePage — Chart & Visualization Components
 */

import { motion } from "framer-motion";
import { STAGGER_CONTAINER, STAGGER_CHILD } from "@/lib/motion";

// ─── Donut chart ───────────────────────────────────────────────────────────────

export function DonutChart({ hot, warm, cold, unscored, total }: {
  hot: number; warm: number; cold: number; unscored: number; total: number;
}) {
  const safeTotal = total || 1;
  const angles = [
    { value: hot, color: "#EF4444", label: "Hot" },
    { value: warm, color: "#F59E0B", label: "Warm" },
    { value: cold, color: "#60A5FA", label: "Cold" },
    { value: unscored, color: "#94A3B8", label: "Unscored" },
  ];
  let cumulative = 0;
  const segments = angles.map((seg) => {
    const start = cumulative;
    const pct = (seg.value / safeTotal) * 100;
    cumulative += pct;
    return { ...seg, pct, start };
  });
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        {segments.map((seg, i) => {
          const r = 15.91549; const C = 2 * Math.PI * r;
          const offset = C * (1 - seg.start / 100);
          const len = C * (seg.pct / 100);
          return <circle key={i} cx="18" cy="18" r={r} fill="none" stroke={seg.color} strokeWidth="3.5" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={offset} strokeLinecap="round" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold" style={{ color: "var(--text)" }}>{total}</span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>Total</span>
      </div>
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

export function ScoreBar({ label, count, total, color, icon: Icon }: {
  label: string; count: number; total: number; color: string; icon: typeof import("lucide-react").TrendingUp;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${color}18`, border: `1px solid ${color}30`, color }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1"><span style={{ color: "var(--text-muted)" }}>{label}</span><span className="font-medium" style={{ color: "var(--text)" }}>{count} ({pct}%)</span></div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--glass-raised)" }}><div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} /></div>
      </div>
    </div>
  );
}

// ─── Funnel Step ─────────────────────────────────────────────────────────────

export function FunnelStep({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1"><span style={{ color: "var(--text-muted)" }}>{label}</span><span className="font-medium" style={{ color: "var(--text)" }}>{count} <span style={{ color: "var(--text-muted)" }}>({pct}%)</span></span></div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--glass-raised)" }}><div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}

// ─── Run Status Icon ────────────────────────────────────────────────────────

export function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed": return <CheckCircle2 className="w-4 h-4" style={{ color: "#34D399" }} />;
    case "failed": return <AlertCircle className="w-4 h-4" style={{ color: "#F87171" }} />;
    case "running": return <Clock className="w-4 h-4 animate-pulse" style={{ color: "#60A5FA" }} />;
    default: return <Circle className="w-4 h-4" style={{ color: "var(--text-muted)" }} />;
  }
}

import { CheckCircle2, AlertCircle, Clock, Circle } from "lucide-react";
