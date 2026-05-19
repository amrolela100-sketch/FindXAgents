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
  hidden:  { opacity: 0, y: 20, filter: "blur(4px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: SPRING },
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
        className="text-4xl md:text-5xl font-extrabold tracking-tighter leading-none mb-3 text-text"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={SPRING_BOUNCE}
      >
        <span ref={ref}>0</span>
      </motion.div>
      <div className="text-xs font-semibold tracking-wider uppercase text-text-muted">
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
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6 border border-border bg-interactive-hover text-text"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Step {step}
        </div>
        <h3 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-5 text-text">
          {title}
        </h3>
        <p className="text-base leading-relaxed text-text-muted max-w-[48ch]">
          {desc}
        </p>
      </motion.div>

      {/* Visual Side */}
      <motion.div variants={itemVariants} className={isEven ? "" : "md:order-1"}>
        <motion.div
          whileHover={{ scale: 1.01, rotateY: isEven ? -2 : 2, rotateX: 2 }}
          className="rounded-2xl p-10 flex items-center justify-center aspect-[4/3] relative overflow-hidden border border-border bg-glass backdrop-blur-glass shadow-md"
          style={{
            transformPerspective: 1000
          }}
        >
          <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ background: `radial-gradient(circle at center, ${color} 0%, transparent 60%)` }} />
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center relative z-10 border border-border bg-interactive-hover/40 shadow-sm"
          >
            <Icon className="w-8 h-8 text-primary" strokeWidth={1.5} />
          </motion.div>
        </motion.div>
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

  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true });
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // Mouse Parallax for Hero
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const { innerWidth, innerHeight } = window;
    const x = (clientX / innerWidth - 0.5) * 20; // Subtle movement
    const y = (clientY / innerHeight - 0.5) * 20;
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
    { icon: Search,   key: "discover" as const, color: "var(--findx-accent)" },
    { icon: Activity, key: "analyze"  as const, color: "var(--findx-accent)" },
    { icon: Target,   key: "outreach" as const, color: "var(--findx-accent)" },
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
    <div dir={isRtl ? "rtl" : "ltr"} onMouseMove={handleMouseMove} className="overflow-hidden bg-background min-h-screen text-text">

      {/* ══ NAV ══ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 border-b border-border bg-glass backdrop-blur-glass"
      >
        <Link href="/">
          <a className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 90 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-border"
            >
              <RadarIcon className="w-4 h-4 text-primary-foreground" />
            </motion.div>
            <span className="font-extrabold text-base tracking-tight text-text">
              FindX
            </span>
          </a>
        </Link>

        <div className="flex items-center gap-2">
          <button onClick={toggleLang} className="btn btn-ghost text-xs font-semibold gap-1.5 px-3 rounded-full">
            <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
            {lang.toUpperCase()}
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost px-2 rounded-full">
            {isDark ? <Sun className="w-4 h-4" strokeWidth={1.5} /> : <Moon className="w-4 h-4" strokeWidth={1.5} />}
          </button>
          <Link href="/login">
            <MagneticButton className="btn btn-primary px-5 py-2 text-xs rounded-full ml-2" strength={0.15}>
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
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-8 border border-border bg-interactive-hover text-text">
                <Sparkles className="w-3.5 h-3.5" />
                {t.landing.badge}
              </div>
            </motion.div>

            {/* H1 Title */}
            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.05] mb-6 text-text"
            >
              {t.landing.heroTitle.split("\n").map((line, i) =>
                i === 0 ? (
                  <span key={i} className="block">{line}</span>
                ) : (
                  <span key={i} className="block text-primary">
                    {line}
                  </span>
                )
              )}
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl mb-10 max-w-[48ch] text-text-muted"
              style={{ lineHeight: 1.6 }}
            >
              {t.landing.heroSubtitle}
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
              <Link href="/login">
                <MagneticButton className="btn btn-primary px-8 py-4 text-base rounded-full shadow-sm" strength={0.15}>
                  {t.landing.getStarted}
                  <ChevronRight className="w-5 h-5 ml-1" strokeWidth={2.5} />
                </MagneticButton>
              </Link>
              <a href="#how" className="btn btn-secondary px-8 py-4 text-base rounded-full border border-border">
                {t.landing.learnMore}
              </a>
            </motion.div>

            {/* Trust Badges */}
            <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-12 font-medium text-text-subtle">
              {["Real website scraping", "Zero hallucination", "Instant setup"].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-success" strokeWidth={2.5} />
                  <span>{item}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT: Floating Mockup with Parallax */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, rotateY: 5 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            style={{ x: springX, y: springY }}
            className="hidden lg:block relative"
          >
            <div className="relative rounded-2xl overflow-hidden border border-border bg-glass backdrop-blur-glass shadow-2xl">
              {/* Browser Header */}
              <div className="flex items-center gap-2 px-5 py-4 border-b border-border bg-interactive-hover/40">
                <span className="w-3 h-3 rounded-full bg-red-400/80" />
                <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-400/80" />
                <div className="flex-1 mx-4 h-6 rounded-full text-xs flex items-center justify-center font-mono bg-background border border-border text-text-subtle">
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
                      className="rounded-xl p-4 border border-border bg-interactive-hover/30"
                    >
                      <div className="text-2xl font-extrabold text-text tabular-nums">{n}</div>
                      <div className="text-[10px] font-bold uppercase mt-1 text-text-muted">{label}</div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Simulated Chart/Kanban */}
                <div className="rounded-xl p-5 border border-border bg-interactive-hover/30">
                  <div className="h-2 w-24 rounded-full mb-4 bg-primary/20" />
                  <div className="flex gap-3 h-32 items-end">
                    {[40, 70, 45, 90, 60, 100, 85].map((h, j) => (
                      <motion.div
                        key={j}
                        className="flex-1 rounded-t-md bg-primary"
                        initial={{ height: "0%" }}
                        animate={{ height: `${h}%` }}
                        transition={{ delay: 1 + j * 0.05, duration: 0.8, ease: "easeOut" }}
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
      <section className="relative z-20 py-24 border-y border-border bg-interactive-hover/30">
        <div className="max-w-6xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left">
            {stats.map(({ value, key, icon: Icon }) => (
              <div key={key} className="flex flex-col md:flex-row items-center md:items-start gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center border border-border bg-glass shadow-sm">
                  <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
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
            <p className="text-xs font-bold uppercase tracking-widest mb-4 text-primary">
              {t.landing.howItWorks}
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-text">
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
            initial={{ opacity: 0, scale: 0.98, y: 40 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ ...SPRING, duration: 1 }}
            className="rounded-3xl p-12 md:p-20 text-center relative overflow-hidden border border-border bg-interactive-hover/40 shadow-xl"
          >
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-primary mb-8 flex items-center justify-center border border-border shadow-sm">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-6 max-w-2xl text-balance text-text">
                {t.landing.ctaTitle}
              </h2>
              <p className="text-lg mb-10 max-w-xl mx-auto text-text-muted">
                {t.landing.ctaSubtitle}
              </p>
              <Link href="/login">
                <MagneticButton className="btn btn-primary px-12 py-5 text-lg rounded-full shadow-sm" strength={0.15}>
                  {t.landing.getStarted}
                  <ArrowIcon className="w-5 h-5 ml-2" strokeWidth={2.5} />
                </MagneticButton>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer className="px-6 md:px-12 py-12 flex flex-col md:flex-row items-center justify-between gap-6 text-sm font-medium border-t border-border bg-glass">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center border border-border">
            <RadarIcon className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-text-muted">© {new Date().getFullYear()} FindX Inc.</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="/privacy"><a className="text-text-muted hover:text-text transition-colors">Privacy Policy</a></Link>
          <Link href="/terms"><a className="text-text-muted hover:text-text transition-colors">Terms of Service</a></Link>
          <a href="mailto:hello@findx.ai" className="text-text-muted hover:text-text transition-colors">Contact Sales</a>
        </div>
      </footer>
    </div>
  );
}
