import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  Zap, Key, Play, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, Loader2, ExternalLink, Eye, EyeOff,
} from "lucide-react";
import { SPRING, FADE_UP } from "@/lib/motion";
import { saveSearchConfig, saveResendConfig, runAgentPipeline } from "@/lib/api";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDUSTRIES = [
  "SaaS", "Fintech", "E-commerce", "Logistics", "Marketing",
  "Healthcare", "Manufacturing", "Real Estate", "Education",
  "Food & Beverage", "Retail", "Construction", "Other",
];

const REGIONS: { group: string; options: string[] }[] = [
  { group: "🇦🇪 UAE", options: ["Dubai", "Abu Dhabi", "Sharjah", "UAE – All"] },
  { group: "🇸🇦 Saudi Arabia", options: ["Riyadh", "Jeddah", "Dammam", "Saudi Arabia – All"] },
  { group: "🌍 MENA", options: ["Egypt – Cairo", "Qatar – Doha", "Kuwait", "Jordan – Amman", "Morocco – Casablanca"] },
  { group: "🇳🇱 Netherlands", options: ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Heel Nederland"] },
  { group: "🌍 Europe", options: ["London", "Paris", "Berlin", "Madrid", "Barcelona"] },
  { group: "🌏 Asia", options: ["Istanbul", "Singapore", "Mumbai", "Dubai"] },
  { group: "🌎 Americas", options: ["New York", "Miami", "Toronto", "São Paulo"] },
];

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
  { value: "nl", label: "Nederlands" },
  { value: "fr", label: "Français" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
];

const TOTAL_STEPS = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            "w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300",
            i + 1 === current
              ? "bg-primary text-white shadow-glow-brand scale-110"
              : i + 1 < current
              ? "bg-success/20 text-success border border-success/30"
              : "bg-glass border border-glass-border text-text-muted",
          )}>
            {i + 1 < current ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
          </div>
          {i < TOTAL_STEPS - 1 && (
            <div className={cn(
              "h-0.5 w-8 rounded-full transition-all duration-500",
              i + 1 < current ? "bg-success/50" : "bg-glass-border",
            )} />
          )}
        </div>
      ))}
      <span className="ms-3 text-[11px] font-semibold text-text-muted uppercase tracking-wider">
        {current}/{TOTAL_STEPS}
      </span>
    </div>
  );
}

type TestStatus = "idle" | "testing" | "ok" | "fail";

function ApiKeyCard({
  icon: Icon,
  title,
  desc,
  placeholder,
  docsUrl,
  value,
  onChange,
  status,
  onTest,
  required,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  placeholder: string;
  docsUrl: string;
  value: string;
  onChange: (v: string) => void;
  status: TestStatus;
  onTest: () => void;
  required?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="rounded-xl bg-glass-raised border border-glass-border p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">
              {title}
              {required && <span className="text-error ms-1 text-xs">*</span>}
            </p>
            <p className="text-[11px] text-text-muted">{desc}</p>
          </div>
        </div>
        {status === "ok" && <CheckCircle2 className="w-5 h-5 text-success shrink-0" />}
        {status === "fail" && <XCircle className="w-5 h-5 text-error shrink-0" />}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={show ? "text" : "password"}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-9 bg-surface border border-glass-border rounded-lg px-3 pe-9 text-xs font-mono text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <button
            type="button"
            onClick={() => setShow(s => !s)}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
          >
            {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={!value || status === "testing"}
          className="btn btn-outline h-9 px-3 text-xs font-bold shrink-0 disabled:opacity-40"
        >
          {status === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
        </button>
      </div>
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
      >
        Get API key <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1({ data, setData }: {
  data: { displayName: string; language: string };
  setData: (d: Partial<{ displayName: string; language: string }>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Your display name
        </label>
        <input
          type="text"
          value={data.displayName}
          onChange={e => setData({ displayName: e.target.value })}
          placeholder="e.g. Ahmed or Fatima"
          className="w-full h-10 bg-surface border border-glass-border rounded-lg px-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Preferred language
        </label>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.value}
              type="button"
              onClick={() => setData({ language: lang.value })}
              className={cn(
                "h-10 rounded-lg border text-sm font-medium transition-all",
                data.language === lang.value
                  ? "bg-primary text-white border-primary shadow-glow-brand"
                  : "bg-glass border-glass-border text-text-muted hover:border-primary/50",
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step2({ data, setData }: {
  data: { workspaceName: string; industry: string; region: string };
  setData: (d: Partial<{ workspaceName: string; industry: string; region: string }>) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Workspace name
        </label>
        <input
          type="text"
          value={data.workspaceName}
          onChange={e => setData({ workspaceName: e.target.value })}
          placeholder="e.g. My Agency, ACME Corp"
          className="w-full h-10 bg-surface border border-glass-border rounded-lg px-3 text-sm text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Target industry
        </label>
        <select
          value={data.industry}
          onChange={e => setData({ industry: e.target.value })}
          className="w-full h-10 bg-surface border border-glass-border rounded-lg px-3 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">Select industry…</option>
          {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-text-muted mb-1.5">
          Target region
        </label>
        <select
          value={data.region}
          onChange={e => setData({ region: e.target.value })}
          className="w-full h-10 bg-surface border border-glass-border rounded-lg px-3 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
        >
          <option value="">Select region…</option>
          {REGIONS.map(g => (
            <optgroup key={g.group} label={g.group}>
              {g.options.map(o => <option key={o} value={o}>{o}</option>)}
            </optgroup>
          ))}
        </select>
      </div>
    </div>
  );
}

function Step3({
  tavilyKey, setTavilyKey, tavilyStatus, onTestTavily,
  resendKey, setResendKey, resendStatus, onTestResend,
  resendFrom, setResendFrom,
}: {
  tavilyKey: string; setTavilyKey: (v: string) => void; tavilyStatus: TestStatus; onTestTavily: () => void;
  resendKey: string; setResendKey: (v: string) => void; resendStatus: TestStatus; onTestResend: () => void;
  resendFrom: string; setResendFrom: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <ApiKeyCard
        icon={Key}
        title="Tavily Search API"
        desc="Powers web discovery — required to run pipelines"
        placeholder="tvly-xxxxxxxxxxxxxxxx"
        docsUrl="https://tavily.com"
        value={tavilyKey}
        onChange={setTavilyKey}
        status={tavilyStatus}
        onTest={onTestTavily}
        required
      />
      <div className="rounded-xl bg-glass-raised border border-glass-border p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Key className="w-4 h-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text">
              Resend Email API
              <span className="text-error ms-1 text-xs">*</span>
            </p>
            <p className="text-[11px] text-text-muted">Sends outreach emails to leads</p>
          </div>
          {resendStatus === "ok" && <CheckCircle2 className="w-5 h-5 text-success ms-auto shrink-0" />}
          {resendStatus === "fail" && <XCircle className="w-5 h-5 text-error ms-auto shrink-0" />}
        </div>
        <input
          type="text"
          value={resendFrom}
          onChange={e => setResendFrom(e.target.value)}
          placeholder="outreach@yourdomain.com"
          className="w-full h-9 bg-surface border border-glass-border rounded-lg px-3 text-xs text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="password"
              value={resendKey}
              onChange={e => setResendKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxx"
              className="w-full h-9 bg-surface border border-glass-border rounded-lg px-3 text-xs font-mono text-text placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <button
            type="button"
            onClick={onTestResend}
            disabled={!resendKey || resendStatus === "testing"}
            className="btn btn-outline h-9 px-3 text-xs font-bold shrink-0 disabled:opacity-40"
          >
            {resendStatus === "testing" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Test"}
          </button>
        </div>
        <a href="https://resend.com" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
          Get Resend API key <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

function Step4({
  query, region, industry, running, done, onRun,
}: {
  query: string; region: string; industry: string;
  running: boolean; done: boolean; onRun: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-2">Your first pipeline query</p>
        <p className="text-sm font-mono text-text">
          {industry && region
            ? `${industry} businesses in ${region}`
            : "web design agency amsterdam"}
        </p>
      </div>

      {!done ? (
        <button
          type="button"
          onClick={onRun}
          disabled={running}
          className="btn btn-primary w-full h-12 text-sm font-bold gap-3 shadow-glow-brand disabled:opacity-70"
        >
          {running ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Running pipeline…
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run your first pipeline now
            </>
          )}
        </button>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl bg-success/10 border border-success/30 p-5 text-center space-y-2"
        >
          <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
          <p className="font-bold text-text">Pipeline started!</p>
          <p className="text-sm text-text-muted">Leads are being discovered in the background.</p>
        </motion.div>
      )}

      {running && (
        <div className="space-y-2">
          {["Initializing discovery agent…", "Searching web directories…", "Queuing analysis…"].map((msg, i) => (
            <motion.div
              key={msg}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.4 }}
              className="flex items-center gap-2 text-xs text-text-muted"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              {msg}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);

  // Step 1
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage]       = useState("en");

  // Step 2
  const [workspaceName, setWorkspaceName] = useState("");
  const [industry, setIndustry]           = useState("");
  const [region, setRegion]               = useState("");

  // Step 3
  const [tavilyKey, setTavilyKey]   = useState("");
  const [tavilyStatus, setTavilyStatus] = useState<TestStatus>("idle");
  const [resendKey, setResendKey]   = useState("");
  const [resendFrom, setResendFrom] = useState("");
  const [resendStatus, setResendStatus] = useState<TestStatus>("idle");

  // Step 4
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineDone, setPipelineDone]       = useState(false);

  // saving
  const [saving, setSaving] = useState(false);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleTestTavily() {
    if (!tavilyKey) return;
    setTavilyStatus("testing");
    try {
      await saveSearchConfig({ apiKey: tavilyKey, provider: "tavily" });
      setTavilyStatus("ok");
    } catch {
      setTavilyStatus("fail");
    }
  }

  async function handleTestResend() {
    if (!resendKey || !resendFrom) return;
    setResendStatus("testing");
    try {
      await saveResendConfig({ apiKey: resendKey, fromEmail: resendFrom });
      setResendStatus("ok");
    } catch {
      setResendStatus("fail");
    }
  }

  async function handleRunPipeline() {
    setPipelineRunning(true);
    try {
      const q = industry && region
        ? `${industry} businesses in ${region}`
        : "web design agency amsterdam";
      await runAgentPipeline({ query: q, maxResults: 10, language: language as any });
      setPipelineDone(true);
    } catch {
      // still mark done — pipeline may have queued
      setPipelineDone(true);
    } finally {
      setPipelineRunning(false);
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, language, workspaceName, industry, region }),
        credentials: "include",
      });
    } catch {
      // non-blocking
    } finally {
      setSaving(false);
      navigate("/");
    }
  }

  function canAdvance(): boolean {
    if (step === 1) return displayName.trim().length > 0;
    if (step === 2) return workspaceName.trim().length > 0;
    if (step === 3) return true; // all optional via "skip"
    return true;
  }

  const stepTitles = [
    { title: "Welcome to FindX", sub: "Let's get to know you" },
    { title: "Set up your workspace", sub: "Tell us about your target market" },
    { title: "Connect your tools", sub: "Keys are stored encrypted — skip if you want" },
    { title: "Run your first pipeline", sub: "See FindX in action right now" },
  ];

  const current = stepTitles[step - 1];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/8 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-glow-brand">
            <Zap className="w-4 h-4 text-white fill-current" />
          </div>
          <span className="font-bold text-lg tracking-tight text-text">FindX</span>
        </div>

        {/* Card */}
        <motion.div
          className="bg-glass border border-glass-border rounded-2xl p-8 shadow-2xl backdrop-blur-glass"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
        >
          <StepIndicator current={step} />

          {/* Step header */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`header-${step}`}
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              <h1 className="text-2xl font-bold tracking-tight text-text">{current.title}</h1>
              <p className="text-sm text-text-muted mt-1">{current.sub}</p>
            </motion.div>
          </AnimatePresence>

          {/* Step content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${step}`}
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -10 }}
            >
              {step === 1 && (
                <Step1
                  data={{ displayName, language }}
                  setData={d => {
                    if (d.displayName !== undefined) setDisplayName(d.displayName);
                    if (d.language   !== undefined) setLanguage(d.language);
                  }}
                />
              )}
              {step === 2 && (
                <Step2
                  data={{ workspaceName, industry, region }}
                  setData={d => {
                    if (d.workspaceName !== undefined) setWorkspaceName(d.workspaceName);
                    if (d.industry      !== undefined) setIndustry(d.industry);
                    if (d.region        !== undefined) setRegion(d.region);
                  }}
                />
              )}
              {step === 3 && (
                <Step3
                  tavilyKey={tavilyKey}       setTavilyKey={setTavilyKey}
                  tavilyStatus={tavilyStatus}  onTestTavily={handleTestTavily}
                  resendKey={resendKey}         setResendKey={setResendKey}
                  resendStatus={resendStatus}   onTestResend={handleTestResend}
                  resendFrom={resendFrom}       setResendFrom={setResendFrom}
                />
              )}
              {step === 4 && (
                <Step4
                  query={`${industry} businesses in ${region}`}
                  region={region}
                  industry={industry}
                  running={pipelineRunning}
                  done={pipelineDone}
                  onRun={handleRunPipeline}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-glass-border">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="btn btn-ghost h-10 px-4 text-sm font-bold gap-2 text-text-muted hover:text-text"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <div className="flex items-center gap-3">
                {step === 3 && (
                  <button
                    type="button"
                    onClick={() => setStep(s => s + 1)}
                    className="text-xs text-text-muted hover:text-text transition-colors"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canAdvance()}
                  className="btn btn-primary h-10 px-6 text-sm font-bold gap-2 shadow-glow-brand disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={saving}
                className="btn btn-primary h-10 px-6 text-sm font-bold gap-2 shadow-glow-brand disabled:opacity-70"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                ) : (
                  <>
                    View your leads →
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
