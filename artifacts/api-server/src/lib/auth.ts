import type { Request, Response, NextFunction } from "express";
import { verifySupabaseToken } from "./supabase-admin.js";

// ─── JWT types ────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;       // user id
  /** Alias for `sub` — used across all route handlers */
  userId: string;
  email: string;
  role: "admin" | "user";
}

// ─── Express middleware ───────────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware to require a valid Supabase token.
 * Maps the Supabase user to req.user for backward compatibility.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }

  try {
    const supabaseUser = await verifySupabaseToken(authHeader);
    if (!supabaseUser) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    req.user = {
      sub: supabaseUser.userId,
      userId: supabaseUser.userId,
      email: supabaseUser.email,
      role: "user", // Default to user, admin status should be checked in DB if needed
    };
    next();
  } catch (error: any) {
    res.status(401).json({ error: "Authentication failed: " + error.message });
  }
}

export function requireRole(role: "admin" | "user") {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (role === "admin" && req.user.role !== "admin") {
      res.status(403).json({ error: "Forbidden: admin only" });
      return;
    }
    next();
  };
}

