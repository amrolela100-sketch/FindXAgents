/**
 * SettingsPage — Team Members Tab
 * Invite, manage roles, and remove workspace members.
 *
 * @module SettingsPage/TeamTab
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, UserPlus, Loader2, Trash2, Shield,
  Crown, User as UserIcon, ChevronDown, CheckCircle, AlertCircle
} from "lucide-react";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, Alert } from "./shared";
import { supabase } from "@/lib/supabase";
import { useWorkspace } from "@/lib/workspace-context";

interface Member {
  userId:   string;
  email:    string;
  name:     string | null;
  avatarUrl?: string | null;
  role:     "owner" | "admin" | "member";
  joinedAt: string;
}

const BASE = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "");

async function authFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers: Record<string, string> = {
    ...(init?.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Error ${res.status}`);
  }
  return res.json();
}

const ROLE_LABELS: Record<string, { label: string; icon: React.FC<any>; color: string }> = {
  owner:  { label: "Owner",  icon: Crown,      color: "#f59e0b" },
  admin:  { label: "Admin",  icon: Shield,     color: "#3b82f6" },
  member: { label: "Member", icon: UserIcon,   color: "var(--text-muted)" },
};

export function TeamTab() {
  const { activeWorkspace } = useWorkspace();
  const workspaceId = activeWorkspace?.id;

  const [members,      setMembers]      = useState<Member[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [inviteEmail,  setInviteEmail]  = useState("");
  const [inviteRole,   setInviteRole]   = useState<"admin" | "member">("member");
  const [inviting,     setInviting]     = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [inviteError,  setInviteError]  = useState<string | null>(null);
  const [removingId,   setRemovingId]   = useState<string | null>(null);

  // Current user info
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true); setError(null);
    try {
      const data = await authFetch(`/workspaces/${workspaceId}/members`);
      setMembers(data.members ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !inviteEmail) return;
    setInviting(true); setInviteError(null); setInviteResult(null);
    try {
      const data = await authFetch(`/workspaces/${workspaceId}/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteResult(data.message);
      setInviteEmail("");
      fetchMembers();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(userId: string, newRole: "admin" | "member") {
    if (!workspaceId) return;
    try {
      await authFetch(`/workspaces/${workspaceId}/members/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      setMembers(prev => prev.map(m => m.userId === userId ? { ...m, role: newRole } : m));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    }
  }

  async function handleRemove(userId: string) {
    if (!workspaceId) return;
    setRemovingId(userId);
    try {
      await authFetch(`/workspaces/${workspaceId}/members/${userId}`, { method: "DELETE" });
      setMembers(prev => prev.filter(m => m.userId !== userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    } finally {
      setRemovingId(null);
    }
  }

  const currentMember = members.find(m => m.userId === currentUserId);
  const canManage = currentMember?.role === "owner" || currentMember?.role === "admin";

  return (
    <motion.div custom={3} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">

      {/* ── Invite Member ─────────────────────────────────────────────────── */}
      {canManage && (
        <SectionCard>
          <SectionHeader icon={UserPlus} title="Invite Team Member" subtitle="Add a FindX user to your workspace by email" accent="var(--color-primary)" />
          <div className="p-5">
            {inviteResult && <Alert type="success" message={inviteResult} onClose={() => setInviteResult(null)} />}
            {inviteError  && <Alert type="error"   message={inviteError}  onClose={() => setInviteError(null)} />}

            <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 mt-3">
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="input flex-1 text-[13px]"
              />

              {/* Role selector */}
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as "admin" | "member")}
                  className="input text-[13px] pr-8 appearance-none"
                  style={{ minWidth: 120 }}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none" style={{ color: "var(--text-muted)" }} />
              </div>

              <button
                type="submit"
                disabled={inviting || !inviteEmail}
                className="btn text-[13px] px-5 py-2.5 font-semibold gap-2"
                style={{ background: "var(--color-primary)", color: "#fff", opacity: inviting ? 0.7 : 1 }}
              >
                {inviting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Inviting…</>
                  : <><UserPlus className="w-4 h-4" strokeWidth={1.8} /> Invite</>
                }
              </button>
            </form>

            <p className="text-[11px] mt-2.5" style={{ color: "var(--text-subtle)" }}>
              The user must already have a FindX account. They'll be added immediately.
            </p>
          </div>
        </SectionCard>
      )}

      {/* ── Members List ──────────────────────────────────────────────────── */}
      <SectionCard>
        <SectionHeader
          icon={Users}
          title="Team Members"
          subtitle={`${members.length} member${members.length !== 1 ? "s" : ""} in this workspace`}
          accent="var(--color-primary)"
        />
        <div className="p-5">
          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: "var(--text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">Loading members…</span>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--text-subtle)" }} strokeWidth={1.5} />
              <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>No members yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {members.map(member => {
                const roleInfo = ROLE_LABELS[member.role] ?? ROLE_LABELS.member;
                const RoleIcon = roleInfo.icon;
                const isCurrentUser = member.userId === currentUserId;
                const isOwner = member.role === "owner";
                const isRemoving = removingId === member.userId;

                return (
                  <motion.div
                    key={member.userId}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl"
                    style={{ background: "var(--glass)", border: "1px solid var(--glass-border)" }}
                  >
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold flex-shrink-0"
                      style={{ background: `${roleInfo.color}22`, color: roleInfo.color, border: `1px solid ${roleInfo.color}44` }}>
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold truncate" style={{ color: "var(--text)" }}>
                          {member.name || member.email}
                        </span>
                        {isCurrentUser && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                            style={{ background: "rgba(217,119,6,0.12)", color: "var(--color-primary)" }}>
                            You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] truncate" style={{ color: "var(--text-muted)" }}>{member.email}</span>
                    </div>

                    {/* Role badge / selector */}
                    {!isOwner && canManage && !isCurrentUser ? (
                      <div className="relative">
                        <select
                          value={member.role}
                          onChange={e => handleChangeRole(member.userId, e.target.value as "admin" | "member")}
                          className="text-[11px] font-bold px-2 py-1 rounded-lg appearance-none pr-5"
                          style={{
                            background: `${roleInfo.color}18`,
                            color: roleInfo.color,
                            border: `1px solid ${roleInfo.color}30`,
                          }}
                        >
                          <option value="admin">Admin</option>
                          <option value="member">Member</option>
                        </select>
                        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{ color: roleInfo.color }} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
                        style={{ background: `${roleInfo.color}18`, color: roleInfo.color, border: `1px solid ${roleInfo.color}30` }}>
                        <RoleIcon className="w-3 h-3" />
                        {roleInfo.label}
                      </div>
                    )}

                    {/* Remove button */}
                    {!isOwner && (canManage || isCurrentUser) && (
                      <button
                        onClick={() => handleRemove(member.userId)}
                        disabled={isRemoving}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: "var(--text-subtle)" }}
                        title={isCurrentUser ? "Leave workspace" : "Remove member"}
                      >
                        {isRemoving
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />
                        }
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </SectionCard>
    </motion.div>
  );
}
