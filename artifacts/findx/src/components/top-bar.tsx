import { useTheme } from "../lib/theme-context";
import { useLang } from "../lib/lang-context";
import { useAuth } from "../lib/auth-context";

interface TopBarProps {
  title?: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang } = useLang();
  const { user, logout } = useAuth();

  return (
    <header className="flex justify-between items-center w-full px-margin-mobile md:px-margin-desktop h-16 z-50 bg-surface border-b border-outline-variant sticky top-0">
      {/* Left: Search */}
      <div className="flex items-center gap-6">
        <div className="flex items-center w-64 relative group">
          <span className="material-symbols-outlined absolute left-0 text-on-surface-variant group-focus-within:text-primary transition-colors">
            search
          </span>
          <input
            className="w-full bg-transparent border-none border-b border-outline-variant/50 focus:ring-0 focus:border-primary pl-8 py-2 font-body-md text-body-md text-on-surface placeholder-on-surface-variant transition-colors outline-none"
            placeholder={lang === "ar" ? "بحث في الشبكة..." : "Query intelligence network..."}
            type="text"
          />
        </div>
      </div>

      {/* Center: Page title (optional) */}
      {title && (
        <div className="hidden md:block text-center">
          <h2 className="font-headline-sm text-headline-sm text-on-surface">{title}</h2>
          {subtitle && <p className="font-body-md text-body-md text-on-surface-variant text-sm">{subtitle}</p>}
        </div>
      )}

      {/* Right: Controls */}
      <div className="flex items-center gap-4">
        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="text-on-surface-variant hover:text-primary transition-colors duration-200 font-label-caps text-label-caps"
          aria-label="Toggle language"
        >
          {lang === "en" ? "EN" : "AR"}
        </button>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center"
          aria-label="Toggle theme"
        >
          <span className="material-symbols-outlined">
            {isDark ? "light_mode" : "dark_mode"}
          </span>
        </button>

        {/* Notifications */}
        <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 flex items-center">
          <span className="material-symbols-outlined">notifications</span>
        </button>

        {/* User Avatar + Logout */}
        <div className="relative group">
          <button className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-caps text-label-caps">
            {(user?.email ?? "U")[0].toUpperCase()}
          </button>
          {/* Dropdown */}
          <div className="absolute right-0 top-10 w-48 bg-surface-container border border-outline-variant rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="px-4 py-3 border-b border-outline-variant">
              <p className="font-label-caps text-label-caps text-on-surface truncate">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-4 py-3 text-on-surface-variant hover:bg-surface-container-high hover:text-primary transition-colors font-body-md text-body-md rounded-b-xl"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              {lang === "ar" ? "تسجيل الخروج" : "Sign out"}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
