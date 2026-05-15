import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db, users, leads, agentPipelineRuns } from "@workspace/db";
import { count, sql, eq } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth);

router.get("/admin/stats", async (req, res) => {
  if (req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  try {
    const [totalLeadsResult, totalRunsResult, totalUsersResult] = await Promise.all([
      db.select({ count: count() }).from(leads),
      db.select({ count: count() }).from(agentPipelineRuns),
      db.select({ count: count() }).from(users),
    ]);

    return res.json({
      stats: {
        totalUsers: totalUsersResult[0]?.count ?? 0,
        totalLeads: totalLeadsResult[0]?.count ?? 0,
        totalRuns: totalRunsResult[0]?.count ?? 0,
        adminEmail: req.user!.email,
      },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.get("/admin/users", async (req, res) => {
  if (req.user!.role !== "admin") {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  try {
    const allUsers = await db.select().from(users);

    const userLeadCounts = await db
      .select({
        userId: leads.userId,
        count: count(),
      })
      .from(leads)
      .groupBy(leads.userId);

    const countMap: Record<string, number> = {};
    for (const row of userLeadCounts) {
      if (row.userId) countMap[row.userId] = Number(row.count);
    }

    const formattedUsers = allUsers.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.email.split("@")[0] ?? "Unknown",
      avatar: null,
      createdAt: u.createdAt,
      lastSignIn: u.updatedAt,
      leadCount: countMap[u.id] ?? 0,
      onboardingCompleted: u.onboardingCompleted,
      isAdmin: u.role === "admin",
    }));

    return res.json({ users: formattedUsers });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
