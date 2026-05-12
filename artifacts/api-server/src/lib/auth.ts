import type { Request, Response, NextFunction } from "express";

// ─── JWT types ────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;
  /** Alias for `sub` — used across all route handlers */
  userId: string;
  email: string;
  role: "admin" | "user";
  /** Active workspace ID — set by requireAuth via DB sync */
  activeWorkspaceId: string;
}

// ─── Express type augmentation ────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ─── requireRole helper ───────────────────────────────────────────────────────
// Use after requireAuth to gate a route to admins only.
// Example:  router.get("/admin/x", requireAuth, requireRole("admin"), handler)

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
