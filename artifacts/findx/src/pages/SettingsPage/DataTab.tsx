/**
 * SettingsPage — Data Management Tab (GDPR Enhanced)
 *
 * - Clear workspace data
 * - Download my data (GDPR export)
 * - Delete account
 *
 * @module SettingsPage/DataTab
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Database, Trash2, Loader2, Shield, AlertTriangle,
  Download, UserX, CheckCircle, FileJson
} from "lucide-react";
import { clearAllData } from "@/lib/api";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, Alert } from "./shared";
import { supabase } from "@/lib/supabase";

// ─── API helpers (not yet in api.ts, inline here) ────────────────────────────
async function exportUserData(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

  const res = await fetch(`${BASE}/data/export`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Export failed");

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `findx-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

async function deleteAccount(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

  const res = await fetch(`${BASE}/data/delete-account`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Delete account failed");
  await supabase.auth.signOut();
  window.location.href = "/";
}

export function DataTab() {
  // Clear all data state
  const [confirming,   setConfirming]   = useState(false);
  const [clearing,     setClearing]     = useState(false);
  const [clearResult,  setClearResult]  = useState<{ deleted: Record<string, number> } | null>(null);
  const [clearError,   setClearError]   = useState<string | null>(null);

  // Export state
  const [exporting,    setExporting]    = useState(false);
  const [exportDone,   setExportDone]   = useState(false);
  const [exportError,  setExportError]  = useState<string | null>(null);

  // Delete account state
  const [deleteStep,   setDeleteStep]   = useState<"idle" | "confirm1" | "confirm2">("idle");
  const [deleting,     setDeleting]     = useState(false);
  const [deleteError,  setDeleteError]  = useState<string | null>(null);
  const [confirmText,  setConfirmText]  = useState("");

  async function handleClearAll() {
    setClearing(true); setClearError(null);
    try {
      const r = await clearAllData();
      setClearResult({ deleted: (r as any).deleted || {} });
      setConfirming(false);
    } catch (err) {
      setClearError(err instanceof Error ? err.message : "Failed");
    } finally {
      setClearing(false);
    }
  }

  async function handleExport() {
    setExporting(true); setExportError(null); setExportDone(false);
    try {
      await exportUserData();
      setExportDone(true);
      setTimeout(() => setExportDone(false), 4000);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") return;
    setDeleting(true); setDeleteError(null);
    try {
      await deleteAccount();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  return (
    <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">

      {/* ── Download My Data ──────────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={FileJson}
          title="Download My Data"
          subtitle="Export all your leads, analyses, and account data as JSON (GDPR Article 20)"
          accent="var(--color-primary)"
        />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-[12px]"
            style={{ background: "rgba(217,119,6,0.08)", border: "1px solid rgba(217,119,6,0.20)" }}>
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "var(--color-primary)" }} strokeWidth={1.8} />
            <div style={{ color: "var(--text-muted)" }}>
              Includes your profile, workspaces, leads, analyses, pipeline runs, and agent logs. Email content is masked for recipient privacy.
            </div>
          </div>

          {exportError && <Alert type="error" message={exportError} onClose={() => setExportError(null)} />}

          <AnimatePresence mode="wait">
            {exportDone ? (
              <motion.div key="done" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "#22c55e" }}>
                <CheckCircle className="w-4 h-4" /> Download started!
              </motion.div>
            ) : (
              <motion.button key="export-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                onClick={handleExport}
                disabled={exporting}
                className="btn text-[13px] px-5 py-2.5 font-semibold gap-2"
                style={{ background: "rgba(217,119,6,0.12)", color: "var(--color-primary)", border: "1px solid rgba(217,119,6,0.25)" }}>
                {exporting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Preparing export…</>
                  : <><Download className="w-4 h-4" strokeWidth={1.8} /> Download My Data</>
                }
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>

      {/* ── Clear All Workspace Data ──────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader icon={Database} title="Clear Workspace Data" subtitle="Delete all leads, analyses, and outreach emails" accent="#F87171" />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-[12px]"
            style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} strokeWidth={1.8} />
            <div>
              <p className="font-semibold mb-0.5" style={{ color: "#F87171" }}>Irreversible action</p>
              <p style={{ color: "var(--text-muted)" }}>This will permanently delete all leads, pipeline runs, analyses, and outreach emails. This cannot be undone.</p>
            </div>
          </div>

          {clearResult && <Alert type="success" message={`Cleared: ${Object.entries(clearResult.deleted).map(([k, v]) => `${v} ${k}`).join(", ")}`} onClose={() => setClearResult(null)} />}
          {clearError  && <Alert type="error" message={clearError} onClose={() => setClearError(null)} />}

          <AnimatePresence mode="wait">
            {!confirming ? (
              <motion.button key="delete-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setConfirming(true)}
                className="btn text-[13px] px-5 py-2.5 font-semibold gap-2"
                style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}>
                <Trash2 className="w-4 h-4" strokeWidth={1.8} /> Clear All Data
              </motion.button>
            ) : (
              <motion.div key="confirm" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}>
                <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "#F87171" }} strokeWidth={1.8} />
                <span className="text-[12px] flex-1 font-medium" style={{ color: "#F87171" }}>Are you absolutely sure?</span>
                <button onClick={handleClearAll} disabled={clearing}
                  className="btn text-[12px] px-3 py-1.5 font-semibold gap-1.5"
                  style={{ background: "#F87171", color: "#fff" }}>
                  {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />}
                  {clearing ? "Clearing…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirming(false)} className="btn btn-ghost text-[12px] px-3 py-1.5">Cancel</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>

      {/* ── Delete Account ────────────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={UserX}
          title="Delete Account"
          subtitle="Permanently delete your account and all associated data (GDPR Article 17)"
          accent="#ef4444"
        />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-[12px]"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.20)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} strokeWidth={1.8} />
            <div>
              <p className="font-semibold mb-0.5" style={{ color: "#ef4444" }}>This action is permanent and cannot be reversed</p>
              <p style={{ color: "var(--text-muted)" }}>
                All your data including account, workspaces, leads, analyses, and pipeline runs will be permanently deleted.
                We recommend downloading your data first.
              </p>
            </div>
          </div>

          {deleteError && <Alert type="error" message={deleteError} onClose={() => setDeleteError(null)} />}

          <AnimatePresence mode="wait">
            {deleteStep === "idle" && (
              <motion.button key="del-idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setDeleteStep("confirm1")}
                className="btn text-[13px] px-5 py-2.5 font-semibold gap-2"
                style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.25)" }}>
                <UserX className="w-4 h-4" strokeWidth={1.8} /> Delete My Account
              </motion.button>
            )}

            {deleteStep === "confirm1" && (
              <motion.div key="del-confirm1" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3 px-4 py-4 rounded-xl"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
                <p className="text-[12px] font-semibold" style={{ color: "#ef4444" }}>
                  Are you sure you want to permanently delete your account?
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setDeleteStep("confirm2")}
                    className="btn text-[12px] px-4 py-1.5 font-semibold"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    Yes, continue
                  </button>
                  <button onClick={() => setDeleteStep("idle")} className="btn btn-ghost text-[12px] px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {deleteStep === "confirm2" && (
              <motion.div key="del-confirm2" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3 px-4 py-4 rounded-xl"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.20)" }}>
                <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                  Type <strong style={{ color: "#ef4444" }}>DELETE</strong> to confirm permanent deletion:
                </p>
                <input
                  type="text"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="input w-full text-[13px]"
                  style={{ borderColor: confirmText === "DELETE" ? "#ef4444" : undefined }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={confirmText !== "DELETE" || deleting}
                    className="btn text-[12px] px-4 py-1.5 font-semibold gap-1.5"
                    style={{
                      background: confirmText === "DELETE" ? "#ef4444" : "rgba(239,68,68,0.3)",
                      color: "#fff",
                      cursor: confirmText !== "DELETE" ? "not-allowed" : "pointer",
                    }}>
                    {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : <><UserX className="w-3.5 h-3.5" /> Delete Forever</>}
                  </button>
                  <button onClick={() => { setDeleteStep("idle"); setConfirmText(""); }} className="btn btn-ghost text-[12px] px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>
    </motion.div>
  );
}
