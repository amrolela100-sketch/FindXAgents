import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// GET /api/auth/me — returns the fully-synced current user (with activeWorkspaceId)
router.get("/auth/me", requireAuth, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: req.user });
});

export default router;
