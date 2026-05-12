import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { DroppableColumn } from "./kanban-column";
import { LeadCard } from "./lead-card";
import type { Lead, LeadStatus } from "../lib/types";
import { updateLead, getAgentRuns, cancelAgentRun } from "../lib/api";
import { PIPELINE_STAGES } from "../lib/types";
import { Activity, Zap, XCircle } from "lucide-react";

export function KanbanBoard({
  leads,
  onSelectLead,
  onLeadMoved,
}: {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onLeadMoved: () => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [liveActivity, setLiveActivity] = useState<{ phase: string; query: string; runId: string } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const leadsByStatus = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.status === stage.key),
  }));

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  useEffect(() => {
    let cancelled = false;
    async function checkActivity() {
      try {
        const result = await getAgentRuns();
        const active = result.runs.find((r) => r.status === "running");
        if (!cancelled) {
          setLiveActivity(active ? { phase: "agents", query: active.query, runId: active.id } : null);
        }
      } catch { /* ignore */ }
    }
    checkActivity();
    const interval = setInterval(checkActivity, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

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
      onLeadMoved();
    } catch (err) {
      console.error("Failed to move lead:", err);
    }
  }

  return (
    <div className="space-y-3">
      {liveActivity && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <div className="relative">
            <Activity className="w-4 h-4 text-blue-500" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-medium" style={{ color: "#60A5FA" }}>Pipeline is running</span>
          <span className="text-xs truncate max-w-xs" style={{ color: "#93C5FD" }}>&ldquo;{liveActivity.query}&rdquo;</span>
          <div className="ml-auto flex items-center gap-2">
            <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
            <span className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider">Live</span>
            <button
              onClick={async () => {
                try { await cancelAgentRun(liveActivity.runId); } catch { /* ignore */ }
                setLiveActivity(null);
              }}
              className="ml-2 flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 480 }}>
          {leadsByStatus.map((stage) => (
            <SortableContext
              key={stage.key}
              items={stage.leads.map((l) => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn
                id={stage.key}
                label={stage.label}
                color={stage.color}
                count={stage.leads.length}
                isActive={liveActivity !== null && (stage.key === "analyzing" || stage.key === "discovered")}
              >
                {stage.leads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onClick={() => onSelectLead(lead)}
                    showActivity={liveActivity !== null && lead.status === "analyzing"}
                  />
                ))}
              </DroppableColumn>
            </SortableContext>
          ))}
        </div>
        <DragOverlay>
          {activeLead ? (
            <LeadCard lead={activeLead} onClick={() => {}} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
