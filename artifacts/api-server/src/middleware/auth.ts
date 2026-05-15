import type { Request, Response, NextFunction } from "express";
import { verifySupabaseToken } from "../lib/supabase-admin.js";
import { logger } from "../lib/logger.js";

/**
 * Shared helper: ensure Supabase user exists in local DB, auto-create
 * a "Default" workspace on first login, and return the mapped user object
 * (including activeWorkspaceId).
 */
async function syncAndMapUser(supabaseUser: { userId: string; email: string }) {
  const { db, users, workspaces, workspaceMembers } = await import("@workspace/db");
  const { and, eq } = await import("drizzle-orm");

  const dbUser = await db.transaction(async (tx) => {
    let [user] = await tx.select().from(users).where(eq(users.id, supabaseUser.userId)).limit(1);

    if (!user) {
      logger.info({ userId: supabaseUser.userId }, "Syncing new user to local DB from Supabase");

      // Race-safe user creation: concurrent auth/me calls can arrive together.
      await tx.insert(users).values({
        id:                  supabaseUser.userId,
        email:               supabaseUser.email,
        role:                "user",
        onboardingCompleted: false,
        passwordHash:        null,
      }).onConflictDoNothing();

      [user] = await tx.select().from(users).where(eq(users.id, supabaseUser.userId)).limit(1);
      if (!user) throw new Error("Failed to sync authenticated user");
    }

    let activeWorkspaceId = user.activeWorkspaceId ?? null;

    if (!activeWorkspaceId) {
      // Prefer an existing Default workspace. A DB partial unique index prevents
      // two concurrent requests from creating two Default workspaces.
      let [workspace] = await tx
        .select({ id: workspaces.id })
        .from(workspaces)
        .where(and(eq(workspaces.ownerId, supabaseUser.userId), eq(workspaces.name, "Default")))
        .limit(1);

      if (!workspace) {
        await tx.insert(workspaces).values({
          ownerId:     supabaseUser.userId,
          name:        "Default",
          description: "My default workspace",
        }).onConflictDoNothing();

        [workspace] = await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(and(eq(workspaces.ownerId, supabaseUser.userId), eq(workspaces.name, "Default")))
          .limit(1);
      }

      // If a legacy account already had a non-default workspace, fall back to it.
      if (!workspace) {
        [workspace] = await tx
          .select({ id: workspaces.id })
          .from(workspaces)
          .where(eq(workspaces.ownerId, supabaseUser.userId))
          .limit(1);
      }

      if (!workspace) throw new Error("Failed to create or find default workspace");

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId:      supabaseUser.userId,
        role:        "owner",
      }).onConflictDoNothing();

      activeWorkspaceId = workspace.id;

      const [updated] = await tx.update(users)
        .set({ activeWorkspaceId, updatedAt: new Date() })
        .where(eq(users.id, supabaseUser.userId))
        .returning();

      return updated ?? { ...user, activeWorkspaceId };
    }

    return user;
  });

  return {
    sub:               supabaseUser.userId,
    userId:            supabaseUser.userId,
    email:             supabaseUser.email,
    role:              (dbUser.role as "admin" | "user") || "user",
    activeWorkspaceId: dbUser.activeWorkspaceId as string,
  };
}

// ─── requireAuth ──────────────────────────────────────────────────────────────

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
    logger.error({ error }, "requireAuth failure");
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// ─── optionalAuth ─────────────────────────────────────────────────────────────

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return next();

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

// ─── requireWorkspace ─────────────────────────────────────────────────────────
/**
 * Must be used AFTER requireAuth.
 * Validates that req.user.activeWorkspaceId exists and the user is a member.
 * Attach the resolved workspace to req.workspace.
 *
 * Usage:  router.get("/leads", requireAuth, requireWorkspace, handler)
 */
export async function requireWorkspace(req: Request, res: Response, next: NextFunction) {
  const workspaceId = req.user?.activeWorkspaceId
    ?? (req.headers["x-workspace-id"] as string | undefined)
    ?? req.query.workspaceId as string | undefined;

  if (!workspaceId) {
    return res.status(400).json({ error: "No active workspace — please create or select a workspace first" });
  }

  try {
    const { db, workspaces, workspaceMembers } = await import("@workspace/db");
    const { and, eq } = await import("drizzle-orm");

    // Verify workspace exists and user is a member (or owner)
    const [membership] = await db
      .select({ role: workspaceMembers.role, ws: workspaces })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!membership) {
      return res.status(403).json({ error: "Workspace not found or access denied" });
    }

    // Attach to request so route handlers can use it without another DB call
    req.workspace = { ...membership.ws, id: workspaceId, role: membership.role };
    req.user!.activeWorkspaceId = workspaceId;

    return next();
  } catch (err) {
    logger.error({ err }, "requireWorkspace failure");
    return res.status(500).json({ error: "Internal server error" });
  }
}
