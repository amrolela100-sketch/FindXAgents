import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth-context";
import { useWorkspace } from "../lib/workspace-context";
import { useLang } from "../lib/lang-context";
import { useState } from "react";

interface SidebarProps {
  isAdmin: boolean;
}

export function Sidebar({ isAdmin }: SidebarProps) {
  const { user, logout } = useAuth();
  const { t, isRtl } = useLang();
  const [location] = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/agents", label: "Prospects", icon: "search" },
    { href: "/pipeline", label: "Pipeline", icon: "view_kanban" },
    { href: "/leads", label: "Lead Insights", icon: "insights" },
    { href: "/clients", label: "Clients", icon: "business" },
    { href: "/workspaces", label: "Workspaces", icon: "workspaces" },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <nav
      className={`hidden md:flex flex-col fixed ${isRtl ? "right-0" : "left-0"} top-0 h-full w-64 bg-surface-container border-r border-outline-variant py-gutter px-4 shadow-sm z-20`}
    >
      {/* Logo */}
      <div className="mb-8">
        <Link href="/">
          <h1 className="font-display-lg text-display-lg-mobile text-primary cursor-pointer">
            FindX
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Warm Intelligence
          </p>
        </Link>
      </div>

      {/* Upgrade CTA */}
      <div className="mb-8">
        <button className="w-full bg-primary-container text-on-primary-container py-3 rounded-xl hover:bg-surface-variant transition-all duration-300 font-label-caps text-label-caps tracking-widest uppercase shadow-sm">
          Upgrade to Gold
        </button>
      </div>

      {/* Nav Links */}
      <div className="flex-1 flex flex-col gap-1">
        {navItems.map(({ href, label, icon }) => {
          const isActive = href === "/" ? location === "/" : location.startsWith(href);
          return (
            <Link key={href} href={href}>
              <a
                className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer ${
                  isActive
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                <span className="material-symbols-outlined" style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}>
                  {icon}
                </span>
                <span className="font-body-md text-body-md">{label}</span>
              </a>
            </Link>
          );
        })}

        {isAdmin && (
          <Link href="/admin">
            <a
              className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer ${
                location.startsWith("/admin")
                  ? "bg-primary-container text-on-primary-container font-bold"
                  : "text-on-surface-variant hover:bg-surface-variant"
              }`}
            >
              <span className="material-symbols-outlined">admin_panel_settings</span>
              <span className="font-body-md text-body-md">Admin</span>
            </a>
          </Link>
        )}

        <Link href="/owner">
          <a
            className={`flex items-center gap-3 py-3 px-4 rounded-xl transition-all duration-300 cursor-pointer ${
              location.startsWith("/owner")
                ? "bg-primary-container text-on-primary-container font-bold"
                : "text-on-surface-variant hover:bg-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined">shield</span>
            <span className="font-body-md text-body-md">Owner Panel</span>
          </a>
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-auto flex flex-col gap-1">
        <a className="flex items-center gap-3 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-all duration-300 cursor-pointer">
          <span className="material-symbols-outlined">help</span>
          <span className="font-body-md text-body-md">Help</span>
        </a>
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 py-3 px-4 rounded-xl text-on-surface-variant hover:bg-surface-variant transition-all duration-300 w-full text-left"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-body-md text-body-md">Logout</span>
        </button>

        {/* User info */}
        {user && (
          <div className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl bg-surface-container-high">
            <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-label-caps text-label-caps flex-shrink-0">
              {(user.email ?? "U")[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-label-caps text-label-caps text-on-surface truncate">{user.email}</p>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
