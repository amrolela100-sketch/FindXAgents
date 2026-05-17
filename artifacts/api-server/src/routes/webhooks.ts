/**
 * Webhooks — outbound webhook management
 *
 * POST   /webhooks          — Register a webhook
 * GET    /webhooks          — List webhooks for workspace
 * PATCH  /webhooks/:id      — Update webhook (url, events, active)
 * DELETE /webhooks/:id      — Delete webhook
 * POST   /webhooks/:id/test — Send a test ping to the webhook URL
 *
 * Supported events:
 *   pipeline_complete | pipeline_failed | lead_status_changed | outreach_sent
 */

import { Router } from "express";
import { requireAuth, requireWorkspace } from "../middleware/auth.js";
import { db } from "@workspace/db";
import { z } from "zod";
import { safeError } from "../lib/safe-error.js";
import { eq, and } from "drizzle-orm";

// ── In-memory store (no schema migration needed for MVP) ──────────────────────
// Production upgrade path: add a webhooks table to lib/db/schema.ts
// For now, we use a workspace-scoped in-memory Map that resets on server restart.
// This is intentional — it lets us ship the full UI/API surface without
// touching the shared DB schema, which requires a migration snapshot.

interface WebhookRecord {
  id:          string;
  workspaceId: string;
  url:         string;
  events:      string[];
  secret:      string;
  isActive:    boolean;
  createdAt:   string;
  lastPingAt:  string | null;
  lastPingOk:  boolean | null;
}

const store = new Map<string, WebhookRecord>();

function genId(): string {
  return `wh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const VALID_EVENTS = ["pipeline_complete", "pipeline_failed", "lead_status_changed", "outreach_sent"] as const;
type WebhookEvent = typeof VALID_EVENTS[number];

const webhookSchema = z.object({
  url:      z.string().url("Must be a valid HTTPS URL").refine(u => u.startsWith("https://"), "URL must use HTTPS"),
  events:   z.array(z.enum(VALID_EVENTS)).min(1, "Select at least one event"),
  isActive: z.boolean().default(true),
});

const router = Router();
router.use(requireAuth);
router.use(requireWorkspace);

// ─── List ─────────────────────────────────────────────────────────────────────
router.get("/webhooks", (req, res) => {
  const workspaceId = req.workspace!.id;
  const hooks = [...store.values()].filter(h => h.workspaceId === workspaceId);
  return res.json({ webhooks: hooks.map(h => ({ ...h, secret: undefined })) });
});

// ─── Create ───────────────────────────────────────────────────────────────────
router.post("/webhooks", async (req, res) => {
  const workspaceId = req.workspace!.id;

  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  // Cap at 10 webhooks per workspace
  const existing = [...store.values()].filter(h => h.workspaceId === workspaceId);
  if (existing.length >= 10) {
    return res.status(429).json({ error: "Maximum 10 webhooks per workspace" });
  }

  const hook: WebhookRecord = {
    id:          genId(),
    workspaceId,
    url:         parsed.data.url,
    events:      parsed.data.events,
    secret:      `whsec_${Math.random().toString(36).slice(2, 18)}`,
    isActive:    parsed.data.isActive,
    createdAt:   new Date().toISOString(),
    lastPingAt:  null,
    lastPingOk:  null,
  };

  store.set(hook.id, hook);
  return res.status(201).json({ webhook: { ...hook, secret: hook.secret } });
});

// ─── Update ───────────────────────────────────────────────────────────────────
router.patch("/webhooks/:id", async (req, res) => {
  const hook = store.get(req.params.id);
  if (!hook || hook.workspaceId !== req.workspace!.id) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  const updateSchema = webhookSchema.partial();
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
  }

  const updated: WebhookRecord = { ...hook, ...parsed.data };
  store.set(hook.id, updated);
  return res.json({ webhook: { ...updated, secret: undefined } });
});

// ─── Delete ───────────────────────────────────────────────────────────────────
router.delete("/webhooks/:id", (req, res) => {
  const hook = store.get(req.params.id);
  if (!hook || hook.workspaceId !== req.workspace!.id) {
    return res.status(404).json({ error: "Webhook not found" });
  }
  store.delete(req.params.id);
  return res.json({ deleted: true });
});

// ─── Test ping ────────────────────────────────────────────────────────────────
router.post("/webhooks/:id/test", async (req, res) => {
  const hook = store.get(req.params.id);
  if (!hook || hook.workspaceId !== req.workspace!.id) {
    return res.status(404).json({ error: "Webhook not found" });
  }

  const payload = {
    event:     "test.ping",
    timestamp: new Date().toISOString(),
    webhookId: hook.id,
    data:      { message: "This is a test ping from FindX" },
  };

  try {
    const response = await fetch(hook.url, {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "X-FindX-Event":     "test.ping",
        "X-FindX-Signature": `sha256=${hook.secret}`,
      },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(8000),
    });

    const ok = response.ok;
    const updated: WebhookRecord = { ...hook, lastPingAt: new Date().toISOString(), lastPingOk: ok };
    store.set(hook.id, updated);

    return res.json({
      ok,
      status: response.status,
      message: ok ? "Test ping delivered successfully" : `Endpoint returned ${response.status}`,
    });
  } catch (err) {
    const updated: WebhookRecord = { ...hook, lastPingAt: new Date().toISOString(), lastPingOk: false };
    store.set(hook.id, updated);
    return res.json({ ok: false, status: 0, message: err instanceof Error ? err.message : "Request failed" });
  }
});

/**
 * dispatchWebhook — Call this from other routes when events occur.
 * Example: await dispatchWebhook(workspaceId, "pipeline_complete", { runId })
 */
export async function dispatchWebhook(workspaceId: string, event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const hooks = [...store.values()].filter(h => h.workspaceId === workspaceId && h.isActive && h.events.includes(event));

  const payload = {
    event,
    timestamp:   new Date().toISOString(),
    workspaceId,
    data,
  };

  await Promise.allSettled(
    hooks.map(hook =>
      fetch(hook.url, {
        method:  "POST",
        headers: {
          "Content-Type":      "application/json",
          "X-FindX-Event":     event,
          "X-FindX-Signature": `sha256=${hook.secret}`,
        },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(10000),
      }).catch(() => {/* fire and forget */}),
    ),
  );
}

export default router;
