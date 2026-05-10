import { motion, useInView, type Variants } from "framer-motion";
import { Search, BarChart2, Mail, ArrowRight, ChevronDown, Check, X, Star, Quote } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useLocation } from "wouter";

/* ─── Animation variants ─────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ─── Geometric hero decoration ─────────────────────────────── */
function GeometricDecoration() {
  return (
    <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" aria-hidden="true">
      <circle cx="240" cy="240" r="200" stroke="#D4CFC5" strokeWidth="1" strokeDasharray="4 8" />
      <circle cx="240" cy="240" r="130" stroke="#E2DDD5" strokeWidth="1" />
      <circle cx="240" cy="240" r="40" stroke="#C9C4BA" strokeWidth="1" fill="#F0EDE6" />
      <line x1="240" y1="40" x2="240" y2="440" stroke="#E2DDD5" strokeWidth="0.75" />
      <line x1="40" y1="240" x2="440" y2="240" stroke="#E2DDD5" strokeWidth="0.75" />
      <line x1="98" y1="98" x2="382" y2="382" stroke="#EAE7E0" strokeWidth="0.75" />
      <line x1="382" y1="98" x2="98" y2="382" stroke="#EAE7E0" strokeWidth="0.75" />
      <rect x="210" y="210" width="60" height="60" stroke="#C9C4BA" strokeWidth="1" fill="none" />
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const x = 240 + 200 * Math.cos(rad);
        const y = 240 + 200 * Math.sin(rad);
        return <circle key={deg} cx={x} cy={y} r="3.5" fill="#C9C4BA" />;
      })}
      <rect x="140" y="175" width="70" height="48" rx="4" stroke="#C9C4BA" strokeWidth="1" fill="#FAF9F5" />
      <line x1="150" y1="188" x2="200" y2="188" stroke="#D4CFC5" strokeWidth="1" />
      <line x1="150" y1="198" x2="190" y2="198" stroke="#E2DDD5" strokeWidth="1" />
      <line x1="150" y1="207" x2="195" y2="207" stroke="#E2DDD5" strokeWidth="1" />
      <rect x="270" y="195" width="70" height="48" rx="4" stroke="#C9C4BA" strokeWidth="1" fill="#FAF9F5" />
      <line x1="280" y1="208" x2="330" y2="208" stroke="#D4CFC5" strokeWidth="1" />
      <line x1="280" y1="218" x2="320" y2="218" stroke="#E2DDD5" strokeWidth="1" />
      <line x1="280" y1="227" x2="325" y2="227" stroke="#E2DDD5" strokeWidth="1" />
      <rect x="205" y="260" width="70" height="48" rx="4" stroke="#C9C4BA" strokeWidth="1" fill="#FAF9F5" />
      <line x1="215" y1="273" x2="265" y2="273" stroke="#D4CFC5" strokeWidth="1" />
      <line x1="215" y1="283" x2="255" y2="283" stroke="#E2DDD5" strokeWidth="1" />
      <line x1="215" y1="292" x2="260" y2="292" stroke="#E2DDD5" strokeWidth="1" />
    </svg>
  );
}

/* ─── Animated Product Preview ───────────────────────────────── */
const PIPELINE_LEADS = [
  { company: "Exact Group", domain: "exact.com", score: 94, industry: "Software" },
  { company: "Mollie B.V.", domain: "mollie.com", score: 89, industry: "Fintech" },
  { company: "Teamleader", domain: "teamleader.eu", score: 84, industry: "SaaS" },
  { company: "Sendcloud", domain: "sendcloud.com", score: 81, industry: "Logistics" },
  { company: "Spotler", domain: "spotler.nl", score: 76, industry: "MarTech" },
];

const STAGES = ["Discovered", "Analysed", "Email Ready", "Sent"];
const STAGE_COLORS: Record<string, string> = {
  Discovered: "bg-blue-50 text-blue-700 border-blue-100",
  Analysed: "bg-amber-50 text-amber-700 border-amber-100",
  "Email Ready": "bg-violet-50 text-violet-700 border-violet-100",
  Sent: "bg-emerald-50 text-emerald-700 border-emerald-100",
};

function ProductPreview() {
  const [tick, setTick] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const id = setInterval(() => setTick((t) => t + 1), 1800);
    return () => clearInterval(id);
  }, [inView]);

  const getStage = (idx: number) => STAGES[Math.min((tick + idx) % (STAGES.length + 2), STAGES.length - 1)];

  return (
    <div ref={ref} className="relative">
      {/* Browser chrome */}
      <div className="bg-[#2A2A2A] rounded-t-2xl px-4 py-3 flex items-center gap-2.5">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-[#3A3A3A] rounded-md px-3 py-1 flex items-center gap-2 max-w-xs mx-auto">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 flex-shrink-0" />
            <span className="text-[#8A8A8A] text-xs font-mono truncate">app.findx.nl/pipeline</span>
          </div>
        </div>
      </div>

      {/* App window */}
      <div className="bg-[#F7F5F0] border border-[#E5E3D9] border-t-0 rounded-b-2xl overflow-hidden shadow-2xl">
        {/* Inner sidebar + main */}
        <div className="flex" style={{ minHeight: 340 }}>
          {/* Sidebar */}
          <div className="w-40 bg-white border-r border-[#E5E3D9] p-3 flex-shrink-0">
            <div className="flex items-center gap-1.5 mb-4 px-1">
              <div className="w-5 h-5 rounded bg-[#1A1A1A] flex items-center justify-center">
                <span className="text-white font-bold text-[8px] font-serif">FX</span>
              </div>
              <span className="font-serif font-bold text-xs text-[#1A1A1A]">FindX</span>
            </div>
            {[
              { label: "Dashboard", active: false },
              { label: "Pipeline", active: true },
              { label: "Agents", active: false },
              { label: "Settings", active: false },
            ].map(({ label, active }) => (
              <div key={label} className={`px-2 py-1.5 rounded-lg mb-0.5 text-xs font-medium ${active ? "bg-[#1A1A1A] text-white" : "text-[#7A756D]"}`}>
                {label}
              </div>
            ))}
            <div className="mt-4 pt-3 border-t border-[#F0EDE6]">
              <p className="text-[9px] text-[#BDBDB0] uppercase tracking-wider mb-2 px-1">Agents</p>
              {["Researcher", "Analyst", "Copywriter"].map((a) => (
                <div key={a} className="px-2 py-1.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-[10px] text-[#7A756D]">{a}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-serif font-bold text-[#1A1A1A]">Lead Pipeline</h3>
                <p className="text-[10px] text-[#7A756D]">5 leads · Updated just now</p>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] text-emerald-600 font-medium">Agents running</span>
              </div>
            </div>

            {/* Kanban columns */}
            <div className="grid grid-cols-4 gap-2 h-full">
              {STAGES.map((stage, si) => (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold text-[#7A756D] uppercase tracking-wider">{stage}</span>
                    <span className="text-[9px] bg-[#F0EDE6] text-[#7A756D] rounded-full px-1.5 py-0.5">
                      {PIPELINE_LEADS.filter((_, li) => getStage(li) === stage).length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {PIPELINE_LEADS.map((lead, li) => {
                      const leadStage = getStage(li);
                      if (leadStage !== stage) return null;
                      return (
                        <motion.div
                          key={`${lead.company}-${tick}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white border border-[#E5E3D9] rounded-lg p-2 shadow-sm"
                        >
                          <p className="text-[9px] font-semibold text-[#1A1A1A] truncate">{lead.company}</p>
                          <p className="text-[8px] text-[#7A756D] truncate">{lead.domain}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`text-[7px] font-medium border rounded px-1 py-0.5 ${STAGE_COLORS[stage]}`}>
                              {lead.industry}
                            </span>
                            <span className="text-[8px] font-bold text-emerald-600">{lead.score}</span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute -inset-6 -z-10 bg-gradient-to-b from-[#E8E4DC]/40 to-transparent rounded-3xl blur-2xl" />
    </div>
  );
}

/* ─── Feature comparison strip ───────────────────────────────── */
const FEATURES = [
  "Automated lead research 24/7",
  "AI-scored opportunity ranking",
  "Hyper-personalised email drafts",
  "Dutch B2B market focus",
  "Real-time pipeline tracking",
  "Zero manual data entry",
];

function FeatureStrip() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-20 border-t border-[#E5E3D9]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="space-y-12"
        >
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <p className="text-xs font-medium text-[#7A756D] tracking-widest uppercase">The Difference</p>
            <h2 className="font-serif text-4xl font-bold text-[#1A1A1A]">FindX vs Doing It Yourself</h2>
          </motion.div>

          <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {/* FindX */}
            <div className="bg-[#1A1A1A] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-white font-bold text-xs font-serif">FX</span>
                </div>
                <span className="font-serif font-semibold text-white">FindX</span>
              </div>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f}
                  variants={fadeUp}
                  custom={i * 0.5}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-emerald-400" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm text-[#D4CFC5]">{f}</span>
                </motion.div>
              ))}
            </div>

            {/* Manual */}
            <div className="bg-white border border-[#E5E3D9] rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 rounded-lg bg-[#F0EDE6] flex items-center justify-center">
                  <span className="text-[#7A756D] text-xs font-medium">👤</span>
                </div>
                <span className="font-serif font-semibold text-[#7A756D]">Manual prospecting</span>
              </div>
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f}
                  variants={fadeUp}
                  custom={i * 0.5}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <X className="w-3 h-3 text-red-400" strokeWidth={2.5} />
                  </div>
                  <span className="text-sm text-[#BDBDB0] line-through">{f}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Testimonials ───────────────────────────────────────────── */
const TESTIMONIALS = [
  {
    quote: "FindX completely changed how we approach outbound. Our team used to spend two full days per week on research alone — now the agents do it overnight and we wake up with a qualified pipeline.",
    name: "Sander van der Berg",
    role: "Head of Sales",
    company: "Nexplain B.V.",
    initials: "SB",
    stars: 5,
  },
  {
    quote: "The personalisation is genuinely impressive. Prospects comment on how relevant our emails are. We've gone from 4% to 18% reply rate since switching to FindX — in just six weeks.",
    name: "Lotte Vermeulen",
    role: "Growth Lead",
    company: "Datashift NL",
    initials: "LV",
    stars: 5,
  },
  {
    quote: "Onboarding took less than ten minutes. By the end of that first afternoon we had 40 scored leads and three draft emails ready to send. The ROI was immediate.",
    name: "Thomas de Wit",
    role: "Founder & CEO",
    company: "Brightloop",
    initials: "TW",
    stars: 5,
  },
];

function Testimonials() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 bg-[#FAFAF7] border-t border-[#E5E3D9]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="space-y-14"
        >
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <p className="text-xs font-medium text-[#7A756D] tracking-widest uppercase">Trusted by Dutch Teams</p>
            <h2 className="font-serif text-4xl font-bold text-[#1A1A1A]">What Our Customers Say</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                custom={i}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
                className="bg-white border border-[#E5E3D9] rounded-2xl p-7 space-y-5 flex flex-col"
              >
                <Quote className="w-6 h-6 text-[#D4CFC5]" strokeWidth={1.5} />
                <p className="text-sm text-[#4A4540] leading-relaxed flex-1 italic">"{t.quote}"</p>
                <div className="space-y-3">
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.stars }).map((_, si) => (
                      <Star key={si} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{t.initials}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#1A1A1A]">{t.name}</p>
                      <p className="text-xs text-[#7A756D]">{t.role} · {t.company}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────── */
const PRICING_FREE = [
  "50 leads per month",
  "Researcher & Analyst agents",
  "Basic email drafts",
  "Pipeline Kanban view",
  "Community support",
];

const PRICING_PRO = [
  "Unlimited leads",
  "All 3 AI agents — full power",
  "Hyper-personalised email copy",
  "Priority pipeline processing",
  "Custom search filters",
  "Tavily & API key integrations",
  "Priority email support",
];

function Pricing({ onGetStarted }: { onGetStarted: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-24 border-t border-[#E5E3D9]">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={staggerContainer}
          className="space-y-14"
        >
          <motion.div variants={fadeUp} className="text-center space-y-3">
            <p className="text-xs font-medium text-[#7A756D] tracking-widest uppercase">Simple Pricing</p>
            <h2 className="font-serif text-4xl font-bold text-[#1A1A1A]">Start Free. Scale as You Grow.</h2>
            <p className="text-[#7A756D] max-w-md mx-auto">No credit card required for your trial. Upgrade whenever your pipeline demands it.</p>
          </motion.div>

          <motion.div variants={fadeUp} className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free tier */}
            <div className="bg-white border border-[#E5E3D9] rounded-2xl p-8 space-y-7">
              <div className="space-y-1">
                <p className="text-xs font-medium text-[#7A756D] uppercase tracking-wider">Starter</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-5xl font-bold text-[#1A1A1A]">€0</span>
                  <span className="text-[#7A756D] text-sm">/ month</span>
                </div>
                <p className="text-xs text-[#7A756D]">Perfect for trying out the platform</p>
              </div>
              <ul className="space-y-3">
                {PRICING_FREE.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#4A4540]">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onGetStarted}
                className="w-full py-3 border border-[#1A1A1A] text-[#1A1A1A] font-medium rounded-xl hover:bg-[#F7F5F0] transition-colors text-sm"
              >
                Get Started Free
              </motion.button>
            </div>

            {/* Pro tier */}
            <div className="bg-[#1A1A1A] rounded-2xl p-8 space-y-7 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="text-[10px] font-semibold bg-amber-400 text-[#1A1A1A] px-2.5 py-1 rounded-full uppercase tracking-wide">Most Popular</span>
              </div>
              {/* subtle pattern */}
              <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, #fff 1px, transparent 1px)", backgroundSize: "20px 20px" }} />

              <div className="space-y-1 relative">
                <p className="text-xs font-medium text-[#7A756D] uppercase tracking-wider">Pro</p>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-5xl font-bold text-white">€49</span>
                  <span className="text-[#7A756D] text-sm">/ month</span>
                </div>
                <p className="text-xs text-[#7A756D]">For teams serious about outbound</p>
              </div>
              <ul className="space-y-3 relative">
                {PRICING_PRO.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-[#D4CFC5]">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onGetStarted}
                className="relative w-full py-3 bg-white text-[#1A1A1A] font-medium rounded-xl hover:bg-[#F7F5F0] transition-colors text-sm flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Start Pro Trial
              </motion.button>
            </div>
          </motion.div>

          <motion.p variants={fadeUp} className="text-center text-xs text-[#BDBDB0]">
            All plans include Supabase-backed secure storage · Cancel any time · No hidden fees
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

/* ─── Data constants (agents, metrics) ──────────────────────── */
const agents = [
  { icon: Search, name: "The Researcher", tagline: "Discovers qualified leads", description: "Scours the web for Dutch B2B companies that match your ideal customer profile — analysing domains, firmographics, and digital signals in real time." },
  { icon: BarChart2, name: "The Analyst", tagline: "Scores & ranks prospects", description: "Deep-dives each website to evaluate content quality, SEO performance, and buying intent — then ranks leads by opportunity score so you focus on the best." },
  { icon: Mail, name: "The Copywriter", tagline: "Drafts personalised emails", description: "Writes tailored, high-converting outreach emails based on each prospect's unique context, pain points, and digital presence — ready to send with one click." },
];

const metrics = [
  { value: "10×", label: "Faster prospecting", desc: "Find and qualify 10 times more leads in the same time." },
  { value: "↑ 3×", label: "Higher reply rates", desc: "Hyper-personalised copy outperforms generic templates every time." },
  { value: "0", label: "Manual research hours", desc: "Agents run while you sleep — wake up to a full pipeline." },
];

/* ─── Main component ─────────────────────────────────────────── */
export default function LandingPage() {
  const [, navigate] = useLocation();
  const [loadingCta, setLoadingCta] = useState(false);

  const handleGetStarted = () => {
    setLoadingCta(true);
    // Simulate tiny delay for visual feedback before redirecting
    setTimeout(() => {
      navigate("/login");
    }, 200);
  };

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1A1A1A] overflow-x-hidden">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#F7F5F0]/90 backdrop-blur-md border-b border-[#E5E3D9]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center">
              <span className="text-white font-bold text-sm font-serif">FX</span>
            </div>
            <span className="font-serif font-bold text-lg text-[#1A1A1A] tracking-tight">FindX</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleGetStarted} className="px-4 py-2 text-sm text-[#7A756D] hover:text-[#1A1A1A] transition-colors font-medium hidden sm:block">
              Log In
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetStarted}
              disabled={loadingCta}
              className="px-5 py-2 bg-[#1A1A1A] text-white text-sm font-medium rounded-xl hover:bg-[#333] transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {loadingCta && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Get Started
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center py-20 lg:py-32">
            <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-8">
              <motion.div variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#7A756D] tracking-widest uppercase border border-[#E5E3D9] rounded-full px-3.5 py-1.5 bg-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  AI Agents · Live
                </span>
              </motion.div>

              <motion.h1 variants={fadeUp} custom={1} className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1A1A1A] leading-[1.1] tracking-tight">
                Automate Your<br />Outreach with<br /><em className="not-italic text-[#4A4540]">Intelligent Agents.</em>
              </motion.h1>

              <motion.p variants={fadeUp} custom={2} className="text-base sm:text-lg text-[#7A756D] leading-relaxed max-w-md">
                FindX deploys specialised AI agents to research prospects, analyse their digital presence, and draft hyper-personalised emails — all while you sleep.
              </motion.p>

              <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 pt-2">
                <motion.button whileHover={{ scale: 1.02, backgroundColor: "#333" }} whileTap={{ scale: 0.97 }} onClick={handleGetStarted} disabled={loadingCta}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-[#1A1A1A] text-white font-medium rounded-xl transition-colors disabled:opacity-60">
                  {loadingCta ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  Start Generating Leads
                </motion.button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={scrollToHowItWorks}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 border border-[#D4CFC5] text-[#4A4540] font-medium rounded-xl hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors">
                  <ChevronDown className="w-4 h-4" />
                  How it Works
                </motion.button>
              </motion.div>

              <motion.div variants={fadeUp} custom={4} className="grid grid-cols-3 gap-4 sm:flex sm:items-center sm:gap-6 pt-4 border-t border-[#E5E3D9]">
                {[["500+", "Dutch companies found"], ["3", "Specialised AI agents"], ["< 60s", "To first lead"]].map(([val, lbl]) => (
                  <div key={val} className="space-y-0.5">
                    <p className="font-serif text-xl font-bold text-[#1A1A1A]">{val}</p>
                    <p className="text-xs text-[#7A756D]">{lbl}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="relative w-[360px] xl:w-[420px] aspect-square">
                <GeometricDecoration />
                {[
                  { label: "Researcher", top: "8%", left: "58%", delay: 0.8 },
                  { label: "Analyst", top: "42%", left: "72%", delay: 1.0 },
                  { label: "Copywriter", top: "68%", left: "52%", delay: 1.2 },
                ].map(({ label, top, left, delay }) => (
                  <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.5 }}
                    style={{ top, left }} className="absolute bg-white border border-[#E5E3D9] rounded-lg px-3 py-1.5 shadow-sm">
                    <span className="text-xs font-medium text-[#1A1A1A]">{label}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>

        <motion.button onClick={scrollToHowItWorks} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-[#BDBDB0] hover:text-[#7A756D] transition-colors">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <motion.div animate={{ y: [0, 5, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        </motion.button>
      </section>

      {/* ── Animated Product Preview ── */}
      <section className="py-20 border-t border-[#E5E3D9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={staggerContainer}
            className="space-y-12"
          >
            <motion.div variants={fadeUp} className="text-center space-y-3">
              <p className="text-xs font-medium text-[#7A756D] tracking-widest uppercase">See It in Action</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">Your Pipeline, Always Moving</h2>
              <p className="text-[#7A756D] max-w-md mx-auto leading-relaxed">
                Watch leads flow through the pipeline automatically — researched, scored, and email-ready without you lifting a finger.
              </p>
            </motion.div>
            <motion.div variants={fadeUp}>
              <ProductPreview />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Feature comparison strip ── */}
      <FeatureStrip />

      {/* ── How it Works ── */}
      <section id="how-it-works" className="py-28 border-t border-[#E5E3D9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="space-y-16">
            <motion.div variants={fadeUp} className="text-center space-y-4">
              <p className="text-xs font-medium text-[#7A756D] tracking-widest uppercase">The System</p>
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">Three Agents, One Pipeline</h2>
              <p className="text-[#7A756D] max-w-lg mx-auto leading-relaxed">
                Each specialised agent handles a distinct stage — working in sequence to take a raw search query all the way to a ready-to-send email.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6">
              {agents.map((agent, i) => (
                <motion.div key={agent.name} variants={fadeUp} custom={i} whileHover={{ y: -4, transition: { duration: 0.25 } }}
                  className="bg-white border border-[#E5E3D9] rounded-2xl p-8 space-y-5 group">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-xl bg-[#F0EDE6] flex items-center justify-center group-hover:bg-[#E8E4DC] transition-colors">
                      <agent.icon className="w-5 h-5 text-[#4A4540]" strokeWidth={1.5} />
                    </div>
                    <span className="text-xs font-mono text-[#BDBDB0] pt-1">0{i + 1}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-xl font-bold text-[#1A1A1A]">{agent.name}</h3>
                    <p className="text-sm font-medium text-[#7A756D]">{agent.tagline}</p>
                  </div>
                  <p className="text-sm text-[#7A756D] leading-relaxed">{agent.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <Testimonials />

      {/* ── Metrics / dark section ── */}
      <section className="py-28 bg-[#1A1A1A] text-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="space-y-16">
            <motion.div variants={fadeUp} className="text-center space-y-4">
              <p className="text-xs font-medium text-[#7A756D] tracking-widest uppercase">Why FindX</p>
              <h2 className="font-serif text-4xl font-bold text-white">Results That Speak for Themselves</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-px bg-[#333]">
              {metrics.map((m, i) => (
                <motion.div key={m.value} variants={fadeUp} custom={i} className="bg-[#1A1A1A] p-10 space-y-4 hover:bg-[#222] transition-colors">
                  <p className="font-serif text-6xl font-bold text-white leading-none">{m.value}</p>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">{m.label}</p>
                    <p className="text-sm text-[#7A756D] leading-relaxed">{m.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <Pricing onGetStarted={handleGetStarted} />

      {/* ── Final CTA ── */}
      <section className="py-28 border-t border-[#E5E3D9]">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={staggerContainer} className="text-center space-y-8">
            <motion.div variants={fadeUp} className="space-y-4">
              <h2 className="font-serif text-5xl font-bold text-[#1A1A1A] leading-tight">Your pipeline won't<br />fill itself.</h2>
              <p className="text-[#7A756D] text-lg max-w-md mx-auto leading-relaxed">
                Let FindX's agents do the prospecting while you focus on closing deals.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="flex justify-center">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleGetStarted} disabled={loadingCta}
                className="inline-flex items-center gap-2 px-10 py-4 bg-[#1A1A1A] text-white font-medium rounded-xl hover:bg-[#333] transition-colors text-base disabled:opacity-60">
                {loadingCta ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Start Generating Leads — Free
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E5E3D9] py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#1A1A1A] flex items-center justify-center">
              <span className="text-white font-bold text-xs font-serif">FX</span>
            </div>
            <span className="font-serif font-bold text-sm text-[#1A1A1A]">FindX</span>
            <span className="text-[#BDBDB0] text-xs ml-1">· B2B Prospecting for the Netherlands</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-[#BDBDB0]">
            <button onClick={scrollToHowItWorks} className="hover:text-[#7A756D] transition-colors">How it Works</button>
            <button onClick={handleGetStarted} className="hover:text-[#7A756D] transition-colors">Log In</button>
            <span>© {new Date().getFullYear()} FindX</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
