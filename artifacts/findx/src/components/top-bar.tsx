import { useTheme } from "../lib/theme-context";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";
import { Sun, Moon, Globe, Bell, LogOut } from "lucide-react";
import { useState } from "react";

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

  const initial = (user?.email ?? "U")[0].toUpperCase();

  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between h-14 px-5 gap-4"
      style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {/* Left: Page title */}
      <div className="flex items-center gap-3 min-w-0">
        {title && (
          <div className="min-w-0">
            <h1
              className="text-sm font-semibold truncate"
              style={{ color: "var(--text)" }}
            >
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
          {isDark
            ? <Sun className="w-4 h-4" />
            : <Moon className="w-4 h-4" />
          }
        </button>

        {/* Notifications */}
        <button className="btn btn-ghost px-2 py-1.5 relative">
          <Bell className="w-4 h-4" />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "var(--brand)" }}
          />
        </button>

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all hover:opacity-80"
            style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}
          >
            {initial}
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setUserMenuOpen(false)}
              />
              <div
                className={`absolute ${isRtl ? "left-0" : "right-0"} top-9 w-52 z-20 rounded-xl overflow-hidden animate-slide-up`}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                }}
              >
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                    {user?.email}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--text-subtle)" }}>
                    Free plan
                  </p>
                </div>
                <button
                  onClick={() => { logout(); setUserMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors hover:bg-[var(--bg-subtle)]"
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
