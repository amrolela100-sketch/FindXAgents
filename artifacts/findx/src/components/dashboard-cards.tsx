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
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { run(); obs.unobserve(e.target); } });
    }, { threshold: 0.2 });
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
  color: string;
};

const CARD_DEFS: CardDef[] = [
  {
    labelKey: "totalLeads",
    getValue: (s) => s.totalLeads,
    icon: Database,
    getTrend: (s, t) => s.leadsThisWeek > 0 ? `+${s.leadsThisWeek} ${t.dashboard.thisWeek}` : t.dashboard.noNewLeads,
    positive: (s) => s.leadsThisWeek > 0,
    color: "var(--color-info)",
  },
  {
    labelKey: "analyzed",
    getValue: (s) => s.leadsAnalyzed,
    icon: Search,
    getTrend: (s, t) => `${s.totalLeads > 0 ? Math.round((s.leadsAnalyzed / s.totalLeads) * 100) : 0}% ${t.dashboard.ofTotal}`,
    positive: (s) => s.leadsAnalyzed > 0,
    color: "var(--brand)",
  },
  {
    labelKey: "contacted",
    getValue: (s) => s.leadsContacted,
    icon: Mail,
    getTrend: (s, t) => `${s.leadsResponded} ${t.dashboard.responded}`,
    positive: (s) => s.leadsResponded > 0,
    color: "var(--color-success)",
  },
  {
    labelKey: "conversion",
    getValue: (s) => s.conversionRate + "%",
    icon: TrendingUp,
    getTrend: (s, t) => `${s.leadsWon} ${t.dashboard.wonDeals}`,
    positive: (s) => s.leadsWon > 0,
    color: "#8B5CF6",
  },
];

function SkeletonCard() {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="w-8 h-8 rounded-lg skeleton" />
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
      className="card p-5 reveal card-hover"
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: `${def.color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color: def.color }} />
        </div>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--text)" }}>
        <span ref={ref}>{value}</span>
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {t.dashboard[def.labelKey] as string}
      </p>
      <p
        className="text-xs mt-3 font-medium"
        style={{ color: isPos ? "var(--color-success)" : "var(--text-subtle)" }}
      >
        {trend}
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
