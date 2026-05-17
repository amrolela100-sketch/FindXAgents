/**
 * CookieConsent — GDPR cookie consent banner
 * Shows once, persists choice to localStorage.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, ExternalLink } from "lucide-react";

const STORAGE_KEY = "findx_cookie_consent";

type ConsentChoice = "accepted" | "declined" | null;

export function CookieConsent() {
  const [choice, setChoice] = useState<ConsentChoice | "loading">("loading");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ConsentChoice;
    setChoice(stored ?? null);
  }, []);

  function accept() {
    localStorage.setItem(STORAGE_KEY, "accepted");
    setChoice("accepted");
  }

  function decline() {
    localStorage.setItem(STORAGE_KEY, "declined");
    setChoice("declined");
  }

  // Only show banner if user hasn't chosen yet
  const visible = choice === null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 1.5 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-[100]"
        >
          <div
            className="rounded-2xl p-5 shadow-xl"
            style={{
              background: "var(--surface-raised)",
              border: "1px solid var(--glass-border)",
              backdropFilter: "blur(20px)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(217,119,6,0.12)", border: "1px solid rgba(217,119,6,0.2)" }}
                >
                  <Cookie className="w-4 h-4" style={{ color: "var(--color-primary)" }} strokeWidth={1.8} />
                </div>
                <p className="text-[13px] font-bold" style={{ color: "var(--text)" }}>
                  We use cookies
                </p>
              </div>
              <button
                onClick={decline}
                className="p-1 rounded-lg hover:bg-glass transition-colors"
                style={{ color: "var(--text-muted)" }}
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <p className="text-[12px] mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              FindX uses essential cookies for authentication and session management.
              We also use analytics cookies to improve your experience.{" "}
              <a
                href="/privacy"
                className="underline"
                style={{ color: "var(--color-primary)" }}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy <ExternalLink className="inline w-3 h-3" />
              </a>
            </p>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={accept}
                className="btn flex-1 text-[12px] py-2 font-semibold"
                style={{ background: "var(--color-primary)", color: "#fff" }}
              >
                Accept All
              </button>
              <button
                onClick={decline}
                className="btn btn-ghost flex-1 text-[12px] py-2 font-semibold"
                style={{ border: "1px solid var(--glass-border)" }}
              >
                Essential Only
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
