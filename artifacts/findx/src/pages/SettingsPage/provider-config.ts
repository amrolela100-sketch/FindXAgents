/**
 * SettingsPage — Provider Configuration & Constants
 *
 * Centralized configuration for all AI provider types,
 * empty form state, and tab definitions.
 *
 * @module SettingsPage/provider-config
 */

import type { AiProviderType } from "@/lib/types";
import {
  Bot, Mail, Search, Bell, Database, Users, Webhook,
} from "lucide-react";

// ─── Animation presets ──────────────────────────────────────────────────────
export const SPRING = { type: "spring" as const, stiffness: 120, damping: 22 };

export const FADE_UP = {
  hidden: { opacity: 0, y: 12 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { ...SPRING, delay: i * 0.05 } }),
};

// ─── Tabs ────────────────────────────────────────────────────────────────────
export const TABS = [
  { id: "ai",            label: "AI Providers",   icon: Bot,           color: "#C084FC" },
  { id: "email",         label: "Email",          icon: Mail,          color: "#60A5FA" },
  { id: "search",        label: "Search",         icon: Search,        color: "#FBBF24" },
  { id: "notifications", label: "Notifications",  icon: Bell,          color: "#F97316" },
  { id: "data",          label: "Data",           icon: Database,      color: "#F87171" },
  { id: "team",          label: "Team",           icon: Users,         color: "#A855F7" },
  { id: "webhooks",      label: "Webhooks",       icon: Webhook,       color: "#8B5CF6" },
] as const;

export type TabId = typeof TABS[number]["id"];

// ─── Provider configs ────────────────────────────────────────────────────────
export type ProviderConfig = {
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
  keyPrefix?: string;
};

export const PROVIDER_TYPES: ProviderConfig[] = [
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

export const EMPTY_FORM = {
  providerType: "openai" as AiProviderType,
  name: "",
  apiKey: "",
  baseUrl: "",
  model: "",
  temperature: "",
  maxTokens: 4096,
};

export type AiFormState = typeof EMPTY_FORM;
