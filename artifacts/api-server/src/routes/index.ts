import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import dashboardRouter from "./dashboard.js";
import pipelineRouter from "./pipeline.js";
import leadsRouter from "./leads.js";
import outreachesRouter from "./outreaches.js";
import analysesRouter from "./analyses.js";
import agentsRouter from "./agents.js";
import emailRouter from "./email.js";
import aiRouter from "./ai.js";
import telegramRouter from "./telegram.js";
import dataRouter from "./data.js";
import searchRouter from "./search.js";
import notificationsRouter from "./notifications.js";
import adminRouter from "./admin.js";
import workspacesRouter from "./workspaces.js";
import onboardingRouter from "./onboarding.js";
import ownerRouter from "./owner.js";
import chatRouter from "./chat.js";
import jobsRouter from "./jobs.js";
import { requireAuth } from "../middleware/auth.js";

const router: IRouter = Router();

// ─── Public routes (no auth required) ────────────────────────────────────────
router.use(healthRouter);
router.use(authRouter);
router.use(jobsRouter);

// ─── Protected routes (JWT required) ─────────────────────────────────────────
router.use(requireAuth);

router.use(dashboardRouter);
router.use(pipelineRouter);
router.use(leadsRouter);
router.use(outreachesRouter);
router.use(analysesRouter);
router.use(agentsRouter);
router.use(emailRouter);
router.use(aiRouter);
router.use(telegramRouter);
router.use(dataRouter);
router.use(searchRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(workspacesRouter);
router.use(onboardingRouter);
router.use(ownerRouter);
router.use(chatRouter);

export default router;
