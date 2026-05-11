import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import {
  Zap, Search, BarChart3, Mail,
  ArrowRight, ArrowLeft, Sun, Moon, Globe, ChevronRight,
} from "lucide-react";
import { getDashboardStats } from "../lib/api";

/* ── Animated counter on scroll ── */
function useCounterOnScroll(
  targetStr: string,
  duration = 1600
): React.RefObject<HTMLSpanElement | null> {
  const ref = useRef<HTMLSpanElement | null>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isPct   = targetStr.endsWith("%");
    const hasPlus = targetStr.endsWith("+");
    const suffix  = isPct ? "%" : hasPlus ? "+" : "";
    const num     = parseFloat(targetStr.replace(/[%+]/g, "").replace("K", ""));
    const isK     = targetStr.includes("K");

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || done.current) return;
        done.current = true;
        const start = performance.now();

        function tick(now: number) {
          const p     = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          const cur   = eased * num;
          const display = isK
            ? Math.floor(cur) + "K" + suffix
            : isPct
            ? cur.toFixed(0) + suffix
            : Math.floor(cur) + suffix;
          if (el) el.textContent = display;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [targetStr, duration]);

  return ref;
}

/* ── Scroll reveal hook ── */
function useScrollReveal(deps: unknown[] = []) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const items = container.querySelectorAll<HTMLElement>(".reveal");
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
}

/* ── Stat counter card ── */
function StatCounter({ value, label }: { value: string; label: string }) {
  const ref = useCounterOnScroll(value);
  return (
    <div>
      <div className="text-3xl md:text-4xl font-bold gradient-text-brand mb-1">
        <span ref={ref}>0</span>
      </div>
      <div className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

/* ════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════ */
export default function LandingPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  /* scroll reveal ref for feature cards */
  const featuresRef = useScrollReveal([lang]);

  /* ── Live stats from API (falls back to defaults if unauthenticated) ── */
  const [liveStats, setLiveStats] = useState<{
    leads: string;
    accuracy: string;
    timeSaved: string;
  } | null>(null);

  useEffect(() => {
    getDashboardStats({ skipAuthRedirect: true })
      .then(({ stats }) => {
        const total = stats.totalLeads;
        const label = total >= 1000 ? `${Math.floor(total / 1000)}K+` : `${total}+`;
        const convRate = parseFloat(stats.conversionRate ?? "0");
        const accuracy = convRate > 0 ? `${Math.min(Math.round(convRate * 10 + 60), 99)}%` : "94%";
        setLiveStats({ leads: label, accuracy, timeSaved: "18" });
      })
      .catch(() => {
        /* not authenticated or API unavailable — keep defaults */
      });
  }, []);

  const features = [
    { icon: Search,    key: "discover" as const, color: "var(--color-info)" },
    { icon: BarChart3, key: "analyze"  as const, color: "var(--brand)" },
    { icon: Mail,      key: "outreach" as const, color: "var(--color-success)" },
  ];

  const stats: { value: string; key: keyof typeof t.landing.stats }[] = [
    { value: liveStats?.leads     ?? "50K+", key: "leads" },
    { value: liveStats?.accuracy  ?? "94%",  key: "accuracy" },
    { value: liveStats?.timeSaved ?? "18",   key: "timeSaved" },
  ];

  /* mock dashboard labels — translated */
  const mockKpis = [
    { n: "50", label: t.landing.mockStats.leads },
    { n: "32", label: t.landing.mockStats.analyzed },
    { n: "18", label: t.landing.mockStats.contacted },
    { n: "7.3%", label: t.landing.mockStats.conv },
  ];

  const mockCols = [
    { label: `${t.landing.mockStats.new} (12)`,        cards: 3 },
    { label: `${t.landing.mockStats.analyzing} (4)`,   cards: 2 },
    { label: `${t.landing.mockStats.contacted2} (8)`,  cards: 2 },
    { label: `${t.landing.mockStats.won} (3)`,         cards: 1 },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg)" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* ══ NAV ══ */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-14 glass"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center shadow-sm">
            <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-sm" style={{ color: "var(--text)" }}>FindX</span>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={toggleLang} className="btn btn-ghost text-xs gap-1.5 px-2.5">
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost px-2">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/login">
            <a className="btn btn-primary px-4 py-1.5 text-xs ml-1">
              {t.landing.getStarted}
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </Link>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section className="flex flex-col items-center text-center px-6 py-24 md:py-32">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8 animate-fade-in"
          style={{
            background: "var(--brand-subtle)",
            color: "var(--brand-subtle-fg)",
            border: "1px solid rgba(217,119,6,0.2)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--brand)", animation: "pulse 2s infinite" }}
          />
          {t.landing.badge}
        </div>

        {/* Headline */}
        <h1
          className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-balance animate-slide-up"
          style={{ color: "var(--text)" }}
        >
          {t.landing.heroTitle.split("\n").map((line, i) => (
            <span key={i}>
              {i === 0 ? (
                line
              ) : (
                <>
                  <br />
                  <span className="gradient-text-brand">{line}</span>
                </>
              )}
            </span>
          ))}
        </h1>

        <p
          className="text-base md:text-lg max-w-2xl leading-relaxed mb-10 text-balance animate-slide-up"
          style={{ color: "var(--text-muted)", animationDelay: "80ms" }}
        >
          {t.landing.heroSubtitle}
        </p>

        {/* CTAs */}
        <div
          className="flex flex-wrap gap-3 justify-center animate-slide-up"
          style={{ animationDelay: "160ms" }}
        >
          <Link href="/login">
            <a className="btn btn-primary px-6 py-2.5 text-sm shadow-md">
              {t.landing.getStarted}
              <ArrowIcon className="w-4 h-4" />
            </a>
          </Link>
          <a href="#how" className="btn btn-secondary px-6 py-2.5 text-sm">
            {t.landing.learnMore}
          </a>
        </div>

        {/* ── Mock Dashboard Preview ── */}
        <div
          className="mt-16 w-full max-w-4xl rounded-2xl overflow-hidden animate-slide-up"
          style={{
            border: "1px solid var(--border)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.08)",
            animationDelay: "240ms",
          }}
        >
          {/* Browser chrome */}
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <div
              className="flex-1 mx-4 h-5 rounded-md text-xs flex items-center justify-center"
              style={{ background: "var(--bg-subtle)", color: "var(--text-subtle)" }}
            >
              app.findx.nl/dashboard
            </div>
          </div>

          {/* Mock content */}
          <div className="p-5" style={{ background: "var(--bg)" }}>
            {/* KPI row */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              {mockKpis.map(({ n, label }, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div
                    className="h-1.5 w-12 rounded mb-2"
                    style={{ background: "var(--bg-inset)" }}
                  />
                  <div className="text-base font-bold" style={{ color: "var(--text)" }}>{n}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Mini Kanban */}
            <div
              className="rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div
                className="h-2 w-20 rounded mb-3"
                style={{ background: "var(--bg-inset)" }}
              />
              <div className="flex gap-3 overflow-hidden">
                {mockCols.map(({ label, cards }, i) => (
                  <div key={i} className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </div>
                    <div className="space-y-1.5">
                      {[...Array(cards)].map((_, j) => (
                        <div
                          key={j}
                          className="h-9 rounded-lg"
                          style={{ background: "var(--bg-subtle)", border: "1px solid var(--border)" }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ══ */}
      <section id="how" className="px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          {/* Section header */}
          <div className="text-center mb-14">
            <p
              className="text-xs font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--brand)" }}
            >
              {t.landing.howItWorks}
            </p>
            <h2
              className="text-3xl font-bold text-balance"
              style={{ color: "var(--text)" }}
            >
              {t.landing.agentsFull}
            </h2>
          </div>

          {/* Cards — scroll reveal applied here */}
          <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, key, color }, i) => (
              <div
                key={key}
                className="card p-6 card-hover reveal"
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}18` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {t.landing.step} {i + 1}
                </div>
                <h3 className="font-bold mb-2" style={{ color: "var(--text)" }}>
                  {t.landing.features[key].title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {t.landing.features[key].desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ STATS ══ */}
      <section
        className="px-6 md:px-12 py-16"
        style={{
          background: "var(--bg-subtle)",
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
          {stats.map(({ value, key }) => (
            <StatCounter key={key} value={value} label={t.landing.stats[key]} />
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="px-6 py-24 text-center">
        <h2
          className="text-3xl font-bold mb-4 text-balance"
          style={{ color: "var(--text)" }}
        >
          {t.landing.ctaTitle}
        </h2>
        <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
          {t.landing.ctaSubtitle}
        </p>
        <Link href="/login">
          <a className="btn btn-primary px-8 py-3 text-sm shadow-lg">
            {t.landing.getStarted}
            <ArrowIcon className="w-4 h-4" />
          </a>
        </Link>
      </section>

      {/* ══ FOOTER ══ */}
      <footer
        className="px-6 py-6 text-center text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-subtle)" }}
      >
        © {new Date().getFullYear()} FindX · Built for the Netherlands market
      </footer>
    </div>
  );
}
