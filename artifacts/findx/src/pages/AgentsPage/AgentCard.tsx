/**
 * AgentsPage — AgentCard & PipelineFlow & StatPill Components
 */
import { motion } from "framer-motion";
import { Bot, ArrowRight, Cpu, Zap, Network, CheckCircle2 } from "lucide-react";
import type { Agent } from "@/lib/types";
import { FADE_UP } from "@/lib/motion";
import { AGENT_META } from "./agent-meta";
import { cn } from "@/lib/utils";

export function PipelineFlow({ agents }: { agents: Agent[] }) {
  return (
    <div className="flex items-center gap-0 flex-nowrap overflow-x-auto py-1 scrollbar-none">
      {agents.map((agent, i) => {
        const meta = AGENT_META[agent.name] ?? { accent: "#C084FC", icon: Bot };
        const Icon = meta.icon;
        return (
          <div key={agent.id} className="flex items-center gap-0 flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold bg-glass border border-glass-border text-text">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-white shadow-sm">{i + 1}</span>
              <Icon className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
              <span className="capitalize">{agent.name}</span>
            </div>
            {i < agents.length - 1 && <ArrowRight className="w-4 h-4 mx-2 flex-shrink-0 text-text-subtle" />}
          </div>
        );
      })}
    </div>
  );
}

export function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  const meta = AGENT_META[agent.name] ?? { icon: Bot, accent: "#C084FC", description: "AI agent handling pipeline tasks." };
  const Icon = meta.icon;
  
  return (
    <motion.div 
      custom={index} 
      variants={FADE_UP} 
      initial="hidden" 
      animate="visible" 
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group relative rounded-2xl bg-glass border border-glass-border overflow-hidden flex flex-col shadow-sm transition-all hover:shadow-xl hover:border-primary/30"
    >
      {/* Decorative top border */}
      <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-transparent" />
      
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-start justify-between mb-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/5 border border-primary/10 shadow-inner group-hover:bg-primary/10 transition-colors">
            <Icon className="w-6 h-6 text-primary" strokeWidth={2} />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 border border-success/20">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-bold text-success uppercase tracking-wider">Active</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base tracking-tight text-text">{agent.displayName}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary/10 text-primary border border-primary/20">
              STEP {agent.pipelineOrder}
            </span>
          </div>
          <p className="text-sm text-text-muted leading-relaxed line-clamp-2">{meta.description}</p>
        </div>

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between text-[11px] border-t border-glass-border pt-4">
            <div className="flex items-center gap-2 text-text-subtle">
              <Cpu className="w-3.5 h-3.5" />
              <span className="font-mono font-bold uppercase tracking-tighter">
                {agent.model?.split("/").pop()?.split(":")[0] ?? "GENERIC-LLM"}
              </span>
            </div>
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest bg-glass-raised px-2.5 py-1 rounded-lg border border-glass-border">
              Phase {agent.pipelineOrder} / 3
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function StatPill({ icon: Icon, label, value, colorClass, bgClass, borderClass }: { 
  icon: any; label: string; value: string | number; colorClass: string; bgClass: string; borderClass: string;
}) {
  return (
    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-sm", bgClass, borderClass)}>
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center bg-white/10 shadow-inner", colorClass)}>
        <Icon className="w-5 h-5" strokeWidth={2} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest leading-none mb-1">{label}</p>
        <p className={cn("text-lg font-bold leading-none tabular-nums", colorClass)}>{value}</p>
      </div>
    </div>
  );
}
