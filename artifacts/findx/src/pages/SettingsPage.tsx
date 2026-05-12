import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Trash2, Bell, Mail, AlertTriangle, Loader2,
  CheckCircle2, Plus, X, Star, Eye, EyeOff, ExternalLink,
  ChevronDown, ChevronUp, Settings2, Search, Bot, Shield,
  Send, MessageSquare, Database, Cpu, Key, Globe, ChevronRight,
  AlertCircle, Check, RefreshCw, TestTube,
} from "lucide-react";
import {
  getAiProviders, createAiProvider, updateAiProvider, deleteAiProvider,
  testAiProvider, setDefaultAiProvider, clearAllData,
  getEmailSettings, setEmailSettings,
  getSmtpConfig, saveSmtpConfig, deleteSmtpConfig,
  getResendConfig, saveResendConfig, deleteResendConfig, testResendConfig,
  getSearchConfig, saveSearchConfig, deleteSearchConfig, testSearchConfig,
  getTelegramSettings, saveTelegramSettings, testTelegram,
} from "../lib/api";
import type { AiProvider, AiProviderType, SmtpConfigResponse, ResendConfigResponse, SearchConfigResponse } from "../lib/types";

// ─── Design tokens ───────────────────────────────────────────────────────────
const SPRING = { type: "spring" as const, stiffness: 120, damping: 22 };
const FADE_UP = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { ...SPRING, delay: i * 0.05 } }),
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "ai",            label: "AI Providers",   icon: Bot,           color: "#C084FC" },
  { id: "email",         label: "Email",          icon: Mail,          color: "#60A5FA" },
  { id: "search",        label: "Search",         icon: Search,        color: "#FBBF24" },
  { id: "notifications", label: "Notifications",  icon: Bell,          color: "#F97316" },
  { id: "data",          label: "Data",           icon: Database,      color: "#F87171" },
];

// ─── Provider configs ─────────────────────────────────────────────────────────
type ProviderConfig = {
  value: string; label: string; icon: string; color: string;
  description: string; apiKeyLabel: string; apiKeyPlaceholder: string;
  apiKeyUrl: string; apiKeyUrlLabel: string; defaultBaseUrl: string;
  baseUrlEditable: boolean; models: string[]; defaultModel: string;
  keyPrefix?: string;
};

const PROVIDER_TYPES: ProviderConfig[] = [
  { value: "openai", label: "OpenAI", icon: "🤖", color: "#10a37f", description: "GPT-4o, GPT-4 Turbo, o1 — best for reasoning", apiKeyLabel: "OpenAI API Key", apiKeyPlaceholder: "sk-...", apiKeyUrl: "https://platform.openai.com/api-keys", apiKeyUrlLabel: "platform.openai.com", defaultBaseUrl: "https://api.openai.com/v1", baseUrlEditable: false, models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-mini", "o1-preview"], defaultModel: "gpt-4o" },
  { value: "anthropic", label: "Anthropic", icon: "🧠", color: "#d97706", description: "Claude 3.5 Sonnet & Opus — excellent for writing", apiKeyLabel: "Anthropic API Key", apiKeyPlaceholder: "sk-ant-...", apiKeyUrl: "https://console.anthropic.com/settings/keys", apiKeyUrlLabel: "console.anthropic.com", defaultBaseUrl: "https://api.anthropic.com/v1", baseUrlEditable: false, models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"], defaultModel: "claude-3-5-sonnet-20241022" },
  { value: "google", label: "Google Gemini", icon: "✨", color: "#4285f4", description: "Gemini 2.5 Flash — large context, fast & cheap", apiKeyLabel: "Google AI API Key", apiKeyPlaceholder: "AIza...", apiKeyUrl: "https://aistudio.google.com/app/apikey", apiKeyUrlLabel: "aistudio.google.com", defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", baseUrlEditable: false, models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro", "gemini-1.5-flash"], defaultModel: "gemini-2.5-flash" },
  { value: "groq", label: "Groq", icon: "⚡", color: "#f97316", description: "Ultra-fast Llama 3 & Mixtral inference", apiKeyLabel: "Groq API Key", apiKeyPlaceholder: "gsk_...", apiKeyUrl: "https://console.groq.com/keys", apiKeyUrlLabel: "console.groq.com", defaultBaseUrl: "https://api.groq.com/openai/v1", baseUrlEditable: false, models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"], defaultModel: "llama-3.3-70b-versatile" },
  { value: "openrouter", label: "OpenRouter", icon: "🔀", color: "#7c3aed", description: "100+ models from one API", apiKeyLabel: "OpenRouter API Key", apiKeyPlaceholder: "sk-or-v1-...", apiKeyUrl: "https://openrouter.ai/keys", apiKeyUrlLabel: "openrouter.ai", defaultBaseUrl: "https://openrouter.ai/api/v1", baseUrlEditable: false, models: ["google/gemini-2.5-flash", "google/gemini-2.0-flash-001", "openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.3-70b-instruct"], defaultModel: "google/gemini-2.5-flash", keyPrefix: "sk-or-" },
  { value: "deepseek", label: "DeepSeek", icon: "🔭", color: "#0ea5e9", description: "DeepSeek V3 & R1 — top coding & reasoning", apiKeyLabel: "DeepSeek API Key", apiKeyPlaceholder: "sk-...", apiKeyUrl: "https://platform.deepseek.com/api_keys", apiKeyUrlLabel: "platform.deepseek.com", defaultBaseUrl: "https://api.deepseek.com/v1", baseUrlEditable: false, models: ["deepseek-chat", "deepseek-reasoner"], defaultModel: "deepseek-chat" },
  { value: "mistral", label: "Mistral AI", icon: "🌊", color: "#06b6d4", description: "Mistral Large — European AI, GDPR-friendly", apiKeyLabel: "Mistral API Key", apiKeyPlaceholder: "...", apiKeyUrl: "https://console.mistral.ai/api-keys/", apiKeyUrlLabel: "console.mistral.ai", defaultBaseUrl: "https://api.mistral.ai/v1", baseUrlEditable: false, models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest"], defaultModel: "mistral-large-latest" },
  { value: "together", label: "Together AI", icon: "🤝", color: "#8b5cf6", description: "Open-source models at competitive prices", apiKeyLabel: "Together AI API Key", apiKeyPlaceholder: "...", apiKeyUrl: "https://api.together.xyz/settings/api-keys", apiKeyUrlLabel: "api.together.xyz", defaultBaseUrl: "https://api.together.xyz/v1", baseUrlEditable: false, models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo"], defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { value: "ollama", label: "Ollama (Local)", icon: "🦙", color: "#78716c", description: "Run models locally — 100% private", apiKeyLabel: "API Key (not required)", apiKeyPlaceholder: "Leave empty", apiKeyUrl: "https://ollama.com/download", apiKeyUrlLabel: "Install Ollama", defaultBaseUrl: "http://localhost:11434/v1", baseUrlEditable: true, models: ["llama3.2", "llama3.1", "mistral", "codellama", "phi3", "gemma2"], defaultModel: "llama3.2" },
  { value: "custom", label: "Custom / Other", icon: "⚙️", color: "#6b7280", description: "Any OpenAI-compatible API", apiKeyLabel: "API Key", apiKeyPlaceholder: "sk-...", apiKeyUrl: "", apiKeyUrlLabel: "", defaultBaseUrl: "", baseUrlEditable: true, models: [], defaultModel: "" },
];

const EMPTY_FORM = {
  providerType: "openai" as AiProviderType,
  name: "", apiKey: "", baseUrl: "", model: "", temperature: "", maxTokens: 4096,
};

// ─── Reusable UI atoms ────────────────────────────────────────────────────────

function SectionCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`glass-card rounded-2xl overflow-hidden ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  accent = "var(--brand)",
  action,
}: {
  icon: typeof Bot;
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

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="block mb-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
        {children}
      </span>
      {hint && <span className="ml-1.5 text-[10px]" style={{ color: "var(--text-subtle)" }}>{hint}</span>}
    </label>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold"
      style={{
        background: ok ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
        color: ok ? "#34D399" : "#F87171",
        border: `1px solid ${ok ? "rgba(52,211,153,0.25)" : "rgba(248,113,113,0.25)"}`,
      }}
    >
      {ok
        ? <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
        : <AlertCircle className="w-3 h-3" strokeWidth={2} />}
      {label}
    </span>
  );
}

function Alert({
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

function PasswordField({
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

// ─── Advanced Settings ────────────────────────────────────────────────────────
function AdvancedSettings({
  form, setForm, baseUrlEditable, isOllama,
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
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

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai");

  // ── AI state ──
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const [activeProvider, setActiveProvider] = useState<{ name: string; providerType: string; model: string; isEnvFallback?: boolean } | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; ok: boolean; error?: string; model?: string } | null>(null);

  // ── Email state ──
  const [emailSettings, setEmailSettingsState] = useState<{ defaultProvider: string | null; providers?: Record<string, { configured: boolean; email: string | null; source?: string | null }> } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigResponse | null>(null);
  const [smtpForm, setSmtpForm] = useState({ host: "", port: 465, secure: true, user: "", password: "", fromEmail: "", fromName: "FindX" });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpDeleting, setSmtpDeleting] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [smtpSuccess, setSmtpSuccess] = useState<string | null>(null);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [resendConfig, setResendConfig] = useState<ResendConfigResponse | null>(null);
  const [resendForm, setResendForm] = useState({ apiKey: "", fromEmail: "FindX <onboarding@resend.dev>" });
  const [resendSaving, setResendSaving] = useState(false);
  const [resendTesting, setResendTesting] = useState(false);
  const [resendDeleting, setResendDeleting] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);

  // ── Search state ──
  const [searchConfig, setSearchConfig] = useState<SearchConfigResponse | null>(null);
  const [searchForm, setSearchForm] = useState({ apiKey: "" });
  const [searchSaving, setSearchSaving] = useState(false);
  const [searchTesting, setSearchTesting] = useState(false);
  const [searchDeleting, setSearchDeleting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [showSearchForm, setShowSearchForm] = useState(false);

  // ── Telegram state ──
  const [telegramSettings, setTelegramSettingsState] = useState<{ configured: boolean; chatId?: string } | null>(null);
  const [telegramForm, setTelegramForm] = useState({ botToken: "", chatId: "" });
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [telegramSaveError, setTelegramSaveError] = useState<string | null>(null);

  // ── Data state ──
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState<{ deleted: Record<string, number> } | null>(null);
  const [clearError, setClearError] = useState<string | null>(null);

  // ── Loaders ──
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
  async function loadEmailSettings() {
    try { const d = await getEmailSettings(); setEmailSettingsState({ defaultProvider: d.defaultProvider, providers: d.providers as any }); } catch { }
  }
  async function loadSmtpConfig() {
    try { const d = await getSmtpConfig(); setSmtpConfig(d); if (d.configured && d.host) setSmtpForm({ host: d.host ?? "", port: d.port ?? 465, secure: d.secure ?? true, user: d.user ?? "", password: "", fromEmail: d.fromEmail ?? "", fromName: d.fromName ?? "FindX" }); } catch { }
  }
  async function loadResendConfig() {
    try { const d = await getResendConfig(); setResendConfig(d); if (d.configured && d.fromEmail) setResendForm((f) => ({ ...f, fromEmail: d.fromEmail ?? f.fromEmail })); } catch { }
  }
  async function loadSearchConfig() {
    try { const d = await getSearchConfig(); setSearchConfig(d); } catch { }
  }
  async function loadTelegramSettings() {
    try {
      const d = await getTelegramSettings();
      // API returns { configured, chatId } directly — not { settings: { ... } }
      const raw = d as any;
      const configured = raw.configured ?? !!(raw.settings?.botToken && raw.settings?.chatId);
      const chatId: string | undefined = raw.chatId ?? raw.settings?.chatId;
      setTelegramSettingsState({ configured, chatId });
      if (chatId) setTelegramForm((f) => ({ ...f, chatId }));
    } catch { }
  }

  useEffect(() => {
    loadAiProviders(); loadEmailSettings(); loadSmtpConfig();
    loadResendConfig(); loadSearchConfig(); loadTelegramSettings();
  }, []);

  // ── AI handlers ──
  function openAddForm() {
    setEditingId(null);
    const def = PROVIDER_TYPES.find((p) => p.value === "openai")!;
    setForm({ ...EMPTY_FORM, name: def.label, baseUrl: def.defaultBaseUrl, model: def.defaultModel });
    setShowForm(true);
  }
  function handleProviderTypeChange(value: string) {
    const def = PROVIDER_TYPES.find((p) => p.value === value);
    if (!def) return;
    setForm((f) => ({ ...f, providerType: value as AiProviderType, name: f.name && f.name !== PROVIDER_TYPES.find((p) => p.value === f.providerType)?.label ? f.name : def.label, baseUrl: def.defaultBaseUrl, model: def.defaultModel }));
  }
  function openEditForm(provider: AiProvider) {
    setEditingId(provider.id);
    setForm({ providerType: provider.providerType, name: provider.name, apiKey: "", baseUrl: provider.baseUrl || "", model: provider.model, temperature: provider.temperature != null ? String(provider.temperature) : "", maxTokens: provider.maxTokens });
    setShowForm(true);
  }
  async function handleSaveProvider() {
    setSaving(true); setAiError(null);
    try {
      // When editing: omit apiKey entirely if left blank (server keeps existing key)
      // When creating: include apiKey if provided
      const payload: Record<string, unknown> = {
        name: form.name,
        providerType: form.providerType,
        baseUrl: form.baseUrl || undefined,
        model: form.model,
        temperature: form.temperature || undefined,
        maxTokens: form.maxTokens,
      };
      if (!editingId || form.apiKey) {
        payload.apiKey = form.apiKey || undefined;
      }
      if (editingId) {
        await updateAiProvider(editingId, payload as any);
      } else {
        const result = await createAiProvider(payload as any);
        // Auto set as default if this is the first (or only) provider
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

  // ── Email handlers ──
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

  // ── Search handlers ──
  async function handleSaveSearch() {
    setSearchSaving(true); setSearchError(null); setSearchSuccess(null);
    try { const d = await saveSearchConfig({ apiKey: searchForm.apiKey, provider: "tavily" }); setSearchConfig(d); setShowSearchForm(false); setSearchForm({ apiKey: "" }); setSearchSuccess("Tavily key saved."); }
    catch (err) { setSearchError(err instanceof Error ? err.message : "Failed"); }
    finally { setSearchSaving(false); }
  }
  async function handleTestSearch() {
    setSearchTesting(true); setSearchError(null); setSearchSuccess(null);
    try { const r = await testSearchConfig(); if (r.ok) setSearchSuccess(r.message ?? "OK"); else setSearchError(r.error ?? "Failed"); }
    catch (err) { setSearchError(err instanceof Error ? err.message : "Failed"); }
    finally { setSearchTesting(false); }
  }
  async function handleDeleteSearch() {
    setSearchDeleting(true); setSearchError(null);
    try { await deleteSearchConfig(); setSearchConfig({ configured: false }); setSearchForm({ apiKey: "" }); setShowSearchForm(false); }
    catch (err) { setSearchError(err instanceof Error ? err.message : "Failed"); }
    finally { setSearchDeleting(false); }
  }

  // ── Telegram handlers ──
  async function handleSaveTelegram() {
    setTelegramSaving(true); setTelegramSaveError(null);
    try {
      if (!telegramSettings?.configured && !telegramForm.botToken) {
        setTelegramSaveError("Bot Token is required");
        return;
      }
      // If already configured and user left token blank → sentinel tells server to keep existing
      const payload = {
        botToken: telegramForm.botToken || "__keep__",
        chatId: telegramForm.chatId,
      };
      await saveTelegramSettings(payload);
      await loadTelegramSettings();
    } catch (err) {
      setTelegramSaveError(err instanceof Error ? err.message : "Failed to save settings");
    } finally { setTelegramSaving(false); }
  }
  async function handleTestTelegram() {
    setTelegramTesting(true); setTelegramTestResult(null);
    try {
      // If no token entered, send __keep__ so server uses stored token
      const payload = {
        botToken: telegramForm.botToken || "__keep__",
        chatId: telegramForm.chatId,
      };
      setTelegramTestResult(await testTelegram(payload));
    }
    catch (err) { setTelegramTestResult({ success: false, error: err instanceof Error ? err.message : "Failed" }); }
    finally { setTelegramTesting(false); }
  }

  // ── Data handlers ──
  async function handleClearAll() {
    setClearing(true); setClearError(null);
    try { const r = await clearAllData(); setClearResult({ deleted: (r as any).deleted || {} }); setConfirming(false); }
    catch (err) { setClearError(err instanceof Error ? err.message : "Failed"); }
    finally { setClearing(false); }
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  const provCfg = PROVIDER_TYPES.find((p) => p.value === form.providerType) ?? PROVIDER_TYPES[0];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6">

        {/* ── Page Header ──────────────────────────────── */}
        <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible">
          <div className="flex items-center gap-2.5 mb-1">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.22)" }}
            >
              <Settings2 className="w-4 h-4" style={{ color: "var(--brand)" }} strokeWidth={1.8} />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text)" }}>Settings</h1>
          </div>
          <p className="text-[13px] ml-[42px]" style={{ color: "var(--text-muted)" }}>
            Configure AI providers, email, search, and manage data.
          </p>
        </motion.div>

        {/* ── Tab Bar ──────────────────────────────────── */}
        <motion.div custom={1} variants={FADE_UP} initial="hidden" animate="visible">
          <div
            className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
            style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap transition-all flex-shrink-0"
                  style={isActive ? {
                    background: `${tab.color}18`,
                    color: tab.color,
                    border: `1px solid ${tab.color}30`,
                    boxShadow: `0 2px 10px ${tab.color}15`,
                  } : {
                    color: "var(--text-muted)",
                    border: "1px solid transparent",
                  }}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ══════════════════════════════════════════════
            TAB: AI PROVIDERS
        ══════════════════════════════════════════════ */}
        {activeTab === "ai" && (
          <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">

            {/* Active provider banner */}
            {activeProvider && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.20)" }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(52,211,153,0.15)" }}
                >
                  <Zap className="w-4 h-4" style={{ color: "#34D399" }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[12px] font-bold" style={{ color: "#34D399" }}>Active Provider</p>
                    {activeProvider.isEnvFallback && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ background: "rgba(251,191,36,0.15)", color: "#FBBF24" }}>ENV</span>
                    )}
                  </div>
                  <p className="text-[11px] truncate font-mono" style={{ color: "#34D399", opacity: 0.8 }}>
                    {PROVIDER_TYPES.find((t) => t.value === activeProvider.providerType)?.label ?? activeProvider.providerType}
                    {" · "}{activeProvider.model}
                  </p>
                </div>
              </div>
            )}

            {/* Providers list */}
            <SectionCard>
              <SectionHeader
                icon={Cpu}
                title="AI Providers"
                subtitle="Configure language models for the pipeline"
                accent="#C084FC"
                action={
                  <button onClick={openAddForm} className="btn btn-primary text-[12px] px-3.5 py-2 gap-1.5 font-semibold">
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                    Add Provider
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
                      <div
                        key={provider.id}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
                        style={{
                          background: provider.isDefault ? "var(--glass-raised)" : "var(--glass)",
                          border: `1px solid ${provider.isDefault ? "var(--glass-border-strong)" : "var(--glass-border)"}`,
                        }}
                      >
                        <span className="text-xl flex-shrink-0">{info?.icon ?? "🤖"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                              {provider.name}
                            </p>
                            {provider.isDefault && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "var(--brand)", border: "1px solid rgba(245,158,11,0.25)" }}>
                                DEFAULT
                              </span>
                            )}
                            {!provider.isActive && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--glass-raised)", color: "var(--text-subtle)" }}>INACTIVE</span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono truncate" style={{ color: "var(--text-subtle)" }}>
                            {info?.label} · {provider.model}
                          </p>
                          {result && (
                            <p className="text-[11px] mt-0.5" style={{ color: result.ok ? "#34D399" : "#F87171" }}>
                              {result.ok ? `✓ OK · ${result.model ?? ""}` : `✗ ${result.error}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Test */}
                          <button
                            onClick={() => handleTestProvider(provider.id)}
                            disabled={isTest}
                            title="Test connection"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                            style={{
                              background: "rgba(96,165,250,0.10)",
                              border: "1px solid rgba(96,165,250,0.20)",
                              color: "#60A5FA",
                            }}
                          >
                            {isTest ? <Loader2 className="w-3 h-3 animate-spin" /> : <TestTube className="w-3 h-3" strokeWidth={2} />}
                            <span>Test</span>
                          </button>
                          {/* Set Default */}
                          {!provider.isDefault && (
                            <button
                              onClick={() => handleSetDefault(provider.id)}
                              title="Set as default"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                              style={{
                                background: "rgba(245,158,11,0.10)",
                                border: "1px solid rgba(245,158,11,0.20)",
                                color: "#F59E0B",
                              }}
                            >
                              <Star className="w-3 h-3" strokeWidth={2} />
                              <span>Default</span>
                            </button>
                          )}
                          {/* Edit */}
                          <button
                            onClick={() => openEditForm(provider)}
                            title="Edit"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                            style={{
                              background: "var(--glass-raised)",
                              border: "1px solid var(--glass-border)",
                              color: "var(--text-muted)",
                            }}
                          >
                            <Settings2 className="w-3 h-3" strokeWidth={2} />
                            <span>Edit</span>
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteProvider(provider.id)}
                            title="Delete"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                            style={{
                              background: "rgba(248,113,113,0.08)",
                              border: "1px solid rgba(248,113,113,0.18)",
                              color: "#F87171",
                            }}
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={2} />
                            <span>Delete</span>
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
                <motion.div
                  initial={{ opacity: 0, y: -8, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -8, height: 0 }}
                  className="overflow-hidden"
                >
                  <SectionCard>
                    <SectionHeader
                      icon={editingId ? Settings2 : Plus}
                      title={editingId ? "Edit Provider" : "Add AI Provider"}
                      accent="#C084FC"
                      action={
                        <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-ghost w-7 h-7 p-0 rounded-lg">
                          <X className="w-3.5 h-3.5" strokeWidth={1.8} />
                        </button>
                      }
                    />

                    <div className="p-5 space-y-5">
                      {/* Provider picker */}
                      {!editingId && (
                        <div>
                          <FieldLabel>① Choose Provider</FieldLabel>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                            {PROVIDER_TYPES.map((p) => (
                              <button
                                key={p.value}
                                onClick={() => handleProviderTypeChange(p.value)}
                                className="flex flex-col items-start gap-1 p-3 rounded-xl transition-all text-left"
                                style={{
                                  background: form.providerType === p.value ? `${p.color}12` : "var(--glass-raised)",
                                  border: `1px solid ${form.providerType === p.value ? p.color + "40" : "var(--glass-border)"}`,
                                  boxShadow: form.providerType === p.value ? `0 0 12px ${p.color}15` : "none",
                                }}
                              >
                                <span className="text-lg">{p.icon}</span>
                                <span className="text-[11px] font-semibold leading-tight" style={{ color: form.providerType === p.value ? p.color : "var(--text-muted)" }}>
                                  {p.label}
                                </span>
                              </button>
                            ))}
                          </div>
                          <div
                            className="flex items-start gap-2.5 mt-3 px-3.5 py-2.5 rounded-xl text-[12px]"
                            style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
                          >
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
                          <div
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] mb-2"
                            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)" }}
                          >
                            <span style={{ color: "#60A5FA" }}>Get your key from</span>
                            <a href={provCfg.apiKeyUrl} target="_blank" rel="noopener noreferrer"
                              className="font-semibold flex items-center gap-1 underline"
                              style={{ color: "#60A5FA" }}>
                              {provCfg.apiKeyUrlLabel}
                              <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
                            </a>
                          </div>
                        )}
                        {provCfg.value === "ollama" && (
                          <div
                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] mb-2"
                            style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.18)", color: "#34D399" }}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2} />
                            No API key needed — Ollama runs locally
                          </div>
                        )}
                        <PasswordField
                          value={form.apiKey}
                          onChange={(v) => setForm({ ...form, apiKey: v })}
                          placeholder={editingId ? "Leave empty to keep current key" : provCfg.apiKeyPlaceholder}
                        />
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
                              <button
                                key={m}
                                onClick={() => setForm({ ...form, model: m })}
                                className="text-left px-3 py-2 rounded-xl text-[12px] transition-all"
                                style={{
                                  background: form.model === m ? "rgba(192,132,252,0.10)" : "var(--glass-raised)",
                                  border: `1px solid ${form.model === m ? "rgba(192,132,252,0.30)" : "var(--glass-border)"}`,
                                  color: form.model === m ? "#C084FC" : "var(--text-muted)",
                                  fontWeight: form.model === m ? "600" : "400",
                                }}
                              >
                                {m}
                                {m === provCfg.defaultModel && (
                                  <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: "rgba(245,158,11,0.15)", color: "var(--brand)" }}>
                                    recommended
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                        <input
                          type="text"
                          value={form.model}
                          onChange={(e) => setForm({ ...form, model: e.target.value })}
                          placeholder={provCfg.models.length > 0 ? "Or type custom model…" : "e.g. gpt-4o"}
                          className="input text-[13px]"
                        />
                      </div>

                      {/* Advanced */}
                      <AdvancedSettings
                        form={form}
                        setForm={setForm}
                        baseUrlEditable={provCfg.baseUrlEditable || !!editingId}
                        isOllama={provCfg.value === "ollama"}
                      />

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
                        <button
                          onClick={handleSaveProvider}
                          disabled={saving || !form.name || !form.model}
                          className="btn btn-primary text-[13px] px-5 py-2.5 gap-2 font-semibold"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
                          {saving ? "Saving…" : editingId ? "Update Provider" : "Add Provider"}
                        </button>
                        <button onClick={() => { setShowForm(false); setEditingId(null); }} className="btn btn-ghost text-[13px] px-4 py-2.5">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </SectionCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: EMAIL
        ══════════════════════════════════════════════ */}
        {activeTab === "email" && (
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
                          <button
                            key={p}
                            onClick={() => handleSetEmailDefault(p)}
                            disabled={!isConfigured}
                            className="px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed capitalize"
                            style={isDefault ? {
                              background: "rgba(96,165,250,0.15)",
                              color: "#60A5FA",
                              border: "1px solid rgba(96,165,250,0.30)",
                            } : {
                              background: "var(--glass-raised)",
                              color: "var(--text-muted)",
                              border: "1px solid var(--glass-border)",
                            }}
                          >
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
              <SectionHeader
                icon={Send}
                title="Resend"
                subtitle="Transactional email via Resend API"
                accent="#60A5FA"
                action={
                  <div className="flex items-center gap-2">
                    {resendConfig?.configured && <StatusBadge ok={true} label={resendConfig.source === "env" ? "via ENV" : "Configured"} />}
                    <button
                      onClick={() => { setShowResendForm(!showResendForm); setResendError(null); setResendSuccess(null); }}
                      className="btn btn-secondary text-[12px] px-3 py-1.5 gap-1.5"
                    >
                      {showResendForm ? "Cancel" : resendConfig?.configured ? "Update" : "Configure"}
                    </button>
                    {resendConfig?.configured && (
                      <>
                        <button onClick={handleTestResend} disabled={resendTesting} className="btn btn-ghost text-[12px] px-3 py-1.5 gap-1.5">
                          {resendTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" strokeWidth={1.8} />}
                          Test
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
                      <div>
                        <FieldLabel>Resend API Key</FieldLabel>
                        <PasswordField value={resendForm.apiKey} onChange={(v) => setResendForm((f) => ({ ...f, apiKey: v }))} placeholder="re_..." />
                      </div>
                      <div>
                        <FieldLabel>From Email</FieldLabel>
                        <input type="text" value={resendForm.fromEmail} onChange={(e) => setResendForm((f) => ({ ...f, fromEmail: e.target.value }))} className="input text-[13px]" placeholder="FindX <noreply@yourdomain.com>" />
                      </div>
                      {resendError && <Alert type="error" message={resendError} onClose={() => setResendError(null)} />}
                      {resendSuccess && <Alert type="success" message={resendSuccess} onClose={() => setResendSuccess(null)} />}
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveResend} disabled={resendSaving} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                          {resendSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          Save
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
              <SectionHeader
                icon={Globe}
                title="SMTP"
                subtitle="Connect your own SMTP server"
                accent="#60A5FA"
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
                        <div>
                          <FieldLabel>Host</FieldLabel>
                          <input type="text" value={smtpForm.host} onChange={(e) => setSmtpForm((f) => ({ ...f, host: e.target.value }))} placeholder="smtp.gmail.com" className="input text-[13px]" />
                        </div>
                        <div>
                          <FieldLabel>Port</FieldLabel>
                          <input type="number" value={smtpForm.port} onChange={(e) => setSmtpForm((f) => ({ ...f, port: parseInt(e.target.value) }))} className="input text-[13px]" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Username</FieldLabel>
                          <input type="text" value={smtpForm.user} onChange={(e) => setSmtpForm((f) => ({ ...f, user: e.target.value }))} className="input text-[13px]" />
                        </div>
                        <div>
                          <FieldLabel>Password</FieldLabel>
                          <PasswordField value={smtpForm.password} onChange={(v) => setSmtpForm((f) => ({ ...f, password: v }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>From Email</FieldLabel>
                          <input type="email" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm((f) => ({ ...f, fromEmail: e.target.value }))} className="input text-[13px]" />
                        </div>
                        <div>
                          <FieldLabel>From Name</FieldLabel>
                          <input type="text" value={smtpForm.fromName} onChange={(e) => setSmtpForm((f) => ({ ...f, fromName: e.target.value }))} className="input text-[13px]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="smtp-secure" checked={smtpForm.secure} onChange={(e) => setSmtpForm((f) => ({ ...f, secure: e.target.checked }))} className="rounded" />
                        <label htmlFor="smtp-secure" className="text-[12px]" style={{ color: "var(--text-muted)" }}>Use TLS/SSL</label>
                      </div>
                      {smtpError && <Alert type="error" message={smtpError} onClose={() => setSmtpError(null)} />}
                      {smtpSuccess && <Alert type="success" message={smtpSuccess} onClose={() => setSmtpSuccess(null)} />}
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveSmtp} disabled={smtpSaving} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                          {smtpSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          Save
                        </button>
                        <button onClick={() => setShowSmtpForm(false)} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </SectionCard>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: SEARCH
        ══════════════════════════════════════════════ */}
        {activeTab === "search" && (
          <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
            <SectionCard>
              <SectionHeader
                icon={Search}
                title="Tavily Search"
                subtitle="Powers the lead discovery step"
                accent="#FBBF24"
                action={
                  <div className="flex items-center gap-2">
                    {searchConfig?.configured && <StatusBadge ok={true} label={searchConfig.source === "env" ? "via ENV" : "Configured"} />}
                    <button onClick={() => { setShowSearchForm(!showSearchForm); setSearchError(null); setSearchSuccess(null); }} className="btn btn-secondary text-[12px] px-3 py-1.5">
                      {showSearchForm ? "Cancel" : searchConfig?.configured ? "Update" : "Configure"}
                    </button>
                    {searchConfig?.configured && (
                      <>
                        <button onClick={handleTestSearch} disabled={searchTesting} className="btn btn-ghost text-[12px] px-3 py-1.5 gap-1.5">
                          {searchTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" strokeWidth={1.8} />}
                          Test
                        </button>
                        <button onClick={handleDeleteSearch} disabled={searchDeleting} className="btn btn-ghost text-[12px] px-3 py-1.5" style={{ color: "#F87171" }}>
                          {searchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
                        </button>
                      </>
                    )}
                  </div>
                }
              />
              <AnimatePresence>
                {showSearchForm && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-5 space-y-3">
                      <div
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]"
                        style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", color: "#FBBF24" }}
                      >
                        <Key className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                        Get your free key at{" "}
                        <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-1">
                          tavily.com <ExternalLink className="w-3 h-3" strokeWidth={1.8} />
                        </a>
                      </div>
                      <div>
                        <FieldLabel>Tavily API Key</FieldLabel>
                        <PasswordField value={searchForm.apiKey} onChange={(v) => setSearchForm({ apiKey: v })} placeholder="tvly-..." />
                      </div>
                      {searchError && <Alert type="error" message={searchError} onClose={() => setSearchError(null)} />}
                      {searchSuccess && <Alert type="success" message={searchSuccess} onClose={() => setSearchSuccess(null)} />}
                      <div className="flex gap-2 pt-1">
                        <button onClick={handleSaveSearch} disabled={searchSaving || !searchForm.apiKey} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                          {searchSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          Save
                        </button>
                        <button onClick={() => setShowSearchForm(false)} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {searchSuccess && !showSearchForm && <div className="px-5 pb-4"><Alert type="success" message={searchSuccess} onClose={() => setSearchSuccess(null)} /></div>}
            </SectionCard>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: NOTIFICATIONS
        ══════════════════════════════════════════════ */}
        {activeTab === "notifications" && (
          <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
            <SectionCard>
              <SectionHeader
                icon={MessageSquare}
                title="Telegram Notifications"
                subtitle="Get pipeline updates in Telegram"
                accent="#F97316"
                action={telegramSettings?.configured && <StatusBadge ok={true} label="Configured" />}
              />
              <div className="p-5 space-y-3">
                <div
                  className="flex flex-col gap-1 px-3.5 py-3 rounded-xl text-[12px]"
                  style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}
                >
                  <p className="font-semibold" style={{ color: "var(--text)" }}>Setup steps:</p>
                  <ol className="list-decimal list-inside space-y-1" style={{ color: "var(--text-muted)" }}>
                    <li>Message <a href="https://t.me/BotFather" target="_blank" className="underline font-medium" style={{ color: "#F97316" }}>@BotFather</a> to create a bot and get your token</li>
                    <li>Start a chat with your bot</li>
                    <li>Get your Chat ID from <a href="https://t.me/userinfobot" target="_blank" className="underline font-medium" style={{ color: "#F97316" }}>@userinfobot</a></li>
                  </ol>
                </div>
                <div>
                  <FieldLabel>Bot Token</FieldLabel>
                  <PasswordField value={telegramForm.botToken} onChange={(v) => setTelegramForm({ ...telegramForm, botToken: v })} placeholder={telegramSettings?.configured ? "••••••••••" : "123456789:ABCdef..."} />
                </div>
                <div>
                  <FieldLabel>Chat ID</FieldLabel>
                  <input type="text" value={telegramForm.chatId} onChange={(e) => setTelegramForm({ ...telegramForm, chatId: e.target.value })} placeholder="123456789" className="input text-[13px]" />
                </div>
                {telegramSaveError && (
                  <Alert type="error" message={telegramSaveError} />
                )}
                {telegramTestResult && (
                  <Alert type={telegramTestResult.success ? "success" : "error"} message={telegramTestResult.success ? "Test message sent!" : telegramTestResult.error ?? "Test failed"} />
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveTelegram} disabled={telegramSaving || (!telegramSettings?.configured && !telegramForm.botToken) || !telegramForm.chatId} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                    {telegramSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                    Save Settings
                  </button>
                  <button onClick={handleTestTelegram} disabled={telegramTesting || !telegramForm.botToken || !telegramForm.chatId} className="btn btn-secondary text-[13px] px-4 py-2 gap-2">
                    {telegramTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" strokeWidth={1.8} />}
                    Test
                  </button>
                </div>
              </div>
            </SectionCard>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════
            TAB: DATA
        ══════════════════════════════════════════════ */}
        {activeTab === "data" && (
          <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
            <SectionCard>
              <SectionHeader
                icon={Database}
                title="Data Management"
                subtitle="Delete all leads, analyses, and outreach emails"
                accent="#F87171"
              />
              <div className="p-5 space-y-4">
                <div
                  className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-[12px]"
                  style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}
                >
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#F87171" }} strokeWidth={1.8} />
                  <div>
                    <p className="font-semibold mb-0.5" style={{ color: "#F87171" }}>Irreversible action</p>
                    <p style={{ color: "var(--text-muted)" }}>
                      This will permanently delete all leads, pipeline runs, analyses, and outreach emails. This cannot be undone.
                    </p>
                  </div>
                </div>

                {clearResult && (
                  <Alert
                    type="success"
                    message={`Cleared: ${Object.entries(clearResult.deleted).map(([k, v]) => `${v} ${k}`).join(", ")}`}
                    onClose={() => setClearResult(null)}
                  />
                )}
                {clearError && <Alert type="error" message={clearError} onClose={() => setClearError(null)} />}

                <AnimatePresence mode="wait">
                  {!confirming ? (
                    <motion.button
                      key="delete-btn"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setConfirming(true)}
                      className="btn text-[13px] px-5 py-2.5 font-semibold gap-2"
                      style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                      Clear All Data
                    </motion.button>
                  ) : (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                      className="flex items-center gap-3 px-4 py-3.5 rounded-xl"
                      style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)" }}
                    >
                      <Shield className="w-4 h-4 flex-shrink-0" style={{ color: "#F87171" }} strokeWidth={1.8} />
                      <span className="text-[12px] flex-1 font-medium" style={{ color: "#F87171" }}>
                        Are you absolutely sure?
                      </span>
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
        )}

      </div>
    </div>
  );
}
