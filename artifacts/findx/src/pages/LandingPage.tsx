import { Link } from "wouter";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import { Zap, Search, BarChart3, Mail, ArrowRight, ArrowLeft, Sun, Moon, Globe, ChevronRight } from "lucide-react";

export default function LandingPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();

  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const features = [
    { icon: Search,   key: "discover" as const, color: "var(--color-info)" },
    { icon: BarChart3,key: "analyze"  as const, color: "var(--brand)" },
    { icon: Mail,     key: "outreach" as const, color: "var(--color-success)" },
  ];

  const stats = [
    { value: "50K+", key: "leads" as const },
    { value: "94%",  key: "accuracy" as const },
    { value: "18h",  key: "timeSaved" as const },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── NAV ── */}
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

      {/* ── HERO ── */}
      <section className="flex flex-col items-center text-center px-6 py-24 md:py-32">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{
            background: "var(--brand-subtle)",
            color: "var(--brand-subtle-fg)",
            border: "1px solid rgba(217,119,6,0.2)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" style={{ background: "var(--brand)" }} />
          AI-powered B2B Prospecting
        </div>

        <h1
          className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6 text-balance"
          style={{ color: "var(--text)", fontFamily: isRtl ? "Noto Sans Arabic" : "Inter" }}
        >
          {t.landing.heroTitle.split("\n").map((line, i) => (
            <span key={i}>
              {i === 0 ? line : (
                <><br /><span className="gradient-text-brand">{line}</span></>
              )}
            </span>
          ))}
        </h1>

        <p
          className="text-base md:text-lg max-w-2xl leading-relaxed mb-10 text-balance"
          style={{ color: "var(--text-muted)" }}
        >
          {t.landing.heroSubtitle}
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/login">
            <a className="btn btn-primary px-6 py-2.5 text-sm shadow-md">
              {t.landing.getStarted}
              <ArrowIcon className="w-4 h-4" />
            </a>
          </Link>
          <a
            href="#how"
            className="btn btn-secondary px-6 py-2.5 text-sm"
          >
            {t.landing.learnMore}
          </a>
        </div>

        {/* Hero visual */}
        <div
          className="mt-16 w-full max-w-4xl rounded-2xl overflow-hidden"
          style={{ border: "1px solid var(--border)", boxShadow: "0 24px 80px rgba(0,0,0,0.08)" }}
        >
          {/* Mock dashboard header */}
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

          {/* Mock app content */}
          <div
            className="p-6 grid grid-cols-4 gap-4"
            style={{ background: "var(--bg)" }}
          >
            {["50 leads", "32 analyzed", "18 contacted", "7.3% conv."].map((s, i) => (
              <div
                key={i}
                className="rounded-xl p-4 skeleton"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="h-2 w-16 rounded skeleton mb-3" style={{ background: "var(--bg-inset)" }} />
                <div className="text-lg font-bold" style={{ color: "var(--text)" }}>{s.split(" ")[0]}</div>
                <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{s.split(" ").slice(1).join(" ")}</div>
              </div>
            ))}
            <div
              className="col-span-4 rounded-xl p-4"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="h-2 w-24 rounded mb-4" style={{ background: "var(--bg-inset)" }} />
              <div className="flex gap-3 overflow-hidden">
                {["New (12)", "Analyzing (4)", "Contacted (8)", "Won (3)"].map((col, i) => (
                  <div key={i} className="flex-1 min-w-0">
                    <div className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>{col}</div>
                    <div className="space-y-2">
                      {[...Array(i === 0 ? 3 : i === 1 ? 2 : i === 2 ? 2 : 1)].map((_, j) => (
                        <div
                          key={j}
                          className="h-12 rounded-lg"
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

      {/* ── FEATURES ── */}
      <section id="how" className="px-6 md:px-12 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--brand)" }}>
              How it works
            </p>
            <h2 className="text-3xl font-bold text-balance" style={{ color: "var(--text)" }}>
              3 agents. Full pipeline.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, key, color }, i) => (
              <div
                key={key}
                className="card p-6 card-hover reveal"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "var(--text-subtle)" }}
                >
                  Step {i + 1}
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

      {/* ── STATS ── */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ background: "var(--bg-subtle)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-8 text-center">
          {stats.map(({ value, key }) => (
            <div key={key}>
              <div className="text-3xl md:text-4xl font-bold gradient-text-brand mb-1">{value}</div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>{t.landing.stats[key]}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4 text-balance" style={{ color: "var(--text)" }}>
          Ready to find your next client?
        </h2>
        <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
          Start for free. No credit card required.
        </p>
        <Link href="/login">
          <a className="btn btn-primary px-8 py-3 text-sm shadow-lg">
            {t.landing.getStarted}
            <ArrowIcon className="w-4 h-4" />
          </a>
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer
        className="px-6 py-6 text-center text-xs"
        style={{ borderTop: "1px solid var(--border)", color: "var(--text-subtle)" }}
      >
        © {new Date().getFullYear()} FindX · Built for the Netherlands market
      </footer>
    </div>
  );
}
