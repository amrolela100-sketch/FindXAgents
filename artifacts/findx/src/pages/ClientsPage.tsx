import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { getLeads } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import type { Lead } from "../lib/types";
import {
  Building2, MapPin, Globe, Phone, Mail, ExternalLink,
  TrendingUp, Award, Search
} from "lucide-react";

function InitialAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  // Deterministic color based on name
  const colors = [
    "bg-blue-100 text-blue-700",
    "bg-emerald-100 text-emerald-700",
    "bg-purple-100 text-purple-700",
    "bg-amber-100 text-amber-700",
    "bg-rose-100 text-rose-700",
    "bg-indigo-100 text-indigo-700",
    "bg-teal-100 text-teal-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];

  return (
    <div className={`${sizeClasses[size]} ${color} rounded-xl flex items-center justify-center font-bold flex-shrink-0`}>
      {initials || "?"}
    </div>
  );
}

function ScoreRing({ score }: { score: number | null }) {
  if (score == null) return <span className="text-xs text-on-surface-variant">—</span>;
  const color = score >= 70 ? "text-emerald-600" : score >= 40 ? "text-amber-600" : "text-red-500";
  return <span className={`text-sm font-bold ${color}`}>{score}</span>;
}

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Clients = leads that are "won" or "qualified"
  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 200 }),
    ["leads", "clients"],
    30_000
  );

  const allLeads = data?.leads ?? [];
  const clients = allLeads.filter((l) =>
    l.status === "won" || l.status === "qualified" || l.status === "responded"
  );

  const filtered = search
    ? clients.filter(
        (l) =>
          l.businessName.toLowerCase().includes(search.toLowerCase()) ||
          l.city.toLowerCase().includes(search.toLowerCase()) ||
          (l.industry ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  const wonCount = clients.filter((l) => l.status === "won").length;
  const qualifiedCount = clients.filter((l) => l.status === "qualified").length;

  return (
    <PageShell
      title="Clients"
      subtitle={`${clients.length} active client relationships`}
    >
      {/* Summary Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Won", count: wonCount, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "Qualified", count: qualifiedCount, color: "text-purple-600 bg-purple-50 border-purple-200" },
          { label: "Responded", count: clients.filter((l) => l.status === "responded").length, color: "text-amber-600 bg-amber-50 border-amber-200" },
        ].map((s) => (
          <div key={s.label} className={`flex flex-col items-center py-4 rounded-2xl border ${s.color}`}>
            <span className={`text-2xl font-bold ${s.color.split(" ")[0]}`}>{s.count}</span>
            <span className="text-xs font-medium mt-0.5 opacity-80">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
        <input
          type="text"
          placeholder="Search clients by name, city or industry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low border border-outline-variant rounded-xl text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
        />
      </div>

      {/* Client Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-container-lowest border border-outline-variant rounded-2xl">
          <Building2 className="w-12 h-12 text-on-surface-variant opacity-25 mb-3" />
          <p className="text-sm font-medium text-on-surface">
            {search ? "No clients match your search" : "No clients yet"}
          </p>
          <p className="text-xs text-on-surface-variant mt-1">
            {search
              ? "Try a different search term"
              : "Leads with Won, Qualified or Responded status will appear here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <ClientCard
              key={lead.id}
              lead={lead}
              onClick={() => setSelectedLeadId(lead.id)}
            />
          ))}
        </div>
      )}

      <LeadDetailPanel
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}

function ClientCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const statusColors: Record<string, string> = {
    won: "bg-emerald-100 text-emerald-700 border-emerald-200",
    qualified: "bg-purple-100 text-purple-700 border-purple-200",
    responded: "bg-amber-100 text-amber-700 border-amber-200",
  };

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <InitialAvatar name={lead.businessName} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-on-surface truncate">{lead.businessName}</h3>
          {lead.industry && (
            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3" />
              {lead.industry}
            </p>
          )}
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex-shrink-0 ${statusColors[lead.status] ?? "bg-slate-100 text-slate-600 border-slate-200"}`}>
          {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
        </span>
      </div>

      {/* Info */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          {lead.city}{lead.address ? `, ${lead.address}` : ""}
        </div>
        {lead.email && (
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Mail className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </div>
        )}
        {lead.website && (
          <div className="flex items-center gap-2 text-xs text-blue-500">
            <Globe className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{lead.website.replace(/^https?:\/\//, "")}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-outline-variant flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
          <Award className="w-3.5 h-3.5" />
          Score: <ScoreRing score={lead.leadScore} />
        </div>
        <span className="text-xs text-on-surface-variant">
          {new Date(lead.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}
