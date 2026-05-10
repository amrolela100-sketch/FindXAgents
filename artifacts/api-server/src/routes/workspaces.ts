import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { safeError } from "../lib/safe-error.js";

export interface Workspace {
  id: string;
  name: string;
  description: string;
  icp: string;
  targetIndustry: string;
  targetCity: string;
  createdAt: string;
}

const router = Router();

router.use(requireAuth);

async function getUserMeta(userId: string): Promise<Record<string, unknown>> {
  const [user] = await db
    .select({ metadata: users.metadata })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return (user?.metadata ?? {}) as Record<string, unknown>;
}

async function setUserMeta(userId: string, meta: Record<string, unknown>): Promise<void> {
  await db
    .update(users)
    .set({ metadata: meta, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

router.get("/workspaces", async (req, res) => {
  try {
    const meta = await getUserMeta(req.user!.userId);
    const workspaces = (meta.workspaces as Workspace[] | undefined) ?? [];
    const activeId = (meta.activeWorkspaceId as string | undefined) ?? null;
    return res.json({ workspaces, activeId });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/workspaces", async (req, res) => {
  try {
    const { name, description = "", icp = "", targetIndustry = "", targetCity = "" } = req.body as {
      name?: string; description?: string; icp?: string; targetIndustry?: string; targetCity?: string;
    };
    if (!name?.trim()) return res.status(400).json({ error: "name is required" });

    const meta = await getUserMeta(req.user!.userId);
    const workspaces = (meta.workspaces as Workspace[] | undefined) ?? [];

    const newWs: Workspace = {
      id: randomUUID(),
      name: name.trim(),
      description,
      icp,
      targetIndustry,
      targetCity,
      createdAt: new Date().toISOString(),
    };
    workspaces.push(newWs);

    const activeId = workspaces.length === 1 ? newWs.id : (meta.activeWorkspaceId as string | undefined) ?? newWs.id;
    await setUserMeta(req.user!.userId, { ...meta, workspaces, activeWorkspaceId: activeId });

    return res.status(201).json({ workspace: newWs, activeId });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.put("/workspaces/:id", async (req, res) => {
  try {
    const meta = await getUserMeta(req.user!.userId);
    const workspaces = (meta.workspaces as Workspace[] | undefined) ?? [];
    const idx = workspaces.findIndex((w) => w.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "Workspace not found" });

    const { name, description, icp, targetIndustry, targetCity } = req.body as Partial<Workspace>;
    if (name !== undefined) workspaces[idx].name = name;
    if (description !== undefined) workspaces[idx].description = description;
    if (icp !== undefined) workspaces[idx].icp = icp;
    if (targetIndustry !== undefined) workspaces[idx].targetIndustry = targetIndustry;
    if (targetCity !== undefined) workspaces[idx].targetCity = targetCity;

    await setUserMeta(req.user!.userId, { ...meta, workspaces });
    return res.json({ workspace: workspaces[idx] });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/workspaces/:id/switch", async (req, res) => {
  try {
    const meta = await getUserMeta(req.user!.userId);
    const workspaces = (meta.workspaces as Workspace[] | undefined) ?? [];
    const ws = workspaces.find((w) => w.id === req.params.id);
    if (!ws) return res.status(404).json({ error: "Workspace not found" });

    await setUserMeta(req.user!.userId, { ...meta, activeWorkspaceId: ws.id });
    return res.json({ activeId: ws.id, workspace: ws });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.delete("/workspaces/:id", async (req, res) => {
  try {
    const meta = await getUserMeta(req.user!.userId);
    let workspaces = (meta.workspaces as Workspace[] | undefined) ?? [];
    const before = workspaces.length;
    workspaces = workspaces.filter((w) => w.id !== req.params.id);
    if (workspaces.length === before) return res.status(404).json({ error: "Workspace not found" });

    let activeId = meta.activeWorkspaceId as string | undefined;
    if (activeId === req.params.id) activeId = workspaces[0]?.id ?? undefined;

    await setUserMeta(req.user!.userId, { ...meta, workspaces, activeWorkspaceId: activeId });
    return res.json({ deleted: true, activeId: activeId ?? null });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
