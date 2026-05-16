// Auto-generated from Stitch: findx---welcome-to-warm-intelligence.html
// Refactored: replaced dangerouslySetInnerHTML with safe JSX to prevent XSS

export default function OnboardingPage({ onComplete }: { onComplete?: () => void }) {
  return (
    <div className="bg-base-cream text-text-ink font-body-lg min-h-screen flex flex-col antialiased">
      {/* Global icon font */}
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .material-symbols-outlined.fill {
          font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .shadow-ambient {
          box-shadow: 0 10px 40px rgba(139, 111, 58, 0.05);
        }
        .shadow-ambient-hover:hover {
          box-shadow: 0 15px 50px rgba(139, 111, 58, 0.08);
          transform: translateY(-2px);
        }
      `}</style>

      {/* ── Header ── */}
      <header className="w-full px-margin-page py-6 flex justify-between items-center bg-base-cream" role="banner">
        <div className="font-headline-lg text-headline-lg text-text-ink tracking-tight flex items-center gap-2" role="img" aria-label="FindX logo">
          <span className="material-symbols-outlined text-accent-gold" style={{ fontSize: 32 }} aria-hidden="true">
            storm
          </span>
          FindX
        </div>
        <nav aria-label="Header navigation">
          <a
            className="font-label-caps text-label-caps text-text-ink hover:text-accent-gold transition-colors duration-300 me-6"
            href="#"
            aria-label="Sign in to FindX"
          >
            Sign In
          </a>
          <a
            className="inline-flex items-center justify-center px-6 py-3 bg-accent-gold text-surface-white font-label-caps text-label-caps rounded hover:bg-surface-tint transition-colors duration-300"
            href="#"
            aria-label="Get started with FindX"
          >
            Get Started
          </a>
        </nav>
      </header>

      <main className="flex-grow flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-margin-page">
        {/* ── Hero ── */}
        <section className="w-full py-24 flex flex-col items-center text-center space-y-stack-md relative" aria-labelledby="hero-heading">
          <div className="max-w-4xl space-y-6">
            <span className="font-label-caps text-label-caps text-accent-gold uppercase tracking-widest block">
              The Prospectus of Ambition
            </span>
            <h1 id="hero-heading" className="font-display-lg text-display-lg text-text-ink">
              Warm Intelligence for the Crafted Pipeline.
            </h1>
            <p className="font-body-lg text-body-lg text-text-muted max-w-2xl mx-auto">
              FindX bridges the gap between clinical data and human connection. Elevate your
              prospecting with synthesized insights that feel authored, not assembled.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8">
            <button
              className="px-8 py-4 bg-accent-gold text-surface-white font-label-caps text-label-caps rounded shadow-ambient hover:bg-surface-tint transition-all duration-300 shadow-ambient-hover w-full sm:w-auto"
              onClick={onComplete}
              aria-label="Get started with FindX now"
            >
              Get Started Now
            </button>
            <button className="px-8 py-4 bg-surface-white border border-outline-variant text-text-ink font-label-caps text-label-caps rounded hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center gap-3 w-full sm:w-auto" aria-label="Sign in with Google">
              <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign in with Google
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
