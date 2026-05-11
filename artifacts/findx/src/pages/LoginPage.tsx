import { useState } from "react";
import { Link } from "wouter";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import { supabase } from "../lib/supabase";
import { Zap, Sun, Moon, Globe, ArrowLeft, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message ?? "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/">
          <a className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text)" }}>FindX</span>
          </a>
        </Link>
        <div className="flex items-center gap-1">
          <button onClick={toggleLang} className="btn btn-ghost text-xs gap-1.5 px-2.5">
            <Globe className="w-3.5 h-3.5" />
            {lang.toUpperCase()}
          </button>
          <button onClick={toggleTheme} className="btn btn-ghost px-2">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Card */}
          <div
            className="rounded-2xl p-8 animate-slide-up"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
            }}
          >
            {/* Logo */}
            <div className={`flex ${isRtl ? "justify-end" : "justify-start"} mb-6`}>
              <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center shadow-md">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
            </div>

            <h1
              className="text-xl font-bold mb-1.5"
              style={{ color: "var(--text)" }}
            >
              {t.auth.welcome}
            </h1>
            <p
              className="text-sm mb-8 leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              {t.auth.tagline}
            </p>

            {/* Google button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-medium text-sm transition-all disabled:opacity-60"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
                color: "var(--text)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--bg-subtle)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)";
              }}
            >
              {loading ? (
                <div
                  className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
                />
              ) : (
                /* Google SVG logo */
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                  <path d="M47.532 24.552c0-1.636-.148-3.22-.422-4.736H24.48v9.008h12.985c-.56 2.984-2.256 5.512-4.8 7.208v5.984h7.768c4.544-4.184 7.1-10.344 7.1-17.464z" fill="#4285F4"/>
                  <path d="M24.48 48c6.52 0 11.992-2.152 15.988-5.84l-7.768-5.984c-2.152 1.44-4.904 2.296-8.22 2.296-6.312 0-11.664-4.26-13.576-9.984H2.88v6.184C6.86 42.84 15.12 48 24.48 48z" fill="#34A853"/>
                  <path d="M10.904 28.488a14.413 14.413 0 0 1-.752-4.488c0-1.56.272-3.072.752-4.488v-6.184H2.88A23.96 23.96 0 0 0 .48 24c0 3.888.936 7.56 2.4 10.672l8.024-6.184z" fill="#FBBC05"/>
                  <path d="M24.48 9.528c3.56 0 6.748 1.224 9.264 3.624l6.936-6.936C36.464 2.376 30.992 0 24.48 0 15.12 0 6.86 5.16 2.88 12.672l8.024 6.184c1.912-5.724 7.264-9.328 13.576-9.328z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? t.auth.signingIn : t.auth.signInGoogle}
            </button>

            {/* Error */}
            {error && (
              <div
                className="mt-4 px-4 py-3 rounded-xl text-xs"
                style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)" }}
              >
                {error}
              </div>
            )}

            {/* Privacy */}
            <p
              className="mt-6 text-xs text-center leading-relaxed"
              style={{ color: "var(--text-subtle)" }}
            >
              {t.auth.privacyNote}
            </p>
          </div>

          {/* Back link */}
          <Link href="/">
            <a
              className="flex items-center justify-center gap-2 mt-6 text-xs transition-colors"
              style={{ color: "var(--text-muted)" }}
            >
              <BackArrow className="w-3.5 h-3.5" />
              {t.auth.backToHome}
            </a>
          </Link>
        </div>
      </main>
    </div>
  );
}
