import { Globe, Building2, MapPin, Cpu } from "lucide-react";
import type { Lead, LeadStatus } from "../lib/types";
import { StatusBadge, ScoreBadge } from "./status-badge";

/* Accent colors for the left border — vibrant for glass context */
const STATUS_ACCENT: Record<LeadStatus, string> = {
  discovered: "#94A3B8",
  analyzing:  "#F59E0B",
  analyzed:   "#818CF8",
  contacting: "#60A5FA",
  responded:  "#FB923C",
  qualified:  "#C084FC",
  won:        "#34D399",
  lost:       "#F87171",
};

export function LeadCard({
  lead,
  onClick,
  isDragging,
  showActivity,
}: {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
  showActivity?: boolean;
}) {
  const score = lead.leadScore ?? lead.analyses?.[0]?.score ?? null;
  const isHighScore = score != null && score >= 80;
  const accent = STATUS_ACCENT[lead.status];

  return (
    <div
      onClick={onClick}
      className={`lift-card cursor-pointer rounded-xl overflow-hidden ${isDragging ? "opacity-60 rotate-1 scale-105" : ""} ${showActivity ? "" : ""}`}
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
        border: "1px solid var(--glass-border)",
        borderLeft: `3px solid ${accent}`,
        boxShadow: isDragging
          ? `0 16px 40px rgba(0,0,0,0.25), 0 0 0 2px ${accent}40`
          : `0 2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.10)`,
      }}
    >
      {/* Agent activity indicator */}
      {showActivity && (
        <div
          className="flex items-center gap-1.5 px-3.5 py-2 border-b"
          style={{
            background: "rgba(59,130,246, 0.08)",
            borderColor: "rgba(59,130,246, 0.20)",
          }}
        >
          <div className="relative">
            <Cpu className="w-3.5 h-3.5" style={{ color: "#60A5FA" }} />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping" />
          </div>
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: "#60A5FA" }}
          >
            Agent analyzing
          </span>
          <div className="ml-auto flex gap-0.5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1 h-1 rounded-full animate-bounce"
                style={{ background: "#60A5FA", animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="p-3.5">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-sm truncate flex-1 mr-2" style={{ color: "var(--text)" }}>
            {lead.businessName}
          </h3>
          <StatusBadge status={lead.status} />
        </div>

        {/* Meta info */}
        <div className="space-y-1">
          {lead.industry && (
            <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <Building2 className="w-3 h-3 shrink-0" style={{ color: "var(--text-subtle)" }} />
              <span className="truncate">{lead.industry}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            <MapPin className="w-3 h-3 shrink-0" style={{ color: "var(--text-subtle)" }} />
            <span>{lead.city}</span>
          </div>
          {lead.website && (
            <div className="flex items-center gap-1.5 text-xs">
              <Globe className="w-3 h-3 shrink-0" style={{ color: "var(--text-subtle)" }} />
              <span className="truncate" style={{ color: "#60A5FA" }}>{lead.website}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        {(score != null || lead._count?.analyses || lead._count?.outreaches) && (
          <div
            className="flex items-center gap-2 mt-2.5 pt-2.5"
            style={{ borderTop: "1px solid var(--glass-border)" }}
          >
            {score != null && (
              <span className={isHighScore ? "animate-pulse" : ""}>
                <ScoreBadge score={score} />
              </span>
            )}
            {lead._count?.analyses ? (
              <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                {lead._count.analyses} analyses
              </span>
            ) : null}
            {lead._count?.outreaches ? (
              <span className="text-[11px]" style={{ color: "var(--text-subtle)" }}>
                {lead._count.outreaches} emails
              </span>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { motion } from "framer-motion";

export function SortableLeadCard({
  lead,
  onClick,
  showActivity,
}: {
  lead: Lead;
  onClick: () => void;
  showActivity?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      layoutId={lead.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "opacity-50 z-50" : ""}`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
        style={{ color: "var(--text-subtle)" }}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="pl-6">
        <LeadCard lead={lead} onClick={onClick} isDragging={isDragging} showActivity={showActivity} />
      </div>
    </motion.div>
  );
}
