import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Loader2, X, Layers, CheckCircle2, AlertCircle, Sparkles, FolderOpen, Edit2,
} from "lucide-react";
import { useWorkspace } from "@/lib/workspace-context";
import { FADE_UP } from "@/lib/motion";
import { WorkspaceForm } from "./WorkspaceForm";
import { WorkspaceCard } from "./WorkspaceCard";
import { cn } from "@/lib/utils";

export default function WorkspacePage() {
  const { workspaces, activeWorkspace, loading, createWorkspace, updateWorkspace, deleteWorkspace, switchWorkspace } = useWorkspace();
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(data: Record<string, string>) {
    setSaving(true); setError(null);
    try { await createWorkspace(data as any); setShowCreate(false); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }
  async function handleUpdate(id: string, data: Record<string, string>) {
    setSaving(true); setError(null);
    try { await updateWorkspace(id, data as any); setEditingId(null); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }
  async function handleDelete(id: string) {
    setError(null);
    try { await deleteWorkspace(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }
  async function handleSwitch(id: string) {
    setError(null);
    try { await switchWorkspace(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed"); }
  }

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Header */}
        <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible" className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-interactive-hover">
                <Layers className="w-4 h-4 text-primary" strokeWidth={1.8} />
              </div>
              <h1 className="text-[22px] font-bold tracking-tight text-text">Workspaces</h1>
            </div>
            <p className="text-[13px] text-text-muted">Manage multiple prospecting campaigns with their own ICP and region.</p>
          </div>
          <button onClick={() => { setShowCreate(true); setEditingId(null); }} className="btn btn-primary px-4 py-2.5 rounded-full text-[13px] font-semibold gap-2 flex-shrink-0">
            <Plus className="w-4 h-4" strokeWidth={2.5} /> New workspace
          </button>
        </motion.div>

        {/* Active Workspace Banner */}
        <AnimatePresence>
          {activeWorkspace && (
            <motion.div custom={1} variants={FADE_UP} initial="hidden" animate="visible" className="rounded-2xl overflow-hidden bg-glass border border-primary/20 bg-primary/5 shadow-sm">
              <div className="px-5 py-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border border-primary/20 bg-primary/10 text-primary">
                  <CheckCircle2 className="w-5 h-5 text-primary" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary/75 mb-0.5">Active workspace</p>
                  <p className="font-bold text-text truncate text-[15px]">{activeWorkspace.name}</p>
                  {(activeWorkspace.targetIndustry || activeWorkspace.targetCity) && (
                    <p className="text-[11px] text-text-muted mt-0.5">{activeWorkspace.targetIndustry}{activeWorkspace.targetIndustry && activeWorkspace.targetCity ? " · " : ""}{activeWorkspace.targetCity}</p>
                  )}
                </div>
                <div className="text-[11px] font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border border-success/20 bg-success/5 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Running
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] border border-danger/20 bg-danger/5 text-danger">
              <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={1.8} />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="opacity-70 hover:opacity-100"><X className="w-4 h-4" strokeWidth={1.8} /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Create Form */}
        <AnimatePresence>
          {showCreate && (
            <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: "auto" }} exit={{ opacity: 0, y: -8, height: 0 }} className="overflow-hidden">
              <div className="glass-card rounded-2xl overflow-hidden border border-border">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-interactive-hover">
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.8} />
                    <p className="text-[13px] font-semibold text-text">Create new workspace</p>
                  </div>
                  <button onClick={() => setShowCreate(false)} className="btn btn-ghost w-7 h-7 p-0 rounded-full"><X className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
                </div>
                <div className="p-5 bg-glass"><WorkspaceForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} /></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid / Loading / Empty */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-text-muted" />
            <p className="text-[13px] text-text-subtle">Loading workspaces…</p>
          </div>
        ) : workspaces.length === 0 ? (
          <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible"
            className="flex flex-col items-center justify-center py-24 rounded-2xl border-2 border-dashed border-border bg-interactive-hover">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 border border-border bg-glass">
              <FolderOpen className="w-7 h-7 text-primary/60" strokeWidth={1.5} />
            </div>
            <p className="text-[15px] font-semibold mb-1 text-text-muted">No workspaces yet</p>
            <p className="text-[13px] mb-5 text-text-subtle">Create your first workspace to start prospecting</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary px-5 py-2.5 rounded-full text-[13px] font-semibold gap-2"><Plus className="w-4 h-4" strokeWidth={2.5} /> First workspace</button>
          </motion.div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {workspaces.map((ws, i) =>
              editingId === ws.id ? (
                <motion.div key={ws.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                  className="glass-card rounded-2xl overflow-hidden border border-primary bg-glass" style={{ gridColumn: "1 / -1" }}>
                  <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-interactive-hover">
                    <div className="flex items-center gap-2.5"><Edit2 className="w-4 h-4 text-primary" strokeWidth={1.8} /><p className="text-[13px] font-semibold text-text">Edit workspace</p></div>
                    <button onClick={() => setEditingId(null)} className="btn btn-ghost w-7 h-7 p-0 rounded-full"><X className="w-3.5 h-3.5" strokeWidth={1.8} /></button>
                  </div>
                  <div className="p-5"><WorkspaceForm initial={ws} onSave={(data) => handleUpdate(ws.id, data)} onCancel={() => setEditingId(null)} saving={saving} /></div>
                </motion.div>
              ) : (
                <WorkspaceCard key={ws.id} ws={ws} isActive={activeWorkspace?.id === ws.id} index={i}
                  onSwitch={() => handleSwitch(ws.id)} onEdit={() => setEditingId(ws.id)} onDelete={() => handleDelete(ws.id)} />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
