import { db } from "@workspace/db";
import { leads, aiProviders } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Request, Response } from "express";

/**
 * Check if OpenRouter API key is available (DB takes priority over env).
 */
export async function hasOpenRouterKey(): Promise<boolean> {
  try {
    const [cfg] = await db
      .select({ apiKey: aiProviders.apiKey })
      .from(aiProviders)
      .where(eq(aiProviders.providerType, "openrouter"))
      .limit(1);
    if (cfg?.apiKey) return true;
  } catch { /* fall through */ }
  return !!process.env.OPENROUTER_API_KEY;
}

/**
 * Check ownership: a lead is accessible only if its workspaceId matches the
 * caller's activeWorkspaceId.
 *
 * Returns false and writes a 404 response when access is denied.
 */
export function checkLeadOwnership(
  lead: { workspaceId: string | null; userId: string | null },
  req: Request,
  res: Response
): boolean {
  const reqWorkspaceId = req.user?.activeWorkspaceId ?? null;
  const isAdmin = req.user?.role === "admin";

  if (isAdmin) return true;

  if (!lead.workspaceId || !reqWorkspaceId || lead.workspaceId !== reqWorkspaceId) {
    res.status(404).json({ error: "Lead not found" });
    return false;
  }
  return true;
}

export function isAdminUser(req: Request): boolean {
  return req.user?.role === "admin";
}
