import { useTheme } from "../lib/theme-context";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";
import { Sun, Moon, Globe, Bell, BellRing, LogOut } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "../lib/hooks/use-notifications";
import { NotificationPanel } from "./notification-panel";
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
  const [userMenuOpen, setUserMenuOpen]   = useState(false);
  const [notifOpen,    setNotifOpen]      = useState(false);

  const { unreadCount } = useNotifications();

  const initial = (user?.email ?? "U")[0].toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-5 gap-4 bg-glass backdrop-blur-glass border-b border-glass-border">
      {/* Left: Page title */}
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <div className="min-w-0">
            <h1 className="text-sm font-semibold truncate text-text">{title}</h1>
            {subtitle && (
              <p className="text-xs truncate text-text-muted">{subtitle}</p>
            )}
          </div>
        )}
      </div>

      {/* Right: controls */}
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
              setNotifOpen(v => !v);
              setUserMenuOpen(false);
            }}
            className="btn btn-ghost px-2 py-1.5 relative text-text-muted hover:text-text"
            title="Notifications"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
          >
            {/* BellRing when there are unread notifications */}
            {unreadCount > 0
              ? <BellRing className="w-4 h-4 text-primary" />
              : <Bell className="w-4 h-4" />
            }
            {/* Badge */}
            {unreadCount > 0 && (
              <span className="absolute top-1 end-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center text-[9px] font-bold text-white px-0.5 bg-primary shadow-glow-brand">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
            align={isRtl ? "left" : "right"}
          />
        </div>

        {/* ── User menu ── */}
        <div className="relative ms-1">
          <button
            onClick={() => { setUserMenuOpen(v => !v); setNotifOpen(false); }}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all hover:scale-105 bg-gradient-to-br from-primary to-teal-600 text-white shadow-glow-brand"
            title={user?.email}
          >
            {initial}
          </button>

          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
              <div className={cn(
                "absolute top-12 w-52 z-20 rounded-2xl overflow-hidden",
                "bg-glass-overlay backdrop-blur-glass border border-glass-border-strong shadow-2xl",
                "animate-in fade-in slide-in-from-top-2 duration-200",
                isRtl ? "left-0" : "right-0",
              )}>
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
