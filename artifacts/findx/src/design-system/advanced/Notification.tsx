/**
 * FindX Design System — Notification System
 * 
 * A comprehensive notification/toast system with stacking,
 * progress tracking, and action support.
 * 
 * Design Tokens Used:
 * - --findx-text-primary/secondary (text colors)
 * - --findx-bg-elevated (toast background)
 * - --findx-surface-glass (glass variant)
 * - --findx-feedback-success/warning/danger/info (semantic colors)
 * - --findx-radius-lg (border radius)
 * - --findx-shadow-lg (elevation)
 * - --findx-duration-normal (transitions)
 * - --findx-z-toast (z-index)
 */

import * as React from "react";
import { createContext, useContext, useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type NotificationType = "success" | "error" | "warning" | "info" | "loading" | "default";

export interface NotificationAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description?: string;
  duration?: number; // Auto dismiss in ms, 0 = persistent
  action?: NotificationAction;
  progress?: { current: number; total: number };
  onClose?: () => void;
  createdAt: number;
}

export interface NotificationOptions {
  type?: NotificationType;
  title: string;
  description?: string;
  duration?: number;
  action?: NotificationAction;
  progress?: { current: number; total: number };
}

export interface NotificationContextValue {
  notifications: Notification[];
  add: (options: NotificationOptions) => string;
  remove: (id: string) => void;
  clear: () => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  loading: (title: string, description?: string) => string;
  updateProgress: (id: string, current: number, total: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

const NotificationContext = createContext<NotificationContextValue | null>(null);

// ═══════════════════════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const icons: Record<NotificationType, React.ReactNode> = {
  success: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  loading: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5 animate-spin" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fillOpacity="0.75" />
    </svg>
  ),
  default: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface ToastProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ notification, onRemove }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [isLeaving, setIsLeaving] = React.useState(false);

  // Entrance animation
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Auto dismiss
  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => onRemove(notification.id), 200);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onRemove]);

  // Handle close
  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(notification.id);
      notification.onClose?.();
    }, 200);
  };

  // Type-based colors
  const getTypeStyles = (): { bg: string; border: string; icon: string; progress: string } => {
    switch (notification.type) {
      case "success":
        return {
          bg: "var(--findx-feedback-success-bg)",
          border: "var(--findx-feedback-success-border)",
          icon: "var(--findx-feedback-success)",
          progress: "var(--findx-feedback-success)",
        };
      case "error":
        return {
          bg: "var(--findx-feedback-danger-bg)",
          border: "var(--findx-feedback-danger-border)",
          icon: "var(--findx-feedback-danger)",
          progress: "var(--findx-feedback-danger)",
        };
      case "warning":
        return {
          bg: "var(--findx-feedback-warning-bg)",
          border: "var(--findx-feedback-warning-border)",
          icon: "var(--findx-feedback-warning)",
          progress: "var(--findx-feedback-warning)",
        };
      case "info":
        return {
          bg: "var(--findx-feedback-info-bg)",
          border: "var(--findx-feedback-info-border)",
          icon: "var(--findx-feedback-info)",
          progress: "var(--findx-feedback-info)",
        };
      case "loading":
        return {
          bg: "var(--findx-bg-elevated)",
          border: "var(--findx-border-default)",
          icon: "var(--findx-accent)",
          progress: "var(--findx-accent)",
        };
      default:
        return {
          bg: "var(--findx-bg-elevated)",
          border: "var(--findx-border-default)",
          icon: "var(--findx-text-secondary)",
          progress: "var(--findx-accent)",
        };
    }
  };

  const styles = getTypeStyles();

  // Progress percentage
  const progressPercent = notification.progress
    ? (notification.progress.current / notification.progress.total) * 100
    : 0;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "relative w-[360px] max-w-[calc(100vw-32px)]",
        "rounded-[var(--findx-radius-lg)] overflow-hidden",
        "bg-[var(--findx-bg-elevated)]",
        "border shadow-[var(--findx-shadow-lg)]",
        "transition-all duration-[var(--findx-duration-normal)]",
        styles.border,
        isVisible && !isLeaving
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0"
      )}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Icon */}
        <div
          className="shrink-0 mt-0.5"
          style={{ color: styles.icon }}
        >
          {icons[notification.type]}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--findx-text-primary)]">
            {notification.title}
          </p>
          {notification.description && (
            <p className="mt-1 text-sm text-[var(--findx-text-secondary)]">
              {notification.description}
            </p>
          )}

          {/* Action */}
          {notification.action && (
            <button
              type="button"
              onClick={notification.action.onClick}
              className={cn(
                "mt-3 text-sm font-medium",
                notification.action.variant === "primary" && "text-[var(--findx-accent)]",
                notification.action.variant === "secondary" && "text-[var(--findx-text-secondary)]",
                !notification.action.variant && "text-[var(--findx-accent)]",
                "hover:underline"
              )}
            >
              {notification.action.label}
            </button>
          )}
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className={cn(
            "shrink-0 p-1 rounded-[var(--findx-radius-sm)]",
            "text-[var(--findx-text-muted)]",
            "hover:bg-[var(--findx-interactive-hover)]",
            "hover:text-[var(--findx-text-primary)]",
            "transition-colors duration-[var(--findx-duration-fast)]"
          )}
          aria-label="Dismiss notification"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      {(notification.progress || (notification.duration && notification.duration > 0)) && (
        <div
          className="h-1 w-full"
          style={{ backgroundColor: "var(--findx-bg-inset)" }}
        >
          <div
            className="h-full transition-all duration-[var(--findx-duration-normal)]"
            style={{
              width: notification.progress ? `${progressPercent}%` : "100%",
              backgroundColor: styles.progress,
            }}
          />
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// TOAST CONTAINER
// ═══════════════════════════════════════════════════════════════════════════════

interface ToastContainerProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
}

const ToastContainer: React.FC<ToastContainerProps> = ({
  notifications,
  onRemove,
  position = "top-right",
}) => {
  const getPositionClasses = () => {
    switch (position) {
      case "top-right":
        return "top-4 right-4 flex-col items-end";
      case "top-left":
        return "top-4 left-4 flex-col items-start";
      case "bottom-right":
        return "bottom-4 right-4 flex-col-reverse items-end";
      case "bottom-left":
        return "bottom-4 left-4 flex-col-reverse items-start";
      case "top-center":
        return "top-4 left-1/2 -translate-x-1/2 flex-col items-center";
      case "bottom-center":
        return "bottom-4 left-1/2 -translate-x-1/2 flex-col-reverse items-center";
      default:
        return "top-4 right-4 flex-col items-end";
    }
  };

  return (
    <div
      className={cn(
        "fixed z-[var(--findx-z-toast)] flex gap-3 p-4",
        "pointer-events-none",
        getPositionClasses()
      )}
      aria-label="Notifications"
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <Toast notification={notification} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

interface NotificationProviderProps {
  children: React.ReactNode;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left" | "top-center" | "bottom-center";
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  position = "top-right",
  maxNotifications = 5,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Generate unique ID
  const generateId = () => `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Add notification
  const add = useCallback((options: NotificationOptions): string => {
    const id = generateId();
    const notification: Notification = {
      id,
      type: options.type || "default",
      title: options.title,
      description: options.description,
      duration: options.duration ?? 5000, // Default 5 seconds
      action: options.action,
      progress: options.progress,
      createdAt: Date.now(),
    };

    setNotifications((prev) => {
      const updated = [notification, ...prev];
      // Limit max notifications
      return updated.slice(0, maxNotifications);
    });

    return id;
  }, [maxNotifications]);

  // Remove notification
  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, description?: string) => 
    add({ type: "success", title, description }), [add]);

  const error = useCallback((title: string, description?: string) => 
    add({ type: "error", title, description, duration: 8000 }), [add]);

  const warning = useCallback((title: string, description?: string) => 
    add({ type: "warning", title, description }), [add]);

  const info = useCallback((title: string, description?: string) => 
    add({ type: "info", title, description }), [add]);

  const loading = useCallback((title: string, description?: string) => 
    add({ type: "loading", title, description, duration: 0 }), [add]);

  // Update progress for loading notification
  const updateProgress = useCallback((id: string, current: number, total: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, progress: { current, total } } : n
      )
    );
  }, []);

  const contextValue: NotificationContextValue = {
    notifications,
    add,
    remove,
    clear,
    success,
    error,
    warning,
    info,
    loading,
    updateProgress,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        notifications={notifications}
        onRemove={remove}
        position={position}
      />
    </NotificationContext.Provider>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { Toast, ToastContainer };
export type {
  Notification,
  NotificationOptions,
  NotificationType,
  NotificationAction,
  NotificationContextValue,
  NotificationProviderProps,
};