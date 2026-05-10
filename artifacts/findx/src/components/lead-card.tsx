import { Globe, Building2, MapPin, Cpu } from "lucide-react";
import type { Lead, LeadStatus } from "../lib/types";
import { StatusBadge, ScoreBadge } from "./status-badge";

const STATUS_BORDER: Record<LeadStatus, string> = {
  discovered: "border-l-gray-400",
  analyzing: "border-l-amber-400",
  analyzed: "border-l-indigo-400",
  contacting: "border-l-blue-400",
  responded: "border-l-orange-400",
  qualified: "border-l-purple-400",
  won: "border-l-emerald-500",
  lost: "border-l-red-400",
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

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-[#E5E3D9] border-l-[3px] ${STATUS_BORDER[lead.status]} p-3.5 cursor-pointer transition-all duration-150 hover:border-[#C4C0B8] hover:-translate-y-0.5 ${
        isDragging ? "opacity-70 rotate-1 shadow-md" : ""
      } ${showActivity ? "ring-1 ring-blue-200" : ""}`}
    >
      {showActivity && (
        <div className="flex items-center gap-1.5 mb-2.5 pb-2.5 border-b border-blue-100">
          <div className="relative">
            <Cpu className="w-3.5 h-3.5 text-blue-500" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
          </div>
          <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide">Agent analyzing</span>
          <div className="ml-auto flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-sm text-[#1A1A1A] truncate flex-1 mr-2">
          {lead.businessName}
        </h3>
        <StatusBadge status={lead.status} />
      </div>

      <div className="space-y-1 text-xs text-[#7A756D]">
        {lead.industry && (
          <div className="flex items-center gap-1.5">
            <Building2 className="w-3 h-3 shrink-0" />
            <span className="truncate">{lead.industry}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3 h-3 shrink-0" />
          <span>{lead.city}</span>
        </div>
        {lead.website && (
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 shrink-0" />
            <span className="truncate text-blue-600">{lead.website}</span>
          </div>
        )}
      </div>

      {(score != null || lead._count?.analyses || lead._count?.outreaches) && (
        <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-[#E5E3D9]">
          {score != null && (
            <span className={isHighScore ? "animate-pulse" : ""}>
              <ScoreBadge score={score} />
            </span>
          )}
          {lead._count?.analyses ? (
            <span className="text-[11px] text-[#BDBDB0]">{lead._count.analyses} analyses</span>
          ) : null}
          {lead._count?.outreaches ? (
            <span className="text-[11px] text-[#BDBDB0]">{lead._count.outreaches} emails</span>
          ) : null}
        </div>
      )}
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
        className="absolute left-1.5 top-1/2 -translate-y-1/2 p-1 cursor-grab active:cursor-grabbing text-[#BDBDB0] opacity-0 group-hover:opacity-100 hover:text-[#7A756D] transition-opacity z-10"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="pl-6">
        <LeadCard lead={lead} onClick={onClick} isDragging={isDragging} showActivity={showActivity} />
      </div>
    </motion.div>
  );
}
