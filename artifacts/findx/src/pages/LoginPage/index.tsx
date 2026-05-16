import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "@/lib/lang-context";
import { useTheme } from "@/lib/theme-context";
import { supabase } from "@/lib/supabase";
import {
  Zap, Sun, Moon, Globe, ArrowLeft, ArrowRight,
  Shield, Search, BarChart3, Mail, CheckCircle2,
} from "lucide-react";
import { MagneticButton } from "@/components/magnetic-button";

/* ─── Spring config ─── */
const SPRING = { type: "spring" as const, stiffness: 100, damping: 20 };
const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

/* ─── Animated pipeline steps (left panel) ─── */
const PIPELINE_STEPS = [
  {
    icon: Search,
    label: "Discover",
    desc: "Finds real businesses via web search",
    color: "#60A5FA",
    delay: 0,
  },
  {
    icon: BarChart3,
    label: "Analyze",
    desc: "Visits websites, scores digital gaps",
    color: "#FBBF24",
    delay: 0.12,
  },
  {
    icon: Mail,
    label: "Outreach",
    desc: "Writes hyper-personalized cold emails",
    color: "#34D399",
    delay: 0.24,
  },
];

/* ─── Social proof row ─── */
const PROOF_ITEMS = [
  { value: "247K+", label: "Leads found" },
  { value: "94%",   label: "Accuracy" },
  { value: "18h",   label: "Saved/week" },
];

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M47.532 24.552c0-1.636-.148-3.22-.422-4.736H24.48v9.008h12.985c-.56 2.984-2.256 5.512-4.8 7.208v5.984h7.768c4.544-4.184 7.1-10.344 7.1-17.464z" fill="#4285F4"/>
      <path d="M24.48 48c6.52 0 11.992-2.152 15.988-5.84l-7.768-5.984c-2.152 1.44-4.904 2.296-8.22 2.296-6.312 0-11.664-4.26-13.576-9.984H2.88v6.184C6.86 42.84 15.12 48 24.48 48z" fill="#34A853"/>
      <path d="M10.904 28.488a14.413 14.413 0 0 1-.752-4.488c0-1.56.272-3.072.752-4.488v-6.184H2.88A23.96 23.96 0 0 0 .48 24c0 3.888.936 7.56 2.4 10.672l8.024-6.184z" fill="#FBBC05"/>
      <path d="M24.48 9.528c3.56 0 6.748 1.224 9.264 3.624l6.936-6.936C36.464 2.376 30.992 0 24.48 0 15.12 0 6.86 5.16 2.88 12.672l8.024 6.184c1.912-5.724 7.264-9.328 13.576-9.328z" fill="#EA4335"/>
    </svg>
  );
}

/* ════════════════════════════════════════
   LOGIN PAGE
════════════════════════════════════════ */
export default function LoginPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message ?? "Connection failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-[100dvh] grid grid-cols-1 md:grid-cols-2"
    >

      {/* ══ LEFT PANEL — Brand showcase ══ */}
      <div
        className="hidden md:flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden"
        style={{
          background: "var(--bg-inset)",
          borderRight: isRtl ? "none" : "1px solid var(--glass-border)",
          borderLeft: isRtl ? "1px solid var(--glass-border)" : "none",
        }}
      >
        {/* Mesh glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `
              radial-gradient(ellipse 70% 50% at 20% 10%, rgba(109,40,217,0.18) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 80% 80%, rgba(245,158,11,0.14) 0%, transparent 55%)
            `,
          }}
        />

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="relative flex items-center gap-2.5"
        >
          <div
            className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center"
            style={{ boxShadow: "0 4px 12px var(--brand-glow)" }}
          >
            <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight" style={{ color: "var(--text)" }}>
            FindX
          </span>
        </motion.div>

        {/* Center content */}
        <motion.div
          className="relative space-y-10"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          <motion.div variants={itemVariants}>
            <h2
              className="text-3xl lg:text-4xl font-bold tracking-tighter leading-tight mb-4 text-balance break-words"
              style={{ color: "var(--text)" }}
            >
              AI-powered B2B<br />
              <span className="gradient-brand-text">prospecting</span><br />
              that actually works.
            </h2>
            <p
              className="text-sm leading-relaxed max-w-full"
              style={{ color: "var(--text-muted)", lineHeight: 1.8 }}
            >
              Find real businesses, visit their websites, score their gaps,
              and write personalized cold emails — automatically.
            </p>
          </motion.div>

          {/* Pipeline steps */}
          <motion.div variants={itemVariants} className="space-y-3">
            {PIPELINE_STEPS.map(({ icon: Icon, label, desc, color, delay }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, delay: 0.4 + delay }}
                className="flex items-center gap-4 p-4 rounded-2xl"
                style={{
                  background: "var(--glass)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid var(--glass-border)",
                  boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10)`,
                }}
              >
                {/* Step number */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono"
                  style={{
                    background: `${color}18`,
                    border: `1px solid ${color}30`,
                    color,
                  }}
                >
                  {i + 1}
                </div>

                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${color}12`,
                    boxShadow: `0 0 12px ${color}20`,
                  }}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold tracking-tight truncate" style={{ color: "var(--text)" }}>
                    {label}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {desc}
                  </p>
                </div>

                {/* Live pulse */}
                <motion.div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color }}
                  animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Bottom stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SPRING, delay: 0.8 }}
          className="relative grid grid-cols-3 gap-4"
        >
          {PROOF_ITEMS.map(({ value, label }) => (
            <div
              key={label}
              className="text-center p-3 rounded-xl"
              style={{
                background: "var(--glass)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <div
                className="text-xl font-bold tracking-tighter font-mono gradient-brand-text"
              >
                {value}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-subtle)" }}>
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ══ RIGHT PANEL — Login form ══ */}
      <div className="flex flex-col min-h-[100dvh]">

        {/* Top bar */}
        <header
          className="flex items-center justify-between px-6 py-4 topbar-glass"
          style={{ borderBottom: "1px solid var(--glass-border)" }}
        >
          {/* Mobile logo */}
          <Link href="/">
            <a className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm" style={{ color: "var(--text)" }}>FindX</span>
            </a>
          </Link>
          <div className="hidden md:block" />

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
          </div>
        </header>

        {/* Form area */}
        <main className="flex-1 flex items-center justify-center px-6 py-10 overflow-y-auto">
          <motion.div
            className="w-full max-w-sm"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            {/* Mobile-only logo */}
            <motion.div variants={itemVariants} className="flex md:hidden mb-8">
              <div
                className="w-12 h-12 rounded-2xl gradient-brand flex items-center justify-center"
                style={{ boxShadow: "0 4px 16px var(--brand-glow)" }}
              >
                <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.div variants={itemVariants} className="mb-8">
              <h1
                className="text-2xl md:text-3xl font-bold tracking-tight mb-2"
                style={{ color: "var(--text)" }}
              >
                {t.auth.welcome}
              </h1>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "var(--text-muted)", lineHeight: 1.75 }}
              >
                {t.auth.tagline}
              </p>
            </motion.div>

            {/* Google Sign-in */}
            <motion.div variants={itemVariants}>
              <MagneticButton
                as="button"
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl font-medium text-sm transition-all disabled:opacity-50"
                style={{
                  background: "var(--glass-raised)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid var(--glass-border-strong)",
                  color: "var(--text)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
                onClick={handleGoogleSignIn}
                disabled={loading}
                strength={0.15}
              >
                {loading ? (
                  <div
                    className="w-4 h-4 rounded-full border-2 animate-spin"
                    style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
                  />
                ) : (
                  <GoogleLogo />
                )}
                <span>{loading ? t.auth.signingIn : t.auth.signInGoogle}</span>
              </MagneticButton>
            </motion.div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
                className="mt-4 px-4 py-3 rounded-xl text-xs"
                style={{
                  background: "var(--color-danger-bg)",
                  border: "1px solid var(--color-danger-border)",
                  color: "var(--color-danger)",
                }}
              >
                {error}
              </motion.div>
            )}

            {/* Trust indicators */}
            <motion.div
              variants={itemVariants}
              className="mt-8 space-y-2"
            >
              {[
                "No credit card required",
                "Secure Google OAuth — we never store passwords",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: "var(--text-subtle)" }}
                >
                  <CheckCircle2
                    className="w-3.5 h-3.5 flex-shrink-0"
                    strokeWidth={1.5}
                    style={{ color: "var(--color-success)" }}
                  />
                  {item}
                </div>
              ))}
            </motion.div>

            {/* Privacy */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-xs text-center leading-relaxed flex items-center justify-center gap-1 flex-wrap"
              style={{ color: "var(--text-subtle)" }}
            >
              <Shield className="w-3 h-3 flex-shrink-0" strokeWidth={1.5} style={{ color: "var(--brand)" }} />
              {t.auth.privacyNote}{" "}
              <Link href="/terms">
                <a className="underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: "var(--brand)" }}>
                  {t.auth.privacyTerms}
                </a>
              </Link>
              {" "}{t.auth.privacyAnd}{" "}
              <Link href="/privacy">
                <a className="underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: "var(--brand)" }}>
                  {t.auth.privacyPolicy}
                </a>
              </Link>.
            </motion.p>

            {/* Back */}
            <motion.div variants={itemVariants} className="mt-8 text-center">
              <Link href="/">
                <a
                  className="inline-flex items-center gap-2 text-xs transition-colors hover:opacity-80"
                  style={{ color: "var(--text-muted)" }}
                >
                  <BackArrow className="w-3.5 h-3.5" strokeWidth={1.5} />
                  {t.auth.backToHome}
                </a>
              </Link>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
