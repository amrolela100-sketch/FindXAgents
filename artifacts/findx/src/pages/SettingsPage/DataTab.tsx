/**
 * SettingsPage — Data Management Tab
 *
 * Clear all leads, analyses, and outreach data (irreversible).
 *
 * @module SettingsPage/DataTab
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Trash2, Loader2, Shield, AlertTriangle } from "lucide-react";
import { clearAllData } from "@/lib/api";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, Alert } from "./shared";

export function DataTab() {
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: Record<string, number> } | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  async function handleClearAll() {
    setClearing(true); setClearError(null);
    try { const r = await clearAllData(); setClearResult({ deleted: (r as any).deleted || {} }); setConfirming(false); }
    catch (err) { setClearError(err instanceof Error ? err.message : "Failed"); }
    finally { setClearing(false); }
  }

  return (
    <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
      <SectionCard>
        <SectionHeader icon={Database} title="Data Management" subtitle="Delete all leads, analyses, and outreach emails" accent="#F87171" />
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-[12px]" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} strokeWidth={1.8} />
            <div>
              <p className="font-semibold mb-0.5" style={{ color: "#F87171" }}>Irreversible action</p>
              <p style={{ color: "var(--text-muted)" }}>This will permanently delete all leads, pipeline runs, analyses, and outreach emails. This cannot be undone.</p>
            </div>
          </div>

          {clearResult && <Alert type="success" message={`Cleared: ${Object.entries(clearResult.deleted).map(([k, v]) => `${v} ${k}`).join(", ")}`} onClose={() => setClearResult(null)} />}
          {clearError && <Alert type="error" message={clearError} onClose={() => setClearError(null)} />}

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
                <button onClick={handleClearAll} disabled={clearing} className="btn text-[12px] px-3 py-1.5 font-semibold gap-1.5" style={{ background: "#F87171", color: "#fff" }}>
                  {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />}
                  {clearing ? "Clearing…" : "Yes, delete"}
                </button>
                <button onClick={() => setConfirming(false)} className="btn btn-ghost text-[12px] px-3 py-1.5">Cancel</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SectionCard>
    </motion.div>
  );
}
