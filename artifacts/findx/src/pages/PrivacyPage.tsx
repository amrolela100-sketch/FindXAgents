import { Link } from "wouter";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import { Zap, Sun, Moon, Globe, ArrowLeft, ArrowRight, Lock } from "lucide-react";

export default function PrivacyPage() {
  const { t, lang, toggleLang, isRtl } = useLang();
  const { isDark, toggleTheme } = useTheme();
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;

  const sections = [
    { title: t.legal.section.collection, body: t.legal.section.collectionText },
    { title: t.legal.section.usage,      body: t.legal.section.usageText },
    { title: t.legal.section.security,   body: t.legal.section.securityText },
    { title: t.legal.section.rights,     body: t.legal.section.rightsText },
    { title: t.legal.section.cookies,    body: t.legal.section.cookiesText },
    { title: t.legal.section.contact,    body: t.legal.section.contactText },
  ];

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--bg)" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-6 py-4 sticky top-0 z-40 glass"
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

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        {/* Icon + Title */}
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--brand-subtle)" }}
          >
            <Lock className="w-5 h-5" style={{ color: "var(--brand)" }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            {t.legal.privacyTitle}
          </h1>
        </div>

        <p className="text-xs mb-8" style={{ color: "var(--text-subtle)" }}>
          {t.legal.privacyLastUpdated}
        </p>

        <p
          className="text-sm mb-8 leading-relaxed p-4 rounded-xl"
          style={{
            color: "var(--text-muted)",
            background: "var(--surface)",
            border: "1px solid var(--border)",
          }}
        >
          {t.legal.privacyIntro}
        </p>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((s, i) => (
            <div
              key={i}
              className="rounded-xl p-5"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <h2
                className="text-sm font-semibold mb-2 flex items-center gap-2"
                style={{ color: "var(--text)" }}
              >
                <span
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold shrink-0"
                  style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}
                >
                  {i + 1}
                </span>
                {s.title}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                {s.body}
              </p>
            </div>
          ))}
        </div>

        {/* Back link */}
        <Link href="/login">
          <a
            className="flex items-center gap-2 mt-10 text-xs transition-colors w-fit"
            style={{ color: "var(--text-muted)" }}
          >
            <BackArrow className="w-3.5 h-3.5" />
            {t.legal.backToLogin}
          </a>
        </Link>
      </main>
    </div>
  );
}
