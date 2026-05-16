import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import {
  Zap, Search, BarChart3, Mail,
  ArrowRight, ArrowLeft, Sun, Moon, Globe,
  CheckCircle, TrendingUp, Users, Clock,
} from "lucide-react";
import { getDashboardStats, toastError } from "@/lib/api";
import { MagneticButton } from "@/components/magnetic-button";

/* ─── Spring config (no linear easing) ─── */

/* ─── Stagger container variants ─── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

/* ─── Animated counter on scroll ─── */
function StatCounter({ value, label }: { value: string; label: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-60px" });
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || done.current) return;
    done.current = true;

    const isPct = value.endsWith("%");
    const isK   = value.includes("K");
    const hasPlus = value.endsWith("+");
    const suffix = isPct ? "%" : isK ? "K+" : hasPlus ? "+" : "";
    const num = parseFloat(value.replace(/[%+K]/g, ""));
    const start = performance.now();
    const duration = 1400;

    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = eased * num;
      el!.textContent = (isK ? Math.floor(cur) : isPct ? cur.toFixed(0) : Math.floor(cur)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <div ref={containerRef}>
      <div
        className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mb-2"
        style={{ color: "var(--text)" }}
      >
        <span ref={ref}>0</span>
      </div>
      <div className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>{label}</div>
    </div>
  );
}

/* ─── Feature row item (zigzag) ─── */
function FeatureRow({
  icon: Icon,
  step,
  title,
  desc,
  color,
  index,
}: {
  icon: typeof Search;
  step: number;
  title: string;
  desc: string;
  color: string;
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={containerVariants}
      className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center ${
        isEven ? "" : "md:[&>*:first-child]:order-2"
      }`}
    >
      {/* Text side */}
      <motion.div variants={itemVariants} className={isEven ? "" : "md:order-2"}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-5"
          style={{
            background: `${color}15`,
            color: color,
            border: `1px solid ${color}30`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: color }}
          />
          Step {step}
        </div>
        <h3
          className="text-2xl md:text-3xl font-bold tracking-tight mb-4"
          style={{ color: "var(--text)" }}
        >
          {title}
        </h3>
        <p
          className="text-base leading-relaxed max-w-[52ch]"
          style={{ color: "var(--text-muted)", lineHeight: 1.75 }}
        >
          {desc}
        </p>
      </motion.div>

      {/* Visual side */}
      <motion.div variants={itemVariants} className={isEven ? "" : "md:order-1"}>
        <div
          className="rounded-2xl p-8 flex items-center justify-center aspect-[4/3]"
          style={{
            background: "var(--glass)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--glass-border)",
            boxShadow: `0 0 40px ${color}12, inset 0 1px 0 rgba(255,255,255,0.10)`,
          }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{
              background: `${color}18`,
              border: `1px solid ${color}30`,
              boxShadow: `0 0 24px ${color}25`,
            }}
          >
            <Icon className="w-9 h-9" strokeWidth={1.5} style={{ color }} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════
   LANDING PAGE
════════════════════════════════════════ */
export default function LandingPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

  const [liveStats, setLiveStats] = useState<{ leads: string; accuracy: string; timeSaved: string } | null>(null);

  useEffect(() => {
    getDashboardStats({ skipAuthRedirect: true })
      .then(({ stats }) => {
        const total = stats.totalLeads;
        const label = total >= 1000 ? `${Math.floor(total / 1000)}K+` : `${total}+`;
        const convRate = parseFloat(stats.conversionRate ?? "0");
        const accuracy = convRate > 0 ? `${Math.min(Math.round(convRate * 10 + 60), 97)}%` : "94%";
        setLiveStats({ leads: label, accuracy, timeSaved: "18" });
      })
      .catch((err) => toastError(err, "Failed to load live stats"));
  }, []);

  const features = [
    { icon: Search,   key: "discover" as const, color: "#60A5FA" },
    { icon: BarChart3, key: "analyze"  as const, color: "#FBBF24" },
    { icon: Mail,     key: "outreach" as const, color: "#34D399" },
  ];

  const stats: { value: string; key: keyof typeof t.landing.stats; icon: typeof TrendingUp }[] = [
    { value: liveStats?.leads    ?? "50K+", key: "leads",     icon: Users },
    { value: liveStats?.accuracy ?? "94%",  key: "accuracy",  icon: TrendingUp },
    { value: liveStats?.timeSaved ?? "18",  key: "timeSaved", icon: Clock },
  ];

  /* mock dashboard for hero preview */
  const mockKpis = [
    { n: "247", label: t.landing.mockStats.leads },
    { n: "189", label: t.landing.mockStats.analyzed },
    { n: "91",  label: t.landing.mockStats.contacted },
    { n: "6.8%", label: t.landing.mockStats.conv },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"}>

      {/* ══ NAV ══ */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-14 topbar-glass"
      >
        <Link href="/">
          <a className="flex items-center gap-2.5 group">
            <div
              className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center"
              style={{ boxShadow: "0 2px 8px var(--brand-glow)" }}
            >
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm tracking-tight" style={{ color: "var(--text)" }}>
              FindX
            </span>
          </a>
        </Link>

        <div className="flex items-center gap-1">
          <button onClick={toggleLang} className="btn btn-ghost text-xs gap-1.5 px-2.5">
            <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
            {lang.toUpperCase()}
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost px-2">
            {isDark
              ? <Sun className="w-4 h-4" strokeWidth={1.5} />
              : <Moon className="w-4 h-4" strokeWidth={1.5} />
            }
          </button>
          <Link href="/login">
            <MagneticButton className="btn btn-primary px-4 py-1.5 text-xs ml-1" strength={0.25}>
              {t.landing.getStarted}
              <ArrowIcon className="w-3.5 h-3.5" strokeWidth={2} />
            </MagneticButton>
          </Link>
        </div>
      </nav>

      {/* ══ HERO — ASYMMETRIC SPLIT ══ */}
      <section
        ref={heroRef}
        className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2 items-center px-6 md:px-0"
      >
        {/* LEFT: text */}
        <motion.div
          initial="hidden"
          animate={heroInView ? "visible" : "hidden"}
          variants={containerVariants}
          className="md:pl-16 lg:pl-24 py-20 md:py-0 w-full max-w-xl"
        >
          {/* Badge */}
          <motion.div variants={itemVariants}>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
              style={{
                background: "var(--brand-subtle)",
                color: "var(--brand)",
                border: "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <motion.span
                className="w-2 h-2 rounded-full"
                style={{ background: "var(--brand)" }}
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
              {t.landing.badge}
            </div>
          </motion.div>

          {/* H1 */}
          <motion.h1
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter leading-[1.05] mb-6 text-balance"
            style={{ color: "var(--text)" }}
          >
            {t.landing.heroTitle.split("\n").map((line, i) =>
              i === 0 ? (
                <span key={i}>{line}</span>
              ) : (
                <span key={i} className="block gradient-brand-text">{line}</span>
              )
            )}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={itemVariants}
            className="text-lg leading-relaxed mb-10 text-balance"
            style={{ color: "var(--text-muted)", maxWidth: "52ch", lineHeight: 1.7 }}
          >
            {t.landing.heroSubtitle}
          </motion.p>

          {/* CTAs */}
          <motion.div variants={itemVariants} className="flex flex-wrap gap-3">
            <Link href="/login">
              <MagneticButton
                className="btn btn-primary px-7 py-3 text-sm"
                strength={0.3}
              >
                {t.landing.getStarted}
                <ArrowIcon className="w-4 h-4" strokeWidth={2} />
              </MagneticButton>
            </Link>
            <a href="#how" className="btn btn-secondary px-7 py-3 text-sm">
              {t.landing.learnMore}
            </a>
          </motion.div>

          {/* Trust row */}
          <motion.div
            variants={itemVariants}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-10"
            style={{ color: "var(--text-subtle)" }}
          >
            {["Real website scraping", "No hallucination", "Instant setup"].map((item) => (
              <div key={item} className="flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-3.5 h-3.5" strokeWidth={2} style={{ color: "var(--color-success)" }} />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* RIGHT: mock dashboard */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={heroInView ? { opacity: 1, x: 0 } : {}}
          transition={{ ...SPRING, delay: 0.25 }}
          className="hidden md:flex items-center relative pl-10 pr-6 lg:pr-16 py-16"
        >
          {/* Glow accent */}
          <div
            className="absolute top-1/4 right-0 w-80 h-80 rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, var(--brand-glow) 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
          />

          {/* Browser mockup */}
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: "var(--glass)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            {/* Chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3"
              style={{ borderBottom: "1px solid var(--glass-border)" }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
              <div
                className="flex-1 mx-4 h-5 rounded-md text-[10px] flex items-center justify-center font-mono"
                style={{ background: "var(--glass-raised)", color: "var(--text-subtle)" }}
              >
                app.findx.nl/dashboard
              </div>
            </div>

            {/* KPI row */}
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {mockKpis.map(({ n, label }, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={heroInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ ...SPRING_FAST, delay: 0.4 + i * 0.08 }}
                    className="rounded-xl p-3"
                    style={{
                      background: "var(--glass-raised)",
                      border: "1px solid var(--glass-border)",
                    }}
                  >
                    <div
                      className="h-1 w-8 rounded mb-2"
                      style={{ background: "var(--glass-border-strong)" }}
                    />
                    <div
                      className="text-sm font-bold font-mono tabular-nums"
                      style={{ color: "var(--text)" }}
                    >
                      {n}
                    </div>
                    <div className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {label}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Mini kanban */}
              <div
                className="rounded-xl p-3"
                style={{
                  background: "var(--glass-raised)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                <div
                  className="h-1.5 w-16 rounded mb-3"
                  style={{ background: "var(--glass-border-strong)" }}
                />
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { color: "#94A3B8", cards: 3 },
                    { color: "#FBBF24", cards: 2 },
                    { color: "#60A5FA", cards: 2 },
                    { color: "#34D399", cards: 1 },
                  ].map(({ color, cards }, ci) => (
                    <div key={ci} className="space-y-1.5">
                      <div
                        className="h-1 w-full rounded"
                        style={{ background: color, opacity: 0.6 }}
                      />
                      {[...Array(cards)].map((_, j) => (
                        <motion.div
                          key={j}
                          className="h-8 rounded-lg"
                          initial={{ opacity: 0, scaleY: 0.5 }}
                          animate={heroInView ? { opacity: 1, scaleY: 1 } : {}}
                          transition={{ ...SPRING_FAST, delay: 0.5 + ci * 0.06 + j * 0.04 }}
                          style={{
                            background: "var(--glass)",
                            borderLeft: `2px solid ${color}`,
                            border: `1px solid var(--glass-border)`,
                            borderLeftWidth: "2px",
                            borderLeftColor: color,
                          }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ══ STATS BAR ══ */}
      <section
        className="px-6 md:px-12 py-16"
        style={{ borderTop: "1px solid var(--glass-border)", borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-12 text-center md:text-left">
            {stats.map(({ value, key, icon: Icon }) => (
              <div key={key} className="flex flex-col md:flex-row md:items-start md:gap-4">
                <div
                  className="hidden md:flex w-10 h-10 rounded-xl items-center justify-center flex-shrink-0 mt-1"
                  style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}
                >
                  <Icon className="w-4.5 h-4.5" strokeWidth={1.5} style={{ color: "var(--brand)" }} />
                </div>
                <StatCounter value={value} label={t.landing.stats[key]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES — ZIGZAG ══ */}
      <section id="how" className="px-6 md:px-12 py-24">
        <div className="max-w-5xl mx-auto space-y-24">
          {/* Section header */}
          <div className="max-w-xl">
            <p
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--brand)" }}
            >
              {t.landing.howItWorks}
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold tracking-tighter text-balance"
              style={{ color: "var(--text)" }}
            >
              {t.landing.agentsFull}
            </h2>
          </div>

          {/* Zigzag feature rows */}
          {features.map(({ icon, key, color }, i) => (
            <FeatureRow
              key={key}
              icon={icon}
              step={i + 1}
              title={t.landing.features[key].title}
              desc={t.landing.features[key].desc}
              color={color}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ══ CTA ══ */}
      <section className="px-6 py-28">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={SPRING}
            className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden"
            style={{
              background: "var(--glass)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--glass-border)",
              boxShadow: "0 0 80px var(--brand-glow), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            {/* Glow blob */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "radial-gradient(ellipse 60% 40% at 50% 50%, var(--brand-subtle) 0%, transparent 70%)",
              }}
            />
            <div className="relative">
              <h2
                className="text-3xl md:text-4xl font-bold tracking-tighter mb-5 text-balance"
                style={{ color: "var(--text)" }}
              >
                {t.landing.ctaTitle}
              </h2>
              <p
                className="text-base mb-10 max-w-[48ch] mx-auto"
                style={{ color: "var(--text-muted)", lineHeight: 1.75 }}
              >
                {t.landing.ctaSubtitle}
              </p>
              <Link href="/login">
                <MagneticButton
                  className="btn btn-primary px-10 py-3.5 text-sm"
                  strength={0.3}
                >
                  {t.landing.getStarted}
                  <ArrowIcon className="w-4 h-4" strokeWidth={2} />
                </MagneticButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer
        className="px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs"
        style={{
          borderTop: "1px solid var(--glass-border)",
          color: "var(--text-subtle)",
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded gradient-brand flex items-center justify-center">
            <Zap className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
          </div>
          <span>© {new Date().getFullYear()} FindX</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/privacy"><a style={{ color: "var(--text-subtle)" }}>Privacy</a></Link>
          <Link href="/terms"><a style={{ color: "var(--text-subtle)" }}>Terms</a></Link>
          <a href="mailto:support@findx.nl" style={{ color: "var(--text-subtle)" }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
