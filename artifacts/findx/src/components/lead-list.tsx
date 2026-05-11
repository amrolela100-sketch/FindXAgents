import { useState } from "react";
import { ArrowUpDown, Globe, Building2, MapPin, ExternalLink } from "lucide-react";
import type { Lead } from "../lib/types";
import { StatusBadge } from "./status-badge";
import { getLeads } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { useLang } from "../lib/lang-context";

interface LeadListProps {
  onSelectLead: (lead: Lead) => void;
}

type SortKey = "discoveredAt" | "businessName" | "city" | "status";
type SortDir = "asc" | "desc";

export function LeadList({ onSelectLead }: LeadListProps) {
  const { t } = useLang();
  const { data } = useRealtimeData(() => getLeads({ pageSize: 200 }), ["leads"], 30_000);
  const leads = data?.leads ?? [];

  const [sortKey, setSortKey] = useState<SortKey>("discoveredAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  const toggle = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  let filtered = leads;
  if (filterStatus) filtered = filtered.filter((l) => l.status === filterStatus);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (l) =>
        l.businessName.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        (l.industry?.toLowerCase().includes(q) ?? false)
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    const m = sortDir === "asc" ? 1 : -1;
    if (sortKey === "discoveredAt")
      return m * (new Date(a.discoveredAt).getTime() - new Date(b.discoveredAt).getTime());
    return m * String(a[sortKey]).localeCompare(String(b[sortKey]));
  });

  const th = "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none";

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder={t.leads.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-3 pr-3 py-2 text-xs"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input py-2 text-xs w-36"
        >
          <option value="">{t.leads.allStatuses}</option>
          {Object.entries(t.leads.status).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <span className="text-xs ml-auto" style={{ color: "var(--text-subtle)" }}>
          {sorted.length} leads
        </span>
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--border)" }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
              {(["businessName", "city", "discoveredAt", "status"] as const).map((col) => (
                <th
                  key={col}
                  onClick={() => toggle(col)}
                  className={th}
                  style={{ color: "var(--text-muted)" }}
                >
                  <span className="flex items-center gap-1.5">
                    {t.common[col as keyof typeof t.common] ?? col}
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
                  </span>
                </th>
              ))}
              <th className={th} style={{ color: "var(--text-muted)" }}>{t.leads.score}</th>
              <th className={th} style={{ color: "var(--text-muted)" }}>{t.leads.website}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead, i) => (
              <tr
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className="cursor-pointer transition-colors"
                style={{
                  borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                  background: "var(--surface)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "var(--surface)")}
              >
                <td className="px-4 py-3">
                  <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{lead.businessName}</p>
                  {lead.industry && (
                    <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                      <Building2 className="w-3 h-3" />
                      {lead.industry}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                    <MapPin className="w-3 h-3" />
                    {lead.city}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs" style={{ color: "var(--text-subtle)" }}>
                  {new Date(lead.discoveredAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lead.status} />
                </td>
                <td className="px-4 py-3">
                  {lead.leadScore != null ? (
                    <span
                      className="badge text-xs"
                      style={{
                        background: lead.leadScore >= 70 ? "var(--color-success-bg)" : lead.leadScore >= 40 ? "var(--color-warning-bg)" : "var(--color-danger-bg)",
                        color: lead.leadScore >= 70 ? "var(--color-success)" : lead.leadScore >= 40 ? "var(--color-warning)" : "var(--color-danger)",
                      }}
                    >
                      {lead.leadScore}
                    </span>
                  ) : (
                    <span style={{ color: "var(--text-subtle)" }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {lead.website ? (
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center gap-1 hover:underline"
                      style={{ color: "var(--color-info)" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Globe className="w-3 h-3" />
                      <span className="clamp-1 max-w-28">{lead.website.replace(/^https?:\/\//, "")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-subtle)" }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-sm" style={{ color: "var(--text-subtle)" }}>
                  {t.leads.noLeads}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
