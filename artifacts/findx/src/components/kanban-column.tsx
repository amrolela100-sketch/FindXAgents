import { useDroppable } from "@dnd-kit/core";
import { Plus, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/* Map old color keys → accent hex colors for glass context */
const ACCENT_COLORS: Record<string, string> = {
  "bg-slate-500":   "#94A3B8",
  "bg-yellow-500":  "#F59E0B",
  "bg-indigo-500":  "#818CF8",
  "bg-blue-500":    "#60A5FA",
  "bg-amber-500":   "#FBBF24",
  "bg-purple-500":  "#C084FC",
  "bg-emerald-500": "#34D399",
  "bg-red-500":     "#F87171",
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
  const accent = ACCENT_COLORS[color] ?? "#94A3B8";

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-72 rounded-2xl transition-all duration-300"
      style={{
        background: isOver
          ? "rgba(255,255,255, 0.10)"
          : "var(--glass)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: isOver
          ? `1px solid ${accent}60`
          : isActive
          ? `1px solid rgba(96,165,250, 0.35)`
          : "1px solid var(--glass-border)",
        boxShadow: isOver
          ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 2px ${accent}25`
          : "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
        transform: isOver ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-3.5 py-3"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? "animate-pulse" : ""}`}
            style={{
              background: accent,
              boxShadow: `0 0 8px ${accent}60`,
            }}
          />
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>
            {label}
          </span>
          {isActive && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#60A5FA" }} />}
        </div>

        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: `${accent}18`,
            color: accent,
            border: `1px solid ${accent}35`,
            backdropFilter: "blur(8px)",
          }}
        >
          {count}
        </span>
      </div>

      {/* Leads list */}
      <div className="overflow-y-auto max-h-[calc(100vh-340px)] p-2 space-y-2 kanban-scroll">
        {children}
        {count === 0 && (
          <div
            className="flex flex-col items-center justify-center py-10 gap-1.5 rounded-xl m-1"
            style={{
              background: "rgba(255,255,255, 0.03)",
              border: `1px dashed var(--glass-border)`,
            }}
          >
            <Plus className="w-5 h-5" style={{ color: "var(--text-subtle)" }} />
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>Drop leads here</span>
          </div>
        )}
      </div>
    </div>
  );
}
