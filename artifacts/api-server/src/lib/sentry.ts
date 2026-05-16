/**
 * lib/sentry.ts — no-op stub
 *
 * Sentry is intentionally NOT imported here to avoid pulling in
 * @sentry/node and its @opentelemetry/* peer deps into the esbuild bundle.
 * If you need real Sentry tracing, initialise it via the Sentry CLI or a
 * separate instrumentation file loaded with --require / --import BEFORE
 * this bundle (Node.js --require flag).
 *
 * All exports are no-ops so the rest of the codebase compiles unchanged.
 */
import type { Request, Response, NextFunction } from "express";

export function initSentry(): void {}

export function sentryRequestHandler() {
  return (_req: Request, _res: Response, next: NextFunction) => next();
}

export function sentryErrorHandler() {
  return (err: Error, _req: Request, _res: Response, next: NextFunction) => next(err);
}

export function captureException(_err: unknown, _context?: Record<string, unknown>): void {}
