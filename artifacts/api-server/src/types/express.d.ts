// artifacts/api-server/src/types/express.d.ts
// Extend Express Request to carry authenticated user + active workspace

import type { Workspace } from "@workspace/db";

/**
 * Authenticated user payload — set by requireAuth middleware.
 * Access via req.user (optional) or assertUser(req) (throws on missing).
 */
export interface AuthenticatedUser {
  sub:               string;
  userId:            string;
  email:             string;
  role:              "admin" | "user";
  activeWorkspaceId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      /** Populated by requireWorkspace middleware */
      workspace?: Workspace & { role: string };
    }
  }
}

export {};
