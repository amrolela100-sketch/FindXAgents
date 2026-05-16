import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/lang-context";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Bot, GitBranch, Users, Building2,
  Layers, Settings, ShieldCheck, LogOut, HelpCircle,
  Menu, X, ChevronRight, ChevronLeft, Zap, PanelLeftClose, PanelLeftOpen
} from "lucide-react";

interface SidebarProps {
  isAdmin: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type NavItem = {
  href: string;
  icon: typeof LayoutDashboard;
  labelKey: keyof typeof import("../lib/i18n/en").en.nav;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/",           icon: LayoutDashboard, labelKey: "dashboard"  },
  { href: "/agents",     icon: Bot,             labelKey: "agents"     },
  { href: "/pipeline",   icon: GitBranch,       labelKey: "pipeline"   },
  { href: "/leads",      icon: Users,           labelKey: "leads"      },
  { href: "/clients",    icon: Building2,       labelKey: "clients"    },
  { href: "/workspaces", icon: Layers,          labelKey: "workspaces" },
  { href: "/settings",   icon: Settings,        labelKey: "settings"   },
];

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <a onClick={onClick} className={`nav-link ${active ? "active" : ""}`}>
        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="w-3 h-3 opacity-40 rtl:rotate-180" />}
      </a>
    </Link>
  );
}

function NavLinkIcon({
  href,
  icon: Icon,
  label,
  active,
  onClick,
}: {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <a
        onClick={onClick}
        title={label}
        className={`nav-link justify-center !px-0 ${active ? "active" : ""}`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
      </a>
    </Link>
  );
}

function SidebarContent({
  isAdmin,
  onClose,
  collapsed = false,
}: {
  isAdmin: boolean;
  onClose?: () => void;
  collapsed?: boolean;
}) {
  const { t } = useLang();
  const { user: authUser, logout: authLogout } = useAuth();
  const [location] = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const initial = (authUser?.email ?? "U")[0].toUpperCase();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <div className={`py-5 mb-1 ${collapsed ? "flex justify-center px-0" : "px-4"}`}>
        <Link href="/">
          <a onClick={onClose} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div>
                <span className="text-base font-bold tracking-tight" style={{ color: "var(--text)" }}>
                  FindX
                </span>
                <p className="text-[10px] leading-none" style={{ color: "var(--text-subtle)" }}>
                  Warm Intelligence
                </p>
              </div>
            )}
          </a>
        </Link>
      </div>

      {/* Upgrade button */}
      {collapsed ? (
        <div className="flex justify-center mb-4 px-1">
          <button
            className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-sm text-white text-xs font-bold"
            title={t.nav.upgrade}
          >
            ✦
          </button>
        </div>
      ) : (
        <div className="px-3 mb-4">
          <button className="w-full btn btn-primary text-xs py-2 shadow-sm">
            ✦ {t.nav.upgrade}
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className={`flex-1 space-y-0.5 overflow-y-auto ${collapsed ? "px-1" : "px-2"}`}>
        {NAV_ITEMS.map(({ href, icon, labelKey }) =>
          collapsed ? (
            <NavLinkIcon
              key={href}
              href={href}
              icon={icon}
              label={t.nav[labelKey] as string}
              active={isActive(href)}
              onClick={onClose}
            />
          ) : (
            <NavLink
              key={href}
              href={href}
              icon={icon}
              label={t.nav[labelKey] as string}
              active={isActive(href)}
              onClick={onClose}
            />
          )
        )}

        {isAdmin && (
          collapsed ? (
            <NavLinkIcon
              href="/admin"
              icon={ShieldCheck}
              label={t.nav.admin}
              active={isActive("/admin")}
              onClick={onClose}
            />
          ) : (
            <NavLink
              href="/admin"
              icon={ShieldCheck}
              label={t.nav.admin}
              active={isActive("/admin")}
              onClick={onClose}
            />
          )
        )}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3" style={{ borderTop: "1px solid var(--glass-border)" }} />

      {/* Footer */}
      <div className={`pb-4 space-y-0.5 ${collapsed ? "px-1" : "px-2"}`}>
        {collapsed ? (
          <>
            <a
              href="mailto:support@findx.nl"
              className="nav-link justify-center !px-0"
              title={t.nav.help}
            >
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
            </a>
            <button
              onClick={() => authLogout()}
              className="nav-link justify-center !px-0 w-full"
              title={t.nav.signout}
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
            </button>
            {authUser && (
              <div className="flex justify-center mt-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}
                  title={authUser.email}
                >
                  {initial}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <a href="mailto:support@findx.nl" className="nav-link">
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
              <span>{t.nav.help}</span>
            </a>
            <button
              onClick={() => authLogout()}
              className="nav-link w-full text-left"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              <span>{t.nav.signout}</span>
            </button>
            {authUser && (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 mt-2 rounded-xl"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: "var(--brand-subtle)", color: "var(--brand)" }}
                >
                  {initial}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text)" }}>
                    {authUser.email}
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ isAdmin, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { isRtl } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Close on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Lock scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 h-full z-20 ${collapsed ? "w-16" : "w-60"} ${isRtl ? "sidebar-glass sidebar-glass-rtl" : "sidebar-glass"}`}
        dir={isRtl ? "rtl" : "ltr"}
        role="navigation"
        aria-label="Main navigation"
        style={{
          [isRtl ? "right" : "left"]: 0,
          transition: "width 0.3s ease",
        }}
      >
        <SidebarContent isAdmin={isAdmin} collapsed={collapsed} />

        {/* Collapse toggle button */}
        <button
          onClick={onToggleCollapse}
          className={`absolute top-6 w-6 h-6 rounded-full flex items-center justify-center z-30 ${isRtl ? "-left-3" : "-right-3"}`}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          style={{
            background: "var(--glass-raised)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid var(--glass-border-strong)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.12)",
            color: "var(--text-subtle)",
          }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isRtl
            ? collapsed
              ? <PanelLeftClose className="w-3 h-3" />
              : <PanelLeftOpen className="w-3 h-3" />
            : collapsed
              ? <PanelLeftOpen className="w-3 h-3" />
              : <PanelLeftClose className="w-3 h-3" />
          }
        </button>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 topbar-glass"
      >
        <Link href="/">
          <a className="flex items-center gap-2" aria-label="FindX home">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm" style={{ color: "var(--text)" }}>FindX</span>
          </a>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="btn btn-ghost p-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Mobile spacer */}
      <div className="md:hidden h-14" />

      {/* ── MOBILE BACKDROP ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div
        className={`md:hidden fixed top-0 h-full w-72 z-50 transition-transform duration-300 ${isRtl ? "sidebar-glass sidebar-glass-rtl" : "sidebar-glass"}`}
        dir={isRtl ? "rtl" : "ltr"}
        role="navigation"
        aria-label="Mobile navigation"
        style={{
          [isRtl ? "right" : "left"]: 0,
          transform: mobileOpen ? "translateX(0)" : isRtl ? "translateX(100%)" : "translateX(-100%)",
        }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className={`absolute top-4 btn btn-ghost p-1.5 z-10 ${isRtl ? "left-4" : "right-4"}`}
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
      </div>
    </>
  );
}
