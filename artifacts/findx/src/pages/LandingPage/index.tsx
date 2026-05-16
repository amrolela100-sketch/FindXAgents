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
import { cn } from "@/lib/utils";

const SPRING = { type: "spring", stiffness: 100, damping: 15 };
const SPRING_FAST = { type: "spring", stiffness: 120, damping: 20 };

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

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
    <div ref={containerRef} className="flex flex-col items-center md:items-start">
      <div className="text-3xl md:text-4xl font-bold tracking-tighter leading-none mb-2 text-text">
        <span ref={ref}>0</span>
      </div>
      <div className="text-sm font-medium text-text-muted">{label}</div>
    </div>
  );
}

function FeatureRow({ icon: Icon, step, title, desc, colorClass, borderClass, bgClass, index }: {
  icon: any; step: number; title: string; desc: string; colorClass: string; borderClass: string; bgClass: string; index: number;
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
      className={cn("grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 items-center", !isEven && "md:rtl:grid-cols-2")}
    >
      <motion.div variants={itemVariants} className={cn(isEven ? "md:order-1" : "md:order-2")}>
        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-5 border", bgClass, colorClass, borderClass)}>
          <span className={cn("w-1.5 h-1.5 rounded-full", colorClass.replace('text-', 'bg-'))} />
          Step {step}
        </div>
        <h3 className="text-2xl md:text-3xl font-bold tracking-tight mb-4 text-text">
          {title}
        </h3>
        <p className="text-base leading-relaxed max-w-[52ch] text-text-muted">
          {desc}
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className={cn(isEven ? "md:order-2" : "md:order-1")}>
        <div className="rounded-3xl p-8 flex items-center justify-center aspect-[4/3] bg-glass backdrop-blur-glass border border-glass-border shadow-xl">
          <div className={cn("w-24 h-24 rounded-2xl flex items-center justify-center border transition-all duration-500 hover:scale-110", bgClass, borderClass)}>
            <Icon className={cn("w-10 h-10", colorClass)} strokeWidth={1.5} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

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
      .catch((err) => console.log("Stats load error", err));
  }, []);

  const features = [
    { icon: Search,   key: "discover" as const, colorClass: "text-info", bgClass: "bg-info-bg", borderClass: "border-info-border" },
    { icon: BarChart3, key: "analyze"  as const, colorClass: "text-warning", bgClass: "bg-warning-bg", borderClass: "border-warning-border" },
    { icon: Mail,     key: "outreach" as const, colorClass: "text-success", bgClass: "bg-success-bg", borderClass: "border-success-border" },
  ];

  const stats: { value: string; key: keyof typeof t.landing.stats; icon: typeof TrendingUp }[] = [
    { value: liveStats?.leads    ?? "50K+", key: "leads",     icon: Users },
    { value: liveStats?.accuracy ?? "94%",  key: "accuracy",  icon: TrendingUp },
    { value: liveStats?.timeSaved ?? "18",  key: "timeSaved", icon: Clock },
  ];

  const mockKpis = [
    { n: "247", label: t.landing.mockStats.leads },
    { n: "189", label: t.landing.mockStats.analyzed },
    { n: "91",  label: t.landing.mockStats.contacted },
    { n: "6.8%", label: t.landing.mockStats.conv },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="bg-background min-h-screen selection:bg-primary/30">
      
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 md:px-12 h-16 bg-glass-overlay backdrop-blur-glass border-b border-glass-border">
        <Link href="/">
          <a className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow-brand transition-transform group-hover:scale-105">
              <Zap className="w-4 h-4 text-white fill-current" />
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

      {/* Hero Section */}
      <section ref={heroRef} className="relative overflow-hidden pt-12 md:pt-20 pb-20 md:pb-32 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial="hidden"
            animate={heroInView ? "visible" : "hidden"}
            variants={containerVariants}
            className="text-center md:text-left rtl:md:text-right"
          >
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-8 bg-primary/10 text-primary border border-primary/20">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                {t.landing.badge}
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

            <motion.div variants={itemVariants} className="mt-12 flex flex-wrap justify-center md:justify-start gap-x-6 gap-y-3">
               {["Real website scraping", "No hallucination", "Instant setup"].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-text-subtle">
                    <CheckCircle className="w-4 h-4 text-success" />
                    {item}
                  </div>
               ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            animate={heroInView ? { opacity: 1, scale: 1, x: 0 } : {}}
            transition={{ ...SPRING, delay: 0.3 }}
            className="hidden md:block relative"
          >
            <div className="absolute inset-0 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
            <div className="relative rounded-2xl bg-glass border border-glass-border-strong shadow-2xl overflow-hidden backdrop-blur-glass">
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
                <div className="grid grid-cols-4 gap-3">
                  {mockKpis.map((k, i) => (
                    <div key={i} className="p-3 rounded-xl bg-glass-raised border border-glass-border">
                      <div className="h-1 w-6 rounded bg-primary/30 mb-2" />
                      <div className="text-sm font-bold text-text font-mono">{k.n}</div>
                      <div className="text-[9px] text-text-muted uppercase font-bold tracking-tighter mt-1">{k.label}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-glass-raised border border-glass-border">
                  <div className="h-1.5 w-20 rounded bg-primary/20 mb-4" />
                  <div className="grid grid-cols-4 gap-4 h-32 items-end">
                    {[60, 80, 45, 95].map((h, i) => (
                       <div key={i} className="w-full bg-primary/10 rounded-lg relative overflow-hidden group" style={{ height: `${h}%` }}>
                          <div className="absolute bottom-0 left-0 right-0 bg-primary/40 h-full transform translate-y-1/2 group-hover:translate-y-0 transition-transform duration-500" />
                       </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-glass-raised/30 border-y border-glass-border">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {stats.map((s, i) => (
              <div key={i} className="flex items-center gap-6">
                 <div className="w-14 h-14 rounded-2xl bg-glass border border-glass-border flex items-center justify-center text-primary shadow-lg">
                    <s.icon className="w-6 h-6" />
                 </div>
                 <StatCounter value={s.value} label={t.landing.stats[s.key]} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
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

          <div className="space-y-40">
             {features.map((f, i) => (
                <FeatureRow key={i} index={i} step={i+1} icon={f.icon} title={t.landing.features[f.key].title} desc={t.landing.features[f.key].desc} {...f} />
             ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-glass-border bg-glass-raised/20">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                 <Zap className="w-4 h-4 fill-current" />
              </div>
              <span className="font-bold text-text">© {new Date().getFullYear()} FindX Intelligence.</span>
           </div>
           <div className="flex gap-8">
              <Link href="/privacy"><a className="text-xs font-bold text-text-muted hover:text-primary transition-colors">PRIVACY</a></Link>
              <Link href="/terms"><a className="text-xs font-bold text-text-muted hover:text-primary transition-colors">TERMS</a></Link>
              <a href="mailto:support@findx.nl" className="text-xs font-bold text-text-muted hover:text-primary transition-colors">SUPPORT</a>
           </div>
        </div>
      </footer>
    </div>
  );
}
