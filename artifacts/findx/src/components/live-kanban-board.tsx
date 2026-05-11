import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { getLeads, updateLead } from "../lib/api";
import { PIPELINE_STAGES, type Lead, type LeadStatus } from "../lib/types";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { LeadCard } from "./lead-card";

function LiveColumn({
  id,
  label,
  count,
  children,
}: {
  id: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-[18rem] sm:w-72 rounded-2xl transition-all duration-300"
      style={{
        background: isOver ? "rgba(255,255,255,0.10)" : "var(--glass)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: isOver ? "1px solid var(--glass-border-strong)" : "1px solid var(--glass-border)",
        boxShadow: isOver
          ? "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.14)"
          : "0 4px 20px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
        transform: isOver ? "scale(1.01)" : "scale(1)",
      }}
    >
      <div
        className="flex items-center justify-between px-3.5 py-3"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>{label}</span>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{
            background: "var(--glass-raised)",
            border: "1px solid var(--glass-border-strong)",
            color: "var(--text-muted)",
          }}
        >
          {count}
        </span>
      </div>

      <div className="overflow-y-auto max-h-[calc(100vh-340px)] p-2 space-y-2 kanban-scroll">
        {children}
        {count === 0 && (
          <div
            className="flex flex-col items-center justify-center py-8 rounded-xl m-1"
            style={{
              border: "1px dashed var(--glass-border)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <span className="text-xs" style={{ color: "var(--text-subtle)" }}>No leads</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function LiveKanbanBoard({
  onSelectLead,
}: {
  onSelectLead: (lead: Lead) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const { data, refetch } = useRealtimeData(
    useCallback(() => getLeads({ pageSize: 500 }), []),
    ["leads"],
    30_000,
  );

  const leads = data?.leads ?? [];
  const leadsByStatus = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.status === stage.key),
  }));

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = String(active.id);
    const newStatus = String(over.id) as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    try {
      await updateLead(leadId, { status: newStatus });
      refetch();
    } catch (err) {
      console.error("Failed to move lead:", err);
    }
  }

  return (
    <div className="rounded-xl">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ minHeight: 480 }}
        >
          {leadsByStatus.map((stage) => (
            <SortableContext
              key={stage.key}
              items={stage.leads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <LiveColumn
                id={stage.key}
                label={stage.label}
                count={stage.leads.length}
              >
                {stage.leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onSelectLead(lead)}
                  />
                ))}
              </LiveColumn>
            </SortableContext>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
