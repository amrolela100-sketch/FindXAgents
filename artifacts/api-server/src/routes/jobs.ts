import { Router } from "express";
import { z } from "zod";
import { markRunFailed, startAgentRunInProcess, verifyInternalJobSecret } from "../lib/agent-job-queue.js";
import { safeError } from "../lib/safe-error.js";

const router = Router();

const jobSchema = z.object({
  runId:       z.string().uuid(),
  query:       z.string().min(2).max(500),
  maxResults:  z.number().int().min(1).max(50),
  userId:      z.string().nullable(),
  workspaceId: z.string().nullable(),
  language:    z.enum(["en", "nl", "ar", "fr", "es", "de"]),
});

/**
 * Internal worker endpoint for queued agent runs.
 *
 * This route is intentionally mounted before requireAuth because it is called by
 * QStash / an internal worker, not by a Supabase user session. It is protected
 * by X-Internal-Job-Secret and must never be exposed without that env var.
 */
router.post("/internal/jobs/agent-run", async (req, res) => {
  if (!verifyInternalJobSecret(req.headers["x-internal-job-secret"])) {
    return res.status(401).json({ error: "Unauthorized job request" });
  }

  const parsed = jobSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid job payload", details: parsed.error.flatten() });
  }

  const payload = parsed.data;

  try {
    // For QStash/worker delivery, process the job in this worker request.
    // The target URL should be a long-lived worker (Render/VPS) for large runs.
    await startAgentRunInProcess(payload);
    return res.json({ ok: true, runId: payload.runId });
  } catch (err: any) {
    await markRunFailed(payload.runId, err?.message ?? "Agent job failed").catch(() => {});
    return safeError(res, err, "Agent job failed");
  }
});

export default router;
