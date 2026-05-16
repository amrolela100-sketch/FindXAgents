/**
 * SettingsPage — Shared UI Components
 *
 * Reusable atoms used across all settings tabs:
 * SectionCard, SectionHeader, FieldLabel, StatusBadge, Alert, PasswordField, AdvancedSettings
 *
 * @module SettingsPage/shared
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, AlertCircle, CheckCircle2, AlertTriangle, Eye, EyeOff,
  ChevronUp, ChevronDown, Settings2, Plus,
} from "lucide-react";
import type { AiFormState } from "./provider-config";
import { EMPTY_FORM } from "./provider-config";

// ─── Section Card ─────────────────────────────────────────────────────────────

export function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "var(--brand)",
  action,
}: {
  icon: typeof Settings2;
  title: string;
  subtitle?: string;
  accent?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accent}15`, border: `1px solid ${accent}25` }}
        >
          <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.8} />
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>{title}</p>
          {subtitle && <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ─── Field Label ──────────────────────────────────────────────────────────────

export function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {children}
      </span>
      {hint && <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-subtle)" }}>{hint}</span>}
    </label>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold"
      style={{
        background: ok ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
        color: ok ? "#34D399" : "#F87171",
        border: `1px solid ${ok ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
      }}
    >
      {ok ? <CheckCircle2 className="w-3 h-3" strokeWidth={2} /> : <AlertCircle className="w-3 h-3" strokeWidth={2} />}
      {label}
    </span>
  );
}

// ─── Alert Banner ─────────────────────────────────────────────────────────────

export function Alert({
  type,
  message,
  onClose,
}: { type: "success" | "error" | "warn"; message: string; onClose?: () => void }) {
  const styles = {
    success: { bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.25)", color: "#34D399", Icon: CheckCircle2 },
    error:   { bg: "rgba(248,113,113,0.10)", border: "rgba(248,113,113,0.25)", color: "#F87171", Icon: AlertCircle },
    warn:    { bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)", color: "#FBBF24", Icon: AlertTriangle },
  }[type];
  const { Icon } = styles;
  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[12px]"
      style={{ background: styles.bg, border: `1px solid ${styles.border}`, color: styles.color }}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
      <span className="flex-1">{message}</span>
      {onClose && (
        <button onClick={onClose} className="opacity-70 hover:opacity-100 transition-opacity">
          <X className="w-3.5 h-3.5" strokeWidth={1.8} />
        </button>
      )}
    </div>
  );
}

// ─── Password Field ───────────────────────────────────────────────────────────

export function PasswordField({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input pr-10 text-[13px]"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
        style={{ color: "var(--text-muted)" }}
      >
        {show ? <EyeOff className="w-4 h-4" strokeWidth={1.8} /> : <Eye className="w-4 h-4" strokeWidth={1.8} />}
      </button>
    </div>
  );
}

// ─── Advanced Settings Collapsible ────────────────────────────────────────────

export function AdvancedSettings({
  form, setForm, baseUrlEditable, isOllama,
}: {
  form: AiFormState;
  setForm: (f: AiFormState) => void;
  baseUrlEditable: boolean;
  isOllama: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors"
        style={{ background: "var(--glass-raised)" }}
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Advanced Settings
        </span>
        {open
          ? <ChevronUp className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />
          : <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-subtle)" }} strokeWidth={1.8} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-3">
              <div>
                <FieldLabel>Display Name</FieldLabel>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My Provider"
                  className="input text-[13px]"
                />
              </div>
              {(baseUrlEditable || isOllama) && (
                <div>
                  <FieldLabel hint={isOllama ? "(default: http://localhost:11434/v1)" : undefined}>
                    Base URL
                  </FieldLabel>
                  <input
                    type="text"
                    value={form.baseUrl}
                    onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                    placeholder={isOllama ? "http://localhost:11434/v1" : "https://api.example.com/v1"}
                    className="input text-[13px]"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel hint="(0–2, default 0.7)">Temperature</FieldLabel>
                  <input
                    type="number" step="0.1" min="0" max="2"
                    value={form.temperature}
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })}
                    placeholder="0.7"
                    className="input text-[13px]"
                  />
                </div>
                <div>
                  <FieldLabel hint="(default 4096)">Max Tokens</FieldLabel>
                  <input
                    type="number" min="1" max="65536"
                    value={form.maxTokens}
                    onChange={(e) => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
                    className="input text-[13px]"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
