import { useState, useEffect, useCallback, useRef } from "react";
import {
  getNotifications,
  createNotification,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
  type ApiNotification,
} from "../api";
import { supabase } from "../supabase";

export type { ApiNotification as AppNotification };

/**
 * dispatchNotification
 * Creates a notification in the DB (cross-device).
 * Falls back silently if the API call fails — non-critical.
 */
export async function dispatchNotification(data: {
  id?: string;         // optional — ignored (DB generates its own id)
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
  } catch {
    // Non-critical — swallow errors silently
  }
}

/**
 * useNotifications
 * Fetches notifications from the API (DB-backed, cross-device).
 * Subscribes to Supabase realtime for instant updates across devices.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const fetchedRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Not logged in yet or API unavailable — silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    load();
  }, [load]);

  // Supabase realtime — refresh when notifications table changes for this user
  useEffect(() => {
    const channel = supabase
      .channel("notifications:realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications" },
        () => { load(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  const markAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      load(); // revert on error
    }
  }, [load]);

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      load();
    }
  }, [load]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    setUnreadCount(0);
    try {
      await clearAllNotifications();
    } catch {
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
