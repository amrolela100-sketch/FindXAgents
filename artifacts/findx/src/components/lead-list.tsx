import { useState, useCallback } from "react";
import { ArrowUpDown, Globe, Building2, MapPin, ExternalLink, Trash2, CheckSquare, Square, AlertTriangle, Users, Zap } from "lucide-react";
import type { Lead } from "../lib/types";
import { StatusBadge } from "./status-badge";
import { getLeads, deleteLead, bulkDeleteLeads } from "../lib/api";
import { useRealtimeData } from "../lib/hooks/use-realtime-data";
import { useLang } from "../lib/lang-context";
import { LeadRowSkeleton } from "./ui/skeleton-patterns";
import { QueryError } from "./QueryError";

interface LeadListProps {
  onSelectLead: (lead: Lead) => void;
}

type SortKey = "discoveredAt" | "businessName" | "city" | "status";
type SortDir = "asc" | "desc";

// ─── Confirm dialog ───────────────────────────────────────────────────────────
function DeleteConfirmDialog({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={`Delete ${count} lead${count !== 1 ? "s" : ""}`}
    >
      <div
        className="rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--glass-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full p-2" style={{ background: "var(--color-danger-bg)" }}>
            <AlertTriangle className="w-5 h-5" style={{ color: "var(--color-danger)" }} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Delete {count} lead{count !== 1 ? "s" : ""}?
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
              This will also remove all analyses and outreach emails. Cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="btn btn-ghost text-xs px-4 py-2"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="btn text-xs px-4 py-2 flex items-center gap-1.5"
            style={{ background: "var(--color-danger)", color: "#fff", opacity: loading ? 0.7 : 1 }}
            aria-busy={loading}
          >
            {loading ? (
              <span className="animate-spin w-3 h-3 border-2 border-white border-t-transparent rounded-full" aria-hidden="true" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {loading ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyLeads({ onDiscover }: { onDiscover?: () => void }) {
  return (
    <tr>
      <td colSpan={8}>
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "var(--bg-subtle)", border: "1px solid var(--glass-border)" }}
            aria-hidden="true"
          >
            <Users className="w-7 h-7" style={{ color: "var(--text-subtle)" }} />
          </div>
          <h3 className="text-base font-semibold mb-1.5" style={{ color: "var(--text)" }}>
            No leads yet
          </h3>
          <p className="text-sm mb-5 max-w-xs" style={{ color: "var(--text-muted)" }}>
            Run the discovery agent to start finding businesses that match your ICP.
          </p>
          {onDiscover && (
            <button
              onClick={onDiscover}
              className="btn btn-primary flex items-center gap-2 text-sm px-5 py-2"
              aria-label="Discover new leads"
            >
              <Zap className="w-4 h-4" aria-hidden="true" />
              Discover Leads
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function LeadList({ onSelectLead }: LeadListProps) {
  const { t } = useLang();
  const { data, isLoading, error, refresh } = useRealtimeData(() => getLeads({ pageSize: 200 }), ["leads"], 30_000);
  const leads = data?.leads ?? [];

  const [sortKey, setSortKey] = useState<SortKey>("discoveredAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");

  // ── Selection state ──────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  // ── Selection helpers ────────────────────────────────────────────────────
  const allVisibleIds = sorted.map((l) => l.id);
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selected.has(id));
  const someSelected = selected.size > 0;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(allVisibleIds));
    }
  }, [allSelected, allVisibleIds]);

  const toggleSelectOne = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ── Delete handlers ──────────────────────────────────────────────────────
  async function handleDeleteConfirm() {
    setDeleting(true);
    try {
      const ids = [...selected];
      if (ids.length === 1) {
        await deleteLead(ids[0]);
      } else {
        await bulkDeleteLeads(ids);
      }
      setSelected(new Set());
      setShowConfirm(false);
      await refresh();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleting(false);
    }
  }

  const th = "text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none";

  // ── Error state ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="py-4">
        <QueryError
          error={new Error(error)}
          resetErrorBoundary={refresh}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Delete confirm dialog */}
      {showConfirm && (
        <DeleteConfirmDialog
          count={selected.size}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowConfirm(false)}
          loading={deleting}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4" role="toolbar" aria-label="Lead filters">
        <div className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder={t.leads.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-3 pr-3 py-2 text-xs"
            aria-label="Search leads"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input py-2 text-xs w-36"
          aria-label="Filter by status"
        >
          <option value="">{t.leads.allStatuses}</option>
          {Object.entries(t.leads.status).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        <span className="text-xs ms-auto" style={{ color: "var(--text-subtle)" }} aria-live="polite">
          {isLoading ? "…" : `${sorted.length} leads`}
        </span>

        {/* Delete button — visible only when something is selected */}
        {someSelected && (
          <button
            onClick={() => setShowConfirm(true)}
            className="btn flex items-center gap-1.5 text-xs px-3 py-2"
            style={{ background: "var(--color-danger-bg)", color: "var(--color-danger)", border: "1px solid var(--color-danger)", borderRadius: 8 }}
            aria-label={`Delete ${selected.size} selected lead${selected.size !== 1 ? "s" : ""}`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Delete {selected.size}
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--glass-border)" }}
        role="region"
        aria-label="Leads table"
        aria-busy={isLoading}
      >
        <table className="w-full" aria-label="Leads">
          <thead>
            <tr style={{ background: "var(--bg-subtle)", borderBottom: "1px solid var(--border)" }}>
              {/* Select-all checkbox */}
              <th className="px-4 py-3 w-10" scope="col">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center justify-center"
                  style={{ color: allSelected ? "var(--color-primary)" : "var(--text-muted)" }}
                  title={allSelected ? "Deselect all" : "Select all"}
                  aria-label={allSelected ? "Deselect all leads" : "Select all leads"}
                  aria-pressed={allSelected}
                >
                  {allSelected
                    ? <CheckSquare className="w-4 h-4" aria-hidden="true" />
                    : <Square className="w-4 h-4" aria-hidden="true" />}
                </button>
              </th>

              {(["businessName", "city", "discoveredAt", "status"] as const).map((col) => (
                <th
                  key={col}
                  onClick={() => toggle(col)}
                  className={th}
                  style={{ color: "var(--text-muted)" }}
                  scope="col"
                  aria-sort={sortKey === col ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggle(col); }}
                >
                  <span className="flex items-center gap-1.5">
                    {t.common[col as keyof typeof t.common] ?? col}
                    <ArrowUpDown className="w-3 h-3 opacity-40" aria-hidden="true" />
                  </span>
                </th>
              ))}
              <th className={th} style={{ color: "var(--text-muted)" }} scope="col">{t.leads.score}</th>
              <th className={th} style={{ color: "var(--text-muted)" }} scope="col">{t.leads.website}</th>
              {/* Actions column */}
              <th className="px-4 py-3 w-10" scope="col" aria-label="Actions" />
            </tr>
          </thead>
          <tbody aria-live="polite">
            {/* Skeleton loading rows */}
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <LeadRowSkeleton key={`skeleton-${i}`} />
            ))}

            {/* Empty state */}
            {!isLoading && sorted.length === 0 && (
              <EmptyLeads />
            )}

            {/* Data rows */}
            {!isLoading && sorted.map((lead, i) => {
              const isSelected = selected.has(lead.id);
              return (
                <tr
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none",
                    background: isSelected ? "var(--color-primary-bg, var(--bg-subtle))" : "var(--surface)",
                  }}
                  onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "var(--bg-subtle)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "var(--color-primary-bg, var(--bg-subtle))" : "var(--surface)"; }}
                  tabIndex={0}
                  role="row"
                  aria-selected={isSelected}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelectLead(lead); }}
                >
                  {/* Row checkbox */}
                  <td className="px-4 py-3 w-10" onClick={(e) => toggleSelectOne(lead.id, e)}>
                    <span
                      className="flex items-center justify-center"
                      style={{ color: isSelected ? "var(--color-primary)" : "var(--text-muted)" }}
                    >
                      {isSelected ? <CheckSquare className="w-4 h-4" aria-hidden="true" /> : <Square className="w-4 h-4 opacity-40" aria-hidden="true" />}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <p className="text-sm font-medium" style={{ color: "var(--text)" }}>{lead.businessName}</p>
                    {lead.industry && (
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-muted)" }}>
                        <Building2 className="w-3 h-3" aria-hidden="true" />
                        {lead.industry}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <MapPin className="w-3 h-3" aria-hidden="true" />
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
                        aria-label={`Lead score: ${lead.leadScore}`}
                      >
                        {lead.leadScore}
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-subtle)" }} aria-label="No score">&#8212;</span>
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
                        aria-label={`Visit ${lead.businessName} website`}
                      >
                        <Globe className="w-3 h-3" aria-hidden="true" />
                        <span className="clamp-1 max-w-28">{lead.website.replace(/^https?:\/\//, "")}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-subtle)" }} aria-label="No website">&#8212;</span>
                    )}
                  </td>
                  {/* Quick delete button per row */}
                  <td className="px-3 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(new Set([lead.id]));
                        setShowConfirm(true);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg"
                      style={{ color: "var(--text-muted)" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--color-danger)";
                        (e.currentTarget as HTMLElement).style.background = "var(--color-danger-bg)";
                        (e.currentTarget as HTMLElement).style.opacity = "1";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                        (e.currentTarget as HTMLElement).style.opacity = "";
                      }}
                      title="Delete lead"
                      aria-label={`Delete ${lead.businessName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
