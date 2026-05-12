import { useState, useEffect } from "react";
import {
  X, Globe, Building2, MapPin, Phone, Mail, ExternalLink,
  FileText, Send, BarChart3, StickyNote, Clock,
} from "lucide-react";
import type { Lead } from "../lib/types";
import { getLead } from "../lib/api";
import { StatusBadge, ScoreBadge } from "./status-badge";
import { AnalysisPanel } from "./analysis-panel";
import { OutreachPanel } from "./outreach-panel";
import { NotesPanel } from "./notes-panel";

interface LeadDetailPanelProps {
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated: () => void;
}

type Tab = "overview" | "analysis" | "outreach" | "notes";

export function LeadDetailPanel({ leadId, onClose, onLeadUpdated }: LeadDetailPanelProps) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(false);

  async function refreshLead() {
    if (!leadId) return;
    try {
      const res = await getLead(leadId);
      setLead(res.lead);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    setTab("overview");
    getLead(leadId)
      .then((res) => setLead(res.lead))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [leadId]);

  if (!leadId) return null;

  const tabs: { key: Tab; label: string; icon: typeof FileText }[] = [
    { key: "overview",  label: "Overview",  icon: FileText },
    { key: "analysis",  label: "Analysis",  icon: BarChart3 },
    { key: "outreach",  label: "Email",     icon: Send },
    { key: "notes",     label: "Notes",     icon: StickyNote },
  ];

  return (
    <div
      className="fixed inset-y-0 w-[480px] z-50 flex flex-col"
      style={{
        right: document.documentElement.dir === "rtl" ? "auto" : 0,
        left:  document.documentElement.dir === "rtl" ? 0 : "auto",
        background: "rgba(255,255,255, 0.60)",
        backdropFilter: "blur(32px) saturate(200%)",
        WebkitBackdropFilter: "blur(32px) saturate(200%)",
        borderLeft:  document.documentElement.dir === "rtl" ? "none" : "1px solid var(--glass-border-strong)",
        borderRight: document.documentElement.dir === "rtl" ? "1px solid var(--glass-border-strong)" : "none",
        boxShadow: document.documentElement.dir === "rtl"
          ? "8px 0 48px rgba(0,0,0,0.15), inset -1px 0 0 rgba(255,255,255,0.20)"
          : "-8px 0 48px rgba(0,0,0,0.15), inset 1px 0 0 rgba(255,255,255,0.20)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-lg truncate" style={{ color: "var(--text)" }}>
            {lead?.businessName ?? "Loading..."}
          </h2>
          {lead && <StatusBadge status={lead.status} />}
        </div>
        <button
          onClick={onClose}
          aria-label="Close lead detail panel"
          className="ml-3 p-1.5 rounded-lg transition-colors hover:bg-[var(--glass-raised)]"
        >
          <X className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
        </button>
      </div>

      {/* Tabs */}
      <div
        className="flex px-2"
        style={{ borderBottom: "1px solid var(--glass-border)" }}
      >
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors"
            style={
              tab === key
                ? { borderColor: "var(--brand)", color: "var(--brand)" }
                : { borderColor: "transparent", color: "var(--text-muted)" }
            }
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 kanban-scroll">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
            Loading...
          </div>
        ) : !lead ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--text-subtle)" }}>
            Lead not found
          </div>
        ) : tab === "overview" ? (
          <OverviewTab lead={lead} />
        ) : tab === "analysis" ? (
          <AnalysisPanel lead={lead} onLeadUpdated={() => { void refreshLead(); onLeadUpdated(); }} />
        ) : tab === "outreach" ? (
          <OutreachPanel lead={lead} outreaches={lead.outreaches ?? []} onUpdate={() => { void refreshLead(); onLeadUpdated(); }} />
        ) : (
          <NotesPanel lead={lead} />
        )}
      </div>
    </div>
  );
}

function InfoCard({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div
      className="rounded-xl p-4 space-y-3"
      style={{
        background: "var(--glass)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid var(--glass-border)",
      }}
    >
      {title && (
        <h3
          className="font-semibold text-xs uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function OverviewTab({ lead }: { lead: Lead }) {
  const timeline = [
    ...(lead.analyses ?? []).map((a) => ({
      type: "analysis" as const,
      date: a.analyzedAt,
      title: `Analysis completed — Score: ${a.score ?? "N/A"}`,
    })),
    ...(lead.outreaches ?? []).map((o) => ({
      type: "outreach" as const,
      date: o.sentAt ?? o.createdAt,
      title: `Email ${o.status}: ${o.subject}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4">
      <InfoCard title="Contact Info">
        <div className="space-y-2">
          {lead.industry && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <Building2 className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
              <span>{lead.industry}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
            <MapPin className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
            <span>{[lead.address, lead.city].filter(Boolean).join(", ")}</span>
          </div>
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <Phone className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
              <span>{lead.phone}</span>
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <Mail className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
              <span>{lead.email}</span>
            </div>
          )}
          {lead.website && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text)" }}>
              <Globe className="w-4 h-4 shrink-0" style={{ color: "var(--text-subtle)" }} />
              <a
                href={lead.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 hover:underline"
                style={{ color: "#60A5FA" }}
              >
                {lead.website} <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      </InfoCard>

      {(lead.analyses ?? []).length > 0 && (
        <InfoCard title="Latest Score">
          <ScoreBadge score={(lead.analyses ?? [])[0]?.score} />
        </InfoCard>
      )}

      <InfoCard title="Source">
        <p className="text-sm" style={{ color: "var(--text)" }}>{lead.source}</p>
        {lead.kvkNumber && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>KVK: {lead.kvkNumber}</p>
        )}
      </InfoCard>

      <InfoCard title="Timeline">
        {timeline.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-subtle)" }}>No activity yet</p>
        ) : (
          <div className="space-y-3">
            {timeline.map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                  style={{
                    background: item.type === "analysis" ? "#818CF8" : "#60A5FA",
                    boxShadow: `0 0 6px ${item.type === "analysis" ? "rgba(129,140,248,0.5)" : "rgba(96,165,250,0.5)"}`,
                  }}
                />
                <div>
                  <p className="text-sm" style={{ color: "var(--text)" }}>{item.title}</p>
                  <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--text-subtle)" }}>
                    <Clock className="w-3 h-3" />
                    {new Date(item.date).toLocaleString("nl-NL")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </InfoCard>
    </div>
  );
}
