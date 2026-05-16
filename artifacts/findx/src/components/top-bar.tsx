import { useTheme } from "../lib/theme-context";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";
import { Sun, Moon, Globe, Bell, LogOut, CheckCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "../lib/hooks/use-notifications";
import { cn } from "@/lib/utils";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function TopBar({ title, subtitle, actions }: TopBarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang, isRtl } = useLang();
  const { user, logout } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();

  const initial = (user?.email ?? "U")[0].toUpperCase();

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    return d.toLocaleDateString();
  }

  const dropdownClasses = "absolute top-12 w-80 z-20 rounded-2xl overflow-hidden bg-glass-overlay backdrop-blur-glass border border-glass-border-strong shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-5 gap-4 bg-glass backdrop-blur-glass border-b border-glass-border">
      {/* Left: Page title */}
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate text-text">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs truncate text-text-muted">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Right: actions + controls */}
      <div className="flex items-center gap-1">
        {actions}

        {/* Lang toggle */}
        <button
          onClick={toggleLang}
          className="btn btn-ghost px-2.5 py-1.5 text-xs font-semibold gap-1.5 text-text-muted hover:text-text"
          title="Switch language"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang.toUpperCase()}
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost px-2 py-1.5 text-text-muted hover:text-text"
          title="Toggle theme"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* ── Notifications Bell ── */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setUserMenuOpen(false);
              if (!notifOpen && unreadCount > 0) markAllRead();
            }}
            className="btn btn-ghost px-2 py-1.5 relative text-text-muted hover:text-text"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 bg-primary shadow-glow-brand">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className={cn(dropdownClasses, isRtl ? "left-0" : "right-0")}>
                <div className="flex items-center justify-between px-4 py-3 border-b border-glass-border bg-glass-raised/50">
                  <span className="text-sm font-semibold text-text">
                    Notifications
                  </span>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <>
                        <button onClick={markAllRead} title="Mark all read" className="btn btn-ghost px-1.5 py-1 text-text-muted hover:text-text">
                          <CheckCheck className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={clearAll} title="Clear all" className="btn btn-ghost px-1.5 py-1 text-text-muted hover:text-danger">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto max-h-72 divide-y divide-glass-border">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell className="w-7 h-7 text-text-subtle opacity-20" />
                      <p className="text-xs text-text-subtle">No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          "flex gap-3 px-4 py-3 transition-colors hover:bg-glass-raised",
                          !n.read && "bg-primary/5"
                        )}
                      >
                        <span className="mt-0.5 text-base flex-shrink-0">
                          {n.type === "pipeline_complete" ? "✅" : "❌"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate text-text">{n.title}</p>
                          <p className="text-xs mt-0.5 text-text-muted leading-snug">{n.body}</p>
                          <p className="text-[10px] mt-1 text-text-subtle uppercase tracking-wider">{formatTime(n.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User menu */}
        <div className="relative ms-1">
          <button
            onClick={() => { setUserMenuOpen((v) => !v); setNotifOpen(false); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all hover:scale-105 bg-gradient-to-br from-primary to-orange-600 text-white shadow-glow-brand"
          >
            {initial}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className={cn("absolute top-12 w-52 z-20 rounded-2xl overflow-hidden bg-glass-overlay backdrop-blur-glass border border-glass-border-strong shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200", isRtl ? "left-0" : "right-0")}>
                <div className="px-4 py-3 border-b border-glass-border bg-glass-raised/50">
                  <p className="text-xs font-medium truncate text-text">{user?.email}</p>
                  <p className="text-[10px] mt-0.5 text-primary font-bold uppercase tracking-widest">Free plan</p>
                </div>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-danger/10 text-text-muted hover:text-danger"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
