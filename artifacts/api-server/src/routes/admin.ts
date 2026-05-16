import { Router } from "express";
import { requireAuth, assertUser } from "../middleware/auth";
import { db, users, leads, agentPipelineRuns } from "@workspace/db";
import { count, desc } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth);

router.get("/admin/stats", async (req, res) => {
  if (assertUser(req).role !== "admin") {
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
        adminEmail: assertUser(req).email,
      },
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

/**
 * HIGH-6 fix: GET /admin/users now paginates results.
 *
 * Previously fetched ALL users with no LIMIT — on large tables this causes
 * a memory blowup (e.g. 100,000 users loaded into a single array).
 *
 * Now supports ?page=1&pageSize=50 (max 100 per page).
 */
router.get("/admin/users", async (req, res) => {
  if (assertUser(req).role !== "admin") {
    return res.status(403).json({ error: "Forbidden — admin only" });
  }
  try {
    const page     = Math.max(1, parseInt(String(req.query.page     ?? "1"),  10));
    const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize ?? "50"), 10)));

    const [pagedUsers, totalResult] = await Promise.all([
      db
        .select()
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ count: count() }).from(users),
    ]);

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

    const formattedUsers = pagedUsers.map((u) => ({
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

    return res.json({
      users: formattedUsers,
      total: Number(totalResult[0]?.count ?? 0),
      page,
      pageSize,
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
