import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { useLang } from "@/lib/lang-context";
import { getAgent, updateAgent } from "@/lib/api";
import { useRealtimeData } from "@/lib/hooks/use-realtime-data";
import type { Agent } from "@/lib/types";
import {
  Bot, Search, BarChart3, Mail, ChevronLeft, Save, Loader2,
  Hash, Cpu, Thermometer, Layers, Code2, FileText, Wrench,
  CheckCircle2, XCircle, Activity, Zap, Edit3, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const AGENT_META: Record<string, { icon: typeof Bot; accent: string }> = {
  discovery: { icon: Search, accent: "#60A5FA" },
  analysis:  { icon: BarChart3, accent: "#FBBF24" },
  outreach:  { icon: Mail, accent: "#34D399" },
};

import { SPRING, FADE_UP } from "@/lib/motion";

// ─── Stat Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon }: {
  label: string; value: string | number; icon: typeof Bot; accent: string;
}) {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3 border border-border bg-interactive-hover shadow-sm"
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border border-primary/20 bg-primary/10 text-primary">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="text-xs font-semibold text-text-muted">{label}</div>
        <div className="text-lg font-bold text-text">{value}</div>
      </div>
    </div>
  );
}

// ─── Edit Form ───────────────────────────────────────────────────────────────

function EditForm({ agent, onSaved }: { agent: Agent; onSaved: (a: Agent) => void }) {
  const [form, setForm] = useState({
    displayName: agent.displayName,
    description: agent.description,
    model: agent.model,
    maxIterations: agent.maxIterations,
    maxTokens: agent.maxTokens,
    temperature: agent.temperature ?? "",
    systemPrompt: agent.systemPrompt,
    identityMd: agent.identityMd,
    soulMd: agent.soulMd,
    toolsMd: agent.toolsMd,
    isActive: agent.isActive,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const payload: Partial<Agent> = {
        ...form,
        temperature: form.temperature === "" ? null : Number(form.temperature),
        maxIterations: Number(form.maxIterations),
        maxTokens: Number(form.maxTokens),
      };
      const { agent: updated } = await updateAgent(agent.name, payload);
      onSaved(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type: "input" | "textarea" | "number" = "input", rows = 4) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-text-muted">{label}</Label>
      {type === "textarea" ? (
        <Textarea
          rows={rows}
          value={String(form[key])}
          onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="font-mono text-xs resize-y bg-interactive-hover border-border text-text rounded-xl"
        />
      ) : (
        <Input
          type={type === "number" ? "number" : "text"}
          value={String(form[key])}
          onChange={(e) => setForm(f => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
          className="bg-interactive-hover border-border text-text rounded-xl"
        />
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Active toggle */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-border bg-interactive-hover">
        <div>
          <div className="font-semibold text-sm text-text">Active</div>
          <div className="text-xs text-text-muted mt-0.5">
            Inactive agents are skipped by the pipeline runner
          </div>
        </div>
        <Switch
          checked={form.isActive}
          onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))}
        />
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-4">
          <TabsTrigger value="general"><Edit3 className="w-3.5 h-3.5 me-1.5" />General</TabsTrigger>
          <TabsTrigger value="model"><Cpu className="w-3.5 h-3.5 me-1.5" />Model</TabsTrigger>
          <TabsTrigger value="prompts"><FileText className="w-3.5 h-3.5 me-1.5" />Prompts</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {field("Display Name", "displayName")}
          {field("Description", "description", "textarea", 3)}
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          {field("Model", "model")}
          <div className="grid grid-cols-2 gap-4">
            {field("Max Iterations", "maxIterations", "number")}
            {field("Max Tokens", "maxTokens", "number")}
          </div>
          {field("Temperature (0–2, blank = default)", "temperature", "number")}
        </TabsContent>

        <TabsContent value="prompts" className="space-y-4">
          {field("System Prompt", "systemPrompt", "textarea", 6)}
          {field("Identity (IDENTITY.md)", "identityMd", "textarea", 5)}
          {field("Soul (SOUL.md)", "soulMd", "textarea", 5)}
          {field("Tools (TOOLS.md)", "toolsMd", "textarea", 5)}
        </TabsContent>
      </Tabs>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm border border-danger/20 bg-danger/5 text-danger">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className={cn(
          "w-full rounded-full transition-all text-white font-semibold py-2.5 flex items-center justify-center gap-2 text-sm",
          saved ? "bg-success hover:bg-success/90" : "bg-primary hover:bg-primary/90"
        )}
      >
        {saving ? (
          <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
        ) : saved ? (
          <><CheckCircle2 className="w-4 h-4" />Saved!</>
        ) : (
          <><Save className="w-4 h-4" />Save Changes</>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AgentDetailPage() {
  const { name } = useParams<{ name: string }>();
  const [, navigate] = useLocation();

  const {
    data,
    isLoading: loading,
    error,
  } = useRealtimeData<{ agent: Agent }>(
    () => getAgent(name!),
    ["agents"],
  );

  const [localAgent, setLocalAgent] = useState<Agent | null>(null);

  useEffect(() => {
    if (data?.agent) setLocalAgent(data.agent);
  }, [data]);

  const agent = localAgent ?? data?.agent ?? null;
  const meta = agent ? (AGENT_META[agent.name] ?? { icon: Bot, accent: "#C084FC" }) : null;
  const Icon = meta?.icon ?? Bot;

  if (loading) {
    return (
      <PageShell title="Agent">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
        </div>
      </PageShell>
    );
  }

  if (error || !agent) {
    return (
      <PageShell title="Agent">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <XCircle className="w-8 h-8 text-danger" />
          <p className="text-text-muted">Agent "{name}" not found</p>
          <Button variant="outline" className="rounded-full" onClick={() => navigate("/agents")}>
            <ChevronLeft className="w-4 h-4 me-1.5" />Back to Agents
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={agent.displayName}>
      <div className="max-w-4xl mx-auto space-y-6 pb-12">

        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={FADE_UP} className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/agents")}
            className="gap-1.5 -ms-1 text-text-muted rounded-full"
          >
            <ChevronLeft className="w-4 h-4" />
            Agents
          </Button>
        </motion.div>

        {/* Agent identity card */}
        <motion.div initial="hidden" animate="visible" custom={0} variants={FADE_UP}>
          <div
            className="rounded-2xl p-6 border border-primary/20 bg-primary/5 flex items-start gap-5 shadow-sm"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border border-primary/20 bg-primary/10 text-primary shadow-sm"
            >
              <Icon className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-text">
                  {agent.displayName}
                </h1>
                <Badge
                  variant="secondary"
                  className={cn(
                    "text-[11px] font-bold border rounded-full px-2.5 py-0.5",
                    agent.isActive ? "border-success/20 bg-success/5 text-success" : "border-danger/20 bg-danger/5 text-danger"
                  )}
                >
                  {agent.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant="outline" className="text-[11px] rounded-full border border-border bg-interactive-hover text-text-muted">
                  <Hash className="w-3 h-3 me-1" />{agent.name}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-text-muted">
                {agent.description}
              </p>
              <div className="flex items-center gap-4 mt-3 flex-wrap text-text-muted">
                <span className="text-xs flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />{agent.model}
                </span>
                <span className="text-xs flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />Max {agent.maxIterations} iterations
                </span>
                <span className="text-xs flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />Max {agent.maxTokens?.toLocaleString()} tokens
                </span>
                {agent.temperature !== null && (
                  <span className="text-xs flex items-center gap-1.5">
                    <Thermometer className="w-3.5 h-3.5" />temp {agent.temperature}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial="hidden" animate="visible" custom={1} variants={FADE_UP}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Pipeline Order" value={`#${agent.pipelineOrder}`} icon={Activity} accent={meta!.accent} />
          <StatCard label="Skills" value={agent._count?.skills ?? agent.skills?.length ?? 0} icon={Wrench} accent={meta!.accent} />
          <StatCard label="Total Logs" value={(agent._count?.logs ?? 0).toLocaleString()} icon={Code2} accent={meta!.accent} />
          <StatCard label="Role" value={agent.role} icon={Bot} accent={meta!.accent} />
        </motion.div>

        <Separator />

        {/* Main content — Edit form */}
        <motion.div initial="hidden" animate="visible" custom={2} variants={FADE_UP}>
          <Card className="border border-border bg-glass backdrop-blur-glass rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-text">
                <Edit3 className="w-4 h-4 text-primary" />
                Edit Agent
              </CardTitle>
              <CardDescription className="text-text-muted text-xs">
                Changes apply to the next pipeline run. Admin access required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EditForm
                agent={agent}
                onSaved={(updated) => setLocalAgent(updated)}
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Skills list (read-only for now) */}
        {agent.skills && agent.skills.length > 0 && (
          <motion.div initial="hidden" animate="visible" custom={3} variants={FADE_UP}>
            <Card className="border border-border bg-glass backdrop-blur-glass rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-text">
                  <Wrench className="w-4 h-4 text-primary" />
                  Skills ({agent.skills.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {agent.skills.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-border bg-interactive-hover"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-text">
                          {skill.name}
                        </span>
                        {!skill.isActive && (
                          <Badge variant="secondary" className="text-[10px] rounded-full border border-danger/20 bg-danger/5 text-danger">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs mt-0.5 text-text-muted">{skill.description}</p>
                      {skill.toolNames.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {skill.toolNames.map((t) => (
                            <Badge key={t} variant="outline" className="text-[10px] rounded-full border border-border text-text-muted bg-glass">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {skill.isActive
                        ? <CheckCircle2 className="w-4 h-4 text-success" />
                        : <XCircle className="w-4 h-4 text-danger" />
                      }
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </PageShell>
  );
}
