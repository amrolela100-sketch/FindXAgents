/**
 * SettingsPage — Email Configuration Tab
 *
 * Manage email providers: Resend, SMTP, Gmail.
 * Select default provider and configure each service.
 *
 * @module SettingsPage/EmailTab
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Send, Globe, Loader2, Check, Trash2, TestTube,
} from "lucide-react";
import {
  getEmailSettings, setEmailSettings,
  getSmtpConfig, saveSmtpConfig, deleteSmtpConfig,
  getResendConfig, saveResendConfig, deleteResendConfig, testResendConfig,
  toastError,
} from "@/lib/api";
import type { SmtpConfigResponse, ResendConfigResponse } from "@/lib/types";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, FieldLabel, StatusBadge, Alert, PasswordField } from "./shared";

// ─── Tab Component ────────────────────────────────────────────────────────────

export function EmailTab() {
  // Email state
  const [emailSettings, setEmailSettingsState] = useState<{ defaultProvider: string | null; providers?: Record<string, { configured: boolean; email: string | null; source?: string | null }> } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  // SMTP state
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigResponse | null>(null);
  const [smtpForm, setSmtpForm] = useState({ host: "", port: 465, secure: true, user: "", password: "", fromEmail: "", fromName: "FindX" });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpDeleting, setSmtpDeleting] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [smtpSuccess, setSmtpSuccess] = useState<string | null>(null);
  const [showSmtpForm, setShowSmtpForm] = useState(false);

  // Resend state
  const [resendConfig, setResendConfig] = useState<ResendConfigResponse | null>(null);
  const [resendForm, setResendForm] = useState({ apiKey: "", fromEmail: "FindX <onboarding@resend.dev>" });
  const [resendSaving, setResendSaving] = useState(false);
  const [resendTesting, setResendTesting] = useState(false);
  const [resendDeleting, setResendDeleting] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);

  // ── Loaders ────────────────────────────────────────────────────────────────
  async function loadEmailSettings() {
    try { const d = await getEmailSettings(); setEmailSettingsState({ defaultProvider: d.defaultProvider, providers: d.providers as any }); }
    catch (err) { toastError(err, "Failed to load email settings"); }
  }
  async function loadSmtpConfig() {
    try { const d = await getSmtpConfig(); setSmtpConfig(d); if (d.configured && d.host) setSmtpForm({ host: d.host ?? "", port: d.port ?? 465, secure: d.secure ?? true, user: d.user ?? "", password: "", fromEmail: d.fromEmail ?? "", fromName: d.fromName ?? "FindX" }); }
    catch (err) { toastError(err, "Failed to load SMTP config"); }
  }
  async function loadResendConfig() {
    try { const d = await getResendConfig(); setResendConfig(d); if (d.configured && d.fromEmail) setResendForm((f) => ({ ...f, fromEmail: d.fromEmail ?? f.fromEmail })); }
    catch (err) { toastError(err, "Failed to load Resend config"); }
  }

  useEffect(() => { loadEmailSettings(); loadSmtpConfig(); loadResendConfig(); }, []);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleSetEmailDefault(provider: "gmail" | "smtp" | "resend") {
    try { await setEmailSettings({ defaultProvider: provider }); await loadEmailSettings(); }
    catch (err) { setProviderError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleSaveSmtp() {
    setSmtpSaving(true); setSmtpError(null); setSmtpSuccess(null);
    try { const d = await saveSmtpConfig(smtpForm); setSmtpConfig(d); setShowSmtpForm(false); setSmtpSuccess("SMTP saved."); await loadEmailSettings(); }
    catch (err) { setSmtpError(err instanceof Error ? err.message : "Failed"); }
    finally { setSmtpSaving(false); }
  }
  async function handleDeleteSmtp() {
    setSmtpDeleting(true); setSmtpError(null);
    try { await deleteSmtpConfig(); setSmtpConfig({ configured: false }); setSmtpForm({ host: "", port: 465, secure: true, user: "", password: "", fromEmail: "", fromName: "FindX" }); setShowSmtpForm(false); await loadEmailSettings(); }
    catch (err) { setSmtpError(err instanceof Error ? err.message : "Failed"); }
    finally { setSmtpDeleting(false); }
  }
  async function handleSaveResend() {
    setResendSaving(true); setResendError(null); setResendSuccess(null);
    try { const d = await saveResendConfig(resendForm); setResendConfig(d); setShowResendForm(false); setResendForm((f) => ({ ...f, apiKey: "" })); setResendSuccess("Resend saved."); await loadEmailSettings(); }
    catch (err) { setResendError(err instanceof Error ? err.message : "Failed"); }
    finally { setResendSaving(false); }
  }
  async function handleTestResend() {
    setResendTesting(true); setResendError(null); setResendSuccess(null);
    try { const r = await testResendConfig(); if (r.ok) setResendSuccess(r.message ?? "OK"); else setResendError(r.error ?? "Failed"); }
    catch (err) { setResendError(err instanceof Error ? err.message : "Failed"); }
    finally { setResendTesting(false); }
  }
  async function handleDeleteResend() {
    setResendDeleting(true); setResendError(null);
    try { await deleteResendConfig(); setResendConfig({ configured: false }); setResendForm({ apiKey: "", fromEmail: "FindX <onboarding@resend.dev>" }); setShowResendForm(false); await loadEmailSettings(); }
    catch (err) { setResendError(err instanceof Error ? err.message : "Failed"); }
    finally { setResendDeleting(false); }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
      {/* Default provider selector */}
      {emailSettings && (
        <SectionCard>
          <SectionHeader icon={Mail} title="Email Providers" subtitle="Choose which service sends your outreach emails" accent="#60A5FA" />
          <div className="p-4 space-y-3">
            <div>
              <FieldLabel>Default Provider</FieldLabel>
              <div className="flex gap-2">
                {(["resend", "smtp", "gmail"] as const).map((p) => {
                  const isConfigured = emailSettings.providers?.[p]?.configured;
                  const isDefault = emailSettings.defaultProvider === p;
                  return (
                    <button key={p} onClick={() => handleSetEmailDefault(p)} disabled={!isConfigured}
                      className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed capitalize"
                      style={isDefault ? { background: "rgba(96,165,250,0.15)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.30)" } : { background: "var(--glass-raised)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}>
                      {isDefault && <span className="mr-1">✓</span>}{p}
                    </button>
                  );
                })}
              </div>
              {providerError && <Alert type="error" message={providerError} />}
            </div>
          </div>
        </SectionCard>
      )}

      {/* Resend */}
      <SectionCard>
        <SectionHeader icon={Send} title="Resend" subtitle="Transactional email via Resend API" accent="#60A5FA"
          action={
            <div className="flex items-center gap-2">
              {resendConfig?.configured && <StatusBadge ok={true} label={resendConfig.source === "env" ? "via ENV" : "Configured"} />}
              <button onClick={() => { setShowResendForm(!showResendForm); setResendError(null); setResendSuccess(null); }} className="btn btn-secondary text-[12px] px-3 py-1.5 gap-1.5">
                {showResendForm ? "Cancel" : resendConfig?.configured ? "Update" : "Configure"}
              </button>
              {resendConfig?.configured && (
                <>
                  <button onClick={handleTestResend} disabled={resendTesting} className="btn btn-ghost text-[12px] px-3 py-1.5 gap-1.5">
                    {resendTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" strokeWidth={1.8} />} Test
                  </button>
                  <button onClick={handleDeleteResend} disabled={resendDeleting} className="btn btn-ghost text-[12px] px-3 py-1.5" style={{ color: "#F87171" }}>
                    {resendDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
                  </button>
                </>
              )}
            </div>
          }
        />
        <AnimatePresence>
          {showResendForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-5 space-y-3">
                <div><FieldLabel>Resend API Key</FieldLabel><PasswordField value={resendForm.apiKey} onChange={(v) => setResendForm((f) => ({ ...f, apiKey: v }))} placeholder="re_..." /></div>
                <div><FieldLabel>From Email</FieldLabel><input type="text" value={resendForm.fromEmail} onChange={(e) => setResendForm((f) => ({ ...f, fromEmail: e.target.value }))} className="input text-[13px]" placeholder="FindX <noreply@yourdomain.com>" /></div>
                {resendError && <Alert type="error" message={resendError} onClose={() => setResendError(null)} />}
                {resendSuccess && <Alert type="success" message={resendSuccess} onClose={() => setResendSuccess(null)} />}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveResend} disabled={resendSaving} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                    {resendSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />} Save
                  </button>
                  <button onClick={() => setShowResendForm(false)} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {resendSuccess && !showResendForm && <div className="px-5 pb-4"><Alert type="success" message={resendSuccess} onClose={() => setResendSuccess(null)} /></div>}
      </SectionCard>

      {/* SMTP */}
      <SectionCard>
        <SectionHeader icon={Globe} title="SMTP" subtitle="Connect your own SMTP server" accent="#60A5FA"
          action={
            <div className="flex items-center gap-2">
              {smtpConfig?.configured && <StatusBadge ok={true} label="Configured" />}
              <button onClick={() => { setShowSmtpForm(!showSmtpForm); setSmtpError(null); setSmtpSuccess(null); }} className="btn btn-secondary text-[12px] px-3 py-1.5">
                {showSmtpForm ? "Cancel" : smtpConfig?.configured ? "Update" : "Configure"}
              </button>
              {smtpConfig?.configured && (
                <button onClick={handleDeleteSmtp} disabled={smtpDeleting} className="btn btn-ghost text-[12px] px-3 py-1.5" style={{ color: "#F87171" }}>
                  {smtpDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
                </button>
              )}
            </div>
          }
        />
        <AnimatePresence>
          {showSmtpForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>Host</FieldLabel><input type="text" value={smtpForm.host} onChange={(e) => setSmtpForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.gmail.com" className="input text-[13px]" /></div>
                  <div><FieldLabel>Port</FieldLabel><input type="number" value={smtpForm.port} onChange={(e) => setSmtpForm((f) => ({ ...f, port: parseInt(e.target.value) }))} className="input text-[13px]" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>Username</FieldLabel><input type="text" value={smtpForm.user} onChange={(e) => setSmtpForm((f) => ({ ...f, user: e.target.value }))} className="input text-[13px]" /></div>
                  <div><FieldLabel>Password</FieldLabel><PasswordField value={smtpForm.password} onChange={(v) => setSmtpForm((f) => ({ ...f, password: v }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><FieldLabel>From Email</FieldLabel><input type="email" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm((f) => ({ ...f, fromEmail: e.target.value }))} className="input text-[13px]" /></div>
                  <div><FieldLabel>From Name</FieldLabel><input type="text" value={smtpForm.fromName} onChange={(e) => setSmtpForm((f) => ({ ...f, fromName: e.target.value }))} className="input text-[13px]" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="smtp-secure" checked={smtpForm.secure} onChange={(e) => setSmtpForm((f) => ({ ...f, secure: e.target.checked }))} className="rounded" />
                  <label htmlFor="smtp-secure" className="text-[12px]" style={{ color: "var(--text-muted)" }}>Use TLS/SSL</label>
                </div>
                {smtpError && <Alert type="error" message={smtpError} onClose={() => setSmtpError(null)} />}
                {smtpSuccess && <Alert type="success" message={smtpSuccess} onClose={() => setSmtpSuccess(null)} />}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveSmtp} disabled={smtpSaving} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                    {smtpSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />} Save
                  </button>
                  <button onClick={() => setShowSmtpForm(false)} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>
    </motion.div>
  );
}
