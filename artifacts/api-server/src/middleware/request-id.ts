/**
 * LOW-3: Request correlation ID middleware.
 *
 * Attaches a unique X-Request-ID header to every request and response.
 * Enables tracing a single request across:
 *   - Express logs (pino-http)
 *   - Sentry error reports
 *   - Frontend → API spans
 *   - External API calls (Tavily, OpenRouter, Resend)
 *
 * Priority order for the ID:
 *   1. Incoming X-Request-ID header (set by Vercel, load balancer, or client)
 *   2. Auto-generated UUID (fallback for direct API calls)
 *
 * Usage:
 *   app.use(requestId);
 *   // Inside any handler: req.id is now a string
 */

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      /** Unique identifier for this request — set by requestId middleware. */
      id: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // Accept X-Request-ID from upstream (Vercel, CDN, test suites) or generate a new one
  const incoming = req.headers["x-request-id"];
  const id = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();

  // Attach to request for use in logs, Sentry, etc.
  req.id = id;

  // Echo back so clients/logs can correlate request ↔ response
  res.setHeader("X-Request-ID", id);

  next();
}
