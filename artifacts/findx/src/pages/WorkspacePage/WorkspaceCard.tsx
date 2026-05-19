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
      style={isActive ? { border: "1.5px solid var(--findx-border-strong)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" } : {}}>
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-primary text-primary-foreground" : "bg-glass-raised border border-glass-border text-text-muted"}`}>
            <Building2 className="w-5 h-5" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[14px] tracking-tight truncate" style={{ color: "var(--text)" }}>{ws.name}</p>
              {isActive && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 bg-glass-raised border border-glass-border text-text">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Active
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
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-glass-raised border border-glass-border text-text-subtle">
              <Briefcase className="w-3 h-3" strokeWidth={1.8} />{ws.targetIndustry}
            </div>
          )}
          {ws.targetCity && (
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-glass-raised border border-glass-border text-text-subtle">
              <MapPin className="w-3 h-3" strokeWidth={1.8} />{ws.targetCity}
            </div>
          )}
          {ws.icp && (
            <div className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-glass-raised border border-glass-border text-text-subtle">
              <Target className="w-3 h-3" strokeWidth={1.8} />ICP set
            </div>
          )}
        </div>

        {!isActive ? (
          <button onClick={onSwitch} className="w-full btn btn-secondary text-[12px] py-2 gap-2 font-semibold">
            <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} /> Switch to workspace
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[11px] font-medium text-text-subtle">
            <Globe className="w-3.5 h-3.5" strokeWidth={1.8} /> Currently active
          </div>
        )}

        {confirmDelete && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-glass-raised border border-glass-border-strong">
            <span className="text-[11px] flex-1 text-danger">Delete this workspace?</span>
            <button onClick={onDelete} className="btn text-[11px] px-2.5 py-1 font-semibold bg-danger text-white hover:opacity-90">Yes, delete</button>
            <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost text-[11px] px-2.5 py-1">Cancel</button>
          </div>
        )}
      </div>
    </motion.div>
  );
}
