import { useRef, useEffect, useCallback } from "react";
import { Database, Search, Mail, TrendingUp } from "lucide-react";
import { getDashboardStats } from "../lib/api";
import type { DashboardStats } from "../lib/types";
import { usePolling } from "../lib/hooks/use-polling";

/* ─── Animated counter hook (inline, self-contained per card) ─── */
function useAnimatedCounter(
  target: number | string,
  duration = 1800
): React.RefObject<HTMLSpanElement | null> {
  const elRef = useRef<HTMLSpanElement | null>(null);
  const animatedRef = useRef(false);

  const runAnimation = useCallback(() => {
    const el = elRef.current;
    if (!el || animatedRef.current) return;
    animatedRef.current = true;

    // Handle percentage strings like "7.3%"
    const rawStr = String(target);
    const isPct = rawStr.endsWith("%");
    const numericTarget = parseFloat(rawStr.replace("%", ""));
    const isFloat = isPct || numericTarget % 1 !== 0;

    const node = el; // stable non-null reference for the closure
    const start = performance.now();
    function update(time: number) {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = eased * numericTarget;
      node.textContent = isPct
        ? current.toFixed(1) + "%"
        : isFloat
        ? current.toFixed(1)
        : Math.floor(current).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }, [target, duration]);

  useEffect(() => {
    animatedRef.current = false;
    const el = elRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            runAnimation();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [runAnimation]);

  return elRef;
}

interface CardConfig {
  label: string;
  getValue: (stats: DashboardStats) => number | string;
  icon: typeof Database;
  getTrend: (stats: DashboardStats) => string;
}

const CARDS: CardConfig[] = [
  {
    label: "Total Leads",
    getValue: (s) => s.totalLeads,
    icon: Database,
    getTrend: (s) =>
      s.leadsThisWeek > 0
        ? `+${s.leadsThisWeek} this week`
        : "No new leads this week",
  },
  {
    label: "Analyzed",
    getValue: (s) => s.leadsAnalyzed,
    icon: Search,
    getTrend: (s) => {
      const pct =
        s.totalLeads > 0
          ? Math.round((s.leadsAnalyzed / s.totalLeads) * 100)
          : 0;
      return `${pct}% of total`;
    },
  },
  {
    label: "Contacted",
    getValue: (s) => s.leadsContacted,
    icon: Mail,
    getTrend: (s) => `${s.leadsResponded} responded`,
  },
  {
    label: "Conversion Rate",
    getValue: (s) => s.conversionRate + "%",
    icon: TrendingUp,
    getTrend: (s) => `${s.leadsWon} won deals`,
  },
];

function SkeletonCard() {
  return (
    <div className="bg-white border border-[#E5E3D9] rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg bg-[#F0EDE6]">
          <div className="w-5 h-5 bg-[#E5E3D9] rounded" />
        </div>
      </div>
      <div className="h-9 w-20 bg-[#E5E3D9] rounded mb-2" />
      <div className="h-4 w-28 bg-[#E5E3D9] rounded" />
      <div className="h-3 w-24 bg-[#E5E3D9] rounded mt-3" />
    </div>
  );
}

function KpiCard({
  card,
  stats,
  index,
}: {
  card: CardConfig;
  stats: DashboardStats;
  index: number;
}) {
  const Icon = card.icon;
  const value = card.getValue(stats);
  const trend = card.getTrend(stats);
  const isPositive =
    trend.startsWith("+") ||
    trend.includes("won") ||
    trend.includes("responded");

  const counterRef = useAnimatedCounter(value);

  return (
    <div
      className="reveal-item bg-white border border-[#E5E3D9] rounded-xl p-5 lift-card kpi-card"
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-[#F0EDE6]">
          <Icon className="w-5 h-5 text-[#1A1A1A]" />
        </div>
      </div>
      <p className="text-3xl font-serif font-bold text-[#1A1A1A]">
        <span ref={counterRef}>{value}</span>
      </p>
      <p className="text-sm text-[#7A756D] mt-1">{card.label}</p>
      <p
        className={`text-xs mt-3 font-medium ${
          isPositive ? "text-emerald-600" : "text-red-500"
        }`}
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

  /* Scroll reveal for cards */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>(".reveal-item");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stats]);

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {CARDS.map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {CARDS.map((card, i) => (
        <KpiCard key={card.label} card={card} stats={stats} index={i} />
      ))}
    </div>
  );
}
