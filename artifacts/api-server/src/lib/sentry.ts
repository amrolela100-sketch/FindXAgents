/**
 * lib/sentry.ts
 *
 * Sentry initialisation for the API server.
 *
 * Usage:
 *   - Import this file FIRST in src/index.ts (before any other imports)
 *   - Call sentryRequestHandler() as the FIRST express middleware
 *   - Call sentryErrorHandler() as the LAST middleware (before safeError)
 *
 * If SENTRY_DSN is not set, Sentry is a no-op — zero overhead in dev.
 */

import * as Sentry from "@sentry/node";
import type { Scope } from "@sentry/node";
import type { Request, Response, NextFunction } from "express";
import { env } from "./env.js";

let _initialized = false;

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // dev / missing config — no-op

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? "development",
    release: process.env.RENDER_GIT_COMMIT ?? process.env.CF_PAGES_COMMIT_SHA ?? undefined,
    // Capture 10% of transactions in production for performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Don't send PII (emails, IPs) unless explicitly opted in
    sendDefaultPii: false,
    // Ignore noise
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Non-Error promise rejection captured",
    ],
  });

  _initialized = true;
}

/** Express request handler — attach to app BEFORE routes */
export function sentryRequestHandler() {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!_initialized) return next();
    Sentry.withScope((scope: Scope) => {
      scope.setTag("route", req.path);
      scope.setUser(req.user ? { id: req.user.sub, email: req.user.email } : null);
      next();
    });
  };
}

/** Express error handler — attach to app AFTER routes, BEFORE safeError */
export function sentryErrorHandler() {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    if (_initialized) {
      Sentry.withScope((scope: Scope) => {
        scope.setTag("route", req.path);
        scope.setTag("method", req.method);
        if (req.user) scope.setUser({ id: req.user.sub, email: req.user.email });
        Sentry.captureException(err);
      });
    }
    next(err);
  };
}

/**
 * Manually capture an exception (use in catch blocks for non-fatal errors).
 * No-op when Sentry is not initialised.
 */
export function captureException(err: unknown, context?: Record<string, unknown>): void {
  if (!_initialized) return;
  Sentry.withScope((scope: Scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(err);
  });
}
