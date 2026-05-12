import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Search, Mail, TrendingUp, ArrowUpRight, Minus } from "lucide-react";
import { getDashboardStats } from "../lib/api";
import type { DashboardStats } from "../lib/types";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";

// ── Animated counter ──────────────────────────────────────────────────────────
function useAnimatedCounter(target: number | string, duration = 1200): React.RefObject<HTMLSpanElement | null> {
  const elRef = useRef<HTMLSpanElement | null>(null);
  const animatedRef = useRef(false);

  const run = useCallback(() => {
    const el = elRef.current;
    if (!el || animatedRef.current) return;
    animatedRef.current = true;
    const raw = String(target);
    const isPct = raw.endsWith("%");
    const num = parseFloat(raw.replace("%", ""));
    const isFloat = isPct || num % 1 !== 0;
    const start = performance.now();
    function tick(time: number) {
      const p = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = eased * num;
      const node = elRef.current;
      if (!node) return;
      node.textContent = isPct
        ? cur.toFixed(1) + "%"
        : isFloat
        ? cur.toFixed(1)
        : Math.floor(cur).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  useEffect(() => {
    animatedRef.current = false;
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { run(); obs.unobserve(e.target); } }),
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [run]);

  return elRef;
}

// ── Mini SVG sparkline ────────────────────────────────────────────────────────
function Sparkline({ points, accent, glow }: { points: number[]; accent: string; glow: string }) {
  const W = 72, H = 28;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = W / Math.max(points.length - 1, 1);
  const coords = points.map((v, i) => `${i * step},${H - ((v - min) / range) * (H - 2) - 1}`);
  const pathD = `M ${coords.join(" L ")}`;
  const fillD = `M 0,${H} L ${coords.join(" L ")} L ${(points.length - 1) * step},${H} Z`;
  const uid = accent.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" className="overflow-visible flex-shrink-0">
      <defs>
        <linearGradient id={`sg-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.22" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${uid}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <path d={fillD} fill={`url(#sg-${uid})`} />
      <path d={pathD} stroke={accent} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        filter={`url(#glow-${uid})`} style={{ filter: `drop-shadow(0 0 4px ${glow})` }} />
    </svg>
  );
}

// ── Card defs ─────────────────────────────────────────────────────────────────
type CardDef = {
  labelKey: keyof ReturnType<typeof useLang>["t"]["dashboard"];
  getValue:       (s: DashboardStats) => number | string;
  icon:           typeof Users;
  getTrend:       (s: DashboardStats, t: any) => string;
  positive:       (s: DashboardStats) => boolean;
  neutral:        (s: DashboardStats) => boolean;
  accent:         string;
  glowColor:      string;
  getSparkPoints: (s: DashboardStats) => number[];
};

const CARD_DEFS: CardDef[] = [
  {
    labelKey: "totalLeads",
    getValue: (s) => s.totalLeads,
    icon: Users,
    getTrend: (s, t) => s.leadsThisWeek > 0 ? `+${s.leadsThisWeek} ${t.dashboard.thisWeek}` : t.dashboard.noNewLeads,
    positive: (s) => s.leadsThisWeek > 0,
    neutral:  (s) => s.leadsThisWeek === 0,
    accent:   "#60A5FA",
    glowColor:"rgba(59,130,246,0.4)",
    getSparkPoints: (s) => {
      const w = s.leadsThisWeek;
      const b = Math.max(s.totalLeads - w * 4, 0);
      return [b, b + w, b + w * 2, b + w * 3, s.totalLeads];
    },
  },
  {
    labelKey: "analyzed",
    getValue: (s) => s.leadsAnalyzed,
    icon: Search,
    getTrend: (s, t) => `${s.totalLeads > 0 ? Math.round((s.leadsAnalyzed / s.totalLeads) * 100) : 0}% ${t.dashboard.ofTotal}`,
    positive: (s) => s.leadsAnalyzed > 0,
    neutral:  (s) => s.leadsAnalyzed === 0,
    accent:   "#FBBF24",
    glowColor:"rgba(245,158,11,0.4)",
    getSparkPoints: (s) => {
      const v = s.leadsAnalyzed;
      return [0, Math.floor(v * 0.25), Math.floor(v * 0.5), Math.floor(v * 0.8), v];
    },
  },
  {
    labelKey: "contacted",
    getValue: (s) => s.leadsContacted,
    icon: Mail,
    getTrend: (s, t) => `${s.leadsResponded} ${t.dashboard.responded}`,
    positive: (s) => s.leadsResponded > 0,
    neutral:  (s) => s.leadsContacted === 0,
    accent:   "#34D399",
    glowColor:"rgba(16,185,129,0.4)",
    getSparkPoints: (s) => {
      const v = s.leadsContacted;
      return [0, Math.floor(v * 0.2), Math.floor(v * 0.45), Math.floor(v * 0.72), v];
    },
  },
  {
    labelKey: "conversion",
    getValue: (s) => s.conversionRate + "%",
    icon: TrendingUp,
    getTrend: (s, t) => `${s.leadsWon} ${t.dashboard.wonDeals}`,
    positive: (s) => s.leadsWon > 0,
    neutral:  (s) => s.leadsWon === 0,
    accent:   "#C084FC",
    glowColor:"rgba(168,85,247,0.4)",
    getSparkPoints: (s) => {
      const r = Number(s.conversionRate);
      return [0, r * 0.3, r * 0.55, r * 0.8, r];
    },
  },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--glass-border)",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl skeleton" />
        <div className="w-16 h-7 rounded-lg skeleton" />
      </div>
      <div className="h-8 w-20 rounded-lg skeleton mb-1.5" />
      <div className="h-3 w-24 rounded skeleton mb-4" />
      <div className="h-px w-full skeleton mb-3" />
      <div className="h-3 w-28 rounded skeleton" />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20, delay: i * 0.06 },
  }),
};

function KpiCard({ def, stats, index }: { def: CardDef; stats: DashboardStats; index: number }) {
  const { t }    = useLang();
  const Icon     = def.icon;
  const value    = def.getValue(stats);
  const trend    = def.getTrend(stats, t);
  const isPos    = def.positive(stats);
  const isNeu    = def.neutral(stats);
  const numRef   = useAnimatedCounter(value);
  const spark    = def.getSparkPoints(stats);

  const TrendIcon = isNeu ? Minus : ArrowUpRight;
  const trendColor = isNeu
    ? "var(--text-subtle)"
    : isPos ? "#34D399" : "var(--color-danger)";

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${def.glowColor}, 0 4px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.12)` }}
      className="rounded-2xl p-5 cursor-default"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.10)`,
        transition: "box-shadow 0.25s ease, transform 0.25s ease",
      }}
    >
      {/* Top row: icon + sparkline */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${def.accent}18`,
            border: `1px solid ${def.accent}30`,
            boxShadow: `0 0 12px ${def.glowColor}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: def.accent }} strokeWidth={2} />
        </div>
        <Sparkline points={spark} accent={def.accent} glow={def.glowColor} />
      </div>

      {/* Value */}
      <p className="text-[28px] font-bold leading-none tracking-tight" style={{ color: "var(--text)" }}>
        <span ref={numRef}>{value}</span>
      </p>

      {/* Label */}
      <p className="text-[13px] mt-1.5 font-medium" style={{ color: "var(--text-muted)" }}>
        {t.dashboard[def.labelKey] as string}
      </p>

      {/* Divider */}
      <div className="my-3 h-px" style={{ background: "var(--glass-border)" }} />

      {/* Trend */}
      <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: trendColor }}>
        <TrendIcon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
        <span>{trend}</span>
      </div>
    </motion.div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────
export function DashboardCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = usePolling(() => getDashboardStats(), 15_000);
  const stats = data?.stats ?? null;

  // legacy reveal class support
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stats) return;
    const items = container.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    items.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [stats]);

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {CARD_DEFS.map((def, i) => (
        <KpiCard key={String(def.labelKey)} def={def} stats={stats} index={i} />
      ))}
    </div>
  );
}
