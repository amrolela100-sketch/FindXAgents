import { useState } from "react";
import { motion } from "framer-motion";
import { PageShell } from "@/components/page-shell";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { useLang } from "@/lib/lang-context";
import { getLeads } from "@/lib/api";
import { useRealtimeData } from "@/lib/hooks/use-realtime-data";
import type { Lead } from "@/lib/types";
import { Building2, MapPin, Globe, Mail, Award, Search, Trophy, Star, MessageCircle } from "lucide-react";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<string, typeof Trophy> = {
  won:       Trophy,
  qualified: Star,
  responded: MessageCircle,
};

function InitialAvatar({ name }: { name: string }) {
  const initial = (name ?? "?")[0]?.toUpperCase() ?? "?";
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm border border-border bg-interactive-hover text-text-muted"
    >
      {initial}
    </div>
  );
}

// ── Client card ───────────────────────────────────────────────────────────────
function ClientCard({ lead, onClick, index }: { lead: Lead; onClick: () => void; index: number }) {
  const { t }       = useLang();
  const statusLabel = t.leads.status[lead.status as keyof typeof t.leads.status] ?? lead.status;

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SPRING, delay: index * 0.04 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass-card glass-card-hover rounded-2xl p-5 text-left w-full flex flex-col gap-4 border border-border"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <InitialAvatar name={lead.businessName} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[13.5px] truncate text-text">
            {lead.businessName}
          </h3>
          {lead.industry && (
            <p className="text-[12px] mt-0.5 flex items-center gap-1 text-text-muted">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{lead.industry}</span>
            </p>
          )}
        </div>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold border border-primary/20 bg-primary/10 text-primary flex-shrink-0"
        >
          {statusLabel}
        </span>
      </div>

      {/* Details */}
      <div className="space-y-1.5 w-full">
        <p className="text-[12px] flex items-center gap-1.5 text-text-muted">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{lead.city}{lead.address ? `, ${lead.address}` : ""}</span>
        </p>
        {lead.email && (
          <p className="text-[12px] flex items-center gap-1.5 text-text-muted">
            <Mail className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{lead.email}</span>
          </p>
        )}
        {lead.website && (
          <p className="text-[12px] flex items-center gap-1.5 text-primary">
            <Globe className="w-3 h-3 flex-shrink-0 text-primary" />
            <span className="truncate">{lead.website.replace(/^https?:\/\//, "")}</span>
          </p>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-between pt-3 border-t border-border"
      >
        <span className="text-[12px] flex items-center gap-1.5 text-text-subtle">
          <Award className="w-3.5 h-3.5" />
          {lead.leadScore != null ? (
            <span
              className={cn(
                "font-bold text-[13px]",
                lead.leadScore >= 70
                  ? "text-success"
                  : lead.leadScore >= 40
                  ? "text-warning"
                  : "text-danger"
              )}
            >
              {lead.leadScore}
            </span>
          ) : (
            <span>—</span>
          )}
          <span className="text-text-subtle">/ 100</span>
        </span>
        <span className="text-[11px] font-mono text-text-subtle">
          {new Date(lead.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
        </span>
      </div>
    </motion.button>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────
function StatCard({ label, count, icon: Icon }: {
  label: string; count: number; icon: typeof Trophy;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="rounded-2xl p-4 flex flex-col items-center justify-center gap-1 border border-border bg-interactive-hover"
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center mb-1 border border-border bg-glass"
      >
        <Icon className="w-4 h-4 text-primary" strokeWidth={1.5} />
      </div>
      <span className="text-[22px] font-bold leading-none text-text">{count}</span>
      <span className="text-[11px] font-medium text-text-muted">{label}</span>
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
          icon={Trophy}
        />
        <StatCard
          label={t.clients.qualified}
          count={counts.qualified}
          icon={Star}
        />
        <StatCard
          label={t.clients.responded}
          count={counts.responded}
          icon={MessageCircle}
        />
      </div>

      {/* ── Search ────────────────────────────────────────────── */}
      <div className="relative mb-6">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle"
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
          className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-border bg-interactive-hover"
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-4 border border-border bg-glass"
          >
            <Building2 className="w-7 h-7 text-primary/60" strokeWidth={1.5} />
          </div>
          <p className="text-[13px] font-medium text-text-muted">
            {search ? t.clients.noMatch : t.clients.noClients}
          </p>
          <p className="text-[12px] mt-1 text-text-subtle">
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
