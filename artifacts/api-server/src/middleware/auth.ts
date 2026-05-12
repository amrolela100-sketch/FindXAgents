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
  const { eq } = await import("drizzle-orm");

  let [dbUser] = await db.select().from(users).where(eq(users.id, supabaseUser.userId)).limit(1);

  if (!dbUser) {
    // ── First login: create user row ──────────────────────────────────────
    logger.info({ userId: supabaseUser.userId }, "Syncing new user to local DB from Supabase");

    const [newUser] = await db.insert(users).values({
      id:                  supabaseUser.userId,
      email:               supabaseUser.email,
      role:                "user",
      onboardingCompleted: false,
      passwordHash:        null,
    }).returning();

    dbUser = newUser;
  }

  // ── Auto-create "Default" workspace if the user has none ─────────────────
  let activeWorkspaceId = dbUser.activeWorkspaceId ?? null;

  if (!activeWorkspaceId) {
    // Check if any workspace exists for this user
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(eq(workspaces.ownerId, supabaseUser.userId))
      .limit(1);

    if (existing) {
      activeWorkspaceId = existing.id;
    } else {
      // Create the default workspace
      const [defaultWs] = await db.insert(workspaces).values({
        ownerId:     supabaseUser.userId,
        name:        "Default",
        description: "My default workspace",
      }).returning();

      // Add user as owner in workspace_members
      await db.insert(workspaceMembers).values({
        workspaceId: defaultWs.id,
        userId:      supabaseUser.userId,
        role:        "owner",
      });

      activeWorkspaceId = defaultWs.id;
      logger.info({ userId: supabaseUser.userId, workspaceId: defaultWs.id }, "Created default workspace for new user");
    }

    // Persist activeWorkspaceId on user row
    await db.update(users)
      .set({ activeWorkspaceId, updatedAt: new Date() })
      .where(eq(users.id, supabaseUser.userId));
  }

  return {
    sub:               supabaseUser.userId,
    userId:            supabaseUser.userId,
    email:             supabaseUser.email,
    role:              (dbUser.role as "admin" | "user") || "user",
    activeWorkspaceId: activeWorkspaceId as string,
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
