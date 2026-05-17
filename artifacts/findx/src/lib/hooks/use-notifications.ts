import { useState, useEffect, useCallback, useRef } from "react";
import {
  getNotifications,
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  type ApiNotification,
  toastError,
} from "../api";
import { supabase } from "../supabase";

export type { ApiNotification as AppNotification };

/**
 * dispatchNotification
 * Creates a notification in the DB (cross-device).
 * Falls back silently if the API call fails — non-critical.
 */
export async function dispatchNotification(data: {
  id?: string;
  type: string;
  title: string;
  body: string;
  query?: string;
  leadsFound?: number;
  emailsDrafted?: number;
  createdAt?: string;
}) {
  try {
    await createNotification({
      type:  data.type,
      title: data.title,
      body:  data.body,
      meta: {
        query:         data.query ?? "",
        leadsFound:    data.leadsFound ?? 0,
        emailsDrafted: data.emailsDrafted ?? 0,
      },
    });
  } catch (err) {
    toastError(err, "Failed to create notification");
  }
}

/**
 * useNotifications
 *
 * FIX: Each hook instance gets a UNIQUE channel name via useRef.
 * Previously the hardcoded name "notifications:realtime" caused Supabase to
 * throw "cannot add postgres_changes callbacks after subscribe" whenever
 * two components (TopBar + NotificationPanel) both mounted this hook.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  // Unique channel name per hook instance — prevents collision when multiple
  // components call useNotifications() simultaneously.
  const channelName = useRef(
    `notifications:rt:${Math.random().toString(36).slice(2)}`
  );

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      toastError(err, "Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch — run once
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [load]);

  // Supabase realtime — unique channel per instance
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelName.current)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notifications" },
          () => { load(); }
        )
        .subscribe();
    } catch (err) {
      // Non-fatal: realtime unavailable, polling will still work
      console.warn("[useNotifications] Realtime subscription failed:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {/* ignore */});
      }
    };
  }, [load]);

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      toastError(err, "Failed to mark notifications as read");
      load();
    }
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch (err) {
      toastError(err, "Failed to mark notification as read");
      load();
    }
  }, [load]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearAllNotifications();
    } catch (err) {
      toastError(err, "Failed to clear notifications");
      load();
    }
  }, [load]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAllRead,
    markRead,
    clearAll,
    refresh: load,
  };
}
