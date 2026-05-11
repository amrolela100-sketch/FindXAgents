import { useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "../lib/supabase";
import { useTheme } from "../lib/theme-context";
import { useLang } from "../lib/lang-context";
import { Loader2 } from "lucide-react";

export default function LandingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const [, navigate] = useLocation();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col antialiased font-body-lg ${isDark ? "dark bg-background text-on-surface" : "bg-base-cream text-text-ink"}`}>

      {/* ── Header ── */}
      <header className={`w-full px-margin-page py-6 flex justify-between items-center ${isDark ? "bg-background" : "bg-base-cream"}`}>
        <div className="font-headline-md text-headline-md tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-primary" style={{ fontSize: "32px" }}>storm</span>
          FindX
        </div>
        <div className="flex items-center gap-6">
          {/* Language Toggle */}
          <button
            onClick={toggleLang}
            className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors duration-300"
          >
            {lang === "en" ? "EN / AR" : "AR / EN"}
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="text-on-surface-variant hover:text-primary transition-colors duration-300 flex items-center justify-center"
            aria-label="Toggle theme"
          >
            <span className="material-symbols-outlined">
              {isDark ? "light_mode" : "dark_mode"}
            </span>
          </button>

          <button
            onClick={() => navigate("/login")}
            className="font-label-caps text-label-caps text-on-surface hover:text-primary transition-colors duration-300"
          >
            {lang === "ar" ? "تسجيل الدخول" : "Sign In"}
          </button>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded hover:opacity-90 transition-all duration-300 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === "ar" ? "ابدأ الآن" : "Get Started")}
          </button>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-margin-page">

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-900/30 border border-red-500/30 text-red-400 rounded-lg text-sm w-full max-w-md">
            {error}
          </div>
        )}

        {/* ── Hero ── */}
        <section className="w-full py-24 flex flex-col items-center text-center space-y-stack-md">
          <div className="max-w-4xl space-y-6">
            <span className="font-label-caps text-label-caps text-primary uppercase tracking-widest block">
              {lang === "ar" ? "نشرة الطموح" : "The Prospectus of Ambition"}
            </span>
            <h1 className="font-display-lg text-display-lg">
              {lang === "ar" ? "ذكاء دافئ لخط أنابيب مُصمَّم بعناية." : "Warm Intelligence for the Crafted Pipeline."}
            </h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
              {lang === "ar"
                ? "FindX يسد الفجوة بين البيانات الجافة والتواصل الإنساني."
                : "FindX bridges the gap between clinical data and human connection. Elevate your prospecting with synthesized insights that feel authored, not assembled."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="px-8 py-4 bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded shadow-ambient hover:opacity-90 transition-all duration-300 w-full sm:w-auto disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {lang === "ar" ? "ابدأ الآن" : "Get Started Now"}
            </button>
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="px-8 py-4 bg-surface-container border border-outline text-on-surface font-label-caps text-label-caps rounded hover:bg-surface-container-high transition-colors duration-300 flex items-center justify-center gap-3 w-full sm:w-auto"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {lang === "ar" ? "الدخول بـ Google" : "Sign in with Google"}
            </button>
          </div>
        </section>

        {/* ── Social Proof ── */}
        <section className="w-full py-12 border-t border-outline-variant flex flex-col items-center space-y-8">
          <span className="font-label-caps text-label-caps text-on-surface-variant">
            {lang === "ar" ? "موثوق به من قِبَل الشركات الرائدة" : "Trusted by Leading Firms"}
          </span>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 grayscale">
            {["Vanguard", "Apex Capital", "Meridian"].map((name) => (
              <div key={name} className="font-headline-md text-headline-md flex items-center gap-2">
                <span className="material-symbols-outlined">account_balance</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Value Props ── */}
        <section className="w-full py-24 grid grid-cols-1 md:grid-cols-3 gap-gutter-grid">
          {[
            { icon: "auto_awesome", title: lang === "ar" ? "ذكاء مُركَّب" : "Synthesized Intelligence", desc: lang === "ar" ? "البيانات لا تُغلق صفقات — الفهم يفعل ذلك." : "Data doesn't close deals; understanding does. Our AI weaves data into coherent narratives." },
            { icon: "hub", title: lang === "ar" ? "متجهات العلاقات" : "Relationship Vectors", desc: lang === "ar" ? "اكشف المسارات الخفية لتحويل التواصل البارد إلى محادثات دافئة." : "Map unseen connections. Discover warm introduction paths through your network." },
            { icon: "insights", title: lang === "ar" ? "خطوط أنابيب دقيقة" : "Precision Pipelines", desc: lang === "ar" ? "تجربة CRM راقية تحافظ على تركيزك على أعلى العملاء قيمة." : "A refined CRM experience that keeps your highest-value targets always in focus." },
          ].map(({ icon, title, desc }) => (
            <div key={icon} className="bg-surface-container rounded-lg p-8 ambient-shadow ambient-shadow-hover transition-all duration-500 flex flex-col border border-outline-variant">
              <div className="h-12 w-12 rounded-full bg-surface-container-high flex items-center justify-center mb-6 text-primary">
                <span className="material-symbols-outlined">{icon}</span>
              </div>
              <h3 className="font-headline-sm text-headline-sm mb-4">{title}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant flex-grow">{desc}</p>
            </div>
          ))}
        </section>

        {/* ── Final CTA ── */}
        <section className="w-full py-32 flex flex-col items-center text-center space-y-8 bg-surface-container rounded-xl ambient-shadow mb-24 border border-outline-variant px-4">
          <h2 className="font-display-lg text-display-lg max-w-2xl">
            {lang === "ar" ? "هل أنت مستعد لتحسين نهجك؟" : "Ready to Refine Your Approach?"}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            {lang === "ar" ? "انضم إلى المحترفين الذين يتعاملون مع التنقيب كفن." : "Join the professionals who treat prospecting as an art form."}
          </p>
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="px-8 py-4 bg-primary-container text-on-primary-container font-label-caps text-label-caps rounded hover:opacity-90 transition-all duration-300 flex items-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {lang === "ar" ? "ابدأ مجاناً" : "Get Started — Free"}
          </button>
          <span className="font-body-md text-body-md text-on-surface-variant">
            {lang === "ar" ? "لا بطاقة ائتمانية. وصول فوري." : "No credit card required. Instant access."}
          </span>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="w-full py-8 border-t border-outline-variant flex justify-center">
        <div className="font-label-caps text-label-caps text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>storm</span>
          FindX © 2025. Warm Intelligence.
        </div>
      </footer>
    </div>
  );
}
