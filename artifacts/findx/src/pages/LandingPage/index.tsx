import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { SPRING } from "@/lib/motion";
import { motion, useInView } from "framer-motion";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import {
  Search, BarChart3, Mail,
  ArrowRight, ArrowLeft, Sun, Moon, Globe,
  CheckCircle, TrendingUp, Users, Clock,
  ShieldCheck, Lock, Globe2, Wifi, Share2,
} from "lucide-react";

// ─── RadarSweep brand icon ───────────────────────────────────────────────────
function RadarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" />
      {/* Middle ring */}
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Inner dot */}
      <circle cx="12" cy="12" r="1.8" fill="currentColor" />
      {/* Sweep arm */}
      <line x1="12" y1="12" x2="20.5" y2="5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {/* Ping dot at tip of sweep */}
      <circle cx="20.5" cy="5.5" r="1.2" fill="currentColor" strokeOpacity="0.9" />
    </svg>
  );
}
import { getDashboardStats } from "@/lib/api";
import { cn } from "@/lib/utils";



const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

// ─── StatCounter ─────────────────────────────────────────────────────────────
function StatCounter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "0px 0px 0px 0px" });
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || done.current) return;
    done.current = true;

    const isPct   = value.endsWith("%");
    const isK     = value.includes("K");
    const hasPlus = value.endsWith("+");
    const suffix  = isPct ? "%" : isK ? "K+" : hasPlus ? "+" : "";
    const num     = parseFloat(value.replace(/[%+K]/g, ""));
    const start   = performance.now();
    const duration = 1400;

    function tick(now: number) {
      const p      = Math.min((now - start) / duration, 1);
      const eased  = 1 - Math.pow(1 - p, 3);
      const cur    = eased * num;
      el!.textContent =
        (isK ? Math.floor(cur) : isPct ? cur.toFixed(0) : Math.floor(cur)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <div ref={containerRef} className="flex flex-col items-center md:items-start">
      <div className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mb-2 text-text">
        <span ref={ref}>0</span>
      </div>
      <div className="text-sm font-medium text-text-muted">{label}</div>
    </div>
  );
}

// ─── Step 1 Mockup — Search results ──────────────────────────────────────────
function DiscoverMockup() {
  return (
    <div className="rounded-2xl bg-glass border border-glass-border shadow-xl p-5 space-y-3 min-h-[220px]">
      {/* Search bar */}
      <div className="flex items-center gap-2 bg-surface rounded-lg px-3 py-2 border border-glass-border">
        <Search className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[11px] text-text-muted font-mono truncate">
          web design agency amsterdam
        </span>
      </div>
      {/* Results */}
      {[
        { name: "Pixelcraft Studio",  city: "Amsterdam", score: 72, blocked: false },
        { name: "NoordCode Digital",  city: "Amsterdam", score: 58, blocked: false },
        { name: "Design Collective",  city: "Haarlem",   score: 41, blocked: true  },
      ].map((r) => (
        <div key={r.name}
          className="flex items-center justify-between rounded-lg px-3 py-2 bg-glass-raised border border-glass-border"
        >
          <div>
            <p className="text-[11px] font-semibold text-text">{r.name}</p>
            <p className="text-[10px] text-text-muted">{r.city}</p>
          </div>
          {r.blocked ? (
            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-error/10 text-error border border-error/20">
              Directory blocked ✗
            </span>
          ) : (
            <span className="text-[10px] font-bold font-mono text-success">{r.score}/100</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 2 Mockup — Lead score card ─────────────────────────────────────────
function AnalyzeMockup() {
  return (
    <div className="rounded-2xl bg-glass border border-glass-border shadow-xl p-5 space-y-4 min-h-[220px]">
      {/* Company header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[12px] font-bold text-text">Pixelcraft Studio</p>
          <p className="text-[10px] text-text-muted">pixelcraft.nl · Amsterdam</p>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-bold font-mono text-warning leading-none">34</span>
          <span className="text-[9px] text-text-muted uppercase tracking-wider">/100</span>
        </div>
      </div>
      {/* Gap badges */}
      <div className="space-y-2">
        {[
          { icon: Lock,        label: "No SSL certificate", color: "text-error",   bg: "bg-error/10",   border: "border-error/20"   },
          { icon: Wifi,        label: "Slow load speed",    color: "text-warning", bg: "bg-warning/10", border: "border-warning/20" },
          { icon: Share2,      label: "No social presence", color: "text-info",    bg: "bg-info/10",    border: "border-info/20"    },
        ].map(({ icon: Icon, label, color, bg, border }) => (
          <div key={label}
            className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-semibold", bg, border, color)}
          >
            <Icon className="w-3 h-3 shrink-0" />
            {label} ✗
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Step 3 Mockup — Email preview ───────────────────────────────────────────
function OutreachMockup() {
  return (
    <div className="rounded-2xl bg-glass border border-glass-border shadow-xl p-5 space-y-3 min-h-[220px]">
      {/* Email header */}
      <div className="flex items-center gap-2 pb-2 border-b border-glass-border">
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Mail className="w-3 h-3 text-primary" />
        </div>
        <div>
          <p className="text-[10px] font-bold text-text">New outreach ready</p>
          <p className="text-[9px] text-text-muted">To: info@pixelcraft.nl</p>
        </div>
        <span className="ms-auto text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/20">
          Pending review
        </span>
      </div>
      {/* Subject */}
      <div>
        <p className="text-[9px] text-text-muted uppercase tracking-wider font-bold mb-1">Subject</p>
        <p className="text-[11px] font-semibold text-text">
          Quick win for Pixelcraft — SSL issue on your homepage
        </p>
      </div>
      {/* Body preview */}
      <div className="bg-glass-raised rounded-lg px-3 py-2 border border-glass-border">
        <p className="text-[10px] text-text-muted leading-relaxed">
          Hi Pixelcraft team, I noticed your site currently loads without an SSL certificate —
          something we can fix in under 24 hours and immediately boost your Google ranking…
        </p>
      </div>
      <div className="flex gap-2">
        <button className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-primary text-white">Approve & Send</button>
        <button className="flex-1 text-[10px] font-bold py-1.5 rounded-lg bg-glass border border-glass-border text-text-muted">Edit</button>
      </div>
    </div>
  );
}

// ─── FeatureRow ───────────────────────────────────────────────────────────────
type FeatureRowProps = {
  step: number;
  title: string;
  desc: string;
  colorClass: string;
  borderClass: string;
  bgClass: string;
  index: number;
  mockup: React.ReactNode;
};

function FeatureRow({ step, title, desc, colorClass, borderClass, bgClass, index, mockup }: FeatureRowProps) {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={containerVariants}
      className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center"
    >
      <motion.div variants={itemVariants} className={cn(isEven ? "md:order-1" : "md:order-2")}>
        <div className={cn(
          "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5 border",
          bgClass, colorClass, borderClass
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", colorClass.replace("text-", "bg-"))} />
          Step {step}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-text">{title}</h3>
        <p className="text-base leading-relaxed max-w-[52ch] text-text-muted">{desc}</p>
      </motion.div>

      <motion.div variants={itemVariants} className={cn(isEven ? "md:order-2" : "md:order-1")}>
        {mockup}
      </motion.div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;
  const [liveStats, setLiveStats] = useState<{ leads: string; accuracy: string; timeSaved: string } | null>(null);

  useEffect(() => {
    getDashboardStats({ skipAuthRedirect: true })
      .then(({ stats }) => {
        const total = stats.totalLeads;
        const label = total >= 1000 ? `${Math.floor(total / 1000)}K+` : `${total}+`;
        const convRate = parseFloat(stats.conversionRate ?? "0");
        const accuracy = convRate > 0
          ? `${Math.min(Math.round(convRate * 10 + 60), 97)}%`
          : "94%";
        setLiveStats({ leads: label, accuracy, timeSaved: "18" });
      })
      .catch(() => {});
  }, []);

  // 1.3 — defensible stats
  const stats: { value: string; label: string; icon: typeof TrendingUp }[] = [
    { value: "40+",  label: "agencies using FindX",             icon: Users },
    { value: "3",    label: "AI pipeline stages",               icon: TrendingUp },
    { value: "8",    label: "countries supported",              icon: Globe2 },
  ];

  const mockKpis = [
    { n: "247",  label: t.landing.mockStats.leads },
    { n: "189",  label: t.landing.mockStats.analyzed },
    { n: "91",   label: t.landing.mockStats.contacted },
    { n: "6.8%", label: t.landing.mockStats.conv },
  ];

  const features: { step: number; title: string; desc: string; colorClass: string; bgClass: string; borderClass: string; mockup: React.ReactNode }[] = [
    {
      step: 1, title: t.landing.features.discover.title, desc: t.landing.features.discover.desc,
      colorClass: "text-info", bgClass: "bg-info-bg", borderClass: "border-info-border",
      mockup: <DiscoverMockup />,
    },
    {
      step: 2, title: t.landing.features.analyze.title, desc: t.landing.features.analyze.desc,
      colorClass: "text-warning", bgClass: "bg-warning-bg", borderClass: "border-warning-border",
      mockup: <AnalyzeMockup />,
    },
    {
      step: 3, title: t.landing.features.outreach.title, desc: t.landing.features.outreach.desc,
      colorClass: "text-success", bgClass: "bg-success-bg", borderClass: "border-success-border",
      mockup: <OutreachMockup />,
    },
  ];

  // 1.4 — fixed trust signals (no "hallucination" wording)
  const trustChips = [
    "Real website data",
    "Grounded AI scoring",
    "5-minute setup",
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="bg-background min-h-screen selection:bg-primary/30">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-glass-overlay backdrop-blur-glass border-b border-glass-border">
        <Link href="/">
          <a className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow-brand transition-transform group-hover:scale-105">
              <RadarIcon className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-text">FindX</span>
          </a>
        </Link>

        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="btn btn-ghost text-xs gap-1.5 px-3 h-9 text-text-muted hover:text-text uppercase font-bold tracking-widest">
            <Globe className="w-4 h-4" />
            {lang}
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost w-9 h-9 p-0 text-text-muted hover:text-text">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <Link href="/login">
            <button className="btn btn-primary h-9 px-4 text-xs font-bold gap-2 shadow-glow-brand ml-2">
              {t.landing.getStarted}
              <ArrowIcon className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden pt-12 md:pt-20 pb-20 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
            className="text-center md:text-left rtl:md:text-right"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-6 bg-primary/10 text-primary border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                {t.landing.badge}
              </div>
            </motion.div>

            {/* 1.5 — language / region badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold mb-6 ms-3 bg-glass border border-glass-border text-text-muted">
                <Globe2 className="w-3 h-3 text-primary" />
                Arabic · English · Dutch · French · +2 more
              </div>
            </motion.div>

            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tighter leading-[1.1] mb-8 text-text text-balance">
              {t.landing.heroTitle.split("\n").map((line, i) => (
                <span key={i} className={i === 1 ? "text-primary block" : "block"}>{line}</span>
              ))}
            </motion.h1>

            <motion.p variants={itemVariants} className="text-lg md:text-xl text-text-muted mb-10 max-w-2xl mx-auto md:mx-0 leading-relaxed text-balance">
              {t.landing.heroSubtitle}
            </motion.p>

            {/* CTA buttons */}
            <motion.div variants={itemVariants} className="flex flex-wrap justify-center md:justify-start gap-4">
              <Link href="/login">
                <button className="btn btn-primary h-12 px-8 text-sm font-bold gap-3 shadow-glow-brand">
                  {t.landing.getStarted}
                  <ArrowIcon className="w-4 h-4" />
                </button>
              </Link>
              <a href="#how" className="btn btn-outline h-12 px-8 text-sm font-bold bg-glass-raised border-glass-border hover:bg-glass text-text transition-all">
                {t.landing.learnMore}
              </a>
            </motion.div>

            {/* 1.1 — Trust signals row */}
            <motion.div variants={itemVariants} className="mt-6 flex flex-wrap justify-center md:justify-start gap-x-5 gap-y-2">
              {[
                { icon: Lock,        text: "Secure Google OAuth — we never store passwords" },
                { icon: ShieldCheck, text: "Website data encrypted at rest" },
                { icon: Globe2,      text: "GDPR compliant — right to deletion" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-semibold text-text-subtle">
                  <Icon className="w-3.5 h-3.5 text-success shrink-0" />
                  {text}
                </div>
              ))}
            </motion.div>

            {/* 1.4 — Fixed copywriting chips */}
            <motion.div variants={itemVariants} className="mt-8 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
              {trustChips.map((item) => (
                <div key={item} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-subtle">
                  <CheckCircle className="w-4 h-4 text-success" />
                  {item}
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right — dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            transition={{ ...SPRING, delay: 0.3 }}
            className="hidden md:block relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
            <div className="relative rounded-2xl bg-glass border border-glass-border-strong shadow-2xl overflow-hidden backdrop-blur-glass">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-glass-border bg-glass-raised/50">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                </div>
                <div className="flex-1 bg-black/5 dark:bg-white/5 rounded px-3 py-1 text-[10px] text-text-subtle font-mono text-center truncate">
                  app.findx.nl/dashboard
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* KPI cards */}
                <div className="grid grid-cols-4 gap-3">
                  {mockKpis.map((k, i) => (
                    <div key={i} className="p-3 rounded-xl bg-glass-raised border border-glass-border">
                      <div className="h-1 w-6 rounded bg-primary/30 mb-2" />
                      <div className="text-sm font-bold text-text font-mono">{k.n}</div>
                      <div className="text-[9px] text-text-muted uppercase font-bold tracking-tighter mt-1">{k.label}</div>
                    </div>
                  ))}
                </div>
                {/* Bar chart — inline styles, no Tailwind dynamic classes */}
                <div className="p-4 rounded-xl bg-glass-raised border border-glass-border">
                  <div className="h-1.5 w-20 rounded bg-primary/20 mb-4" />
                  <div className="grid grid-cols-4 gap-4 h-32 items-end">
                    {[
                      { h: 60, opacity: 0.5 },
                      { h: 80, opacity: 0.7 },
                      { h: 45, opacity: 0.4 },
                      { h: 95, opacity: 1.0 },
                    ].map((bar, i) => (
                      <div
                        key={i}
                        className="w-full rounded-lg"
                        style={{
                          height: `${bar.h}%`,
                          background: "var(--color-primary)",
                          opacity: bar.opacity,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-20 bg-glass-raised/30 border-y border-glass-border">
        <div className="max-w-6xl mx-auto px-6">
          {/* 1.3 — defensible numbers */}
          <p className="text-center text-[10px] text-text-subtle uppercase tracking-widest font-semibold mb-10">
            Based on beta data, early 2025
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-glass border border-glass-border flex items-center justify-center text-primary shadow-lg">
                  <s.icon className="w-6 h-6" />
                </div>
                <StatCounter value={s.value} label={s.label} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features / How it Works ── */}
      <section id="how" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-24 text-center md:text-left rtl:md:text-right">
            <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs mb-4">
              {t.landing.howItWorks}
            </p>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-text">
              {t.landing.agentsFull}
            </h2>
          </div>

          {/* 1.2 — annotated mockups instead of empty icon containers */}
          <div className="space-y-40">
            {features.map((f, i) => (
              <FeatureRow
                key={i}
                index={i}
                step={f.step}
                title={f.title}
                desc={f.desc}
                colorClass={f.colorClass}
                bgClass={f.bgClass}
                borderClass={f.borderClass}
                mockup={f.mockup}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-12 border-t border-glass-border bg-glass-raised/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <RadarIcon className="w-4 h-4" />
            </div>
            <span className="font-bold text-text">© {new Date().getFullYear()} FindX Intelligence.</span>
          </div>
          <div className="flex gap-8">
            <Link href="/privacy"><a className="text-xs font-bold text-text-muted hover:text-primary transition-colors">PRIVACY</a></Link>
            <Link href="/terms"><a className="text-xs font-bold text-text-muted hover:text-primary transition-colors">TERMS</a></Link>
            <Link href="/pricing"><a className="text-xs font-bold text-text-muted hover:text-primary transition-colors">PRICING</a></Link>
            <a href="mailto:support@findx.nl" className="text-xs font-bold text-text-muted hover:text-primary transition-colors">SUPPORT</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
