/**
 * AgentsPage — AgentCard & PipelineFlow & StatPill Components
 */
import { motion } from "framer-motion";
import { Bot, ArrowRight, Cpu, Search, BarChart3, Mail, Zap, Network, CheckCircle2, TrendingUp, Globe, Layers, Clock, ChevronRight, Sparkles, Play, Activity, Hash, Languages } from "lucide-react";
import type { Agent } from "@/lib/types";
import { FADE_UP, HOVER_LIFT } from "@/lib/motion";
import { AGENT_META } from "./agent-meta";

export function PipelineFlow({ agents }: { agents: Agent[] }) {
  return (
    <div className="flex items-center gap-0 flex-nowrap overflow-x-auto py-1">
      {agents.map((agent, i) => {
        const meta = AGENT_META[agent.name] ?? { accent: "#C084FC", icon: Bot };
        const Icon = meta.icon;
        return (
          <div key={agent.id} className="flex items-center gap-0 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold" style={{ background: `${meta.accent}15`, border: `1px solid ${meta.accent}30`, color: meta.accent }}>
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold" style={{ background: meta.accent, color: "#000" }}>{i + 1}</span>
              <Icon className="w-3 h-3" strokeWidth={2} />
              <span className="capitalize">{agent.name}</span>
            </div>
            {i < agents.length - 1 && <ArrowRight className="w-3.5 h-3.5 mx-1 flex-shrink-0" style={{ color: "var(--text-subtle)" }} />}
          </div>
        );
      })}
    </div>
  );
}

export function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const meta = AGENT_META[agent.name] ?? { icon: Bot, accent: "#C084FC", gradient: "linear-gradient(135deg, #C084FC22, #A855F708)", bg: "rgba(192,132,252,0.10)", description: "AI agent handling pipeline tasks." };
  const Icon = meta.icon;
  return (
    <motion.div custom={index} variants={FADE_UP} initial="hidden" animate="visible" whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="glass-card glass-card-hover rounded-2xl overflow-hidden flex flex-col cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500" tabIndex={0} role="article"
      aria-label={`${agent.displayName} - Step ${agent.pipelineOrder} of 3`}>
      <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${meta.accent}, transparent)` }} />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: meta.bg, border: `1px solid ${meta.accent}28`, boxShadow: `0 0 16px ${meta.accent}20` }}>
            <Icon className="w-5 h-5" strokeWidth={1.8} style={{ color: meta.accent }} aria-hidden="true" />
          </div>
          <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#34D399", boxShadow: "0 0 6px #34D399" }} /><span className="text-[10px] font-semibold" style={{ color: "#34D399" }}>Active</span></div>
        </div>
        <div className="mb-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-[14px] tracking-tight" style={{ color: "var(--text)" }}>{agent.displayName}</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: `${meta.accent}18`, color: meta.accent }}>#{agent.pipelineOrder}</span>
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-muted)" }}>{meta.description}</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between mt-4 pt-3 text-[11px]" style={{ borderTop: "1px solid var(--glass-border)" }}>
          <div className="flex items-center gap-1.5" style={{ color: "var(--text-subtle)" }}><Cpu className="w-3 h-3" strokeWidth={1.5} /><span className="font-mono">{agent.model?.split("/").pop()?.split(":")[0] ?? "—"}</span></div>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: "var(--glass-raised)", color: "var(--text-muted)", border: "1px solid var(--glass-border)" }}>Step {agent.pipelineOrder} of 3</span>
        </div>
      </div>
    </motion.div>
  );
}

export function StatPill({ icon: Icon, label, value, accent }: { icon: typeof Zap; label: string; value: string | number; accent: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl" style={{ background: `${accent}10`, border: `1px solid ${accent}22` }}>
      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: accent }} strokeWidth={1.8} />
      <div><p className="text-[10px] font-medium" style={{ color: `${accent}aa` }}>{label}</p><p className="text-[13px] font-bold leading-none mt-0.5" style={{ color: accent }}>{value}</p></div>
    </div>
  );
}
