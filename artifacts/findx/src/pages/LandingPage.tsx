import { Link } from "wouter";
import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform, useMotionValue, useSpring } from "framer-motion";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import {
  Zap, Search, BarChart3, Mail,
  ArrowRight, ArrowLeft, Sun, Moon, Globe,
  CheckCircle, TrendingUp, Users, Clock,
  ChevronRight, Sparkles, Target, Activity
} from "lucide-react";
import { RadarIcon } from "@/components/radar-icon";
import { getDashboardStats, toastError } from "../lib/api";
import { MagneticButton } from "../components/magnetic-button";

/* ─── Spring Configs ─── */
const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const SPRING_FAST = { type: "spring" as const, stiffness: 160, damping: 22 };
const SPRING_BOUNCE = { type: "spring" as const, stiffness: 120, damping: 14 };

/* ─── Stagger container variants ─── */
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING },
};
const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: "easeOut" } },
};

/* ─── Animated Counter ─── */
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
    const duration = 2000;

    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // Quartic ease out
      const cur = eased * num;
      el!.textContent = (isK ? Math.floor(cur) : isPct ? cur.toFixed(0) : Math.floor(cur)) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [inView, value]);

  return (
    <div ref={containerRef} className="flex flex-col items-center md:items-start group">
      <motion.div
        className="text-4xl md:text-5xl font-black tracking-tighter leading-none mb-3"
        style={{ color: "var(--text)" }}
        initial={{ opacity: 0, scale: 0.8 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={SPRING_BOUNCE}
      >
        <span ref={ref}>0</span>
      </motion.div>
      <div className="text-sm font-medium tracking-wide uppercase" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

/* ─── Feature Row (Zigzag) ─── */
function FeatureRow({
  icon: Icon, step, title, desc, color, index,
}: {
  icon: typeof Search; step: number; title: string; desc: string; color: string; index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const isEven = index % 2 === 0;

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={containerVariants}
      className={`grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-24 items-center ${
        isEven ? "" : "md:[&>*:first-child]:order-2"
      }`}
    >
      {/* Text Side */}
      <motion.div variants={itemVariants} className={isEven ? "" : "md:order-2"}>
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
          style={{ background: `${color}15`, color: color, border: `1px solid ${color}30` }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
          Step {step}
        </div>
        <h3 className="text-3xl md:text-4xl font-black tracking-tight mb-5" style={{ color: "var(--text)" }}>
          {title}
        </h3>
        <p className="text-lg leading-relaxed max-w-[48ch]" style={{ color: "var(--text-muted)" }}>
          {desc}
        </p>
      </motion.div>

      {/* Visual Side */}
      <motion.div variants={itemVariants} className={isEven ? "" : "md:order-1"}>
        <motion.div
          whileHover={{ scale: 1.02, rotateY: isEven ? -5 : 5, rotateX: 5 }}
          className="rounded-3xl p-10 flex items-center justify-center aspect-[4/3] relative overflow-hidden"
          style={{
            background: "var(--glass)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: "1px solid var(--glass-border-strong)",
            boxShadow: `0 20px 60px -10px ${color}15, inset 0 1px 0 rgba(255,255,255,0.15)`,
            transformPerspective: 1000
          }}
        >
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)` }} />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-24 h-24 rounded-3xl flex items-center justify-center relative z-10"
            style={{
              background: `${color}15`,
              border: `1px solid ${color}40`,
              boxShadow: `0 0 40px ${color}30`,
              backdropFilter: "blur(12px)"
            }}
          >
            <Icon className="w-10 h-10" strokeWidth={1.5} style={{ color }} />
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* ════════════════════════════════════════
   LANDING PAGE (Redesigned)
════════════════════════════════════════ */
export default function LandingPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight;

  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Mouse Parallax for Hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 40; // 40px max movement
    const y = (clientY / innerHeight - 0.5) * 40;
    mouseX.set(x);
    mouseY.set(y);
  };

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
    { icon: Search,   key: "discover" as const, color: "#3B82F6" }, // Royal Blue
    { icon: Activity, key: "analyze"  as const, color: "#D97706" }, // Warm Bronze
    { icon: Target,   key: "outreach" as const, color: "#10B981" }, // Emerald
  ];

  const stats = [
    { value: liveStats?.leads    ?? "50K+", key: "leads" as const,     icon: Users },
    { value: liveStats?.accuracy ?? "94%",  key: "accuracy" as const,  icon: TrendingUp },
    { value: liveStats?.timeSaved ?? "18",  key: "timeSaved" as const, icon: Clock },
  ];

  const mockKpis = [
    { n: "247", label: t.landing.mockStats.leads },
    { n: "189", label: t.landing.mockStats.analyzed },
    { n: "91",  label: t.landing.mockStats.contacted },
    { n: "6.8%", label: t.landing.mockStats.conv },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} onMouseMove={handleMouseMove} className="overflow-hidden">

      {/* ══ NAV ══ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-16"
        style={{
          background: "var(--glass-overlay)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid var(--glass-border)"
        }}
      >
        <Link href="/">
          <a className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 90 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-8 h-8 rounded-xl flex items-center justify-center relative"
              style={{ background: "var(--brand)", boxShadow: "0 4px 16px var(--brand-glow)" }}
            >
              <RadarIcon className="w-4 h-4 text-white" />
              <motion.div
                className="absolute inset-0 rounded-xl border border-white opacity-50"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </motion.div>
            <span className="font-black text-lg tracking-tight" style={{ color: "var(--text)" }}>
              FindX
            </span>
          </a>
        </Link>

        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="btn btn-ghost text-xs font-bold gap-1.5 px-3 rounded-full">
            <Globe className="w-4 h-4" strokeWidth={1.5} />
            {lang.toUpperCase()}
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost px-2 rounded-full">
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
          </button>
          <Link href="/login">
            <MagneticButton className="btn btn-primary px-5 py-2 text-xs rounded-full ml-2" strength={0.3}>
              {t.landing.getStarted}
              <ArrowIcon className="w-4 h-4" strokeWidth={2} />
            </MagneticButton>
          </Link>
        </div>
      </motion.nav>

      {/* ══ HERO SECTION ══ */}
      <section
        ref={heroRef}
        className="relative min-h-[100dvh] flex items-center pt-20 px-6 md:px-12"
      >
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* LEFT: Text Content */}
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={containerVariants}
            className="w-full max-w-2xl relative z-10"
          >
            {/* Premium Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-8"
                style={{ background: "var(--brand-subtle)", color: "var(--brand)", border: "1px solid rgba(59, 130, 246, 0.3)" }}>
                <Sparkles className="w-4 h-4" />
                {t.landing.badge}
              </div>
            </motion.div>

            {/* H1 with letter stagger */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[1.05] mb-6"
              style={{ color: "var(--text)" }}
            >
              {t.landing.heroTitle.split("\n").map((line, i) =>
                i === 0 ? (
                  <span key={i} className="block">{line}</span>
                ) : (
                  <span key={i} className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-amber-500 pb-2">
                    {line}
                  </span>
                )
              )}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl mb-10 max-w-[48ch]"
              style={{ color: "var(--text-muted)", lineHeight: 1.6 }}
            >
              {t.landing.heroSubtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
              <Link href="/login">
                <MagneticButton className="btn btn-primary px-8 py-4 text-base rounded-2xl shadow-glow-brand" strength={0.4}>
                  {t.landing.getStarted}
                  <ChevronRight className="w-5 h-5 ml-1" strokeWidth={2.5} />
                </MagneticButton>
              </Link>
              <a href="#how" className="btn btn-secondary px-8 py-4 text-base rounded-2xl" style={{ border: "1px solid var(--border-strong)" }}>
                {t.landing.learnMore}
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-12 font-medium" style={{ color: "var(--text-subtle)" }}>
              {["Real website scraping", "Zero hallucination", "Instant setup"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" strokeWidth={2.5} style={{ color: "var(--color-success)" }} />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT: Floating Mockup with Parallax */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotateY: 10 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            style={{ x: springX, y: springY }}
            className="hidden lg:block relative"
          >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[80px] pointer-events-none" />

            <div className="relative rounded-3xl overflow-hidden border" style={{ background: "var(--glass)", backdropFilter: "blur(30px)", borderColor: "var(--glass-border-strong)", boxShadow: "0 40px 100px -20px rgba(0,0,0,0.3)" }}>
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: "var(--glass-border)" }}>
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <div className="flex-1 mx-4 h-6 rounded-md text-xs flex items-center justify-center font-mono" style={{ background: "var(--bg-subtle)", color: "var(--text-subtle)" }}>
                  app.findx.ai/dashboard
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  {mockKpis.map(({ n, label }, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + i * 0.1, ...SPRING_FAST }}
                      className="rounded-2xl p-4 border"
                      style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}
                    >
                      <div className="text-2xl font-black tabular-nums" style={{ color: "var(--text)" }}>{n}</div>
                      <div className="text-xs font-semibold uppercase mt-1" style={{ color: "var(--text-muted)" }}>{label}</div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Simulated Chart/Kanban */}
                <div className="rounded-2xl p-5 border" style={{ background: "var(--bg-subtle)", borderColor: "var(--border)" }}>
                  <div className="h-2 w-24 rounded-full mb-4 bg-blue-500/30" />
                  <div className="flex gap-3 h-32 items-end">
                    {[40, 70, 45, 90, 60, 100, 85].map((h, j) => (
                      <motion.div
                        key={j}
                        className="flex-1 rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400"
                        initial={{ height: "0%" }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1 + j * 0.1, duration: 0.8, ease: "easeOut" }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ══ STATS SECTION ══ */}
      <section className="relative z-20 py-24 border-y" style={{ borderColor: "var(--glass-border)", background: "var(--bg-subtle)" }}>
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            {stats.map(({ value, key, icon: Icon }) => (
              <div key={key} className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border shadow-sm" style={{ background: "var(--glass)", borderColor: "var(--glass-border-strong)" }}>
                  <Icon className="w-6 h-6" strokeWidth={2} style={{ color: "var(--brand)" }} />
                </div>
                <StatCounter value={value} label={t.landing.stats[key]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FEATURES ZIGZAG ══ */}
      <section id="how" className="py-32 px-6 md:px-12 overflow-hidden relative">
        <div className="max-w-6xl mx-auto space-y-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto"
          >
            <p className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--brand)" }}>
              {t.landing.howItWorks}
            </p>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter" style={{ color: "var(--text)" }}>
              {t.landing.agentsFull}
            </h2>
          </motion.div>

          {features.map(({ icon, key, color }, i) => (
            <FeatureRow key={key} icon={icon} step={i + 1} title={t.landing.features[key].title} desc={t.landing.features[key].desc} color={color} index={i} />
          ))}
        </div>
      </section>

      {/* ══ BOTTOM CTA ══ */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ ...SPRING, duration: 1 }}
            className="rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <div className="absolute inset-0 pointer-events-none opacity-50" style={{ background: "radial-gradient(ellipse at top, var(--brand-subtle) 0%, transparent 70%)" }} />
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500 mb-8 flex items-center justify-center shadow-glow-brand">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter mb-6 max-w-2xl text-balance" style={{ color: "var(--text)" }}>
                {t.landing.ctaTitle}
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "var(--text-muted)" }}>
                {t.landing.ctaSubtitle}
              </p>
              <Link href="/login">
                <MagneticButton className="btn btn-primary px-12 py-5 text-lg rounded-full shadow-glow-brand" strength={0.4}>
                  {t.landing.getStarted}
                  <ArrowIcon className="w-5 h-5 ml-2" strokeWidth={2.5} />
                </MagneticButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-medium border-t" style={{ borderColor: "var(--border)", background: "var(--bg-base)" }}>
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
            <RadarIcon className="w-3.5 h-3.5 text-white" />
          </div>
          <span style={{ color: "var(--text)" }}>© {new Date().getFullYear()} FindX Inc.</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/privacy"><a className="hover:text-blue-500 transition-colors" style={{ color: "var(--text-muted)" }}>Privacy Policy</a></Link>
          <Link href="/terms"><a className="hover:text-blue-500 transition-colors" style={{ color: "var(--text-muted)" }}>Terms of Service</a></Link>
          <a href="mailto:hello@findx.ai" className="hover:text-blue-500 transition-colors" style={{ color: "var(--text-muted)" }}>Contact Sales</a>
        </div>
      </footer>
    </div>
  );
}
