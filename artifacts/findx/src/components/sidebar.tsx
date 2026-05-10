import { Link, useLocation } from "wouter";
import { LayoutDashboard, Settings, Zap, Bot, Kanban, LogOut, Building2, Shield, ChevronDown } from "lucide-react";
import { useAuth } from "../lib/auth-context";
import { useWorkspace } from "../lib/workspace-context";
import { useLang } from "../lib/lang-context";
import { useState } from "react";

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const [location] = useLocation();
  const { user, logout: signOut } = useAuth();
  const { workspaces, activeWorkspace, switchWorkspace } = useWorkspace();
  const { t, lang, toggleLang, isRtl } = useLang();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const ownerUnlocked = typeof window !== "undefined" && localStorage.getItem("owner_unlocked") === "true";

  const navItems = [
    { href: "/", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/agents", label: t("agents"), icon: Bot },
    { href: "/pipeline", label: t("pipeline"), icon: Kanban },
    { href: "/workspaces", label: t("workspaces"), icon: Building2 },
    { href: "/settings", label: t("settings"), icon: Settings },
  ];

  return (
    <aside className={`fixed top-0 bottom-0 w-60 bg-white border-[#E5E3D9] flex flex-col z-40 ${isRtl ? "right-0 border-l" : "left-0 border-r"}`}>
      <div className="px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="p-1.5 rounded-lg bg-[#1A1A1A]">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-serif font-bold tracking-tight text-[#1A1A1A]">FindX</span>
            <p className="text-[10px] text-[#7A756D] font-medium uppercase tracking-widest">{t("prospecting")}</p>
          </div>
        </Link>
      </div>

      {/* Active workspace pill */}
      {workspaces.length > 0 && (
        <div className="px-3 mb-2">
          <button
            onClick={() => setShowWorkspaceMenu((v) => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F7F5F0] border border-[#E5E3D9] hover:bg-[#F0EDE6] transition text-left"
          >
            <div className="w-5 h-5 rounded bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
              <Building2 className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-medium text-[#1A1A1A] truncate flex-1">
              {activeWorkspace?.name ?? t("noWorkspace")}
            </span>
            <ChevronDown className={`w-3 h-3 text-[#7A756D] transition-transform ${showWorkspaceMenu ? "rotate-180" : ""}`} />
          </button>

          {showWorkspaceMenu && workspaces.length > 1 && (
            <div className="mt-1 bg-white border border-[#E5E3D9] rounded-xl shadow-lg overflow-hidden">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => { switchWorkspace(ws.id); setShowWorkspaceMenu(false); }}
                  className={`w-full text-left px-3 py-2.5 text-xs hover:bg-[#F7F5F0] transition flex items-center gap-2 ${activeWorkspace?.id === ws.id ? "font-semibold text-[#1A1A1A]" : "text-[#7A756D]"}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${activeWorkspace?.id === ws.id ? "bg-emerald-500" : "bg-[#D4CFC5]"}`} />
                  <span className="truncate">{ws.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#BDBDB0]">{t("menu")}</p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-[#F0EDE6] text-[#1A1A1A]"
                  : "text-[#7A756D] hover:bg-[#F7F5F0] hover:text-[#1A1A1A]"
              }`}
            >
              {active && (
                <div className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#1A1A1A] ${isRtl ? "right-0 rounded-l-full" : "left-0 rounded-r-full"}`} />
              )}
              <Icon className="w-[18px] h-[18px]" />
              {label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <p className="px-3 mt-4 mb-2 text-[10px] font-semibold uppercase tracking-widest text-[#BDBDB0]">{t("admin")}</p>
            <Link
              href="/admin"
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                location === "/admin"
                  ? "bg-amber-50 text-amber-700"
                  : "text-[#7A756D] hover:bg-[#F7F5F0] hover:text-[#1A1A1A]"
              }`}
            >
              {location === "/admin" && (
                <div className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-amber-500 ${isRtl ? "right-0 rounded-l-full" : "left-0 rounded-r-full"}`} />
              )}
              <Shield className="w-[18px] h-[18px]" />
              {t("adminDashboard")}
            </Link>
          </>
        )}

        {ownerUnlocked && (
          <Link
            href="/owner"
            className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              location === "/owner"
                ? "bg-[#F0EDE6] text-[#1A1A1A]"
                : "text-[#7A756D] hover:bg-[#F7F5F0] hover:text-[#1A1A1A]"
            }`}
          >
            {location === "/owner" && (
              <div className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-[#1A1A1A] ${isRtl ? "right-0 rounded-l-full" : "left-0 rounded-r-full"}`} />
            )}
            <Shield className="w-[18px] h-[18px]" />
            {t("ownerDashboard")}
          </Link>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-[#E5E3D9] space-y-3">
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#F7F5F0] border border-[#E5E3D9] hover:bg-[#F0EDE6] transition"
          title={lang === "en" ? "Switch to Arabic" : "التبديل إلى الإنجليزية"}
        >
          <span className="text-xs font-semibold text-[#1A1A1A]">
            {lang === "en" ? "🇬🇧 English" : "🇸🇦 العربية"}
          </span>
          <span className="text-[10px] text-[#7A756D] font-medium">
            {lang === "en" ? "AR" : "EN"}
          </span>
        </button>

        {user && (
          <div className="flex items-center gap-2.5 px-1">
            {(user as any).user_metadata?.avatar_url ? (
              <img
                src={(user as any).user_metadata.avatar_url}
                alt="avatar"
                className="w-7 h-7 rounded-full object-cover border border-[#E5E3D9]"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#F0EDE6] flex items-center justify-center text-xs font-semibold text-[#1A1A1A]">
                {(user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#1A1A1A] truncate">
                {(user as any).user_metadata?.full_name ?? user.email?.split("@")[0]}
              </p>
              <p className="text-[10px] text-[#BDBDB0] truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#7A756D] hover:bg-[#F7F5F0] hover:text-[#1A1A1A] transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("signOut")}
        </button>
        <p className="text-[10px] text-[#BDBDB0] px-1">FindX v0.2.0</p>
      </div>
    </aside>
  );
}
