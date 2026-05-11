import { useState } from "react";
import { PageShell } from "../components/page-shell";
import { LeadDetailPanel } from "../components/lead-detail-panel";
import { useLang } from "../lib/lang-context";
import { getLeads } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import type { Lead } from "../lib/types";
import { Building2, MapPin, Globe, Mail, Award, Search } from "lucide-react";

function InitialAvatar({ name }: { name: string }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  const COLORS = [
    ["#DBEAFE", "#1D4ED8"],
    ["#D1FAE5", "#065F46"],
    ["#EDE9FE", "#6D28D9"],
    ["#FEF3C7", "#92400E"],
    ["#FCE7F3", "#9D174D"],
    ["#E0F2FE", "#0369A1"],
    ["#F3F4F6", "#374151"],
  ];
  const [bg, fg] = COLORS[name.charCodeAt(0) % COLORS.length];
  return (
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
      style={{ background: bg, color: fg }}
    >
      {initials || "?"}
    </div>
  );
}

const STATUS_STYLE: Record<string, [string, string]> = {
  won:       ["#D1FAE5", "#065F46"],
  qualified: ["#EDE9FE", "#6D28D9"],
  responded: ["#FEF3C7", "#92400E"],
};

function ClientCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { t } = useLang();
  const [bg, fg] = STATUS_STYLE[lead.status] ?? ["var(--bg-subtle)", "var(--text-muted)"];
  const statusLabel = t.leads.status[lead.status as keyof typeof t.leads.status] ?? lead.status;

  return (
    <button
      onClick={onClick}
      className="card card-hover p-5 text-left w-full flex flex-col gap-4 transition-all"
    >
      <div className="flex items-start gap-3">
        <InitialAvatar name={lead.businessName} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate" style={{ color: "var(--text)" }}>
            {lead.businessName}
          </h3>
          {lead.industry && (
            <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Building2 className="w-3 h-3" />
              {lead.industry}
            </p>
          )}
        </div>
        <span
          className="badge text-[10px] flex-shrink-0"
          style={{ background: bg, color: fg, border: `1px solid ${fg}30` }}
        >
          {statusLabel}
        </span>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <MapPin className="w-3 h-3 flex-shrink-0" />
          {lead.city}{lead.address ? `, ${lead.address}` : ""}
        </p>
        {lead.email && (
          <p className="text-xs flex items-center gap-1.5 truncate" style={{ color: "var(--text-muted)" }}>
            <Mail className="w-3 h-3 flex-shrink-0" />
            {lead.email}
          </p>
        )}
        {lead.website && (
          <p className="text-xs flex items-center gap-1.5 truncate" style={{ color: "var(--color-info)" }}>
            <Globe className="w-3 h-3 flex-shrink-0" />
            {lead.website.replace(/^https?:\/\//, "")}
          </p>
        )}
      </div>

      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <span className="text-xs flex items-center gap-1" style={{ color: "var(--text-subtle)" }}>
          <Award className="w-3 h-3" />
          {lead.leadScore != null ? (
            <span
              className="font-semibold"
              style={{
                color: lead.leadScore >= 70
                  ? "var(--color-success)"
                  : lead.leadScore >= 40
                  ? "var(--color-warning)"
                  : "var(--color-danger)",
              }}
            >
              {lead.leadScore}
            </span>
          ) : "—"}
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
          {new Date(lead.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </button>
  );
}

export default function ClientsPage() {
  const { t } = useLang();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, refresh } = useRealtimeData(() => getLeads({ pageSize: 200 }), ["leads", "clients"], 30_000);
  const all = data?.leads ?? [];
  const clients = all.filter((l) => ["won", "qualified", "responded"].includes(l.status));

  const filtered = search
    ? clients.filter((l) =>
        l.businessName.toLowerCase().includes(search.toLowerCase()) ||
        l.city.toLowerCase().includes(search.toLowerCase()) ||
        (l.industry ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  const counts = {
    won:       clients.filter((l) => l.status === "won").length,
    qualified: clients.filter((l) => l.status === "qualified").length,
    responded: clients.filter((l) => l.status === "responded").length,
  };

  return (
    <PageShell title={t.clients.title} subtitle={`${clients.length} ${t.clients.subtitle}`}>
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {(["won", "qualified", "responded"] as const).map((key) => {
          const [bg, fg] = STATUS_STYLE[key];
          return (
            <div
              key={key}
              className="flex flex-col items-center py-4 rounded-xl"
              style={{ background: bg, border: `1px solid ${fg}25` }}
            >
              <span className="text-xl font-bold" style={{ color: fg }}>{counts[key]}</span>
              <span className="text-xs mt-0.5 font-medium" style={{ color: fg, opacity: 0.8 }}>
                {t.clients[key]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-subtle)" }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.clients.search}
          className="input pl-9"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{ border: "2px dashed var(--border)", background: "var(--bg-subtle)" }}
        >
          <Building2 className="w-10 h-10 mb-3 opacity-20" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            {search ? t.clients.noMatch : t.clients.noClients}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-subtle)" }}>
            {search ? t.clients.noMatchHint : t.clients.noClientsHint}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead) => (
            <ClientCard key={lead.id} lead={lead} onClick={() => setSelectedId(lead.id)} />
          ))}
        </div>
      )}

      <LeadDetailPanel leadId={selectedId} onClose={() => setSelectedId(null)} onLeadUpdated={refresh} />
    </PageShell>
  );
}
