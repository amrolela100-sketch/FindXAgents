import { useState, useEffect, useCallback } from "react";
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
import { RefreshCw, Loader2, Activity, Zap } from "lucide-react";
import { DroppableColumn } from "../components/kanban-column";
import { LeadCard, SortableLeadCard } from "../components/lead-card";
import { StatusBadge } from "../components/status-badge";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { getLeads, getAgentRuns, updateLead } from "../lib/api";
import { PIPELINE_STAGES } from "../lib/types";
import type { Lead, LeadStatus, AgentPipelineRun } from "../lib/types";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeRuns, setActiveRuns] = useState<AgentPipelineRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [stageFilter, setStageFilter] = useState<LeadStatus | "all">("all");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const filteredStages =
    stageFilter === "all"
      ? PIPELINE_STAGES
      : PIPELINE_STAGES.filter((s) => s.key === stageFilter);

  const leadsByStatus = filteredStages.map((stage) => ({
    ...stage,
    leads: leads.filter((l) => l.status === stage.key),
  }));

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  const fetchLeads = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await getLeads({ pageSize: 200 });
      setLeads(res.leads);
    } catch (err) {
      console.error("Failed to load leads:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchActiveRuns = useCallback(async () => {
    try {
      const res = await getAgentRuns();
      setActiveRuns(res.runs.filter((r) => r.status === "running" || r.status === "queued"));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLeads(true);
    fetchActiveRuns();
  }, [fetchLeads, fetchActiveRuns]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeads();
      fetchActiveRuns();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchLeads, fetchActiveRuns]);

  const { toast } = useToast();

  const { mutate: moveLead } = useMutation({
    mutationFn: ({ leadId, status }: { leadId: string; status: LeadStatus }) => updateLead(leadId, { status }),
    onMutate: async ({ leadId, status }) => {
      const previousLeads = [...leads];
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      toast({
        title: "Failed to move lead",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
      if (context?.previousLeads) {
        setLeads(context.previousLeads);
      }
    },
    onSettled: () => {
      fetchLeads();
    },
  });

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = String(active.id);
    const newStatus = String(over.id) as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    moveLead({ leadId, status: newStatus });
  }

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#1A1A1A]">
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Pipeline</h1>
            <p className="text-sm text-[#7A756D] mt-0.5">
              {leads.length} leads across {PIPELINE_STAGES.length} stages
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as LeadStatus | "all")}
              className="bg-white border border-[#E5E3D9] text-[#1A1A1A] text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#C4C0B8]"
            >
              <option value="all">All stages</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <button
              onClick={() => fetchLeads()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-[#E5E3D9] text-[#1A1A1A] hover:bg-[#F0EDE6] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Refresh
            </button>
          </div>
        </div>

        {activeRuns.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-3 mb-6 bg-white rounded-xl border border-[#E5E3D9]">
            <div className="relative">
              <Activity className="w-4 h-4 text-blue-500" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
            </div>
            <span className="text-xs font-medium text-[#1A1A1A]">
              {activeRuns.length} active {activeRuns.length === 1 ? "run" : "runs"}
            </span>
            {activeRuns.slice(0, 3).map((run) => (
              <span key={run.id} className="flex items-center gap-1.5 text-xs text-[#7A756D]">
                <Zap className="w-3 h-3 text-amber-500" />
                <span className="truncate max-w-[200px]">{run.query}</span>
                <StatusBadge status={run.status === "running" ? "analyzing" : "discovered"} />
              </span>
            ))}
          </div>
        )}

        {loading && leads.length === 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex-shrink-0 w-80 bg-white rounded-xl border border-[#E5E3D9] p-4 min-h-[500px]">
                <div className="flex items-center justify-between mb-4">
                  <div className="h-5 w-24 bg-[#F0EDE6] rounded animate-pulse" />
                  <div className="h-5 w-8 bg-[#F0EDE6] rounded animate-pulse" />
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-28 bg-[#F0EDE6]/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
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
                  >
                    {stage.leads.map((lead) => (
                      <SortableLeadCard
                        key={lead.id}
                        lead={lead}
                        onClick={() => setSelectedLead(lead)}
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
        )}
      </div>

      {selectedLead && (
        <LeadDetailPanel
          leadId={selectedLead.id}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={() => fetchLeads()}
        />
      )}
    </div>
  );
}
