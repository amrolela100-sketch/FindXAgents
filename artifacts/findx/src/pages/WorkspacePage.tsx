import { useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Plus, Building2, Trash2, Check, Edit2, X, ChevronRight, Target, MapPin, Briefcase, Loader2 } from "lucide-react";
import { useWorkspace, type Workspace } from "../lib/workspace-context";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

const INDUSTRIES = ["SaaS", "Fintech", "E-commerce", "Logistics", "Marketing", "Healthcare", "Manufacturing", "Other"];
const CITIES = ["Amsterdam", "Rotterdam", "Den Haag", "Utrecht", "Eindhoven", "Tilburg", "Groningen", "Heel Nederland"];

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
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    icp: initial?.icp ?? "",
    targetIndustry: initial?.targetIndustry ?? "",
    targetCity: initial?.targetCity ?? "",
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Name *</label>
        <input
          className="w-full px-3 py-2.5 border border-[#E5E3D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition"
          placeholder="e.g. Enterprise NL Q3"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Description</label>
        <input
          className="w-full px-3 py-2.5 border border-[#E5E3D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition"
          placeholder="optional"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">ICP</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2.5 border border-[#E5E3D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition resize-none"
          placeholder="Describe your ideal customer profile..."
          value={form.icp}
          onChange={(e) => setForm((f) => ({ ...f, icp: e.target.value }))}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Industry</label>
          <select
            className="w-full px-3 py-2.5 border border-[#E5E3D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition"
            value={form.targetIndustry}
            onChange={(e) => setForm((f) => ({ ...f, targetIndustry: e.target.value }))}
          >
            <option value="">All industries</option>
            {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#1A1A1A] uppercase tracking-wider">Region</label>
          <select
            className="w-full px-3 py-2.5 border border-[#E5E3D9] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 focus:border-[#1A1A1A] transition"
            value={form.targetCity}
            onChange={(e) => setForm((f) => ({ ...f, targetCity: e.target.value }))}
          >
            <option value="">All of Netherlands</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.name.trim()}
          className="flex items-center gap-1.5 bg-[#1A1A1A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#2A2A2A] transition disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg text-sm text-[#7A756D] border border-[#E5E3D9] hover:bg-[#F7F5F0] transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function WorkspaceCard({
  ws,
  isActive,
  onSwitch,
  onEdit,
  onDelete,
}: {
  ws: Workspace;
  isActive: boolean;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <motion.div
      variants={fadeUp}
      className={`bg-white border rounded-2xl p-5 space-y-4 transition-shadow hover:shadow-md ${
        isActive ? "border-[#1A1A1A] ring-2 ring-[#1A1A1A]/8" : "border-[#E5E3D9]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isActive ? "bg-[#1A1A1A]" : "bg-[#F0EDE6]"}`}>
            <Building2 className={`w-5 h-5 ${isActive ? "text-white" : "text-[#7A756D]"}`} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[#1A1A1A] truncate">{ws.name}</p>
            {ws.description && <p className="text-xs text-[#7A756D] truncate">{ws.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {isActive && (
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
          <button onClick={onEdit} className="p-1.5 rounded-lg text-[#7A756D] hover:bg-[#F7F5F0] hover:text-[#1A1A1A] transition">
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-[#7A756D] hover:bg-red-50 hover:text-red-500 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {ws.targetIndustry && (
          <div className="flex items-center gap-1.5 text-xs text-[#7A756D]">
            <Briefcase className="w-3 h-3" />
            <span className="truncate">{ws.targetIndustry}</span>
          </div>
        )}
        {ws.targetCity && (
          <div className="flex items-center gap-1.5 text-xs text-[#7A756D]">
            <MapPin className="w-3 h-3" />
            <span className="truncate">{ws.targetCity}</span>
          </div>
        )}
        {ws.icp && (
          <div className="col-span-2 flex items-start gap-1.5 text-xs text-[#7A756D]">
            <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="line-clamp-2">{ws.icp}</span>
          </div>
        )}
      </div>

      {confirmDelete ? (
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-red-600 flex-1">Are you sure?</span>
          <button onClick={onDelete} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition">
            Delete
          </button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-[#7A756D] px-3 py-1.5 rounded-lg border border-[#E5E3D9] hover:bg-[#F7F5F0] transition">
            Cancel
          </button>
        </div>
      ) : !isActive ? (
        <button
          onClick={onSwitch}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#E5E3D9] text-sm text-[#7A756D] hover:border-[#1A1A1A] hover:text-[#1A1A1A] hover:bg-[#F7F5F0] transition"
        >
          Switch <ChevronRight className="w-3.5 h-3.5" />
        </button>
      ) : null}
    </motion.div>
  );
}

export default function WorkspacePage() {
  const { workspaces, activeWorkspace, loading, switchWorkspace, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (data: Partial<Workspace>) => {
    setSaving(true);
    setError(null);
    try {
      await createWorkspace(data);
      setShowCreate(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<Workspace>) => {
    setSaving(true);
    setError(null);
    try {
      await updateWorkspace(id, data);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteWorkspace(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const handleSwitch = async (id: string) => {
    try {
      await switchWorkspace(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] p-4 sm:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-[#1A1A1A]">Workspaces</h1>
            <p className="text-sm text-[#7A756D] mt-0.5">
              Manage multiple prospecting campaigns, each with their own ICP and region.
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setEditingId(null); }}
            className="flex items-center justify-center gap-1.5 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2A2A2A] transition flex-shrink-0"
          >
            <Plus className="w-4 h-4" />
            New workspace
          </button>
        </motion.div>

        {/* Active workspace banner */}
        {activeWorkspace && (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="bg-[#1A1A1A] rounded-2xl p-5 text-white flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-0.5">Active workspace</p>
              <p className="font-semibold text-white truncate">{activeWorkspace.name}</p>
              {activeWorkspace.targetIndustry && (
                <p className="text-xs text-white/60 mt-0.5">{activeWorkspace.targetIndustry}{activeWorkspace.targetCity ? ` · ${activeWorkspace.targetCity}` : ""}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
            <X className="w-4 h-4 flex-shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* Create form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-white border border-[#E5E3D9] rounded-2xl p-6 space-y-2"
            >
              <p className="font-semibold text-[#1A1A1A] mb-4">Create new workspace</p>
              <WorkspaceForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workspace list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-[#7A756D]" />
          </div>
        ) : workspaces.length === 0 ? (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="bg-white border border-dashed border-[#D4CFC5] rounded-2xl p-12 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#F0EDE6] flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6 text-[#7A756D]" />
            </div>
            <div>
              <p className="font-semibold text-[#1A1A1A]">No workspaces yet</p>
              <p className="text-sm text-[#7A756D] mt-1">Create your first workspace to start prospecting.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 bg-[#1A1A1A] text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-[#2A2A2A] transition"
            >
              <Plus className="w-4 h-4" /> First workspace
            </button>
          </motion.div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="grid sm:grid-cols-2 gap-4">
            {workspaces.map((ws) =>
              editingId === ws.id ? (
                <div key={ws.id} className="bg-white border border-[#1A1A1A] rounded-2xl p-5">
                  <p className="font-semibold text-[#1A1A1A] mb-4">Edit workspace</p>
                  <WorkspaceForm
                    initial={ws}
                    onSave={(data) => handleUpdate(ws.id, data)}
                    onCancel={() => setEditingId(null)}
                    saving={saving}
                  />
                </div>
              ) : (
                <WorkspaceCard
                  key={ws.id}
                  ws={ws}
                  isActive={activeWorkspace?.id === ws.id}
                  onSwitch={() => handleSwitch(ws.id)}
                  onEdit={() => setEditingId(ws.id)}
                  onDelete={() => handleDelete(ws.id)}
                />
              )
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
