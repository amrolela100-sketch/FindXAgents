import type { Request, Response, NextFunction } from "express";
import { verifySupabaseToken } from "../lib/supabase-admin.js";
import { logger } from "../lib/logger.js";

/**
 * Shared helper to ensure Supabase user exists in local DB and return mapped user object.
 */
async function syncAndMapUser(supabaseUser: { userId: string; email: string }) {
  const { db, users } = await import("@workspace/db");
  const { eq } = await import("drizzle-orm");
  
  let [dbUser] = await db.select().from(users).where(eq(users.id, supabaseUser.userId)).limit(1);
  
  if (!dbUser) {
    logger.info({ userId: supabaseUser.userId }, "Syncing new user to local DB from Supabase");
    const [newUser] = await db.insert(users).values({
      id: supabaseUser.userId,
      email: supabaseUser.email,
      role: "user",
      onboardingCompleted: false,
      passwordHash: null,
    }).returning();
    dbUser = newUser;
  }

  return {
    sub: supabaseUser.userId,
    userId: supabaseUser.userId,
    email: supabaseUser.email,
    role: (dbUser.role as "admin" | "user") || "user",
  };
}

/**
 * Middleware to require a valid Supabase token.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized — valid session required" });
  }

  try {
    const supabaseUser = await verifySupabaseToken(authHeader);
    if (supabaseUser) {
      req.user = await syncAndMapUser(supabaseUser);
      return next();
    }
    return res.status(401).json({ error: "Unauthorized — invalid or expired session" });
  } catch (error: any) {
    // Security: log the full error internally but never expose internal details to clients
    logger.error({ error }, "requireAuth failure");
    return res.status(401).json({ error: "Authentication failed" });
  }
}

/**
 * Optional authentication middleware.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  try {
    const supabaseUser = await verifySupabaseToken(authHeader);
    if (supabaseUser) {
      req.user = await syncAndMapUser(supabaseUser);
    }
  } catch {
    // Ignore errors for optional auth
  }
  return next();
}


