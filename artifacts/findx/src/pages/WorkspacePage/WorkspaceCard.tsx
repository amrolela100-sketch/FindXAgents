/**
 * WorkspacePage — WorkspaceCard Component
 */

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2, Trash2, Edit2, ChevronRight, Target, MapPin, Briefcase, Globe,
} from "lucide-react";
import type { Workspace } from "@/lib/workspace-context";
import { FADE_UP, HOVER_LIFT } from "@/lib/motion";

export function WorkspaceCard({
  ws, isActive, index, onSwitch, onEdit, onDelete,
}: {
  ws: Workspace; isActive: boolean; index: number;
  onSwitch: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div custom={index} variants={FADE_UP} initial="hidden" animate="visible"
      whileHover={!isActive ? HOVER_LIFT : {}}
      className="glass-card rounded-2xl overflow-hidden"
      style={isActive ? { border: "1.5px solid rgba(245,158,11,0.40)", boxShadow: "0 0 0 3px rgba(245,158,11,0.08), 0 4px 24px rgba(0,0,0,0.10)" } : {}}>
      {isActive && <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, var(--brand), transparent)" }} />}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={isActive ? { background: "linear-gradient(135deg, var(--brand), #F97316)", boxShadow: "0 4px 14px rgba(245,158,11,0.35)" } : { background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}>
            <Building2 className="w-5 h-5" style={{ color: isActive ? "#fff" : "var(--text-muted)" }} strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[14px] tracking-tight truncate" style={{ color: "var(--text)" }}>{ws.name}</p>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                  style={{ background: "rgba(52,211,153,0.12)", color: "#34D399", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" /> Active
                </span>
              )}
            </div>
            {ws.description && <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{ws.description}</p>}
          </div>
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button onClick={onEdit} className="btn btn-ghost w-7 h-7 p-0 rounded-lg" title="Edit"><Edit2 className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
            <button onClick={() => setConfirmDelete(true)} className="btn btn-ghost w-7 h-7 p-0 rounded-lg" title="Delete" style={{ color: confirmDelete ? "#F87171" : undefined }}><Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {ws.targetIndustry && (
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(192,132,252,0.10)", color: "#C084FC", border: "1px solid rgba(192,132,252,0.20)" }}>
              <Briefcase className="w-3 h-3" strokeWidth={1.8} />{ws.targetIndustry}
            </div>
          )}
          {ws.targetCity && (
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(96,165,250,0.10)", color: "#60A5FA", border: "1px solid rgba(96,165,250,0.20)" }}>
              <MapPin className="w-3 h-3" strokeWidth={1.8} />{ws.targetCity}
            </div>
          )}
          {ws.icp && (
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full" style={{ background: "rgba(251,191,36,0.10)", color: "#FBBF24", border: "1px solid rgba(251,191,36,0.20)" }}>
              <Target className="w-3 h-3" strokeWidth={1.8} />ICP set
            </div>
          )}
        </div>

        {!isActive ? (
          <button onClick={onSwitch} className="w-full btn btn-secondary text-[12px] py-2 gap-2 font-semibold">
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} /> Switch to workspace
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-medium" style={{ color: "#34D399" }}>
            <Globe className="w-3.5 h-3.5" strokeWidth={1.8} /> Currently active
          </div>
        )}

        {confirmDelete && (
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.20)" }}>
            <span className="text-[11px] flex-1" style={{ color: "#F87171" }}>Delete this workspace?</span>
            <button onClick={onDelete} className="btn text-[11px] px-2.5 py-1 font-semibold" style={{ background: "#F87171", color: "#fff" }}>Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost text-[11px] px-2.5 py-1">Cancel</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
