import { useRef, useEffect, useCallback } from "react";
import { Database, Search, Mail, TrendingUp } from "lucide-react";
import { getDashboardStats } from "../lib/api";
import type { DashboardStats } from "../lib/types";
import { usePolling } from "../lib/hooks/use-polling";
import { useLang } from "../lib/lang-context";

function useAnimatedCounter(target: number | string, duration = 1400): React.RefObject<HTMLSpanElement | null> {
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
    const node = el;
    const start = performance.now();
    function tick(time: number) {
      const p = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = eased * num;
      node.textContent = isPct ? cur.toFixed(1) + "%" : isFloat ? cur.toFixed(1) : Math.floor(cur).toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [target, duration]);

  useEffect(() => {
    animatedRef.current = false;
    const el = elRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { run(); obs.unobserve(e.target); } }),
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [run]);

  return elRef;
}

type CardDef = {
  labelKey: keyof ReturnType<typeof useLang>["t"]["dashboard"];
  getValue: (s: DashboardStats) => number | string;
  icon: typeof Database;
  getTrend: (s: DashboardStats, t: any) => string;
  positive: (s: DashboardStats) => boolean;
  accent: string;
  glowColor: string;
};

const CARD_DEFS: CardDef[] = [
  {
    labelKey: "totalLeads",
    getValue: (s) => s.totalLeads,
    icon: Database,
    getTrend: (s, t) => s.leadsThisWeek > 0 ? `+${s.leadsThisWeek} ${t.dashboard.thisWeek}` : t.dashboard.noNewLeads,
    positive: (s) => s.leadsThisWeek > 0,
    accent: "#60A5FA",
    glowColor: "rgba(59,130,246, 0.25)",
  },
  {
    labelKey: "analyzed",
    getValue: (s) => s.leadsAnalyzed,
    icon: Search,
    getTrend: (s, t) => `${s.totalLeads > 0 ? Math.round((s.leadsAnalyzed / s.totalLeads) * 100) : 0}% ${t.dashboard.ofTotal}`,
    positive: (s) => s.leadsAnalyzed > 0,
    accent: "#FBBF24",
    glowColor: "rgba(245,158,11, 0.25)",
  },
  {
    labelKey: "contacted",
    getValue: (s) => s.leadsContacted,
    icon: Mail,
    getTrend: (s, t) => `${s.leadsResponded} ${t.dashboard.responded}`,
    positive: (s) => s.leadsResponded > 0,
    accent: "#34D399",
    glowColor: "rgba(16,185,129, 0.25)",
  },
  {
    labelKey: "conversion",
    getValue: (s) => s.conversionRate + "%",
    icon: TrendingUp,
    getTrend: (s, t) => `${s.leadsWon} ${t.dashboard.wonDeals}`,
    positive: (s) => s.leadsWon > 0,
    accent: "#C084FC",
    glowColor: "rgba(168,85,247, 0.25)",
  },
];

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
      </div>
      <div className="h-8 w-16 rounded-lg skeleton mb-2" />
      <div className="h-3 w-20 rounded skeleton mb-3" />
      <div className="h-3 w-24 rounded skeleton" />
    </div>
  );
}

function KpiCard({ def, stats, index }: { def: CardDef; stats: DashboardStats; index: number }) {
  const { t } = useLang();
  const Icon = def.icon;
  const value = def.getValue(stats);
  const trend = def.getTrend(stats, t);
  const isPos = def.positive(stats);
  const ref = useAnimatedCounter(value);

  return (
    <div
      className="reveal card-hover rounded-2xl p-5 transition-all duration-300"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.10)`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Icon */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: `${def.accent}18`,
            border: `1px solid ${def.accent}30`,
            boxShadow: `0 0 12px ${def.glowColor}`,
          }}
        >
          <Icon className="w-4 h-4" style={{ color: def.accent }} />
        </div>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        <span ref={ref}>{value}</span>
      </p>

      {/* Label */}
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {t.dashboard[def.labelKey] as string}
      </p>

      {/* Trend */}
      <p
        className="text-xs mt-3 font-medium"
        style={{ color: isPos ? "#34D399" : "var(--text-subtle)" }}
      >
        {isPos ? "↑ " : ""}{trend}
      </p>
    </div>
  );
}

export function DashboardCards() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = usePolling(() => getDashboardStats(), 15_000);
  const stats = data?.stats ?? null;

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !stats) return;
    const items = container.querySelectorAll<HTMLElement>(".reveal");
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visible"); obs.unobserve(e.target); } }),
      { threshold: 0.1 }
    );
    items.forEach((el) => obs.observe(el));
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
