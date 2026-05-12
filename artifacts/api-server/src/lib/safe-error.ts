/**
 * Safe error response helper.
 *
 * Extracts the deepest real error cause (e.g. actual Postgres error hidden
 * inside a Drizzle wrapper) so clients get useful messages in development
 * and safe messages in production.
 *
 * Usage:
 *   return safeError(res, err, "Operation failed");
 */

import type { Response } from "express";
import { logger } from "./logger.js";

/**
 * Recursively unwrap err.cause to find the deepest real error message.
 * Drizzle wraps Postgres errors: DrizzleError { message: "Failed query...", cause: PgError { message: "column does not exist" } }
 */
export function extractErrorMessage(err: unknown): string {
  if (!err) return "Unknown error";

  if (err instanceof Error) {
    // Drill into cause chain to find the real DB error
    const cause = (err as any).cause;
    if (cause instanceof Error && cause.message) {
      return extractErrorMessage(cause);
    }
    return err.message;
  }

  if (typeof err === "string") return err;
  if (typeof (err as any)?.message === "string") return (err as any).message;

  return String(err);
}

export function safeError(
  res: Response,
  err: unknown,
  clientMessage = "Internal server error",
  statusCode = 500,
): Response {
  // Always log full error internally (with cause chain)
  logger.error({ err }, clientMessage);

  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    // Production: never expose raw DB errors — safe generic message only
    return res.status(statusCode).json({ error: clientMessage });
  }

  // Development: expose the real error cause for easier debugging
  const realMessage = extractErrorMessage(err);

  return res.status(statusCode).json({
    error: realMessage,
    hint: clientMessage !== realMessage ? clientMessage : undefined,
  });
}
