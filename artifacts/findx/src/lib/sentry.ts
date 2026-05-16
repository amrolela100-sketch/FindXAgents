/**
 * lib/sentry.ts  (frontend)
 *
 * Sentry initialisation for the React app.
 *
 * No-op when VITE_SENTRY_DSN is not set (dev / local).
 * Import this and call initSentry() as early as possible in main.tsx.
 */

import * as Sentry from "@sentry/react";

let _initialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE ?? "development",
    release: import.meta.env.VITE_APP_VERSION ?? undefined,
    // Capture 10% of page loads for performance in production
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    // Don't send PII
    sendDefaultPii: false,
    // Ignore benign browser noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Non-Error promise rejection captured",
      "Load failed",
      "NetworkError",
      "AbortError",
    ],
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });

  _initialized = true;
}

/**
 * Manually capture an exception (use in catch blocks / error boundaries).
 * No-op when Sentry is not initialised.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!_initialized) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}

/**
 * Sentry-wrapped React ErrorBoundary.
 * Use to wrap the entire app or specific subtrees.
 *
 * Usage:
 *   <SentryErrorBoundary fallback={<ErrorFallback />}>
 *     <App />
 *   </SentryErrorBoundary>
 */
export const SentryErrorBoundary = _initialized
  ? Sentry.ErrorBoundary
  : ({ children }: { children: React.ReactNode; fallback?: React.ReactNode }) =>
      children as React.ReactElement;
