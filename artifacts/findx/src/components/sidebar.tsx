import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth-context";
import { useLang } from "../lib/lang-context";
import { useState, useEffect } from "react";
import { Menu, X, Home, Search, LayoutGrid, Lightbulb, Building2, Layers, Settings, ShieldCheck, LogOut, HelpCircle, ChevronUp } from "lucide-react";

interface SidebarProps {
  isAdmin: boolean;
}

const NAV_ITEMS = [
  { href: "/",          label: "Dashboard",      Icon: Home },
  { href: "/agents",    label: "AI Agents",       Icon: Search },
  { href: "/pipeline",  label: "Pipeline",        Icon: LayoutGrid },
  { href: "/leads",     label: "Leads",           Icon: Lightbulb },
  { href: "/clients",   label: "Clients",         Icon: Building2 },
  { href: "/workspaces",label: "Workspaces",      Icon: Layers },
  { href: "/settings",  label: "Settings",        Icon: Settings },
];

function NavLink({
  href,
  label,
  Icon,
  isActive,
  onClick,
}: {
  href: string;
  label: string;
  Icon: typeof Home;
  isActive: boolean;
  onClick?: () => void;
}) {
  return (
    <Link href={href}>
      <a
        onClick={onClick}
        className={`flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all duration-200 cursor-pointer select-none ${
          isActive
            ? "bg-primary-container text-on-primary-container font-semibold"
            : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">{label}</span>
      </a>
    </Link>
  );
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const { user, logout } = useAuth();
  const { isRtl } = useLang();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const userInitial = (user?.email ?? "U")[0].toUpperCase();

  const navContent = (
    <>
      {/* Logo */}
      <div className="mb-6 px-4">
        <Link href="/">
          <a onClick={() => setMobileOpen(false)}>
            <h1 className="text-xl font-bold text-primary tracking-tight">FindX</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Warm Intelligence</p>
          </a>
        </Link>
      </div>

      {/* Upgrade CTA */}
      <div className="mb-5 px-2">
        <button className="w-full bg-primary-container text-on-primary-container py-2.5 rounded-xl text-xs font-semibold tracking-wide hover:opacity-90 transition-opacity shadow-sm">
          ✦ Upgrade to Gold
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => (
          <NavLink
            key={href}
            href={href}
            label={label}
            Icon={Icon}
            isActive={isActive(href)}
            onClick={() => setMobileOpen(false)}
          />
        ))}

        {isAdmin && (
          <NavLink
            href="/admin"
            label="Admin"
            Icon={ShieldCheck}
            isActive={isActive("/admin")}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </nav>

      {/* Footer */}
      <div className="mt-auto px-2 flex flex-col gap-0.5">
        <a className="flex items-center gap-3 py-2.5 px-4 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors cursor-pointer text-sm">
          <HelpCircle className="w-4 h-4" />
          Help
        </a>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 py-2.5 px-4 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors w-full text-left text-sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>

        {/* User chip */}
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-surface-container-high">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold flex-shrink-0">
              {userInitial}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs text-on-surface truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col fixed ${isRtl ? "right-0" : "left-0"} top-0 h-full w-64 bg-surface-container border-r border-outline-variant py-6 z-20 shadow-sm`}
      >
        {navContent}
      </aside>

      {/* ── Mobile Top Bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-surface-container border-b border-outline-variant flex items-center justify-between px-4 z-30 shadow-sm">
        <Link href="/">
          <a className="font-bold text-primary text-lg tracking-tight">FindX</a>
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ── Mobile Drawer Backdrop ── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile Drawer ── */}
      <div
        className={`md:hidden fixed top-0 ${isRtl ? "right-0" : "left-0"} h-full w-72 bg-surface-container z-50 flex flex-col py-6 shadow-2xl transition-transform duration-300 ${
          mobileOpen
            ? "translate-x-0"
            : isRtl
            ? "translate-x-full"
            : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <button
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          className="absolute top-4 right-4 p-2 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        {navContent}
      </div>

      {/* ── Mobile Bottom Spacer (so content doesn't hide under top bar) ── */}
      <div className="md:hidden h-14" />
    </>
  );
}
