// artifacts/api-server/src/types/express.d.ts
// Extend Express Request to carry authenticated user + active workspace

import type { Workspace } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      user?: {
        sub:               string;
        userId:            string;
        email:             string;
        role:              "admin" | "user";
        activeWorkspaceId: string;
      };
      /** Populated by requireWorkspace middleware */
      workspace?: Workspace & { role: string };
    }
  }
}

export {};
