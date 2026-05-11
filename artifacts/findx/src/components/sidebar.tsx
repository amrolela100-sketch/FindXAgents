import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/lang-context";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Bot, GitBranch, Users, Building2,
  Layers, Settings, ShieldCheck, LogOut, HelpCircle,
  Menu, X, ChevronRight, Zap
} from "lucide-react";

interface SidebarProps {
  isAdmin: boolean;
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
      <a
        onClick={onClick}
        className={`nav-link ${active ? "active" : ""}`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={active ? 2.5 : 2} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="w-3 h-3 opacity-40" />}
      </a>
    </Link>
  );
}

function SidebarContent({
  isAdmin,
  onClose,
}: {
  isAdmin: boolean;
  onClose?: () => void;
}) {
  const { user, logout } = useLang === null ? { user: null, logout: () => {} } : { user: null, logout: () => {} };
  const { t, isRtl } = useLang();
  const { user: authUser, logout: authLogout } = useAuth();
  const [location] = useLocation();

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const initial = (authUser?.email ?? "U")[0].toUpperCase();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 mb-1">
        <Link href="/">
          <a onClick={onClose} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 shadow-sm">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight" style={{ color: "var(--text)" }}>
                FindX
              </span>
              <p className="text-[10px] leading-none" style={{ color: "var(--text-subtle)" }}>
                Warm Intelligence
              </p>
            </div>
          </a>
        </Link>
      </div>

      {/* Upgrade */}
      <div className="px-3 mb-4">
        <button className="w-full btn btn-primary text-xs py-2 shadow-sm">
          ✦ {t.nav.upgrade}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, icon, labelKey }) => (
          <NavLink
            key={href}
            href={href}
            icon={icon}
            label={t.nav[labelKey] as string}
            active={isActive(href)}
            onClick={onClose}
          />
        ))}

        {isAdmin && (
          <NavLink
            href="/admin"
            icon={ShieldCheck}
            label={t.nav.admin}
            active={isActive("/admin")}
            onClick={onClose}
          />
        )}
      </nav>

      {/* Divider */}
      <div className="mx-4 my-3" style={{ borderTop: "1px solid var(--border)" }} />

      {/* Footer */}
      <div className="px-2 pb-4 space-y-0.5">
        <a
          href="mailto:support@findx.nl"
          className="nav-link"
        >
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

        {/* User chip */}
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
      </div>
    </div>
  );
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const { isRtl } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Close on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Lock scroll when open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const sidebarStyle: React.CSSProperties = {
    background: "var(--surface)",
    borderRight: isRtl ? "none" : "1px solid var(--border)",
    borderLeft: isRtl ? "1px solid var(--border)" : "none",
  };

  return (
    <>
      {/* ── DESKTOP ── */}
      <aside
        className={`hidden md:block fixed top-0 h-full w-60 z-20`}
        style={{
          ...sidebarStyle,
          [isRtl ? "right" : "left"]: 0,
        }}
      >
        <SidebarContent isAdmin={isAdmin} />
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30"
        style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)" }}
      >
        <Link href="/">
          <a className="flex items-center gap-2">
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
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── MOBILE DRAWER ── */}
      <div
        className="md:hidden fixed top-0 h-full w-72 z-50 transition-transform duration-300"
        style={{
          ...sidebarStyle,
          [isRtl ? "right" : "left"]: 0,
          transform: mobileOpen ? "translateX(0)" : isRtl ? "translateX(100%)" : "translateX(-100%)",
        }}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 btn btn-ghost p-1.5 z-10"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>
        <SidebarContent isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
      </div>
    </>
  );
}
