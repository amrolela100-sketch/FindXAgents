import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/lang-context";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Bot, GitBranch, Users, Building2,
  Layers, Settings, ShieldCheck, LogOut, HelpCircle,
  Menu, X, ChevronRight, Zap, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

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
      <a 
        onClick={onClick} 
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
          active 
            ? "bg-primary text-primary-foreground shadow-glow-brand" 
            : "text-text-muted hover:bg-glass-raised hover:text-text"
        )}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0 transition-transform", active ? "scale-110" : "group-hover:scale-110")} />
        <span className="flex-1">{label}</span>
        {active && <ChevronRight className="w-3 h-3 opacity-60 rtl:rotate-180" />}
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
        className={cn(
          "flex items-center justify-center h-10 w-10 mx-auto rounded-xl transition-all duration-200",
          active 
            ? "bg-primary text-primary-foreground shadow-glow-brand" 
            : "text-text-muted hover:bg-glass-raised hover:text-text"
        )}
      >
        <Icon className={cn("w-4 h-4 flex-shrink-0", active && "scale-110")} />
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
    <div className="flex flex-col h-full overflow-hidden bg-glass backdrop-blur-glass border-x border-glass-border shadow-2xl">
      {/* Logo */}
      <div className={cn("py-6 mb-2", collapsed ? "flex justify-center" : "px-5")}>
        <Link href="/">
          <a onClick={onClose} className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center flex-shrink-0 shadow-glow-brand transition-transform group-hover:scale-105">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-text leading-none">
                  FindX
                </span>
                <span className="text-[10px] font-medium text-primary uppercase tracking-widest mt-0.5">
                  Intelligence
                </span>
              </div>
            )}
          </a>
        </Link>
      </div>

      {/* Upgrade button */}
      <div className={cn("px-3 mb-6", collapsed ? "flex justify-center" : "px-4")}>
        <Link href="/pricing">
          <a className={cn(
            "relative overflow-hidden group transition-all duration-300",
            collapsed 
              ? "h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-glow-brand"
              : "w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-glow-brand flex items-center justify-center gap-2"
          )}>
            <span className="relative z-10">{collapsed ? "✦" : `✦ ${t.nav.upgrade}`}</span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </a>
        </Link>
      </div>

      {/* Nav Section */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto scrollbar-none", collapsed ? "px-2" : "px-3")}>
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
          <div className="pt-4 mt-4 border-t border-glass-border">
             {collapsed ? (
                <NavLinkIcon href="/admin" icon={ShieldCheck} label={t.nav.admin} active={isActive("/admin")} onClick={onClose} />
             ) : (
                <NavLink href="/admin" icon={ShieldCheck} label={t.nav.admin} active={isActive("/admin")} onClick={onClose} />
             )}
          </div>
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className={cn("mt-auto py-4 border-t border-glass-border bg-glass-raised/30", collapsed ? "px-2" : "px-3")}>
        <div className="space-y-1 mb-4">
            <Link href="/help">
              <a className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-text-muted hover:bg-glass-raised hover:text-text transition-all",
                isActive("/help") && "bg-primary text-primary-foreground shadow-glow-brand",
                collapsed && "justify-center !px-0"
              )}>
                <HelpCircle className="w-4 h-4" />
                {!collapsed && <span>{t.nav.help}</span>}
              </a>
            </Link>
            <button 
                onClick={() => authLogout()} 
                className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-text-muted hover:bg-danger/10 hover:text-danger transition-all w-full",
                    collapsed && "justify-center !px-0"
                )}
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>{t.nav.signout}</span>}
            </button>
        </div>

        {authUser && (
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-2xl bg-glass-raised border border-glass-border",
            collapsed && "justify-center p-1.5"
          )}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-text truncate">
                  {authUser.email}
                </p>
                <p className="text-[10px] text-text-subtle font-medium uppercase tracking-tighter">
                  Free Member
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ isAdmin, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { isRtl } = useLang();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location]);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed top-0 h-full z-20 transition-all duration-300",
          collapsed ? "w-16" : "w-64",
          isRtl ? "right-0" : "left-0"
        )}
      >
        <SidebarContent isAdmin={isAdmin} collapsed={collapsed} />

        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className={cn(
            "absolute top-6 w-6 h-6 rounded-full flex items-center justify-center z-30 transition-all shadow-lg border border-glass-border-strong bg-glass-raised text-text-subtle hover:text-primary",
            isRtl ? "-left-3" : "-right-3"
          )}
        >
          {collapsed ? <PanelLeftOpen className="w-3.5 h-3.5" /> : <PanelLeftClose className="w-3.5 h-3.5" />}
        </button>
      </aside>

      {/* Mobile Nav Bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 z-30 bg-glass-overlay backdrop-blur-glass border-b border-glass-border">
        <Link href="/">
          <a className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shadow-glow-brand">
              <Zap className="w-4 h-4 text-white fill-current" />
            </div>
            <span className="font-bold text-sm text-text">FindX</span>
          </a>
        </Link>
        <button onClick={() => setMobileOpen(true)} className="p-2 text-text-muted hover:text-text">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer */}
      <div className={cn(
        "md:hidden fixed top-0 h-full w-72 z-50 transition-transform duration-300",
        isRtl ? "right-0" : "left-0",
        mobileOpen ? "translate-x-0" : (isRtl ? "translate-x-full" : "-translate-x-full")
      )}>
        <button onClick={() => setMobileOpen(false)} className={cn("absolute top-4 p-2 z-10 text-text-muted hover:text-text", isRtl ? "left-4" : "right-4")}>
          <X className="w-5 h-5" />
        </button>
        <SidebarContent isAdmin={isAdmin} onClose={() => setMobileOpen(false)} />
      </div>
    </>
  );
}
