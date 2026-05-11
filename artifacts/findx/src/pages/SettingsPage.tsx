import { useState, useEffect } from "react";
import {
  Settings2, Zap, Trash2, Bell, Mail, AlertTriangle, Loader2,
  CheckCircle2, Plus, X, Star, Eye, EyeOff, ExternalLink, ChevronDown, ChevronUp,
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

const TABS = [
  { id: "ai", label: "AI Providers", icon: <Zap className="w-4 h-4" /> },
  { id: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
  { id: "search", label: "Search", icon: <span className="w-4 h-4 text-[10px] leading-none flex items-center justify-center">🔍</span> },
  { id: "notifications", label: "Notifications", icon: <Bell className="w-4 h-4" /> },
  { id: "data", label: "Data", icon: <Trash2 className="w-4 h-4" /> },
];

type ProviderConfig = {
  value: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  apiKeyUrl: string;
  apiKeyUrlLabel: string;
  defaultBaseUrl: string;
  baseUrlEditable: boolean;
  models: string[];
  defaultModel: string;
};

const PROVIDER_TYPES: ProviderConfig[] = [
  {
    value: "openai",
    label: "OpenAI",
    icon: "🤖",
    color: "#10a37f",
    description: "GPT-4o, GPT-4 Turbo, and o1 models — best for reasoning & coding",
    apiKeyLabel: "OpenAI API Key",
    apiKeyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.openai.com/api-keys",
    apiKeyUrlLabel: "platform.openai.com",
    defaultBaseUrl: "https://api.openai.com/v1",
    baseUrlEditable: false,
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo", "o1-mini", "o1-preview"],
    defaultModel: "gpt-4o",
  },
  {
    value: "anthropic",
    label: "Anthropic",
    icon: "🧠",
    color: "#d97706",
    description: "Claude 3.5 Sonnet & Opus — excellent for writing & analysis",
    apiKeyLabel: "Anthropic API Key",
    apiKeyPlaceholder: "sk-ant-...",
    apiKeyUrl: "https://console.anthropic.com/settings/keys",
    apiKeyUrlLabel: "console.anthropic.com",
    defaultBaseUrl: "https://api.anthropic.com/v1",
    baseUrlEditable: false,
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229"],
    defaultModel: "claude-3-5-sonnet-20241022",
  },
  {
    value: "google",
    label: "Google Gemini",
    icon: "✨",
    color: "#4285f4",
    description: "Gemini 1.5 Pro & Flash — large context window, fast & affordable",
    apiKeyLabel: "Google AI API Key",
    apiKeyPlaceholder: "AIza...",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
    apiKeyUrlLabel: "aistudio.google.com",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta",
    baseUrlEditable: false,
    models: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash", "gemini-2.5-flash"],
    defaultModel: "gemini-2.0-flash",
  },
  {
    value: "groq",
    label: "Groq",
    icon: "⚡",
    color: "#f97316",
    description: "Ultra-fast inference — Llama 3 & Mixtral at lightning speed",
    apiKeyLabel: "Groq API Key",
    apiKeyPlaceholder: "gsk_...",
    apiKeyUrl: "https://console.groq.com/keys",
    apiKeyUrlLabel: "console.groq.com",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    baseUrlEditable: false,
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768", "gemma2-9b-it"],
    defaultModel: "llama-3.3-70b-versatile",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    icon: "🔀",
    color: "#7c3aed",
    description: "Access 100+ models from one API — OpenAI, Claude, Llama, and more",
    apiKeyLabel: "OpenRouter API Key",
    apiKeyPlaceholder: "sk-or-...",
    apiKeyUrl: "https://openrouter.ai/keys",
    apiKeyUrlLabel: "openrouter.ai",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    baseUrlEditable: false,
    models: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash", "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat"],
    defaultModel: "google/gemini-2.0-flash",
  },
  {
    value: "deepseek",
    label: "DeepSeek",
    icon: "🔭",
    color: "#0ea5e9",
    description: "DeepSeek V3 & R1 — top coding & reasoning, very affordable",
    apiKeyLabel: "DeepSeek API Key",
    apiKeyPlaceholder: "sk-...",
    apiKeyUrl: "https://platform.deepseek.com/api_keys",
    apiKeyUrlLabel: "platform.deepseek.com",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    baseUrlEditable: false,
    models: ["deepseek-chat", "deepseek-reasoner"],
    defaultModel: "deepseek-chat",
  },
  {
    value: "mistral",
    label: "Mistral AI",
    icon: "🌊",
    color: "#06b6d4",
    description: "Mistral Large & Codestral — European AI, GDPR-friendly",
    apiKeyLabel: "Mistral API Key",
    apiKeyPlaceholder: "...",
    apiKeyUrl: "https://console.mistral.ai/api-keys/",
    apiKeyUrlLabel: "console.mistral.ai",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    baseUrlEditable: false,
    models: ["mistral-large-latest", "mistral-small-latest", "codestral-latest", "open-mistral-7b"],
    defaultModel: "mistral-large-latest",
  },
  {
    value: "together",
    label: "Together AI",
    icon: "🤝",
    color: "#8b5cf6",
    description: "Open-source models (Llama, Mistral) at competitive prices",
    apiKeyLabel: "Together AI API Key",
    apiKeyPlaceholder: "...",
    apiKeyUrl: "https://api.together.xyz/settings/api-keys",
    apiKeyUrlLabel: "api.together.xyz",
    defaultBaseUrl: "https://api.together.xyz/v1",
    baseUrlEditable: false,
    models: ["meta-llama/Llama-3.3-70B-Instruct-Turbo", "mistralai/Mixtral-8x22B-Instruct-v0.1", "Qwen/Qwen2.5-72B-Instruct-Turbo"],
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  },
  {
    value: "glm",
    label: "GLM / ZhipuAI",
    icon: "🌐",
    color: "#059669",
    description: "GLM-4 series — strong Chinese/English bilingual model",
    apiKeyLabel: "ZhipuAI API Key",
    apiKeyPlaceholder: "...",
    apiKeyUrl: "https://open.bigmodel.cn/usercenter/apikeys",
    apiKeyUrlLabel: "open.bigmodel.cn",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    baseUrlEditable: false,
    models: ["glm-4", "glm-4-flash", "glm-4-plus"],
    defaultModel: "glm-4-flash",
  },
  {
    value: "ollama",
    label: "Ollama (Local)",
    icon: "🦙",
    color: "#78716c",
    description: "Run models locally on your own machine — 100% private, no API key needed",
    apiKeyLabel: "API Key (not required for Ollama)",
    apiKeyPlaceholder: "Leave empty",
    apiKeyUrl: "https://ollama.com/download",
    apiKeyUrlLabel: "Install Ollama",
    defaultBaseUrl: "http://localhost:11434/v1",
    baseUrlEditable: true,
    models: ["llama3.2", "llama3.1", "mistral", "codellama", "phi3", "gemma2"],
    defaultModel: "llama3.2",
  },
  {
    value: "custom",
    label: "Custom / Other",
    icon: "⚙️",
    color: "#6b7280",
    description: "Any OpenAI-compatible API — LM Studio, vLLM, Perplexity, etc.",
    apiKeyLabel: "API Key",
    apiKeyPlaceholder: "sk-...",
    apiKeyUrl: "",
    apiKeyUrlLabel: "",
    defaultBaseUrl: "",
    baseUrlEditable: true,
    models: [],
    defaultModel: "",
  },
];

const EMPTY_FORM = {
  providerType: "openai" as AiProviderType,
  name: "",
  apiKey: "",
  baseUrl: "",
  model: "",
  temperature: "",
  maxTokens: 4096,
};

const inputCls = "w-full px-3 py-2 border border-[#E5E3D9] rounded-lg text-sm bg-white text-[#1A1A1A] placeholder:text-[#BDBDB0] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#C4C0B8]";
const labelCls = "block text-xs font-medium text-[#7A756D] mb-1";

// ─── Advanced Settings sub-component ────────────────────────────────────────
function AdvancedSettings({
  form, setForm, inputCls, labelCls, baseUrlEditable, isOllama, name,
}: {
  form: typeof EMPTY_FORM;
  setForm: (f: typeof EMPTY_FORM) => void;
  inputCls: string;
  labelCls: string;
  baseUrlEditable: boolean;
  isOllama: boolean;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#E5E3D9] rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#FAFAF8] hover:bg-[#F0EDE6] transition-colors text-left"
      >
        <span className="text-xs font-semibold text-[#7A756D] uppercase tracking-wider">Advanced Settings</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-[#BDBDB0]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#BDBDB0]" />}
      </button>
      {open && (
        <div className="p-4 space-y-3 bg-white">
          <div>
            <label className={labelCls}>Display Name</label>
            <input type="text" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="My Provider"
              className={inputCls} />
          </div>
          {(baseUrlEditable || isOllama) && (
            <div>
              <label className={labelCls}>
                Base URL
                {isOllama && <span className="ml-1 text-[#BDBDB0]">(default: http://localhost:11434/v1)</span>}
              </label>
              <input type="text" value={form.baseUrl}
                onChange={e => setForm({ ...form, baseUrl: e.target.value })}
                placeholder={isOllama ? "http://localhost:11434/v1" : "https://api.example.com/v1"}
                className={inputCls} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Temperature <span className="text-[#BDBDB0]">(0–2, default 0.7)</span></label>
              <input type="number" step="0.1" min="0" max="2"
                value={form.temperature}
                onChange={e => setForm({ ...form, temperature: e.target.value })}
                placeholder="0.7"
                className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Max Tokens <span className="text-[#BDBDB0]">(default 4096)</span></label>
              <input type="number" min="1" max="65536"
                value={form.maxTokens}
                onChange={e => setForm({ ...form, maxTokens: parseInt(e.target.value) || 4096 })}
                className={inputCls} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("ai");

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

  const [emailSettings, setEmailSettingsState] = useState<{ defaultProvider: string | null; providers?: Record<string, { configured: boolean; email: string | null; source?: string | null }> } | null>(null);
  const [providerError, setProviderError] = useState<string | null>(null);

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfigResponse | null>(null);
  const [smtpForm, setSmtpForm] = useState({ host: "", port: 465, secure: true, user: "", password: "", fromEmail: "", fromName: "FindX" });
  const [smtpSaving, setSmtpSaving] = useState(false);
  const [smtpDeleting, setSmtpDeleting] = useState(false);
  const [smtpError, setSmtpError] = useState<string | null>(null);
  const [smtpSuccess, setSmtpSuccess] = useState<string | null>(null);
  const [showSmtpForm, setShowSmtpForm] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const [resendConfig, setResendConfig] = useState<ResendConfigResponse | null>(null);
  const [resendForm, setResendForm] = useState({ apiKey: "", fromEmail: "FindX <onboarding@resend.dev>" });
  const [resendSaving, setResendSaving] = useState(false);
  const [resendTesting, setResendTesting] = useState(false);
  const [resendDeleting, setResendDeleting] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);
  const [showResendForm, setShowResendForm] = useState(false);
  const [showResendKey, setShowResendKey] = useState(false);

  const [searchConfig, setSearchConfig] = useState<SearchConfigResponse | null>(null);
  const [searchForm, setSearchForm] = useState({ apiKey: "" });
  const [searchSaving, setSearchSaving] = useState(false);
  const [searchTesting, setSearchTesting] = useState(false);
  const [searchDeleting, setSearchDeleting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showSearchKey, setShowSearchKey] = useState(false);

  const [telegramSettings, setTelegramSettingsState] = useState<{ configured: boolean; chatId?: string } | null>(null);
  const [telegramForm, setTelegramForm] = useState({ botToken: "", chatId: "" });
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [result, setResult] = useState<{ deleted: Record<string, number> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadAiProviders() {
    try {
      const data = await getAiProviders();
      setAiProviders(data.providers);
      // activeProvider may not be returned by the API; derive from default
      const defaultP = data.providers.find((p) => p.isDefault);
      if (defaultP) {
        setActiveProvider({ name: defaultP.name, providerType: defaultP.providerType, model: defaultP.model });
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to load AI providers");
    } finally {
      setAiLoading(false);
    }
  }

  async function loadEmailSettings() {
    try {
      const data = await getEmailSettings();
      setEmailSettingsState({ defaultProvider: data.defaultProvider, providers: data.providers as Record<string, { configured: boolean; email: string | null; source?: string | null }> });
    } catch { /* ignore */ }
  }

  async function loadSmtpConfig() {
    try {
      const data = await getSmtpConfig();
      setSmtpConfig(data);
      if (data.configured && data.host) {
        setSmtpForm({ host: data.host ?? "", port: data.port ?? 465, secure: data.secure ?? true, user: data.user ?? "", password: "", fromEmail: data.fromEmail ?? "", fromName: data.fromName ?? "FindX" });
      }
    } catch { /* ignore */ }
  }

  async function loadResendConfig() {
    try {
      const data = await getResendConfig();
      setResendConfig(data);
      if (data.configured && data.fromEmail) {
        setResendForm((f) => ({ ...f, fromEmail: data.fromEmail ?? f.fromEmail }));
      }
    } catch { /* ignore */ }
  }

  async function loadSearchConfig() {
    try {
      const data = await getSearchConfig();
      setSearchConfig(data);
    } catch { /* ignore */ }
  }

  async function loadTelegramSettings() {
    try {
      const data = await getTelegramSettings();
      const s = data.settings;
      const configured = !!(s?.botToken && s?.chatId);
      setTelegramSettingsState({ configured, chatId: s?.chatId });
      if (s?.chatId) setTelegramForm((f) => ({ ...f, chatId: s.chatId! }));
    } catch { /* ignore */ }
  }

  useEffect(() => { loadAiProviders(); loadEmailSettings(); loadSmtpConfig(); loadResendConfig(); loadSearchConfig(); loadTelegramSettings(); }, []);

  function openAddForm() {
    setEditingId(null);
    const def = PROVIDER_TYPES.find(p => p.value === "openai")!;
    setForm({
      ...EMPTY_FORM,
      name: def.label,
      baseUrl: def.defaultBaseUrl,
      model: def.defaultModel,
    });
    setShowForm(true);
  }

  function handleProviderTypeChange(value: string) {
    const def = PROVIDER_TYPES.find(p => p.value === value);
    if (!def) return;
    setForm(f => ({
      ...f,
      providerType: value as AiProviderType,
      name: f.name && f.name !== PROVIDER_TYPES.find(p => p.value === f.providerType)?.label ? f.name : def.label,
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
    setSaving(true);
    setAiError(null);
    try {
      const payload = {
        name: form.name,
        providerType: form.providerType,
        apiKey: form.apiKey || undefined,
        baseUrl: form.baseUrl || undefined,
        model: form.model,
        temperature: form.temperature || undefined,
        maxTokens: form.maxTokens,
      };
      if (editingId) {
        await updateAiProvider(editingId, payload as any);
      } else {
        await createAiProvider(payload);
      }
      setShowForm(false);
      setEditingId(null);
      await loadAiProviders();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to save provider");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProvider(id: string) {
    try {
      await deleteAiProvider(id);
      await loadAiProviders();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to delete provider");
    }
  }

  async function handleTestProvider(id: string) {
    setTesting(id);
    setTestResult(null);
    try {
      const res = await testAiProvider(id);
      setTestResult({ id, ok: (res as any).success ?? (res as any).ok, error: (res as any).message ?? (res as any).error, model: (res as any).model });
    } catch (err) {
      setTestResult({ id, ok: false, error: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTesting(null);
    }
  }

  async function handleSetDefault(id: string) {
    try {
      await setDefaultAiProvider(id);
      await loadAiProviders();
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "Failed to set default provider");
    }
  }

  async function handleSetEmailDefault(provider: "gmail" | "smtp" | "resend") {
    try {
      await setEmailSettings({ defaultProvider: provider });
      await loadEmailSettings();
    } catch (err) {
      setProviderError(err instanceof Error ? err.message : "Failed to update email settings");
    }
  }

  async function handleSaveSmtp() {
    setSmtpSaving(true);
    setSmtpError(null);
    setSmtpSuccess(null);
    try {
      const data = await saveSmtpConfig(smtpForm);
      setSmtpConfig(data);
      setShowSmtpForm(false);
      setSmtpSuccess("SMTP configuration saved.");
      await loadEmailSettings();
    } catch (err) {
      setSmtpError(err instanceof Error ? err.message : "Failed to save SMTP config");
    } finally {
      setSmtpSaving(false);
    }
  }

  async function handleDeleteSmtp() {
    setSmtpDeleting(true);
    setSmtpError(null);
    try {
      await deleteSmtpConfig();
      setSmtpConfig({ configured: false });
      setSmtpForm({ host: "", port: 465, secure: true, user: "", password: "", fromEmail: "", fromName: "FindX" });
      setShowSmtpForm(false);
      await loadEmailSettings();
    } catch (err) {
      setSmtpError(err instanceof Error ? err.message : "Failed to delete SMTP config");
    } finally {
      setSmtpDeleting(false);
    }
  }

  async function handleSaveResend() {
    setResendSaving(true);
    setResendError(null);
    setResendSuccess(null);
    try {
      const data = await saveResendConfig(resendForm);
      setResendConfig(data);
      setShowResendForm(false);
      setResendForm((f) => ({ ...f, apiKey: "" }));
      setResendSuccess("Resend configuration saved.");
      await loadEmailSettings();
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Failed to save Resend config");
    } finally {
      setResendSaving(false);
    }
  }

  async function handleTestResend() {
    setResendTesting(true);
    setResendError(null);
    setResendSuccess(null);
    try {
      const res = await testResendConfig();
      if (res.ok) setResendSuccess(res.message ?? "Resend connection OK.");
      else setResendError(res.error ?? "Test failed");
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setResendTesting(false);
    }
  }

  async function handleDeleteResend() {
    setResendDeleting(true);
    setResendError(null);
    try {
      await deleteResendConfig();
      setResendConfig({ configured: false });
      setResendForm({ apiKey: "", fromEmail: "FindX <onboarding@resend.dev>" });
      setShowResendForm(false);
      await loadEmailSettings();
    } catch (err) {
      setResendError(err instanceof Error ? err.message : "Failed to delete Resend config");
    } finally {
      setResendDeleting(false);
    }
  }

  async function handleSaveSearch() {
    setSearchSaving(true);
    setSearchError(null);
    setSearchSuccess(null);
    try {
      const data = await saveSearchConfig({ apiKey: searchForm.apiKey, provider: "tavily" });
      setSearchConfig(data);
      setShowSearchForm(false);
      setSearchForm({ apiKey: "" });
      setSearchSuccess("Tavily API key saved.");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Failed to save search config");
    } finally {
      setSearchSaving(false);
    }
  }

  async function handleTestSearch() {
    setSearchTesting(true);
    setSearchError(null);
    setSearchSuccess(null);
    try {
      const res = await testSearchConfig();
      if (res.ok) setSearchSuccess(res.message ?? "Tavily connection OK.");
      else setSearchError(res.error ?? "Test failed");
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Test failed");
    } finally {
      setSearchTesting(false);
    }
  }

  async function handleDeleteSearch() {
    setSearchDeleting(true);
    setSearchError(null);
    try {
      await deleteSearchConfig();
      setSearchConfig({ configured: false });
      setSearchForm({ apiKey: "" });
      setShowSearchForm(false);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Failed to delete search config");
    } finally {
      setSearchDeleting(false);
    }
  }

  async function handleSaveTelegram() {
    setTelegramSaving(true);
    try {
      await saveTelegramSettings(telegramForm);
      await loadTelegramSettings();
    } catch { /* ignore */ } finally {
      setTelegramSaving(false);
    }
  }

  async function handleTestTelegram() {
    setTelegramTesting(true);
    setTelegramTestResult(null);
    try {
      const res = await testTelegram();
      setTelegramTestResult(res);
    } catch (err) {
      setTelegramTestResult({ success: false, error: err instanceof Error ? err.message : "Test failed" });
    } finally {
      setTelegramTesting(false);
    }
  }

  async function handleClearAll() {
    setClearing(true);
    setError(null);
    try {
      const res = await clearAllData();
      setResult({ deleted: (res as any).deleted || {} });
      setConfirming(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear data");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="p-8 space-y-6 bg-[#F7F5F0] min-h-screen">
      <div>
        <h2 className="text-2xl font-serif font-bold text-[#1A1A1A]">Settings</h2>
        <p className="text-sm text-[#7A756D] mt-0.5">Configure API endpoints, AI providers, and manage data.</p>
      </div>

      <div className="flex gap-1 p-1 bg-white border border-[#E5E3D9] rounded-lg w-fit">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-[#1A1A1A] text-white"
                : "text-[#7A756D] hover:text-[#1A1A1A] hover:bg-[#F0EDE6]"
            }`}>
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "ai" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-[#7A756D]" />
              <h3 className="text-sm font-semibold text-[#1A1A1A]">AI Providers</h3>
            </div>
            <button onClick={openAddForm}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#1A1A1A] text-white rounded-lg hover:bg-[#333] transition-colors">
              <Plus className="w-3 h-3" />
              Add Provider
            </button>
          </div>

          {activeProvider && (
            <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-emerald-700">Active Provider</span>
                  {activeProvider.isEnvFallback && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded">ENV FALLBACK</span>
                  )}
                </div>
                <p className="text-xs text-[#7A756D] truncate">
                  {PROVIDER_TYPES.find((t) => t.value === activeProvider.providerType)?.label ?? activeProvider.providerType}
                  {" "}&middot;{" "}
                  <span className="text-[#1A1A1A] font-medium">{activeProvider.model}</span>
                </p>
              </div>
            </div>
          )}

          {aiLoading ? (
            <div className="flex items-center gap-2 text-xs text-[#7A756D]">
              <Loader2 className="w-3 h-3 animate-spin" />
              Loading providers...
            </div>
          ) : aiProviders.length === 0 ? (
            <div className="p-6 bg-white border border-[#E5E3D9] rounded-xl text-center">
              <p className="text-xs text-[#7A756D]">
                No AI providers configured. Add one or set environment variables (<code className="text-[#1A1A1A]">GLM_API_KEY</code>) as fallback.
              </p>
              <button onClick={openAddForm} className="mt-3 px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm hover:bg-[#333] transition-colors">
                Add your first AI provider
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {aiProviders.map((provider) => {
                const info = PROVIDER_TYPES.find((t) => t.value === provider.providerType);
                return (
                  <div key={provider.id} className={`flex items-center justify-between p-3 rounded-lg border ${provider.isDefault ? "bg-[#F0EDE6] border-[#C4C0B8]" : "bg-white border-[#E5E3D9]"}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-base">{info?.icon || "🤖"}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#1A1A1A] truncate">{provider.name}</p>
                          {provider.isDefault && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#1A1A1A] text-white rounded">DEFAULT</span>}
                          {!provider.isActive && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#F0EDE6] text-[#7A756D] rounded">INACTIVE</span>}
                        </div>
                        <p className="text-xs text-[#7A756D]">{info?.label} &middot; {provider.model}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {testResult?.id === provider.id && (testResult.ok ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-red-500" />)}
                      <button onClick={() => handleTestProvider(provider.id)} disabled={testing === provider.id} className="p-1.5 text-[#7A756D] hover:text-emerald-600 disabled:opacity-50 transition-colors" title="Test connection">
                        {testing === provider.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      </button>
                      {!provider.isDefault && (
                        <button onClick={() => handleSetDefault(provider.id)} className="p-1.5 text-[#7A756D] hover:text-amber-600 transition-colors" title="Set as default">
                          <Star className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => openEditForm(provider)} className="p-1.5 text-[#7A756D] hover:text-blue-600 transition-colors" title="Edit">
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteProvider(provider.id)} className="p-1.5 text-[#7A756D] hover:text-red-500 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showForm && (() => {
            const provCfg = PROVIDER_TYPES.find(p => p.value === form.providerType) ?? PROVIDER_TYPES[0];
            const [showKey, setShowKey] = [false, (_: boolean) => {}]; // placeholder; use local state below
            return (
              <div className="bg-white rounded-xl border border-[#E5E3D9] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EDE6]">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{provCfg.icon}</span>
                    <h4 className="text-sm font-semibold text-[#1A1A1A]">{editingId ? "Edit Provider" : "Add AI Provider"}</h4>
                  </div>
                  <button onClick={() => { setShowForm(false); setEditingId(null); }} className="text-[#BDBDB0] hover:text-[#1A1A1A] transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Step 1 — Choose Provider */}
                  {!editingId && (
                    <div>
                      <p className="text-xs font-semibold text-[#7A756D] uppercase tracking-wider mb-3">① Choose Provider</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {PROVIDER_TYPES.map(p => (
                          <button
                            key={p.value}
                            onClick={() => handleProviderTypeChange(p.value)}
                            className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all ${
                              form.providerType === p.value
                                ? "border-[#1A1A1A] bg-[#F7F5F0] shadow-sm"
                                : "border-[#E5E3D9] hover:border-[#C4C0B8] hover:bg-[#FAFAF8]"
                            }`}
                          >
                            <span className="text-xl">{p.icon}</span>
                            <span className="text-xs font-semibold text-[#1A1A1A] leading-tight">{p.label}</span>
                          </button>
                        ))}
                      </div>
                      {/* Provider description */}
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-[#F7F5F0] border border-[#E5E3D9]">
                        <span className="text-base mt-0.5">{provCfg.icon}</span>
                        <div>
                          <p className="text-xs font-semibold text-[#1A1A1A]">{provCfg.label}</p>
                          <p className="text-xs text-[#7A756D] mt-0.5">{provCfg.description}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2 — API Key */}
                  <div>
                    <p className="text-xs font-semibold text-[#7A756D] uppercase tracking-wider mb-3">
                      {editingId ? "🔑 API Key" : "② API Key"}
                    </p>
                    <div className="space-y-2">
                      {provCfg.apiKeyUrl && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                          <span className="text-xs text-blue-700">Get your key from</span>
                          <a href={provCfg.apiKeyUrl} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-semibold text-blue-700 underline flex items-center gap-0.5 hover:text-blue-900">
                            {provCfg.apiKeyUrlLabel}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {provCfg.value === "ollama" && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-xs text-emerald-700">No API key needed — Ollama runs locally on your machine</span>
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="password"
                          value={form.apiKey}
                          onChange={e => setForm({ ...form, apiKey: e.target.value })}
                          placeholder={editingId ? "Leave empty to keep current key" : provCfg.apiKeyPlaceholder}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 — Model */}
                  <div>
                    <p className="text-xs font-semibold text-[#7A756D] uppercase tracking-wider mb-3">
                      {editingId ? "🧩 Model" : "③ Choose Model"}
                    </p>
                    {provCfg.models.length > 0 ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {provCfg.models.map(m => (
                            <button
                              key={m}
                              onClick={() => setForm({ ...form, model: m })}
                              className={`text-left px-3 py-2 rounded-lg border text-xs transition-all ${
                                form.model === m
                                  ? "border-[#1A1A1A] bg-[#F7F5F0] font-semibold text-[#1A1A1A]"
                                  : "border-[#E5E3D9] text-[#7A756D] hover:border-[#C4C0B8] hover:text-[#1A1A1A]"
                              }`}
                            >
                              {m}
                              {m === provCfg.defaultModel && (
                                <span className="ml-1.5 text-[9px] px-1 py-0.5 bg-[#1A1A1A] text-white rounded">recommended</span>
                              )}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-[#BDBDB0]">Or type a custom model name:</p>
                        <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                          placeholder="Custom model name..." className={inputCls} />
                      </div>
                    ) : (
                      <input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })}
                        placeholder="e.g. gpt-4o, claude-3-5-sonnet-20241022" className={inputCls} />
                    )}
                  </div>

                  {/* Advanced — collapsible */}
                  <AdvancedSettings
                    form={form}
                    setForm={setForm}
                    inputCls={inputCls}
                    labelCls={labelCls}
                    baseUrlEditable={provCfg.baseUrlEditable || !!editingId}
                    isOllama={provCfg.value === "ollama"}
                    name={form.name}
                  />

                  {/* Save */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[#F0EDE6]">
                    <button onClick={handleSaveProvider} disabled={saving || !form.name || !form.model}
                      className="px-5 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors flex items-center gap-2">
                      {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      {saving ? "Saving..." : editingId ? "Update Provider" : "Add Provider"}
                    </button>
                    <button onClick={() => { setShowForm(false); setEditingId(null); }}
                      className="px-4 py-2 text-sm text-[#7A756D] hover:text-[#1A1A1A] transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {aiError && (
            <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{aiError}</p>
          )}
          {testResult && !testResult.ok && (
            <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Connection test failed: {testResult.error}</p>
          )}
          {testResult?.ok && (
            <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" />Connection test passed! Model: {testResult.model}</p>
          )}
        </div>
      )}

      {activeTab === "email" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#7A756D]" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Email Providers</h3>
          </div>

          {emailSettings && (
            <div className="flex items-center gap-2 p-3 bg-white border border-[#E5E3D9] rounded-lg">
              <span className="text-xs text-[#7A756D]">Default provider:</span>
              <div className="flex gap-1.5">
                {(["resend", "smtp", "gmail"] as const).map((p) => {
                  const isConfigured = emailSettings.providers?.[p]?.configured;
                  return (
                    <button key={p} onClick={() => handleSetEmailDefault(p)} disabled={!isConfigured}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${emailSettings.defaultProvider === p ? "bg-[#1A1A1A] text-white border-[#1A1A1A]" : "bg-white text-[#7A756D] border-[#E5E3D9] hover:text-[#1A1A1A] hover:border-[#C4C0B8]"}`}>
                      {p}
                    </button>
                  );
                })}
              </div>
              {providerError && <p className="text-xs text-red-500 ml-2">{providerError}</p>}
            </div>
          )}

          {/* ─── Resend ─── */}
          <div className="bg-white rounded-xl border border-[#E5E3D9] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F0EDE6] flex items-center justify-center text-sm">✉️</div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Resend</p>
                  <p className="text-xs text-[#7A756D]">Transactional email via Resend API</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {resendConfig?.configured && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {resendConfig.source === "env" ? "via ENV" : "Configured"}
                  </span>
                )}
                <button onClick={() => { setShowResendForm(!showResendForm); setResendError(null); setResendSuccess(null); }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#F0EDE6] text-[#1A1A1A] rounded-lg hover:bg-[#E8E4DC] transition-colors">
                  {showResendForm ? "Cancel" : resendConfig?.configured ? "Update" : "Configure"}
                </button>
              </div>
            </div>

            {showResendForm && (
              <div className="space-y-3 pt-1 border-t border-[#F0EDE6]">
                <div>
                  <label className={labelCls}>API Key</label>
                  <div className="relative">
                    <input type={showResendKey ? "text" : "password"} value={resendForm.apiKey}
                      onChange={(e) => setResendForm({ ...resendForm, apiKey: e.target.value })}
                      placeholder={resendConfig?.configured ? "Enter new key to update..." : "re_xxxxxxxxxxxx"}
                      className={`${inputCls} pr-9`} />
                    <button type="button" onClick={() => setShowResendKey(!showResendKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#BDBDB0] hover:text-[#7A756D]">
                      {showResendKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7A756D] mt-1">Get your API key from <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">resend.com/api-keys</a></p>
                </div>
                <div>
                  <label className={labelCls}>From Email / Name</label>
                  <input type="text" value={resendForm.fromEmail}
                    onChange={(e) => setResendForm({ ...resendForm, fromEmail: e.target.value })}
                    placeholder='FindX <noreply@yourdomain.com>'
                    className={inputCls} />
                  <p className="text-[10px] text-[#7A756D] mt-1">Must match a verified Resend sender domain</p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleSaveResend} disabled={resendSaving || !resendForm.apiKey}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
                    {resendSaving ? "Saving..." : "Save"}
                  </button>
                  {resendConfig?.configured && resendConfig.source !== "env" && (
                    <button onClick={handleDeleteResend} disabled={resendDeleting}
                      className="px-3 py-2 text-red-500 border border-red-200 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors">
                      {resendDeleting ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {resendConfig?.configured && !showResendForm && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0EDE6]">
                <span className="text-[#7A756D]">From: <span className="text-[#1A1A1A]">{resendConfig.fromEmail ?? "default"}</span></span>
                <button onClick={handleTestResend} disabled={resendTesting}
                  className="flex items-center gap-1 px-2.5 py-1 border border-[#E5E3D9] rounded-md text-[#7A756D] hover:text-[#1A1A1A] hover:border-[#C4C0B8] disabled:opacity-50 transition-colors">
                  {resendTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Test
                </button>
              </div>
            )}

            {resendError && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" />{resendError}</p>}
            {resendSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />{resendSuccess}</p>}
          </div>

          {/* ─── SMTP ─── */}
          <div className="bg-white rounded-xl border border-[#E5E3D9] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F0EDE6] flex items-center justify-center text-sm">📬</div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">SMTP</p>
                  <p className="text-xs text-[#7A756D]">Custom SMTP server (Gmail, Outlook, etc.)</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smtpConfig?.configured && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" />Configured
                  </span>
                )}
                <button onClick={() => { setShowSmtpForm(!showSmtpForm); setSmtpError(null); setSmtpSuccess(null); }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#F0EDE6] text-[#1A1A1A] rounded-lg hover:bg-[#E8E4DC] transition-colors">
                  {showSmtpForm ? "Cancel" : smtpConfig?.configured ? "Update" : "Configure"}
                </button>
              </div>
            </div>

            {showSmtpForm && (
              <div className="space-y-3 pt-1 border-t border-[#F0EDE6]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 sm:col-span-1">
                    <label className={labelCls}>SMTP Host</label>
                    <input type="text" value={smtpForm.host} onChange={(e) => setSmtpForm({ ...smtpForm, host: e.target.value })}
                      placeholder="smtp.gmail.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Port</label>
                    <input type="number" value={smtpForm.port} onChange={(e) => setSmtpForm({ ...smtpForm, port: parseInt(e.target.value) || 465 })}
                      placeholder="465" className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Username / Email</label>
                    <input type="text" value={smtpForm.user} onChange={(e) => setSmtpForm({ ...smtpForm, user: e.target.value })}
                      placeholder="you@gmail.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Password / App Password</label>
                    <div className="relative">
                      <input type={showSmtpPassword ? "text" : "password"} value={smtpForm.password}
                        onChange={(e) => setSmtpForm({ ...smtpForm, password: e.target.value })}
                        placeholder={smtpConfig?.configured ? "Enter new password to update..." : "••••••••••••"}
                        className={`${inputCls} pr-9`} />
                      <button type="button" onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#BDBDB0] hover:text-[#7A756D]">
                        {showSmtpPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>From Email</label>
                    <input type="email" value={smtpForm.fromEmail} onChange={(e) => setSmtpForm({ ...smtpForm, fromEmail: e.target.value })}
                      placeholder="you@gmail.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>From Name</label>
                    <input type="text" value={smtpForm.fromName} onChange={(e) => setSmtpForm({ ...smtpForm, fromName: e.target.value })}
                      placeholder="FindX" className={inputCls} />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={smtpForm.secure} onChange={(e) => setSmtpForm({ ...smtpForm, secure: e.target.checked })}
                      className="rounded border-[#E5E3D9]" />
                    <span className="text-xs text-[#7A756D]">Use TLS/SSL (recommended for port 465)</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleSaveSmtp} disabled={smtpSaving || !smtpForm.host || !smtpForm.user || (!smtpConfig?.configured && !smtpForm.password)}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
                    {smtpSaving ? "Saving..." : "Save"}
                  </button>
                  {smtpConfig?.configured && (
                    <button onClick={handleDeleteSmtp} disabled={smtpDeleting}
                      className="px-3 py-2 text-red-500 border border-red-200 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors">
                      {smtpDeleting ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {smtpConfig?.configured && !showSmtpForm && (
              <div className="text-xs pt-1 border-t border-[#F0EDE6] space-y-0.5">
                <p className="text-[#7A756D]">Host: <span className="text-[#1A1A1A]">{smtpConfig.host}:{smtpConfig.port}</span></p>
                <p className="text-[#7A756D]">From: <span className="text-[#1A1A1A]">{smtpConfig.fromEmail}</span></p>
              </div>
            )}

            {smtpError && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" />{smtpError}</p>}
            {smtpSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />{smtpSuccess}</p>}
          </div>

          {/* ─── Gmail ─── */}
          <div className="bg-white rounded-xl border border-[#E5E3D9] p-5">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#F0EDE6] flex items-center justify-center text-sm">📧</div>
              <div>
                <p className="text-sm font-semibold text-[#1A1A1A]">Gmail OAuth</p>
                <p className="text-xs text-[#7A756D]">Set <code className="bg-[#F0EDE6] px-1 rounded">GOOGLE_CLIENT_ID</code> and <code className="bg-[#F0EDE6] px-1 rounded">GOOGLE_CLIENT_SECRET</code> environment variables to enable.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🔍</span>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Search Providers</h3>
          </div>

          {/* ─── Tavily ─── */}
          <div className="bg-white rounded-xl border border-[#E5E3D9] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#F0EDE6] flex items-center justify-center text-sm">🌐</div>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">Tavily Search</p>
                  <p className="text-xs text-[#7A756D]">AI-powered web search used by the discovery agent</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {searchConfig?.configured && (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    {searchConfig.source === "env" ? "via ENV" : "Configured"}
                  </span>
                )}
                <button onClick={() => { setShowSearchForm(!showSearchForm); setSearchError(null); setSearchSuccess(null); }}
                  className="px-3 py-1.5 text-xs font-medium bg-[#F0EDE6] text-[#1A1A1A] rounded-lg hover:bg-[#E8E4DC] transition-colors">
                  {showSearchForm ? "Cancel" : searchConfig?.configured ? "Update" : "Configure"}
                </button>
              </div>
            </div>

            {showSearchForm && (
              <div className="space-y-3 pt-1 border-t border-[#F0EDE6]">
                <div>
                  <label className={labelCls}>API Key</label>
                  <div className="relative">
                    <input type={showSearchKey ? "text" : "password"} value={searchForm.apiKey}
                      onChange={(e) => setSearchForm({ apiKey: e.target.value })}
                      placeholder={searchConfig?.configured ? "Enter new key to update..." : "tvly-xxxxxxxxxxxx"}
                      className={`${inputCls} pr-9`} />
                    <button type="button" onClick={() => setShowSearchKey(!showSearchKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#BDBDB0] hover:text-[#7A756D]">
                      {showSearchKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[#7A756D] mt-1">
                    Get your API key from <a href="https://app.tavily.com/home" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">app.tavily.com</a>. Free tier includes 1,000 searches/month.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={handleSaveSearch} disabled={searchSaving || !searchForm.apiKey}
                    className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
                    {searchSaving ? "Saving..." : "Save"}
                  </button>
                  {searchConfig?.configured && searchConfig.source !== "env" && (
                    <button onClick={handleDeleteSearch} disabled={searchDeleting}
                      className="px-3 py-2 text-red-500 border border-red-200 rounded-lg text-sm hover:bg-red-50 disabled:opacity-50 transition-colors">
                      {searchDeleting ? "Removing..." : "Remove"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {searchConfig?.configured && !showSearchForm && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-[#F0EDE6]">
                <span className="text-[#7A756D]">Provider: <span className="text-[#1A1A1A] font-medium">Tavily</span></span>
                <button onClick={handleTestSearch} disabled={searchTesting}
                  className="flex items-center gap-1 px-2.5 py-1 border border-[#E5E3D9] rounded-md text-[#7A756D] hover:text-[#1A1A1A] hover:border-[#C4C0B8] disabled:opacity-50 transition-colors">
                  {searchTesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                  Test
                </button>
              </div>
            )}

            {!searchConfig?.configured && !showSearchForm && (
              <p className="text-xs text-[#BDBDB0] pt-1 border-t border-[#F0EDE6]">
                Not configured — the AI discovery agent will not be able to search the web without this key.
              </p>
            )}

            {searchError && <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" />{searchError}</p>}
            {searchSuccess && <p className="text-xs text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />{searchSuccess}</p>}
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-white rounded-xl border border-[#E5E3D9] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#7A756D]" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Telegram Notifications</h3>
          </div>
          <p className="text-xs text-[#7A756D]">Get instant notifications on Telegram when emails are sent, opened, or replied.</p>

          <div className="space-y-4">
            <div>
              <label className={labelCls}>Bot Token</label>
              <input type="password" value={telegramForm.botToken} onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })}
                placeholder={telegramSettings ? "••••••••••••••" : "123456789:ABCdef..."}
                className={inputCls} />
              <p className="text-[10px] text-[#7A756D] mt-1">
                Create a bot via <a href="https://t.me/botfather" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@BotFather</a>
              </p>
            </div>
            <div>
              <label className={labelCls}>Chat ID</label>
              <input type="text" value={telegramForm.chatId} onChange={(e) => setTelegramForm({ ...telegramForm, chatId: e.target.value })} placeholder="123456789"
                className={inputCls} />
              <p className="text-[10px] text-[#7A756D] mt-1">
                Get your Chat ID via <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">@userinfobot</a>
              </p>
            </div>

            {telegramSettings?.configured && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-xs text-emerald-700">Telegram notifications configured</span>
              </div>
            )}

            {telegramTestResult && (
              <p className={`text-xs flex items-center gap-1.5 ${telegramTestResult.success ? "text-emerald-600" : "text-red-500"}`}>
                {telegramTestResult.success ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                {telegramTestResult.success ? "Test message sent!" : telegramTestResult.error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleSaveTelegram} disabled={telegramSaving}
                className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-medium hover:bg-[#333] disabled:opacity-50 transition-colors">
                {telegramSaving ? "Saving..." : "Save Settings"}
              </button>
              <button onClick={handleTestTelegram} disabled={telegramTesting || !telegramForm.botToken || !telegramForm.chatId}
                className="px-4 py-2 border border-[#E5E3D9] text-[#1A1A1A] rounded-lg text-sm font-medium hover:bg-[#F0EDE6] disabled:opacity-50 transition-colors">
                {telegramTesting ? "Sending..." : "Test"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "data" && (
        <div className="bg-white rounded-xl border border-[#E5E3D9] p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Data Management</h3>
          </div>
          <p className="text-sm text-[#7A756D]">
            Permanently delete all leads, analyses, outreach records, and pipeline run history. This cannot be undone.
          </p>

          {result ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">Data cleared successfully</span>
              </div>
              <ul className="text-xs text-emerald-600 space-y-0.5">
                {Object.entries(result.deleted).map(([key, count]) => (
                  <li key={key}>{key}: {count} deleted</li>
                ))}
              </ul>
            </div>
          ) : confirming ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-red-700">Are you sure? This will delete all data permanently.</p>
              <div className="flex gap-2">
                <button onClick={handleClearAll} disabled={clearing}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                  {clearing ? "Deleting..." : "Yes, delete everything"}
                </button>
                <button onClick={() => setConfirming(false)} className="px-4 py-2 border border-[#E5E3D9] text-[#1A1A1A] rounded-lg text-sm hover:bg-[#F0EDE6] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirming(true)}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors">
              <Trash2 className="w-4 h-4" />
              Clear all data
            </button>
          )}

          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
