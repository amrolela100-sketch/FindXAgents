import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  generateOutreach, updateOutreach, sendOutreach, toastError,
} from "../lib/api";
import { useLang } from "../lib/lang-context";
import type { Lead, Outreach } from "../lib/types";
import {
  Send, RefreshCw, Loader2, Check, Edit2, Globe,
  MailCheck, MailX, CheckCircle2, XCircle, AlertTriangle, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SPRING } from "@/lib/motion";

interface OutreachPanelProps {
  lead: Lead;
  outreaches: Outreach[];
  onUpdate: () => void;
}

const LANG_OPTIONS = [
  { value: "ar", label: "🇸🇦 Arabic" },
  { value: "en", label: "🇬🇧 English" },
  { value: "nl", label: "🇳🇱 Dutch" },
  { value: "fr", label: "🇫🇷 French" },
  { value: "es", label: "🇪🇸 Spanish" },
  { value: "de", label: "🇩🇪 German" },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
function OutreachStatusBadge({ status }: { status: Outreach["status"] }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string }> = {
    draft:            { label: "Draft",            color: "text-text-muted",  bg: "bg-glass-raised",  border: "border-glass-border" },
    pending_approval: { label: "Pending Review",   color: "text-warning",     bg: "bg-warning/10",    border: "border-warning/20"   },
    approved:         { label: "Approved",          color: "text-info",        bg: "bg-info/10",       border: "border-info/20"      },
    sent:             { label: "Sent",              color: "text-success",     bg: "bg-success/10",    border: "border-success/20"   },
    saved:            { label: "Saved",             color: "text-text-muted",  bg: "bg-glass-raised",  border: "border-glass-border" },
    opened:           { label: "Opened",            color: "text-primary",     bg: "bg-primary/10",    border: "border-primary/20"   },
    replied:          { label: "Replied",           color: "text-success",     bg: "bg-success/10",    border: "border-success/20"   },
    bounced:          { label: "Bounced",           color: "text-error",       bg: "bg-error/10",      border: "border-error/20"     },
    failed:           { label: "Failed",            color: "text-error",       bg: "bg-error/10",      border: "border-error/20"     },
  };
  const s = map[status] ?? map.draft;
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
      s.color, s.bg, s.border,
    )}>
      {s.label}
    </span>
  );
}

// ─── Pending Approval Card ────────────────────────────────────────────────────
function PendingApprovalCard({
  outreach, leadId, onUpdate,
}: {
  outreach: Outreach;
  leadId: string;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing]     = useState(false);
  const [editSubject, setEditSubject] = useState(outreach.subject);
  const [editBody, setEditBody]       = useState(outreach.body);
  const [approving, setApproving]     = useState(false);
  const [rejecting, setRejecting]     = useState(false);
  const [showReject, setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  async function handleApprove() {
    setApproving(true);
    try {
      // If editing, save edits first
      if (isEditing) {
        await updateOutreach(outreach.id, { subject: editSubject, body: editBody });
        setIsEditing(false);
      }
      // Set status → approved, then send
      await updateOutreach(outreach.id, { status: "approved" });
      await sendOutreach(leadId, outreach.id);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to approve & send");
    } finally {
      setApproving(false);
    }
  }

  async function handleEditApprove() {
    setApproving(true);
    try {
      await updateOutreach(outreach.id, { subject: editSubject, body: editBody, status: "approved" });
      await sendOutreach(leadId, outreach.id);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to save & send");
    } finally {
      setApproving(false);
    }
  }

  async function handleReject() {
    setRejecting(true);
    try {
      await updateOutreach(outreach.id, { status: "draft" });
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to reject");
    } finally {
      setRejecting(false);
      setShowReject(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING}
      className="rounded-xl border border-warning/30 bg-warning/5 overflow-hidden"
    >
      {/* Alert header */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-warning/10 border-b border-warning/20">
        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
        <span className="text-xs font-bold text-warning uppercase tracking-wider">
          Pending your review
        </span>
        <OutreachStatusBadge status="pending_approval" />
      </div>

      <div className="p-4 space-y-3">
        {/* Subject */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Subject</p>
          {isEditing ? (
            <input
              value={editSubject}
              onChange={e => setEditSubject(e.target.value)}
              className="w-full h-9 bg-surface border border-glass-border rounded-lg px-3 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          ) : (
            <p className="text-sm font-semibold text-text">{outreach.subject}</p>
          )}
        </div>

        {/* Body */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">Email body</p>
          {isEditing ? (
            <textarea
              value={editBody}
              onChange={e => setEditBody(e.target.value)}
              rows={7}
              className="w-full bg-surface border border-glass-border rounded-lg px-3 py-2 text-xs text-text resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          ) : (
            <div className="rounded-lg bg-glass border border-glass-border px-3 py-2 max-h-40 overflow-y-auto">
              <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap">
                {outreach.body}
              </p>
            </div>
          )}
        </div>

        {/* Reject reason (expanded) */}
        <AnimatePresence>
          {showReject && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={SPRING}
              className="overflow-hidden"
            >
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Optional: reason for rejection…"
                className="w-full bg-surface border border-glass-border rounded-lg px-3 py-2 text-xs text-text resize-none focus:outline-none focus:ring-1 focus:ring-error/50"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {!isEditing ? (
            <>
              {/* Approve & Send */}
              <button
                onClick={handleApprove}
                disabled={approving || rejecting}
                className="btn btn-primary flex-1 h-9 text-xs font-bold gap-1.5 shadow-glow-brand disabled:opacity-60"
              >
                {approving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <MailCheck className="w-3.5 h-3.5" />
                }
                Approve & Send
              </button>

              {/* Edit toggle */}
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-outline h-9 px-3 text-xs font-bold gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>

              {/* Reject */}
              {!showReject ? (
                <button
                  onClick={() => setShowReject(true)}
                  className="btn btn-ghost h-9 px-3 text-xs font-bold text-error hover:bg-error/10 gap-1.5"
                >
                  <MailX className="w-3.5 h-3.5" />
                  Reject
                </button>
              ) : (
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleReject}
                    disabled={rejecting}
                    className="btn flex-1 h-9 text-xs font-bold bg-error/10 text-error border border-error/30 hover:bg-error/20 gap-1.5 disabled:opacity-60"
                  >
                    {rejecting
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <XCircle className="w-3.5 h-3.5" />
                    }
                    Confirm Reject
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setRejectReason(""); }}
                    className="btn btn-ghost h-9 px-3 text-xs text-text-muted"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleEditApprove}
                disabled={approving}
                className="btn btn-primary flex-1 h-9 text-xs font-bold gap-1.5 shadow-glow-brand disabled:opacity-60"
              >
                {approving
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCircle2 className="w-3.5 h-3.5" />
                }
                Save & Send
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditSubject(outreach.subject); setEditBody(outreach.body); }}
                className="btn btn-ghost h-9 px-3 text-xs text-text-muted"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Regular outreach card ────────────────────────────────────────────────────
function OutreachCard({
  outreach, leadId, onUpdate,
}: {
  outreach: Outreach;
  leadId: string;
  onUpdate: () => void;
}) {
  const [sending, setSending]         = useState(false);
  const [editingId, setEditingId]     = useState(false);
  const [editSubject, setEditSubject] = useState(outreach.subject);
  const [editBody, setEditBody]       = useState(outreach.body);

  async function handleSend() {
    setSending(true);
    try {
      await sendOutreach(leadId, outreach.id);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to send email");
    } finally {
      setSending(false);
    }
  }

  async function handleSave() {
    try {
      await updateOutreach(outreach.id, { subject: editSubject, body: editBody });
      setEditingId(false);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to save changes");
    }
  }

  const isSent    = outreach.status === "sent" || outreach.status === "opened" || outreach.status === "replied";
  const canSend   = !isSent && outreach.status !== "failed";

  return (
    <div className="rounded-xl bg-glass border border-glass-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <OutreachStatusBadge status={outreach.status} />
            <span className="text-[10px] text-text-subtle">
              {new Date(outreach.createdAt).toLocaleDateString()}
            </span>
          </div>
          {editingId ? (
            <input
              value={editSubject}
              onChange={e => setEditSubject(e.target.value)}
              className="w-full h-8 bg-surface border border-glass-border rounded-lg px-2 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          ) : (
            <p className="text-sm font-semibold text-text truncate">{outreach.subject}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {!editingId && (
            <button
              onClick={() => setEditingId(true)}
              className="btn btn-ghost p-1.5 text-text-muted hover:text-text"
              title="Edit"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          {canSend && !editingId && (
            <button
              onClick={handleSend}
              disabled={sending}
              className="btn btn-primary h-8 px-3 text-xs font-bold gap-1.5 disabled:opacity-50"
            >
              {sending
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : isSent ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />
              }
              {isSent ? "Sent" : "Send"}
            </button>
          )}
        </div>
      </div>

      {editingId ? (
        <div className="space-y-2">
          <textarea
            value={editBody}
            onChange={e => setEditBody(e.target.value)}
            rows={6}
            className="w-full bg-surface border border-glass-border rounded-lg px-3 py-2 text-xs text-text resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-primary h-8 px-3 text-xs font-bold">Save</button>
            <button onClick={() => { setEditingId(false); setEditSubject(outreach.subject); setEditBody(outreach.body); }} className="btn btn-ghost h-8 px-3 text-xs text-text-muted">Cancel</button>
          </div>
        </div>
      ) : (
        <p className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap line-clamp-4">
          {outreach.body}
        </p>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export function OutreachPanel({ lead, outreaches, onUpdate }: OutreachPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage]     = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateOutreach(lead.id, language);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to generate email");
    } finally {
      setGenerating(false);
    }
  }

  // Split pending_approval from the rest
  const pendingOutreaches = outreaches.filter(o => o.status === "pending_approval");
  const otherOutreaches   = outreaches.filter(o => o.status !== "pending_approval");

  return (
    <div className="space-y-4">
      {/* Generate controls */}
      <div className="p-4 rounded-xl bg-glass border border-glass-border space-y-3">
        <div className="flex items-center gap-3">
          <Globe className="w-4 h-4 text-text-muted shrink-0" />
          <span className="text-xs font-semibold text-text-muted">Email Language</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value as typeof language)}
            className="ms-auto h-8 bg-surface border border-glass-border rounded-lg px-2 text-xs text-text focus:outline-none focus:ring-1 focus:ring-primary/50"
          >
            {LANG_OPTIONS.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="btn btn-primary w-full h-10 text-sm font-bold gap-2 shadow-glow-brand disabled:opacity-60"
        >
          {generating
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
            : <><RefreshCw className="w-4 h-4" /> {outreaches.length > 0 ? "Regenerate Email" : "Generate Email"}</>
          }
        </button>
      </div>

      {outreaches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-subtle">
          <Eye className="w-8 h-8 opacity-20" />
          <p className="text-sm">No emails generated yet.</p>
          <p className="text-xs">Click "Generate Email" above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending approval first — prominent */}
          {pendingOutreaches.map(o => (
            <PendingApprovalCard key={o.id} outreach={o} leadId={lead.id} onUpdate={onUpdate} />
          ))}
          {/* Rest */}
          {otherOutreaches.map(o => (
            <OutreachCard key={o.id} outreach={o} leadId={lead.id} onUpdate={onUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}
