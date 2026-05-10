import { useDroppable } from "@dnd-kit/core";
import { Plus, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

const DOT_COLORS: Record<string, string> = {
  "bg-slate-500": "bg-gray-400",
  "bg-yellow-500": "bg-amber-400",
  "bg-indigo-500": "bg-indigo-400",
  "bg-blue-500": "bg-blue-400",
  "bg-amber-500": "bg-amber-500",
  "bg-purple-500": "bg-purple-400",
  "bg-emerald-500": "bg-emerald-500",
  "bg-red-500": "bg-red-400",
};

const BADGE_COLORS: Record<string, string> = {
  "bg-slate-500": "bg-gray-100 text-gray-600",
  "bg-yellow-500": "bg-amber-50 text-amber-700",
  "bg-indigo-500": "bg-indigo-50 text-indigo-700",
  "bg-blue-500": "bg-blue-50 text-blue-700",
  "bg-amber-500": "bg-amber-50 text-amber-700",
  "bg-purple-500": "bg-purple-50 text-purple-700",
  "bg-emerald-500": "bg-emerald-50 text-emerald-700",
  "bg-red-500": "bg-red-50 text-red-600",
};

export function DroppableColumn({
  id,
  label,
  color,
  count,
  children,
  isActive,
}: {
  id: string;
  label: string;
  color: string;
  count: number;
  children: ReactNode;
  isActive?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const dot = DOT_COLORS[color] ?? "bg-gray-400";
  const badge = BADGE_COLORS[color] ?? "bg-gray-100 text-gray-600";

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-72 bg-[#F0EDE6] rounded-xl border transition-all duration-300 ${
        isOver
          ? "ring-2 ring-[#1A1A1A]/20 bg-[#E8E4DC] scale-[1.01]"
          : isActive
            ? "border-blue-300"
            : "border-[#E5E3D9]"
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#E5E3D9]">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${dot} ${isActive ? "animate-pulse" : ""}`} />
          <span className="font-semibold text-sm text-[#1A1A1A]">{label}</span>
          {isActive && <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
          {count}
        </span>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-340px)] p-2 space-y-2">
        {children}
        {count === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-[#BDBDB0]">
            <Plus className="w-5 h-5 mb-1" />
            <span className="text-xs">Drop leads here</span>
          </div>
        )}
      </div>
    </div>
  );
}
