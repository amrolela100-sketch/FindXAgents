import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { safeError } from "../lib/safe-error.js";

const router = Router();

router.use(requireAuth);

router.get("/onboarding/status", async (req, res) => {
  try {
    const [user] = await db
      .select({ 
        onboardingCompleted: users.onboardingCompleted, 
        onboardingData: users.onboardingData 
      })
      .from(users)
      .where(eq(users.id, req.user!.userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      completed: user.onboardingCompleted,
      data: user.onboardingData,
    });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

router.post("/onboarding/complete", async (req, res) => {
  try {
    const onboardingData = req.body as Record<string, unknown>;

    await db
      .update(users)
      .set({
        onboardingCompleted: true,
        onboardingData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.userId));

    return res.json({ completed: true });
  } catch (err) {
    return safeError(res, err, "Internal server error");
  }
});

export default router;
