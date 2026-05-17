// artifacts/api-server/src/routes/workspaces.ts
import { Router } from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import { db, users, workspaces, workspaceMembers } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";
import { z } from "zod";

const router = Router();
router.use(requireAuth);

// ─── List workspaces for current user ────────────────────────────────────────

router.get("/workspaces", async (req, res) => {
  try {
    const rows = await db
      .select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, req.user!.userId));

    return res.json({
      workspaces: rows.map(r => ({ ...r.workspace, role: r.role })),
      activeId: req.user!.activeWorkspaceId ?? null,
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Create workspace ─────────────────────────────────────────────────────────

const createSchema = z.object({
  name:           z.string().min(1).max(100),
  description:    z.string().max(500).default(""),
  icp:            z.string().max(500).default(""),
  targetIndustry: z.string().max(200).default(""),
  targetCity:     z.string().max(200).default(""),
});

// MED-12 fix: cap workspace creation per user.
// Without a limit, a single user can create thousands of workspaces, filling
// the DB and degrading performance for all tenants.
const MAX_WORKSPACES_PER_USER = 10;

router.post("/workspaces", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    // Check workspace count for this user before inserting
    const [{ total }] = await db
      .select({ total: count() })
      .from(workspaceMembers)
      .where(eq(workspaceMembers.userId, req.user!.userId));

    if (Number(total) >= MAX_WORKSPACES_PER_USER) {
      return res.status(429).json({
        error: `Workspace limit reached. Maximum ${MAX_WORKSPACES_PER_USER} workspaces per user.`,
      });
    }

    const [ws] = await db.insert(workspaces).values({
      ownerId:        req.user!.userId,
      name:           parsed.data.name,
      description:    parsed.data.description,
      icp:            parsed.data.icp,
      targetIndustry: parsed.data.targetIndustry,
      targetCity:     parsed.data.targetCity,
    }).returning();

    // Add creator as owner member
    await db.insert(workspaceMembers).values({
      workspaceId: ws.id,
      userId:      req.user!.userId,
      role:        "owner",
    });

    // Bug fix: actually persist the new workspace as the active workspace on the user row
    // Previously the response claimed activeId but never wrote it to the DB.
    await db.update(users)
      .set({ activeWorkspaceId: ws.id, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId));

    return res.status(201).json({ workspace: ws, activeId: ws.id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Update workspace ─────────────────────────────────────────────────────────

router.put("/workspaces/:id", requireWorkspace, async (req, res) => {
  // Security fix: explicitly verify that the URL :id matches the resolved workspace.
  // requireWorkspace uses activeWorkspaceId which could differ from req.params.id.
  if (req.params.id !== req.workspace!.id) {
    return res.status(403).json({ error: "Workspace ID mismatch — you may only update your active workspace" });
  }

  const ws = req.workspace!;
  if (ws.role !== "owner" && ws.role !== "admin") {
    return res.status(403).json({ error: "Only workspace owner/admin can update workspace" });
  }

  const updateSchema = createSchema.partial();
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
    // CRIT-6 fix: explicit whitelist of updatable fields — never spread parsed.data directly
    // to prevent mass-assignment if schema grows with sensitive fields (e.g. ownerId)
    const { name, description, icp, targetIndustry, targetCity } = parsed.data;
    const [updated] = await db.update(workspaces)
      .set({ name, description, icp, targetIndustry, targetCity, updatedAt: new Date() })
      .where(eq(workspaces.id, ws.id))
      .returning();
    return res.json({ workspace: updated });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Switch active workspace ──────────────────────────────────────────────────

router.post("/workspaces/:id/switch", async (req, res) => {
  try {
    // Verify user is a member of that workspace
    const [membership] = await db
      .select({ workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, req.params.id),
          eq(workspaceMembers.userId, req.user!.userId),
        ),
      )
      .limit(1);

    if (!membership) return res.status(403).json({ error: "Workspace not found or access denied" });

    await db.update(users)
      .set({ activeWorkspaceId: req.params.id, updatedAt: new Date() })
      .where(eq(users.id, req.user!.userId));

    return res.json({ activeId: req.params.id });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Delete workspace ─────────────────────────────────────────────────────────

router.delete("/workspaces/:id", requireWorkspace, async (req, res) => {
  // Security fix: explicitly verify that the URL :id matches the resolved workspace.
  if (req.params.id !== req.workspace!.id) {
    return res.status(403).json({ error: "Workspace ID mismatch — you may only delete your active workspace" });
  }

  const ws = req.workspace!;
  if (ws.role !== "owner") {
    return res.status(403).json({ error: "Only workspace owner can delete workspace" });
  }

  try {
    await db.delete(workspaces).where(eq(workspaces.id, ws.id));

    // If this was the active workspace, clear it
    if (req.user!.activeWorkspaceId === ws.id) {
      const [fallback] = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, req.user!.userId))
        .limit(1);

      await db.update(users)
        .set({ activeWorkspaceId: fallback?.workspaceId ?? null, updatedAt: new Date() })
        .where(eq(users.id, req.user!.userId));
    }

    return res.json({ deleted: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── List workspace members ───────────────────────────────────────────────────
router.get("/workspaces/:id/members", requireWorkspace, async (req, res) => {
  if (req.params.id !== req.workspace!.id) {
    return res.status(403).json({ error: "Workspace ID mismatch" });
  }
  try {
    const members = await db
      .select({
        userId:    workspaceMembers.userId,
        role:      workspaceMembers.role,
        joinedAt:  workspaceMembers.createdAt,
        email:     users.email,
        name:      users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(workspaceMembers)
      .innerJoin(users, eq(users.id, workspaceMembers.userId))
      .where(eq(workspaceMembers.workspaceId, req.params.id));

    return res.json({ members });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Invite member by email ───────────────────────────────────────────────────
const inviteSchema = z.object({
  email: z.string().email(),
  role:  z.enum(["admin", "member"]).default("member"),
});

router.post("/workspaces/:id/invite", requireWorkspace, async (req, res) => {
  if (req.params.id !== req.workspace!.id) {
    return res.status(403).json({ error: "Workspace ID mismatch" });
  }
  const ws = req.workspace!;
  if (ws.role !== "owner" && ws.role !== "admin") {
    return res.status(403).json({ error: "Only owner/admin can invite members" });
  }

  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  try {
    // Find user by email
    const [invitee] = await db
      .select()
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);

    if (!invitee) {
      return res.status(404).json({ error: "No FindX account found with that email address" });
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, req.params.id),
        eq(workspaceMembers.userId, invitee.id),
      ))
      .limit(1);

    if (existing) {
      return res.status(409).json({ error: "User is already a member of this workspace" });
    }

    // Add member
    await db.insert(workspaceMembers).values({
      workspaceId: req.params.id,
      userId:      invitee.id,
      role:        parsed.data.role,
    });

    return res.status(201).json({
      message: `${invitee.name || invitee.email} added to workspace`,
      member: {
        userId:   invitee.id,
        email:    invitee.email,
        name:     invitee.name,
        role:     parsed.data.role,
        joinedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Update member role ───────────────────────────────────────────────────────
router.patch("/workspaces/:id/members/:userId/role", requireWorkspace, async (req, res) => {
  if (req.params.id !== req.workspace!.id) {
    return res.status(403).json({ error: "Workspace ID mismatch" });
  }
  const ws = req.workspace!;
  if (ws.role !== "owner") {
    return res.status(403).json({ error: "Only workspace owner can change roles" });
  }
  // Owner cannot change their own role
  if (req.params.userId === req.user!.userId) {
    return res.status(400).json({ error: "Cannot change your own role" });
  }

  const roleSchema = z.object({ role: z.enum(["admin", "member"]) });
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid role" });

  try {
    await db.update(workspaceMembers)
      .set({ role: parsed.data.role })
      .where(and(
        eq(workspaceMembers.workspaceId, req.params.id),
        eq(workspaceMembers.userId, req.params.userId),
      ));
    return res.json({ updated: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

// ─── Remove member ────────────────────────────────────────────────────────────
router.delete("/workspaces/:id/members/:userId", requireWorkspace, async (req, res) => {
  if (req.params.id !== req.workspace!.id) {
    return res.status(403).json({ error: "Workspace ID mismatch" });
  }
  const ws = req.workspace!;
  const isSelf = req.params.userId === req.user!.userId;

  // Owner can remove anyone; member can only remove themselves (leave)
  if (!isSelf && ws.role !== "owner" && ws.role !== "admin") {
    return res.status(403).json({ error: "Only owner/admin can remove members" });
  }
  // Owner cannot remove themselves (would orphan workspace)
  if (isSelf && ws.role === "owner") {
    return res.status(400).json({ error: "Owner cannot leave their own workspace. Transfer ownership or delete the workspace." });
  }

  try {
    await db.delete(workspaceMembers).where(
      and(
        eq(workspaceMembers.workspaceId, req.params.id),
        eq(workspaceMembers.userId, req.params.userId),
      ),
    );
    return res.json({ removed: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;

