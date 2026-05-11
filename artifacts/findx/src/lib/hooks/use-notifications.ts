import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "findx_notifications_v1";
const MAX_NOTIFICATIONS = 30;

export interface AppNotification {
  id: string;           // unique — matches runId
  type: "pipeline_complete" | "pipeline_failed";
  title: string;        // e.g. "Pipeline complete"
  body: string;         // e.g. "Found 8 leads for \"marketing agencies\""
  query: string;
  leadsFound?: number;
  emailsDrafted?: number;
  createdAt: string;    // ISO timestamp
  read: boolean;
}

function loadFromStorage(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToStorage(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications.slice(0, MAX_NOTIFICATIONS)));
  } catch { /* ignore quota errors */ }
}

/**
 * Global event bus — components dispatch events to add notifications
 * without needing a shared store or context.
 */
const NOTIFY_EVENT = "findx:notification";

export function dispatchNotification(n: Omit<AppNotification, "read">) {
  window.dispatchEvent(
    new CustomEvent(NOTIFY_EVENT, { detail: { ...n, read: false } })
  );
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>(loadFromStorage);

  // Listen for new notifications dispatched from anywhere in the app
  useEffect(() => {
    function onNotify(e: Event) {
      const notification = (e as CustomEvent<AppNotification>).detail;
      setNotifications((prev) => {
        // Deduplicate by id
        if (prev.some((n) => n.id === notification.id)) return prev;
        const updated = [notification, ...prev].slice(0, MAX_NOTIFICATIONS);
        saveToStorage(updated);
        return updated;
      });
    }
    window.addEventListener(NOTIFY_EVENT, onNotify);
    return () => window.removeEventListener(NOTIFY_EVENT, onNotify);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, read: true }));
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => n.id === id ? { ...n, read: true } : n);
      saveToStorage(updated);
      return updated;
    });
  }, []);

  const clearAll = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNotifications([]);
  }, []);

  return { notifications, unreadCount, markAllRead, markRead, clearAll };
}
