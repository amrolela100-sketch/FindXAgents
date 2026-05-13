// artifacts/api-server/src/routes/workspaces.ts
import { Router } from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth";
import { db, users, workspaces, workspaceMembers } from "@workspace/db";
import { eq, and } from "drizzle-orm";
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

router.post("/workspaces", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });

  try {
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
    const [updated] = await db.update(workspaces)
      .set({ ...parsed.data, updatedAt: new Date() })
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

export default router;
