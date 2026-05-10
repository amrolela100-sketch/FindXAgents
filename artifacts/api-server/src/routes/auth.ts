import { Router } from "express";
import { authMiddleware } from "../lib/auth.js";

const router = Router();

// GET /api/auth/me — returns current user from token
router.get("/auth/me", authMiddleware, async (req, res) => {
  if (!req.user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ user: req.user });
});

export default router;

