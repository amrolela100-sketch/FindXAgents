import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Building2, Trash2, Check, Edit2, X, ChevronRight,
  Target, MapPin, Briefcase, Loader2, Layers, Globe,
  CheckCircle2, AlertCircle, Sparkles, FolderOpen
} from "lucide-react";
import { useWorkspace, type Workspace } from "../lib/workspace-context";

// ─── Constants ───────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 120, damping: 22 };
const FADE_UP = {
  hidden: { opacity: 0, y: 14 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { ...SPRING, delay: i * 0.06 },
  }),
};

const INDUSTRIES = [
  "SaaS", "Fintech", "E-commerce", "Logistics", "Marketing",
  "Healthcare", "Manufacturing", "Real Estate", "Education",
  "Food & Beverage", "Retail", "Construction", "Other",
];

const REGIONS: { group: string; options: string[] }[] = [
  { group: "🇦🇪 UAE", options: ["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "UAE – All"] },
  { group: "🇸🇦 Saudi Arabia", options: ["Riyadh", "Jeddah", "Dammam", "Mecca", "Medina", "Saudi Arabia – All"] },
  { group: "🌍 MENA", options: ["Egypt – Cairo", "Qatar – Doha", "Kuwait", "Bahrain", "Oman – Muscat", "Jordan – Amman", "Iraq – Baghdad", "Syria – Damascus", "Lebanon – Beirut", "Libya", "Tunisia", "Morocco – Casablanca", "Algeria"] },
  { group: "🇳🇱 Netherlands", options: ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Heel Nederland"] },
  { group: "🌍 Europe", options: ["London", "Paris", "Berlin", "Madrid", "Rome", "Barcelona", "Vienna", "Brussels", "Stockholm", "Copenhagen"] },
  { group: "🌏 Asia", options: ["Istanbul", "Singapore", "Hong Kong", "Mumbai", "Karachi", "Lahore", "Nairobi", "Lagos"] },
  { group: "🌎 Americas", options: ["New York", "Los Angeles", "Miami", "Toronto", "São Paulo"] },
];

// ─── Field Label ──────────────────────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      className="block text-[11px] font-semibold uppercase tracking-wider mb-1.5"
      style={{ color: "var(--text-muted)" }}
    >
      {children}
    </label>
  );
}

// ─── Workspace Form ───────────────────────────────────────────────────────────

function WorkspaceForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Workspace>;
  onSave: (data: Partial<Workspace>) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name:           initial?.name ?? "",
    description:    initial?.description ?? "",
    icp:            initial?.icp ?? "",
    targetIndustry: initial?.targetIndustry ?? "",
    targetCity:     initial?.targetCity ?? "",
  });

  const valid = form.name.trim().length > 0;

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel>Name *</FieldLabel>
        <input
          className="input text-[13px]"
          placeholder="e.g. Enterprise NL Q3"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          autoFocus
        />
      </div>

      <div>
        <FieldLabel>Description</FieldLabel>
        <input
          className="input text-[13px]"
          placeholder="Short note (optional)"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>

      <div>
        <FieldLabel>Ideal Customer Profile (ICP)</FieldLabel>
        <textarea
          rows={3}
          className="input text-[13px] resize-none"
          placeholder="Describe your ideal customer — size, pain points, tech stack…"
          value={form.icp}
          onChange={(e) => setForm((f) => ({ ...f, icp: e.target.value }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Industry</FieldLabel>
          <select
            className="input text-[13px]"
            value={form.targetIndustry}
            onChange={(e) => setForm((f) => ({ ...f, targetIndustry: e.target.value }))}
          >
            <option value="">All industries</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Region</FieldLabel>
          <select
            className="input text-[13px]"
            value={form.targetCity}
            onChange={(e) => setForm((f) => ({ ...f, targetCity: e.target.value }))}
          >
            <option value="">Global / All Regions</option>
            {REGIONS.map((g) => (
              <optgroup key={g.group} label={g.group}>
                {g.options.map((c) => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !valid}
          className="btn btn-primary text-[13px] px-4 py-2 gap-2 font-semibold"
        >
          {saving
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
          }
          Save workspace
        </button>
        <button
          onClick={onCancel}
          className="btn btn-ghost text-[13px] px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Workspace Card ───────────────────────────────────────────────────────────

function WorkspaceCard({
  ws,
  isActive,
  index,
  onSwitch,
  onEdit,
  onDelete,
}: {
  ws: Workspace;
  isActive: boolean;
  index: number;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      custom={index}
      variants={FADE_UP}
      initial="hidden"
      animate="visible"
      whileHover={!isActive ? { y: -2, transition: { duration: 0.2 } } : {}}
      className="glass-card rounded-2xl overflow-hidden"
      style={isActive ? {
        border: "1.5px solid rgba(245,158,11,0.40)",
        boxShadow: "0 0 0 3px rgba(245,158,11,0.08), 0 4px 24px rgba(0,0,0,0.10)",
      } : {}}
    >
      {/* Active indicator bar */}
      {isActive && (
        <div
          className="h-0.5 w-full"
          style={{ background: "linear-gradient(90deg, var(--brand), transparent)" }}
        />
      )}

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={isActive ? {
              background: "linear-gradient(135deg, var(--brand), #F97316)",
              boxShadow: "0 4px 14px rgba(245,158,11,0.35)",
            } : {
              background: "var(--glass-raised)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Building2
              className="w-5 h-5"
              style={{ color: isActive ? "#fff" : "var(--text-muted)" }}
              strokeWidth={1.8}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-[14px] tracking-tight truncate" style={{ color: "var(--text)" }}>
                {ws.name}
              </p>
              {isActive && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1"
                  style={{
                    background: "rgba(52,211,153,0.12)",
                    color: "#34D399",
                    border: "1px solid rgba(52,211,153,0.25)",
                  }}
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </span>
              )}
            </div>
            {ws.description && (
              <p className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                {ws.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-0.5 flex-shrink-0">
            <button
              onClick={onEdit}
              className="btn btn-ghost w-7 h-7 p-0 rounded-lg"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="btn btn-ghost w-7 h-7 p-0 rounded-lg"
              title="Delete"
              style={{ color: confirmDelete ? "#F87171" : undefined }}
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Tags row */}
        <div className="flex flex-wrap gap-2">
          {ws.targetIndustry && (
            <div
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(192,132,252,0.10)",
                color: "#C084FC",
                border: "1px solid rgba(192,132,252,0.20)",
              }}
            >
              <Briefcase className="w-3 h-3" strokeWidth={1.8} />
              {ws.targetIndustry}
            </div>
          )}
          {ws.targetCity && (
            <div
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: "rgba(96,165,250,0.10)",
                color: "#60A5FA",
                border: "1px solid rgba(96,165,250,0.20)",
              }}
            >
              <MapPin className="w-3 h-3" strokeWidth={1.8} />
              {ws.targetCity}
            </div>
          )}
          {!ws.targetIndustry && !ws.targetCity && (
            <div
              className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full"
              style={{
                background: "var(--glass-raised)",
                color: "var(--text-subtle)",
                border: "1px solid var(--glass-border)",
              }}
            >
              <Globe className="w-3 h-3" strokeWidth={1.8} />
              Global / All Regions
            </div>
          )}
        </div>

        {/* ICP preview */}
        {ws.icp && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-[12px] leading-relaxed"
            style={{
              background: "var(--glass-raised)",
              border: "1px solid var(--glass-border)",
            }}
          >
            <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--brand)" }} strokeWidth={1.8} />
            <span className="line-clamp-2" style={{ color: "var(--text-muted)" }}>{ws.icp}</span>
          </div>
        )}

        {/* Actions */}
        <AnimatePresence mode="wait">
          {confirmDelete ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="flex items-center gap-2 pt-1"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#F87171" }} strokeWidth={1.8} />
              <span className="text-[12px] flex-1" style={{ color: "#F87171" }}>
                Delete this workspace?
              </span>
              <button
                onClick={onDelete}
                className="btn text-[12px] px-3 py-1.5 font-semibold gap-1"
                style={{ background: "rgba(248,113,113,0.12)", color: "#F87171", border: "1px solid rgba(248,113,113,0.25)" }}
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn btn-ghost text-[12px] px-3 py-1.5"
              >
                Cancel
              </button>
            </motion.div>
          ) : !isActive ? (
            <motion.button
              key="switch"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              onClick={onSwitch}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-semibold transition-all"
              style={{
                background: "var(--glass-raised)",
                border: "1px solid var(--glass-border)",
                color: "var(--text-muted)",
              }}
              whileHover={{ scale: 1.01, borderColor: "var(--brand)" }}
            >
              Switch to workspace
              <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const {
    workspaces,
    activeWorkspace,
    loading,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  } = useWorkspace();

  const [showCreate, setShowCreate] = useState(false);
  const [editingId,  setEditingId]  = useState<string | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const handleCreate = async (data: Partial<Workspace>) => {
    setSaving(true); setError(null);
    try { await createWorkspace(data); setShowCreate(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id: string, data: Partial<Workspace>) => {
    setSaving(true); setError(null);
    try { await updateWorkspace(id, data); setEditingId(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try { await deleteWorkspace(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete"); }
  };

  const handleSwitch = async (id: string) => {
    try { await switchWorkspace(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to switch"); }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6">

        {/* ── Page Header ──────────────────────────────────── */}
        <motion.div
          custom={0}
          variants={FADE_UP}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
        >
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.22)" }}
              >
                <Layers className="w-4 h-4" style={{ color: "#C084FC" }} strokeWidth={1.8} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Workspaces
              </h1>
            </div>
            <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              Manage multiple prospecting campaigns with their own ICP and region.
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); }}
            className="btn btn-primary px-4 py-2.5 text-[13px] font-semibold gap-2 flex-shrink-0"
          >
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            New workspace
          </button>
        </motion.div>

        {/* ── Active Workspace Banner ───────────────────── */}
        <AnimatePresence>
          {activeWorkspace && (
            <motion.div
              custom={1}
              variants={FADE_UP}
              initial="hidden"
              animate="visible"
              className="rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, var(--brand) 0%, #F97316 100%)",
                boxShadow: "0 8px 32px rgba(245,158,11,0.30)",
              }}
            >
              <div className="px-5 py-4 flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.18)" }}
                >
                  <CheckCircle2 className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">
                    Active workspace
                  </p>
                  <p className="font-bold text-white truncate text-[15px]">
                    {activeWorkspace.name}
                  </p>
                  {(activeWorkspace.targetIndustry || activeWorkspace.targetCity) && (
                    <p className="text-[11px] text-white/70 mt-0.5">
                      {activeWorkspace.targetIndustry}
                      {activeWorkspace.targetIndustry && activeWorkspace.targetCity ? " · " : ""}
                      {activeWorkspace.targetCity}
                    </p>
                  )}
                </div>
                <div
                  className="text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5"
                  style={{ background: "rgba(255,255,255,0.20)", color: "#fff" }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  Running
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Error Alert ───────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px]"
              style={{
                background: "rgba(248,113,113,0.10)",
                border: "1px solid rgba(248,113,113,0.25)",
                color: "#F87171",
              }}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100">
                <X className="w-4 h-4" strokeWidth={1.8} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Create Form ───────────────────────────────── */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -8, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -8, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-card rounded-2xl overflow-hidden">
                <div
                  className="flex items-center justify-between px-5 py-3.5"
                  style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4" style={{ color: "var(--brand)" }} strokeWidth={1.8} />
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                      Create new workspace
                    </p>
                  </div>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="btn btn-ghost w-7 h-7 p-0 rounded-lg"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={1.8} />
                  </button>
                </div>
                <div className="p-5">
                  <WorkspaceForm
                    onSave={handleCreate}
                    onCancel={() => setShowCreate(false)}
                    saving={saving}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Workspace Grid / Loading / Empty ─────────── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--text-muted)" }} />
            <p className="text-[13px]" style={{ color: "var(--text-subtle)" }}>Loading workspaces…</p>
          </div>
        ) : workspaces.length === 0 ? (
          <motion.div
            custom={2}
            variants={FADE_UP}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center py-24 rounded-2xl"
            style={{
              border: "2px dashed var(--glass-border-strong)",
              background: "var(--glass-raised)",
            }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(192,132,252,0.10)", border: "1px solid rgba(192,132,252,0.20)" }}
            >
              <FolderOpen className="w-7 h-7" style={{ color: "#C084FC", opacity: 0.6 }} strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold mb-1" style={{ color: "var(--text-muted)" }}>
              No workspaces yet
            </p>
            <p className="text-[13px] mb-5" style={{ color: "var(--text-subtle)" }}>
              Create your first workspace to start prospecting
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="btn btn-primary px-5 py-2.5 text-[13px] font-semibold gap-2"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              First workspace
            </button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {workspaces.map((ws, i) =>
              editingId === ws.id ? (
                <motion.div
                  key={ws.id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-2xl overflow-hidden"
                  style={{ border: "1.5px solid var(--brand)", gridColumn: "1 / -1" }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid var(--glass-border)", background: "var(--glass-raised)" }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Edit2 className="w-4 h-4" style={{ color: "var(--brand)" }} strokeWidth={1.8} />
                      <p className="text-[13px] font-semibold" style={{ color: "var(--text)" }}>
                        Edit workspace
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingId(null)}
                      className="btn btn-ghost w-7 h-7 p-0 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={1.8} />
                    </button>
                  </div>
                  <div className="p-5">
                    <WorkspaceForm
                      initial={ws}
                      onSave={(data) => handleUpdate(ws.id, data)}
                      onCancel={() => setEditingId(null)}
                      saving={saving}
                    />
                  </div>
                </motion.div>
              ) : (
                <WorkspaceCard
                  key={ws.id}
                  ws={ws}
                  isActive={activeWorkspace?.id === ws.id}
                  index={i}
                  onSwitch={() => handleSwitch(ws.id)}
                  onEdit={() => setEditingId(ws.id)}
                  onDelete={() => handleDelete(ws.id)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
