import { db, agentPipelineRuns } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { timingSafeEqual } from "crypto";
import { AgentRunner } from "./agent-runner.js";
import { logger } from "./logger.js";

export type AgentRunLanguage = "ar" | "en" | "nl" | "fr" | "es" | "de";

export interface AgentRunJobPayload {
  runId: string;
  query: string;
  maxResults: number;
  userId: string | null;
  workspaceId: string | null;
  language: AgentRunLanguage;
}

const activeRunIds = new Set<string>();

function isServerlessRuntime(): boolean {
  return !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY ||
    process.env.FUNCTIONS_WORKER_RUNTIME
  );
}

function getInternalJobSecret(): string {
  const secret = process.env.INTERNAL_JOB_SECRET || process.env.QSTASH_JOB_SECRET || "";
  if (!secret) {
    throw new Error("INTERNAL_JOB_SECRET is required for queued agent jobs");
  }
  return secret;
}

function getWorkerUrl(): string {
  const baseUrl = process.env.JOB_WORKER_URL || process.env.PUBLIC_API_URL || process.env.API_PUBLIC_URL || "";
  if (!baseUrl) {
    throw new Error("JOB_WORKER_URL or PUBLIC_API_URL is required when QSTASH_TOKEN is set");
  }
  return `${baseUrl.replace(/\/$/, "")}/api/internal/jobs/agent-run`;
}

export async function startAgentRunInProcess(payload: AgentRunJobPayload): Promise<void> {
  if (activeRunIds.has(payload.runId)) {
    logger.warn({ runId: payload.runId }, "Agent run is already active in this process; skipping duplicate start");
    return;
  }

  activeRunIds.add(payload.runId);
  try {
    const runner = new AgentRunner(payload.runId, payload.workspaceId);
    await runner.run(payload.query, payload.maxResults, payload.userId, payload.language);
  } finally {
    activeRunIds.delete(payload.runId);
  }
}

async function enqueueViaQStash(payload: AgentRunJobPayload): Promise<{ mode: "qstash" }> {
  const token = process.env.QSTASH_TOKEN;
  if (!token) throw new Error("QSTASH_TOKEN is not configured");

  const targetUrl = getWorkerUrl();
  const secret = getInternalJobSecret();

  const response = await fetch(`https://qstash.upstash.io/v2/publish/${encodeURIComponent(targetUrl)}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "Upstash-Forward-X-Internal-Job-Secret": secret,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`QStash enqueue failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return { mode: "qstash" };
}

export async function enqueueAgentRun(payload: AgentRunJobPayload): Promise<{ mode: "qstash" | "in-process" }> {
  if (process.env.QSTASH_TOKEN) {
    return enqueueViaQStash(payload);
  }

  if (isServerlessRuntime()) {
    throw new Error(
      "Refusing to start long-running agent job inside a serverless request. Configure QSTASH_TOKEN + JOB_WORKER_URL/PUBLIC_API_URL, or run the API on a long-lived worker such as Render/VPS."
    );
  }

  // Long-lived hosts (Render/VPS): run asynchronously in-process, tracked for shutdown.
  void startAgentRunInProcess(payload).catch((err) => {
    logger.error({ err, runId: payload.runId }, "In-process agent job failed");
  });
  return { mode: "in-process" };
}

export function verifyInternalJobSecret(headerValue: string | string[] | undefined): boolean {
  // CRIT-4 fix: use timing-safe comparison to prevent timing-oracle attacks
  const expected = process.env.INTERNAL_JOB_SECRET || process.env.QSTASH_JOB_SECRET;
  if (!expected) return false;
  const actual = Array.isArray(headerValue) ? headerValue[0] : (headerValue ?? "");
  // Pad both buffers to the same fixed length to avoid length-leaking side channel
  const MAX_LEN = 512;
  const actualBuf   = Buffer.alloc(MAX_LEN);
  const expectedBuf = Buffer.alloc(MAX_LEN);
  Buffer.from(actual).copy(actualBuf);
  Buffer.from(expected).copy(expectedBuf);
  // Also check raw length equality to reject obviously wrong values fast (after safe compare)
  return timingSafeEqual(actualBuf, expectedBuf) && actual.length === expected.length;
}

export async function markActiveAgentRunsInterrupted(reason: string): Promise<void> {
  const ids = [...activeRunIds];
  if (ids.length === 0) return;

  await db.update(agentPipelineRuns)
    .set({
      status: "failed",
      error: reason,
      completedAt: new Date(),
    })
    .where(inArray(agentPipelineRuns.id, ids));

  logger.warn({ runIds: ids }, "Marked active agent runs as interrupted");
}

export async function markRunFailed(runId: string, error: string): Promise<void> {
  await db.update(agentPipelineRuns)
    .set({ status: "failed", error, completedAt: new Date() })
    .where(eq(agentPipelineRuns.id, runId));
}
