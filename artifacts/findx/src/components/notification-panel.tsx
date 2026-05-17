import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell, Zap, AlertCircle, Search, Users,
  CheckCheck, Trash2, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/lib/hooks/use-notifications";
import type { ApiNotification } from "@/lib/api";
import { SPRING } from "@/lib/motion";

// ─── Icon by notification type ────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  const map: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
    pipeline_complete: { icon: Zap,          color: "text-success",  bg: "bg-success/10" },
    pipeline_failed:  { icon: AlertCircle,   color: "text-error",    bg: "bg-error/10"   },
    lead_analyzed:    { icon: Search,        color: "text-info",     bg: "bg-info/10"    },
    workspace_invite: { icon: Users,         color: "text-primary",  bg: "bg-primary/10" },
  };
  const entry = map[type] ?? { icon: Bell, color: "text-text-muted", bg: "bg-glass-raised" };
  const Icon = entry.icon;
  return (
    <div className={cn(
      "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
      entry.bg,
    )}>
      <Icon className={cn("w-4 h-4", entry.color)} />
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

function NotifRow({
  n,
  onMarkRead,
}: {
  n: ApiNotification;
  onMarkRead: (id: string) => void;
}) {
  function formatTime(iso: string) {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)   return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString();
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={SPRING}
      onClick={() => !n.read && onMarkRead(n.id)}
      className={cn(
        "flex gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-glass-raised group",
        !n.read && "bg-primary/5 border-s-2 border-primary",
      )}
    >
      <NotifIcon type={n.type} />
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-xs truncate text-text",
          !n.read && "font-semibold",
        )}>
          {n.title}
        </p>
        <p className="text-xs mt-0.5 text-text-muted leading-snug line-clamp-2">
          {n.body}
        </p>
        <p className="text-[10px] mt-1 text-text-subtle uppercase tracking-wider font-medium">
          {formatTime(n.createdAt)}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
}

export function NotificationPanel({ open, onClose, align = "right" }: NotificationPanelProps) {
  const { notifications, unreadCount, markAllRead, markRead, clearAll } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={SPRING}
          className={cn(
            "absolute top-12 z-30 w-80 rounded-2xl overflow-hidden",
            "bg-glass-overlay backdrop-blur-glass border border-glass-border-strong shadow-2xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-glass-raised/50">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-text">Notifications</span>
              {unreadCount > 0 && (
                <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-white text-[9px] font-bold flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {notifications.length > 0 && (
                <>
                  <button
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="btn btn-ghost px-1.5 py-1 text-text-muted hover:text-text"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={clearAll}
                    title="Clear all"
                    className="btn btn-ghost px-1.5 py-1 text-text-muted hover:text-error"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              <button
                onClick={onClose}
                className="btn btn-ghost px-1.5 py-1 text-text-muted hover:text-text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px] divide-y divide-glass-border">
            <AnimatePresence initial={false}>
              {notifications.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-12 gap-3"
                >
                  <div className="w-12 h-12 rounded-2xl bg-glass border border-glass-border flex items-center justify-center">
                    <Bell className="w-5 h-5 text-text-subtle opacity-40" />
                  </div>
                  <p className="text-xs text-text-subtle">No notifications yet</p>
                </motion.div>
              ) : (
                notifications.map(n => (
                  <NotifRow key={n.id} n={n} onMarkRead={markRead} />
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
