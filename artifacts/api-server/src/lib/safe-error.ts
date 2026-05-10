/**
 * Safe error response helper.
 *
 * In production, internal server errors (5xx) never expose raw error messages
 * to clients — those details are logged server-side only.
 *
 * Usage:
 *   return safeError(res, err, "Operation failed");
 */

import type { Response } from "express";
import { logger } from "./logger.js";

export function safeError(
  res: Response,
  err: unknown,
  clientMessage = "Internal server error",
  statusCode = 500,
): Response {
  // Always log full error internally
  logger.error({ err }, clientMessage);

  // In production, hide internal details from clients
  const message =
    process.env.NODE_ENV === "production"
      ? clientMessage
      : err instanceof Error
        ? err.message
        : clientMessage;

  return res.status(statusCode).json({ error: message });
}
