import { useState } from "react";
import { DashboardCards } from "../components/dashboard-cards";
import { LiveKanbanBoard } from "../components/live-kanban-board";
import { ActivityFeed } from "../components/activity-feed";
import { AgentRunHistory } from "../components/agent-run-history";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import type { Lead } from "../lib/types";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function HomePage() {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  return (
    <div className="min-h-screen bg-[#F7F5F0] p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">{getGreeting()}</h1>
        <p className="text-sm text-[#7A756D] mt-0.5">
          {formatDate()} &middot; Pipeline overview
        </p>
      </div>

      <DashboardCards />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveKanbanBoard onSelectLead={setSelectedLead} />
        </div>
        <div className="space-y-6">
          <ActivityFeed />
          <AgentRunHistory />
        </div>
      </div>

      {selectedLead && (
        <LeadDetailPanel
          leadId={selectedLead.id}
          onClose={() => setSelectedLead(null)}
          onLeadUpdated={() => {}}
        />
      )}
    </div>
  );
}
