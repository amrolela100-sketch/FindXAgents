import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import { supabase } from "../lib/supabase";
import {
  Zap, Sun, Moon, Globe, ArrowLeft, ArrowRight,
  Shield, Search, BarChart3, Mail, CheckCircle2,
} from "lucide-react";
import { MagneticButton } from "../components/magnetic-button";

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
          background: "var(--findx-bg-inset)",
          borderRight: isRtl ? "none" : "1px solid var(--findx-border-default)",
          borderLeft: isRtl ? "1px solid var(--findx-border-default)" : "none",
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="relative flex items-center gap-2.5"
        >
          <div
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center border border-border"
          >
            <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-base tracking-tight text-text">
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
              className="text-3xl lg:text-4xl font-bold tracking-tighter leading-tight mb-4 text-balance break-words text-text"
            >
              AI-powered B2B<br />
              <span className="text-primary">prospecting</span><br />
              that actually works.
            </h2>
            <p
              className="text-sm leading-relaxed max-w-full text-text-muted"
              style={{ lineHeight: 1.8 }}
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
                className="flex items-center gap-4 p-4 rounded-xl border border-border bg-glass"
              >
                {/* Step number */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold font-mono"
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
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{
                    background: `${color}12`,
                  }}
                >
                  <Icon className="w-4 h-4" strokeWidth={1.5} style={{ color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold tracking-tight truncate text-text">
                    {label}
                  </p>
                  <p className="text-xs mt-0.5 leading-relaxed text-text-muted">
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
              className="text-center p-3 rounded-xl border border-border bg-glass"
            >
              <div
                className="text-xl font-bold tracking-tighter font-mono text-text"
              >
                {value}
              </div>
              <div className="text-[10px] mt-0.5 text-text-subtle">
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
          className="flex items-center justify-between px-6 py-4 topbar-glass border-b border-border"
        >
          {/* Mobile logo */}
          <Link href="/">
            <a className="md:hidden flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center border border-border">
                <Zap className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm text-text">FindX</span>
            </a>
          </Link>
          <div className="hidden md:block" />

          <div className="flex items-center gap-1">
            <button onClick={toggleLang} className="btn btn-ghost text-xs gap-1.5 px-2.5 rounded-full">
              <Globe className="w-3.5 h-3.5" strokeWidth={1.5} />
              {lang.toUpperCase()}
            </button>
            <button onClick={toggleTheme} className="btn btn-ghost px-2 rounded-full">
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
            <motion.div variants={itemVariants} className="flex md:hidden mb-8 justify-center">
              <div
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center border border-border shadow-sm"
              >
                <Zap className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
              </div>
            </motion.div>

            {/* Heading */}
            <motion.div variants={itemVariants} className="mb-8 text-center md:text-start">
              <h1
                className="text-2xl md:text-3xl font-bold tracking-tight mb-2 text-text"
              >
                {t.auth.welcome}
              </h1>
              <p
                className="text-sm leading-relaxed text-text-muted"
                style={{ lineHeight: 1.75 }}
              >
                {t.auth.tagline}
              </p>
            </motion.div>

            {/* Google Sign-in */}
            <motion.div variants={itemVariants}>
              <MagneticButton
                as="button"
                className="w-full flex items-center justify-center gap-3 py-3 px-5 rounded-full font-medium text-sm transition-all duration-300 border border-border bg-interactive-hover hover:bg-interactive-active text-text shadow-sm disabled:opacity-50"
                onClick={handleGoogleSignIn}
                disabled={loading}
                strength={0.10}
              >
                {loading ? (
                  <div
                    className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin"
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
                className="mt-4 px-4 py-3 rounded-xl text-xs border border-danger-border bg-danger-bg text-danger"
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
                  className="flex items-center gap-2 text-xs text-text-subtle"
                >
                  <CheckCircle2
                    className="w-3.5 h-3.5 flex-shrink-0 text-success"
                    strokeWidth={1.5}
                  />
                  {item}
                </div>
              ))}
            </motion.div>

            {/* Privacy */}
            <motion.p
              variants={itemVariants}
              className="mt-6 text-xs text-center leading-relaxed flex items-center justify-center gap-1 flex-wrap text-text-subtle"
            >
              <Shield className="w-3 h-3 flex-shrink-0 text-primary" strokeWidth={1.5} />
              {t.auth.privacyNote}{" "}
              <Link href="/terms">
                <a className="underline underline-offset-2 hover:opacity-80 transition-opacity text-primary">
                  {t.auth.privacyTerms}
                </a>
              </Link>
              {" "}{t.auth.privacyAnd}{" "}
              <Link href="/privacy">
                <a className="underline underline-offset-2 hover:opacity-80 transition-opacity text-primary">
                  {t.auth.privacyPolicy}
                </a>
              </Link>.
            </motion.p>

            {/* Back */}
            <motion.div variants={itemVariants} className="mt-8 text-center">
              <Link href="/">
                <a
                  className="inline-flex items-center gap-2 text-xs transition-colors hover:opacity-80 text-text-muted"
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
