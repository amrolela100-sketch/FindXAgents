import { useTheme } from "../lib/theme-context";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";
import { Sun, Moon, Globe, Bell, LogOut, CheckCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "../lib/hooks/use-notifications";

interface TopBarProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const DROPDOWN_STYLE: React.CSSProperties = {
  background: "var(--glass-overlay)",
  backdropFilter: "blur(24px) saturate(200%)",
  WebkitBackdropFilter: "blur(24px) saturate(200%)",
  border: "1px solid var(--glass-border-strong)",
  boxShadow: "0 16px 48px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.10)",
};

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

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-5 gap-4 topbar-glass">
      {/* Left: Page title */}
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
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
          className="btn btn-ghost px-2.5 py-1.5 text-xs font-semibold gap-1.5"
          title="Switch language"
        >
          <Globe className="w-3.5 h-3.5" />
          {lang.toUpperCase()}
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost px-2 py-1.5"
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
            className="btn btn-ghost px-2 py-1.5 relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1 right-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5"
                style={{ background: "var(--brand)" }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div
                className={`absolute ${isRtl ? "left-0" : "right-0"} top-10 w-80 z-20 rounded-2xl overflow-hidden animate-slide-up`}
                style={DROPDOWN_STYLE}
              >
                <div
                  className="flex items-center justify-between px-4 py-3"
                  style={{ borderBottom: "1px solid var(--glass-border)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                    Notifications
                  </span>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <>
                        <button onClick={markAllRead} title="Mark all read" className="btn btn-ghost px-1.5 py-1">
                          <CheckCheck className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                        </button>
                        <button onClick={clearAll} title="Clear all" className="btn btn-ghost px-1.5 py-1">
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--text-muted)" }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="overflow-y-auto max-h-72">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <Bell className="w-7 h-7 opacity-20" style={{ color: "var(--text-muted)" }} />
                      <p className="text-xs" style={{ color: "var(--text-subtle)" }}>No notifications yet</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="flex gap-3 px-4 py-3 transition-colors"
                        style={{
                          borderBottom: "1px solid var(--glass-border)",
                          background: n.read ? undefined : "var(--brand-subtle)",
                        }}
                      >
                        <span className="mt-0.5 text-base flex-shrink-0">
                          {n.type === "pipeline_complete" ? "✅" : "❌"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold truncate" style={{ color: "var(--text)" }}>{n.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{n.body}</p>
                          <p className="text-[10px] mt-1" style={{ color: "var(--text-subtle)" }}>{formatTime(n.createdAt)}</p>
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
        <div className="relative ml-1">
          <button
            onClick={() => { setUserMenuOpen((v) => !v); setNotifOpen(false); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--brand) 0%, #F97316 100%)",
              color: "#fff",
              boxShadow: "0 2px 8px var(--brand-glow)",
            }}
          >
            {initial}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div
                className={`absolute ${isRtl ? "left-0" : "right-0"} top-10 w-52 z-20 rounded-2xl overflow-hidden animate-slide-up`}
                style={DROPDOWN_STYLE}
              >
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>{user?.email}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>Free plan</p>
                </div>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-[var(--glass-raised)]"
                  style={{ color: "var(--text-muted)" }}
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
