/**
 * SettingsPage — AI Providers Tab
 *
 * Manage AI provider configurations: add, edit, delete, test, set default.
 * Supports OpenAI, Anthropic, Google, Groq, OpenRouter, DeepSeek, Mistral,
 * Together AI, Ollama, and custom providers.
 *
 * @module SettingsPage/AIProvidersTab
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Trash2, Loader2, CheckCircle2, Plus, X, Star, ExternalLink,
  Settings2, Bot, Cpu, Check, TestTube, AlertCircle,
} from "lucide-react";
import {
  getAiProviders, createAiProvider, updateAiProvider, deleteAiProvider,
  testAiProvider, setDefaultAiProvider,
} from "@/lib/api";
import type { AiProvider, AiProviderType } from "@/lib/types";
import { PROVIDER_TYPES, EMPTY_FORM, FADE_UP } from "./provider-config";
import type { AiFormState } from "./provider-config";
import {
  SectionCard, SectionHeader, FieldLabel, Alert, PasswordField,
  AdvancedSettings,
} from "./shared";

// ─── Tab Component ────────────────────────────────────────────────────────────

export function AIProvidersTab() {
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const [activeProvider, setActiveProvider] = useState<{ name: string; providerType: string; model: string; isEnvFallback?: boolean } | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AiFormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; error?: string; model?: string } | null>(null);

  // ── Loaders ────────────────────────────────────────────────────────────────
  async function loadAiProviders() {
    try {
      const data = await getAiProviders();
      setAiProviders(data.providers);
      const def = data.providers.find((p) => p.isDefault);
      if (def) setActiveProvider({ name: def.name, providerType: def.providerType, model: def.model });
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to load AI providers");
    } finally { setAiLoading(false); }
  }

  // Load on mount (caller handles this via index.tsx, but we also support standalone)
  useState(() => { loadAiProviders(); });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function openAddForm() {
    setEditingId(null);
    const def = PROVIDER_TYPES.find((p) => p.value === "openai")!;
    setForm({ ...EMPTY_FORM, name: def.label, baseUrl: def.defaultBaseUrl, model: def.defaultModel });
    setShowForm(true);
  }

  function handleProviderTypeChange(value: string) {
    const def = PROVIDER_TYPES.find((p) => p.value === value);
    if (!def) return;
    setForm((f) => ({
      ...f,
      providerType: value as AiProviderType,
      name: f.name && f.name !== PROVIDER_TYPES.find((p) => p.value === f.providerType)?.label ? f.name : def.label,
      baseUrl: def.defaultBaseUrl,
      model: def.defaultModel,
    }));
  }

  function openEditForm(provider: AiProvider) {
    setEditingId(provider.id);
    setForm({
      providerType: provider.providerType,
      name: provider.name,
      apiKey: "",
      baseUrl: provider.baseUrl || "",
      model: provider.model,
      temperature: provider.temperature != null ? String(provider.temperature) : "",
      maxTokens: provider.maxTokens,
    });
    setShowForm(true);
  }

  async function handleSaveProvider() {
    setSaving(true); setAiError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name, providerType: form.providerType,
        baseUrl: form.baseUrl || undefined, model: form.model,
        temperature: form.temperature || undefined, maxTokens: form.maxTokens,
      };
      if (!editingId || form.apiKey) payload.apiKey = form.apiKey || undefined;
      if (editingId) {
        await updateAiProvider(editingId, payload as any);
      } else {
        const result = await createAiProvider(payload as any);
        const isFirst = !aiProviders || aiProviders.length === 0;
        if (isFirst && (result as any)?.provider?.id) {
          await setDefaultAiProvider((result as any).provider.id);
        }
      }
      setShowForm(false); setEditingId(null); await loadAiProviders();
    } catch (err) { setAiError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  }

  async function handleDeleteProvider(id: string) {
    try { await deleteAiProvider(id); await loadAiProviders(); }
    catch (err) { setAiError(err instanceof Error ? err.message : "Failed to delete"); }
  }

  async function handleTestProvider(id: string) {
    setTesting(id); setTestResult(null);
    try { const r = await testAiProvider(id); setTestResult({ id, ok: (r as any).success ?? (r as any).ok, error: (r as any).message ?? (r as any).error, model: (r as any).model }); }
    catch (err) { setTestResult({ id, ok: false, error: err instanceof Error ? err.message : "Test failed" }); }
    finally { setTesting(null); }
  }

  async function handleSetDefault(id: string) {
    try { await setDefaultAiProvider(id); await loadAiProviders(); }
    catch (err) { setAiError(err instanceof Error ? err.message : "Failed to set default"); }
  }

  const provCfg = PROVIDER_TYPES.find((p) => p.value === form.providerType) ?? PROVIDER_TYPES[0];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
      {/* Active provider banner */}
      {activeProvider && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(52,211,153,0.15)" }}>
            <Zap className="w-4 h-4" style={{ color: "#34D399" }} strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[12px] font-bold" style={{ color: "#34D399" }}>Active Provider</p>
              {activeProvider.isEnvFallback && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24" }}>ENV</span>}
            </div>
            <p className="text-[11px] truncate font-mono" style={{ color: "#34D399", opacity: 0.8 }}>
              {PROVIDER_TYPES.find((t) => t.value === activeProvider.providerType)?.label ?? activeProvider.providerType} · {activeProvider.model}
            </p>
          </div>
        </div>
      )}

      {/* Providers list */}
      <SectionCard>
        <SectionHeader icon={Cpu} title="AI Providers" subtitle="Configure language models for the pipeline" accent="#C084FC"
          action={
            <button onClick={openAddForm} className="btn btn-primary text-[12px] px-3.5 py-2 gap-1.5 font-semibold">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Add Provider
            </button>
          }
        />
        <div className="p-4 space-y-2">
          {aiLoading ? (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-muted)" }} />
              <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>Loading providers…</span>
            </div>
          ) : aiProviders.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(192,132,252,0.10)", border: "1px solid rgba(192,132,252,0.18)" }}>
                <Bot className="w-6 h-6" style={{ color: "#C084FC", opacity: 0.6 }} strokeWidth={1.5} />
              </div>
              <p className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>No AI providers configured</p>
              <p className="text-[11px]" style={{ color: "var(--text-subtle)" }}>Add one or set env vars as fallback</p>
            </div>
          ) : (
            aiProviders.map((provider) => {
              const info = PROVIDER_TYPES.find((t) => t.value === provider.providerType);
              const isTest = testing === provider.id;
              const result = testResult?.id === provider.id ? testResult : null;
              return (
                <div key={provider.id} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                  style={{ background: provider.isDefault ? "var(--glass-raised)" : "var(--glass)", border: `1px solid ${provider.isDefault ? "var(--glass-border-strong)" : "var(--glass-border)"}` }}>
                  <span className="text-xl flex-shrink-0">{info?.icon ?? "🤖"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>{provider.name}</p>
                      {provider.isDefault && <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "var(--brand)", border: "1px solid rgba(245,158,11,0.25)" }}>DEFAULT</span>}
                      {!provider.isActive && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--glass-raised)", color: "var(--text-subtle)" }}>INACTIVE</span>}
                    </div>
                    <p className="text-[11px] font-mono truncate" style={{ color: "var(--text-subtle)" }}>{info?.label} · {provider.model}</p>
                    {result && <p className="text-[11px] mt-0.5" style={{ color: result.ok ? "#34D399" : "#F87171" }}>{result.ok ? `✓ OK · ${result.model ?? ""}` : `✗ ${result.error}`}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleTestProvider(provider.id)} disabled={isTest} title="Test connection"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.20)", color: "#60A5FA" }}>
                      {isTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" strokeWidth={2} />} Test
                    </button>
                    {!provider.isDefault && (
                      <button onClick={() => handleSetDefault(provider.id)} title="Set as default"
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                        style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.20)", color: "#F59E0B" }}>
                        <Star className="w-3 h-3" strokeWidth={2} /> Default
                      </button>
                    )}
                    <button onClick={() => openEditForm(provider)} title="Edit"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)", color: "var(--text-muted)" }}>
                      <Settings2 className="w-3 h-3" strokeWidth={2} /> Edit
                    </button>
                    <button onClick={() => handleDeleteProvider(provider.id)} title="Delete"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.18)", color: "#F87171" }}>
                      <Trash2 className="w-3 h-3" strokeWidth={2} /> Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {aiError && <Alert type="error" message={aiError} onClose={() => setAiError(null)} />}
        </div>
      </SectionCard>

      {/* Add/Edit Provider Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }} className="overflow-hidden">
            <SectionCard>
              <SectionHeader icon={editingId ? Settings2 : Plus} title={editingId ? "Edit Provider" : "Add AI Provider"} accent="#C084FC"
                action={<button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-ghost w-7 h-7 p-0 rounded-lg"><X className="w-3.5 h-3.5" strokeWidth={1.8} /></button>}
              />
              <div className="p-5 space-y-5">
                {/* Provider picker */}
                {!editingId && (
                  <div>
                    <FieldLabel>① Choose Provider</FieldLabel>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                      {PROVIDER_TYPES.map((p) => (
                        <button key={p.value} onClick={() => handleProviderTypeChange(p.value)}
                          className="flex flex-col items-start gap-1 p-3 rounded-xl transition-all text-left"
                          style={{ background: form.providerType === p.value ? `${p.color}12` : "var(--glass-raised)", border: `1px solid ${form.providerType === p.value ? p.color + "40" : "var(--glass-border)"}`, boxShadow: form.providerType === p.value ? `0 0 12px ${p.color}15` : "none" }}>
                          <span className="text-lg">{p.icon}</span>
                          <span className="text-[11px] font-semibold leading-tight" style={{ color: form.providerType === p.value ? p.color : "var(--text-muted)" }}>{p.label}</span>
                        </button>
                      ))}
                    </div>
                    <div className="flex items-start gap-2.5 mt-3 px-3.5 py-2.5 rounded-xl text-[12px]" style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}>
                      <span className="text-base mt-0.5 flex-shrink-0">{provCfg.icon}</span>
                      <div>
                        <p className="font-semibold" style={{ color: "var(--text)" }}>{provCfg.label}</p>
                        <p style={{ color: "var(--text-muted)" }}>{provCfg.description}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* API Key */}
                <div>
                  <FieldLabel>{editingId ? "🔑 API Key" : "② API Key"}</FieldLabel>
                  {provCfg.apiKeyUrl && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] mb-2" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)" }}>
                      <span style={{ color: "#60A5FA" }}>Get your key from</span>
                      <a href={provCfg.apiKeyUrl} target="_blank" rel="noopener noreferrer" className="font-semibold flex items-center gap-1 underline" style={{ color: "#60A5FA" }}>
                        {provCfg.apiKeyUrlLabel} <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
                      </a>
                    </div>
                  )}
                  {provCfg.value === "ollama" && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] mb-2" style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", color: "#34D399" }}>
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} /> No API key needed — Ollama runs locally
                    </div>
                  )}
                  <PasswordField value={form.apiKey} onChange={(v) => setForm({ ...form, apiKey: v })} placeholder={editingId ? "Leave empty to keep current key" : provCfg.apiKeyPlaceholder} />
                  {provCfg.keyPrefix && form.apiKey && !form.apiKey.startsWith(provCfg.keyPrefix) && (
                    <Alert type="warn" message={`${provCfg.label} keys start with ${provCfg.keyPrefix}`} />
                  )}
                </div>

                {/* Model */}
                <div>
                  <FieldLabel>{editingId ? "🧩 Model" : "③ Choose Model"}</FieldLabel>
                  {provCfg.models.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 mb-2">
                      {provCfg.models.map((m) => (
                        <button key={m} onClick={() => setForm({ ...form, model: m })} className="text-left px-3 py-2 rounded-xl text-[12px] transition-all"
                          style={{ background: form.model === m ? "rgba(192,132,252,0.10)" : "var(--glass-raised)", border: `1px solid ${form.model === m ? "rgba(192,132,252,0.30)" : "var(--glass-border)"}`, color: form.model === m ? "#C084FC" : "var(--text-muted)", fontWeight: form.model === m ? "600" : "400" }}>
                          {m}
                          {m === provCfg.defaultModel && <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "var(--brand)" }}>recommended</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder={provCfg.models.length > 0 ? "Or type custom model…" : "e.g. gpt-4o"} className="input text-[13px]" />
                </div>

                <AdvancedSettings form={form} setForm={setForm} baseUrlEditable={provCfg.baseUrlEditable || !!editingId} isOllama={provCfg.value === "ollama"} />

                <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
                  <button onClick={handleSaveProvider} disabled={saving || !form.name || !form.model} className="btn btn-primary text-[13px] px-5 py-2.5 gap-2 font-semibold">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
                    {saving ? "Saving…" : editingId ? "Update Provider" : "Add Provider"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-ghost text-[13px] px-4 py-2.5">Cancel</button>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
