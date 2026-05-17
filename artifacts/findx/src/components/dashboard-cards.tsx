import { useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Users, Search, Mail, TrendingUp, ArrowUpRight, Minus, MailCheck } from "lucide-react";
import { getDashboardStats, getOutreaches } from "../lib/api";
import type { DashboardStats } from "../lib/types";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

// ── Animated counter hook ───────────────────────────────────────────────────
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

// ── Mini SVG sparkline ──────────────────────────────────────────────────────
function Sparkline({ points, colorClass, glowClass }: { points: number[]; colorClass: string; glowClass: string }) {
  const W = 72, H = 28;
  const max = Math.max(...points, 1);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = W / Math.max(points.length - 1, 1);
  const coords = points.map((v, i) => `${i * step},${H - ((v - min) / range) * (H - 2) - 1}`);
  const pathD = `M ${coords.join(" L ")}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" className={cn("overflow-visible flex-shrink-0", colorClass)}>
      <path 
        d={pathD} 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={cn("drop-shadow-[0_0_4px_currentColor]", glowClass)} 
      />
    </svg>
  );
}

// ── KPI Card Component ──────────────────────────────────────────────────────
const cardVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: "spring" as const, stiffness: 100, damping: 20, delay: i * 0.06 },
  }),
};

type CardDef = {
  labelKey: keyof ReturnType<typeof useLang>["t"]["dashboard"];
  getValue: (s: DashboardStats) => number | string;
  icon: any;
  getTrend: (s: DashboardStats, t: any) => string;
  positive: (s: DashboardStats) => boolean;
  neutral: (s: DashboardStats) => boolean;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  glowClass: string;
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
    colorClass: "text-info",
    bgClass: "bg-info/10",
    borderClass: "border-info/20",
    glowClass: "shadow-glow-info",
    getSparkPoints: (s) => [s.totalLeads * 0.7, s.totalLeads * 0.8, s.totalLeads * 0.75, s.totalLeads * 0.9, s.totalLeads],
  },
  {
    labelKey: "analyzed",
    getValue: (s) => s.leadsAnalyzed,
    icon: Search,
    getTrend: (s, t) => `${s.totalLeads > 0 ? Math.round((s.leadsAnalyzed / s.totalLeads) * 100) : 0}% of total`,
    positive: (s) => s.leadsAnalyzed > 0,
    neutral:  (s) => s.leadsAnalyzed === 0,
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
    borderClass: "border-warning/20",
    glowClass: "shadow-glow-warning",
    getSparkPoints: (s) => [0, s.leadsAnalyzed * 0.3, s.leadsAnalyzed * 0.6, s.leadsAnalyzed * 0.8, s.leadsAnalyzed],
  },
  {
    labelKey: "contacted",
    getValue: (s) => s.leadsContacted,
    icon: Mail,
    getTrend: (s, t) => `${s.leadsResponded} responded`,
    positive: (s) => s.leadsResponded > 0,
    neutral:  (s) => s.leadsContacted === 0,
    colorClass: "text-success",
    bgClass: "bg-success/10",
    borderClass: "border-success/20",
    glowClass: "shadow-glow-success",
    getSparkPoints: (s) => [0, s.leadsContacted * 0.2, s.leadsContacted * 0.5, s.leadsContacted * 0.7, s.leadsContacted],
  },
  {
    labelKey: "conversion",
    getValue: (s) => s.conversionRate + "%",
    icon: TrendingUp,
    getTrend: (s, t) => `${s.leadsWon} won deals`,
    positive: (s) => s.leadsWon > 0,
    neutral:  (s) => s.leadsWon === 0,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/20",
    glowClass: "shadow-glow-brand",
    getSparkPoints: (s) => [0, 20, 45, 75, 100],
  },
];

function KpiCard({ def, stats, index }: { def: CardDef; stats: DashboardStats; index: number }) {
  const { t } = useLang();
  const Icon = def.icon;
  const value = def.getValue(stats);
  const trend = def.getTrend(stats, t);
  const isPos = def.positive(stats);
  const isNeu = def.neutral(stats);
  const numRef = useAnimatedCounter(value);
  const spark = def.getSparkPoints(stats);

  const TrendIcon = isNeu ? Minus : ArrowUpRight;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl p-5 bg-glass backdrop-blur-glass border border-glass-border shadow-sm transition-all hover:shadow-xl hover:border-primary/20"
    >
      <div className="flex items-start justify-between mb-5">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", def.bgClass, def.borderClass, def.colorClass)}>
          <Icon className="w-5 h-5" strokeWidth={2} />
        </div>
        <Sparkline points={spark} colorClass={def.colorClass} glowClass={def.glowClass} />
      </div>

      <div className="space-y-1">
        <h4 className="text-2xl font-bold tracking-tighter text-text leading-none">
          <span ref={numRef}>{value}</span>
        </h4>
        <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
          {t.dashboard[def.labelKey] as string}
        </p>
      </div>

      <div className="mt-5 pt-4 border-t border-glass-border/50 flex items-center justify-between">
        <div className={cn(
          "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight",
          isNeu ? "text-text-subtle" : isPos ? "text-success" : "text-danger"
        )}>
          <TrendIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
          {trend}
        </div>
      </div>
    </motion.div>
  );
}

// ── Pending Approval KPI card ────────────────────────────────────────────────
function PendingApprovalCard({ index }: { index: number }) {
  const { data, isLoading } = usePolling(
    () => getOutreaches({ status: "pending_approval", pageSize: 100 }),
    20_000,
  );
  const count = data?.outreaches?.length ?? 0;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl p-5 bg-glass backdrop-blur-glass border border-glass-border shadow-sm transition-all hover:shadow-xl hover:border-warning/30"
    >
      <Link href="/pipeline?status=pending_approval">
        <a className="block h-full">
          <div className="flex items-start justify-between mb-5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center border bg-warning/10 border-warning/20 text-warning">
              <MailCheck className="w-5 h-5" strokeWidth={2} />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-2xl font-bold tracking-tighter text-text leading-none">
              {isLoading ? "—" : count}
            </h4>
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">
              Pending Approval
            </p>
          </div>
          <div className="mt-5 pt-4 border-t border-glass-border/50">
            <div className={cn(
              "flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight",
              count > 0 ? "text-warning" : "text-text-subtle",
            )}>
              <MailCheck className="w-3.5 h-3.5" strokeWidth={2.5} />
              {count > 0 ? `${count} need${count === 1 ? "s" : ""} review` : "All clear"}
            </div>
          </div>
        </a>
      </Link>
    </motion.div>
  );
}

export function DashboardCards() {
  const { data, isLoading } = usePolling(() => getDashboardStats(), 15_000);
  const stats = data?.stats ?? null;

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-glass-raised animate-pulse border border-glass-border" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {CARD_DEFS.map((def, i) => (
        <KpiCard key={i} def={def} stats={stats} index={i} />
      ))}
      <PendingApprovalCard index={CARD_DEFS.length} />
    </div>
  );
}
