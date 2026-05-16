import { useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { useLang } from "@/lib/lang-context";
import { getLeads } from "@/lib/api";
import { useRealtimeData } from "@/lib/hooks/use-realtime-data";
import type { Lead } from "@/lib/types";
import { Building2, MapPin, Globe, Mail, Award, Search, Trophy, Star, MessageCircle } from "lucide-react";

const GLASS = {
  background: "var(--glass)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid var(--glass-border)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.10)",
} as const;

import { SPRING } from "@/lib/motion";

const STATUS_ICONS: Record<string, typeof Trophy> = {
  won:       Trophy,
  qualified: Star,
  responded: MessageCircle,
};

// ── Client card ───────────────────────────────────────────────────────────────
function ClientCard({ lead, onClick, index }: { lead: Lead; onClick: () => void; index: number }) {
  const { t }       = useLang();
  const cfg         = STATUS_CONFIG[lead.status] ?? { accent: "#9CA3AF", glow: "rgba(156,163,175,0.2)" };
  const statusLabel = t.leads.status[lead.status as keyof typeof t.leads.status] ?? lead.status;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.04 }}
      whileHover={{ y: -2, boxShadow: `0 8px 32px ${cfg.glow}, 0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.12)` }}
      onClick={onClick}
      className="rounded-2xl p-5 text-left w-full flex flex-col gap-4"
      style={GLASS}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <InitialAvatar name={lead.businessName} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[13.5px] truncate" style={{ color: "var(--text)" }}>
            {lead.businessName}
          </h3>
          {lead.industry && (
            <p className="text-[12px] mt-0.5 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lead.industry}</span>
            </p>
          )}
        </div>
        <span
          className="badge text-[10px] flex-shrink-0 font-semibold"
          style={{
            background: `${cfg.accent}18`,
            color: cfg.accent,
            border: `1px solid ${cfg.accent}30`,
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5">
        <p className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lead.city}{lead.address ? `, ${lead.address}` : ""}</span>
        </p>
        {lead.email && (
          <p className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </p>
        )}
        {lead.website && (
          <p className="text-[12px] flex items-center gap-1.5" style={{ color: "#60A5FA" }}>
            <Globe className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.website.replace(/^https?:\/\//, "")}</span>
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3"
        style={{ borderTop: "1px solid var(--glass-border)" }}
      >
        <span className="text-[12px] flex items-center gap-1.5" style={{ color: "var(--text-subtle)" }}>
          <Award className="w-3 h-3" />
          {lead.leadScore != null ? (
            <span
              className="font-bold text-[13px]"
              style={{
                color: lead.leadScore >= 70
                  ? "#34D399"
                  : lead.leadScore >= 40
                  ? "#FBBF24"
                  : "#F87171",
              }}
            >
              {lead.leadScore}
            </span>
          ) : (
            <span>—</span>
          )}
          <span style={{ color: "var(--text-subtle)" }}>/ 100</span>
        </span>
        <span className="text-[11px] font-mono" style={{ color: "var(--text-subtle)" }}>
          {new Date(lead.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
    </motion.button>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, count, accent, glow, icon: Icon }: {
  label: string; count: number; accent: string; glow: string; icon: typeof Trophy;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="rounded-2xl p-4 flex flex-col items-center justify-center gap-1"
      style={{
        background: `${accent}10`,
        border: `1px solid ${accent}25`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        boxShadow: `0 2px 12px ${glow}`,
      }}
    >
      <div
        className="w-8 h-8 rounded-xl flex items-center justify-center mb-1"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <Icon className="w-4 h-4" style={{ color: accent }} strokeWidth={1.5} />
      </div>
      <span className="text-[22px] font-bold leading-none" style={{ color: accent }}>{count}</span>
      <span className="text-[11px] font-medium" style={{ color: accent, opacity: 0.75 }}>{label}</span>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { t } = useLang();
  const [search, setSearch]       = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, refresh } = useRealtimeData(
    () => getLeads({ pageSize: 200 }),
    ["leads", "clients"],
    30_000,
  );
  const all     = data?.leads ?? [];
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

      {/* ── Summary stats ─────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard
          label={t.clients.won}
          count={counts.won}
          accent="#34D399"
          glow="rgba(52,211,153,0.2)"
          icon={Trophy}
        />
        <StatCard
          label={t.clients.qualified}
          count={counts.qualified}
          accent="#C084FC"
          glow="rgba(192,132,252,0.2)"
          icon={Star}
        />
        <StatCard
          label={t.clients.responded}
          count={counts.responded}
          accent="#FBBF24"
          glow="rgba(251,191,36,0.2)"
          icon={MessageCircle}
        />
      </div>

      {/* ── Search ────────────────────────────────────────────── */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
          style={{ color: "var(--text-subtle)" }}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t.clients.search}
          className="input pl-9"
        />
      </div>

      {/* ── Grid ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-2xl"
          style={{
            border: "2px dashed var(--glass-border-strong)",
            background: "var(--glass-raised)",
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "rgba(96,165,250,0.10)", border: "1px solid rgba(96,165,250,0.20)" }}
          >
            <Building2 className="w-7 h-7" style={{ color: "#60A5FA", opacity: 0.6 }} strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium" style={{ color: "var(--text-muted)" }}>
            {search ? t.clients.noMatch : t.clients.noClients}
          </p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-subtle)" }}>
            {search ? t.clients.noMatchHint : t.clients.noClientsHint}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((lead, i) => (
            <ClientCard
              key={lead.id}
              lead={lead}
              index={i}
              onClick={() => setSelectedId(lead.id)}
            />
          ))}
        </div>
      )}

      <LeadDetailPanel
        leadId={selectedId}
        onClose={() => setSelectedId(null)}
        onLeadUpdated={refresh}
      />
    </PageShell>
  );
}
