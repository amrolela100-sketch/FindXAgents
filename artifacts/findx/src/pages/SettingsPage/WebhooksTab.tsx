/**
 * SettingsPage — Webhooks Tab
 * Register outbound webhooks for pipeline events.
 *
 * @module SettingsPage/WebhooksTab
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Webhook, Plus, Trash2, Loader2,
  CheckCircle, XCircle, Zap, Radio, Copy
} from "lucide-react";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, Alert } from "./shared";
import { supabase } from "@/lib/supabase";

const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

async function authFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

interface WebhookRecord {
  id:         string;
  url:        string;
  events:     string[];
  secret?:    string;
  isActive:   boolean;
  createdAt:  string;
  lastPingAt: string | null;
  lastPingOk: boolean | null;
}

const ALL_EVENTS = [
  { id: "pipeline_complete",    label: "Pipeline Complete",    icon: "✅", desc: "When an agent pipeline finishes successfully" },
  { id: "pipeline_failed",      label: "Pipeline Failed",      icon: "❌", desc: "When a pipeline run fails" },
  { id: "lead_status_changed",  label: "Lead Status Changed",  icon: "🔄", desc: "When a lead moves to a new stage" },
  { id: "outreach_sent",        label: "Outreach Sent",        icon: "✉️", desc: "When an outreach email is sent" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function WebhooksTab() {
  const [webhooks,     setWebhooks]     = useState<WebhookRecord[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [success,      setSuccess]      = useState<string | null>(null);

  // Create form state
  const [showForm,     setShowForm]     = useState(false);
  const [newUrl,       setNewUrl]       = useState("");
  const [newEvents,    setNewEvents]    = useState<string[]>(["pipeline_complete"]);
  const [creating,     setCreating]     = useState(false);

  // Per-webhook state
  const [testingId,    setTestingId]    = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  const [copiedId,     setCopiedId]     = useState<string | null>(null);
  const [newSecret,    setNewSecret]    = useState<{ id: string; secret: string } | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const data = await authFetch("/webhooks");
      setWebhooks(data.webhooks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load webhooks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

  function toggleEvent(event: string) {
    setNewEvents(prev =>
      prev.includes(event) ? prev.filter(e => e !== event) : [...prev, event]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newUrl || newEvents.length === 0) return;
    setCreating(true); setError(null);
    try {
      const data = await authFetch("/webhooks", {
        method: "POST",
        body:   JSON.stringify({ url: newUrl, events: newEvents, isActive: true }),
      });
      setNewSecret({ id: data.webhook.id, secret: data.webhook.secret });
      setWebhooks(prev => [...prev, data.webhook]);
      setNewUrl(""); setNewEvents(["pipeline_complete"]); setShowForm(false);
      setSuccess("Webhook created! Save the secret — it won't be shown again.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(hook: WebhookRecord) {
    try {
      const data = await authFetch(`/webhooks/${hook.id}`, {
        method: "PATCH",
        body:   JSON.stringify({ isActive: !hook.isActive }),
      });
      setWebhooks(prev => prev.map(h => h.id === hook.id ? data.webhook : h));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update webhook");
    }
  }

  async function handleTest(hookId: string) {
    setTestingId(hookId); setError(null);
    try {
      const data = await authFetch(`/webhooks/${hookId}/test`, { method: "POST" });
      setWebhooks(prev => prev.map(h => h.id === hookId ? {
        ...h,
        lastPingAt: new Date().toISOString(),
        lastPingOk: data.ok,
      } : h));
      if (data.ok) setSuccess("Test ping delivered ✅");
      else setError(`Endpoint returned: ${data.message}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingId(null);
    }
  }

  async function handleDelete(hookId: string) {
    setDeletingId(hookId);
    try {
      await authFetch(`/webhooks/${hookId}`, { method: "DELETE" });
      setWebhooks(prev => prev.filter(h => h.id !== hookId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  async function copySecret(secret: string, hookId: string) {
    await navigator.clipboard.writeText(secret);
    setCopiedId(hookId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <motion.div custom={4} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">

      {/* ── New secret reveal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {newSecret && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="p-4 rounded-xl"
            style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)" }}
          >
            <p className="text-[12px] font-bold mb-2" style={{ color: "#22c55e" }}>
              ⚠️ Save your webhook secret — shown only once!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[11px] px-3 py-2 rounded-lg font-mono break-all"
                style={{ background: "rgba(0,0,0,0.2)", color: "var(--text)" }}>
                {newSecret.secret}
              </code>
              <button
                onClick={() => copySecret(newSecret.secret, newSecret.id)}
                className="btn btn-ghost p-2"
                title="Copy secret"
              >
                {copiedId === newSecret.id
                  ? <CheckCircle className="w-4 h-4" style={{ color: "#22c55e" }} />
                  : <Copy className="w-4 h-4" style={{ color: "var(--text-muted)" }} />
                }
              </button>
            </div>
            <button onClick={() => setNewSecret(null)} className="text-[11px] mt-2" style={{ color: "var(--text-subtle)" }}>
              I've saved it, dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}
      {error   && <Alert type="error"   message={error}   onClose={() => setError(null)}   />}

      {/* ── Register Webhook ──────────────────────────────────────────────── */}
      <SectionCard>
        <div className="flex items-center justify-between px-5 pt-5">
          <SectionHeader icon={Webhook} title="Webhooks" subtitle="Send real-time events to your own endpoints" accent="var(--color-primary)" />
          <button
            onClick={() => setShowForm(v => !v)}
            className="btn text-[12px] px-4 py-2 font-semibold gap-1.5"
            style={{ background: showForm ? "var(--glass)" : "var(--color-primary)", color: showForm ? "var(--text)" : "#fff" }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            {showForm ? "Cancel" : "Add Webhook"}
          </button>
        </div>

        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={handleCreate} className="px-5 pb-5 pt-2 space-y-4">
                {/* URL */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Endpoint URL (HTTPS required)
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={e => setNewUrl(e.target.value)}
                    placeholder="https://yourapp.com/webhooks/findx"
                    required
                    className="input w-full text-[13px]"
                  />
                </div>

                {/* Events */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    Events to subscribe
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_EVENTS.map(ev => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => toggleEvent(ev.id)}
                        className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all"
                        style={{
                          background:  newEvents.includes(ev.id) ? "rgba(217,119,6,0.10)" : "var(--glass)",
                          border:      `1px solid ${newEvents.includes(ev.id) ? "rgba(217,119,6,0.3)" : "var(--glass-border)"}`,
                        }}
                      >
                        <span className="text-base leading-none mt-0.5">{ev.icon}</span>
                        <div>
                          <p className="text-[12px] font-semibold" style={{ color: "var(--text)" }}>{ev.label}</p>
                          <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{ev.desc}</p>
                        </div>
                        {newEvents.includes(ev.id) && (
                          <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creating || !newUrl || newEvents.length === 0}
                  className="btn text-[13px] px-5 py-2.5 font-semibold gap-2"
                  style={{ background: "var(--color-primary)", color: "#fff", opacity: creating ? 0.7 : 1 }}
                >
                  {creating
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</>
                    : <><Plus className="w-4 h-4" strokeWidth={2} /> Register Webhook</>
                  }
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* ── Webhook List ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2" style={{ color: "var(--text-muted)" }}>
          <Loader2 className="w-4 h-4 animate-spin" /><span className="text-[13px]">Loading webhooks…</span>
        </div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-10">
          <Webhook className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--text-subtle)" }} strokeWidth={1.4} />
          <p className="text-[14px] font-semibold" style={{ color: "var(--text-muted)" }}>No webhooks yet</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-subtle)" }}>Add a webhook to receive real-time events</p>
        </div>
      ) : (
        <div className="space-y-3">
          {webhooks.map(hook => (
            <SectionCard key={hook.id}>
              <div className="p-4 space-y-3">
                {/* URL + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <code className="text-[12px] font-mono break-all" style={{ color: "var(--text)" }}>
                      {hook.url}
                    </code>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {hook.events.map(ev => {
                        const meta = ALL_EVENTS.find(e => e.id === ev);
                        return (
                          <span key={ev} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(217,119,6,0.10)", color: "var(--color-primary)", border: "1px solid rgba(217,119,6,0.2)" }}>
                            {meta?.icon} {meta?.label ?? ev}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(hook)}
                    className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg font-semibold flex-shrink-0"
                    style={{
                      background: hook.isActive ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
                      color:      hook.isActive ? "#22c55e" : "#ef4444",
                      border:     `1px solid ${hook.isActive ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                    }}
                    title={hook.isActive ? "Click to disable" : "Click to enable"}
                  >
                    <Radio className="w-3 h-3" />
                    {hook.isActive ? "Active" : "Paused"}
                  </button>
                </div>

                {/* Last ping status */}
                {hook.lastPingAt && (
                  <div className="flex items-center gap-2 text-[11px]" style={{ color: "var(--text-subtle)" }}>
                    {hook.lastPingOk
                      ? <CheckCircle className="w-3.5 h-3.5" style={{ color: "#22c55e" }} />
                      : <XCircle    className="w-3.5 h-3.5" style={{ color: "#ef4444" }} />
                    }
                    Last ping {timeAgo(hook.lastPingAt)} — {hook.lastPingOk ? "success" : "failed"}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleTest(hook.id)}
                    disabled={testingId === hook.id}
                    className="btn text-[11px] px-3 py-1.5 font-semibold gap-1.5"
                    style={{ background: "rgba(217,119,6,0.10)", color: "var(--color-primary)", border: "1px solid rgba(217,119,6,0.2)" }}
                  >
                    {testingId === hook.id
                      ? <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
                      : <><Zap className="w-3 h-3" strokeWidth={2} /> Test</>
                    }
                  </button>

                  <button
                    onClick={() => handleDelete(hook.id)}
                    disabled={deletingId === hook.id}
                    className="btn btn-ghost text-[11px] px-3 py-1.5 gap-1.5"
                    style={{ color: "#ef4444" }}
                  >
                    {deletingId === hook.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Trash2  className="w-3 h-3" strokeWidth={1.8} />
                    }
                    Delete
                  </button>

                  <span className="text-[10px] ml-auto" style={{ color: "var(--text-subtle)" }}>
                    Created {timeAgo(hook.createdAt)}
                  </span>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </motion.div>
  );
}
