import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useLang } from "../lib/lang-context";
import { useTheme } from "../lib/theme-context";
import { getLeads } from "../lib/api";
import type { Lead } from "../lib/types";
import {
  LayoutDashboard, Bot, GitBranch, Users, Building2,
  Layers, Settings, Zap, Plus, Sun, Moon, Globe,
  Search, ArrowRight, Building
} from "lucide-react";

type CmdItem = {
  id: string;
  label: string;
  sublabel?: string;
  icon: typeof Search;
  action: () => void;
  section: string;
  keywords?: string;
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, navigate] = useLocation();
  const { t, toggleLang, lang } = useLang();
  const { toggleTheme, isDark } = useTheme();

  // Open with Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setCursor(0);
    }
  }, [open]);

  // Load leads for search
  useEffect(() => {
    if (!open) return;
    getLeads({ pageSize: 50 }).then((d) => setLeads(d.leads)).catch(() => {});
  }, [open]);

  const go = useCallback((path: string) => {
    navigate(path);
    setOpen(false);
  }, [navigate]);

  // Build items
  const navItems: CmdItem[] = [
    { id: "home",       label: t.nav.dashboard,  icon: LayoutDashboard, action: () => go("/"),           section: t.cmd.sections.navigate, keywords: "home dashboard" },
    { id: "leads",      label: t.nav.leads,      icon: Users,           action: () => go("/leads"),      section: t.cmd.sections.navigate, keywords: "leads prospects" },
    { id: "pipeline",   label: t.nav.pipeline,   icon: GitBranch,       action: () => go("/pipeline"),   section: t.cmd.sections.navigate, keywords: "pipeline kanban" },
    { id: "agents",     label: t.nav.agents,     icon: Bot,             action: () => go("/agents"),     section: t.cmd.sections.navigate, keywords: "agents AI automation" },
    { id: "clients",    label: t.nav.clients,    icon: Building2,       action: () => go("/clients"),    section: t.cmd.sections.navigate, keywords: "clients customers" },
    { id: "workspaces", label: t.nav.workspaces, icon: Layers,          action: () => go("/workspaces"), section: t.cmd.sections.navigate, keywords: "workspaces ICP" },
    { id: "settings",   label: t.nav.settings,   icon: Settings,        action: () => go("/settings"),   section: t.cmd.sections.navigate, keywords: "settings config" },
  ];

  const actionItems: CmdItem[] = [
    {
      id: "run-pipeline", label: t.cmd.actions.runPipeline, icon: Zap,
      action: () => go("/agents"), section: t.cmd.sections.actions, keywords: "run pipeline AI"
    },
    {
      id: "new-lead", label: t.cmd.actions.newLead, icon: Plus,
      action: () => go("/leads"), section: t.cmd.sections.actions, keywords: "add new lead"
    },
    {
      id: "toggle-theme", label: t.cmd.actions.toggleDark, icon: isDark ? Sun : Moon,
      action: () => { toggleTheme(); setOpen(false); }, section: t.cmd.sections.actions
    },
    {
      id: "toggle-lang", label: `${t.cmd.actions.toggleLang} → ${lang === "en" ? "عربي" : "English"}`, icon: Globe,
      action: () => { toggleLang(); setOpen(false); }, section: t.cmd.sections.actions
    },
  ];

  const leadItems: CmdItem[] = leads.map((l) => ({
    id: `lead-${l.id}`,
    label: l.businessName,
    sublabel: `${l.city}${l.industry ? ` · ${l.industry}` : ""}`,
    icon: Building,
    action: () => go("/leads"),
    section: t.cmd.sections.leads,
    keywords: `${l.businessName} ${l.city} ${l.industry ?? ""}`.toLowerCase(),
  }));

  // Filter
  const q = query.toLowerCase().trim();
  const filter = (items: CmdItem[]) =>
    q
      ? items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            (item.sublabel ?? "").toLowerCase().includes(q) ||
            (item.keywords ?? "").includes(q)
        )
      : items;

  const filtered = [
    ...filter(navItems),
    ...filter(actionItems),
    ...(q ? filter(leadItems) : []),
  ];

  // Group
  const grouped = filtered.reduce<Record<string, CmdItem[]>>((acc, item) => {
    (acc[item.section] ??= []).push(item);
    return acc;
  }, {});

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      filtered[cursor]?.action();
    }
  };

  if (!open) return null;

  let idx = 0;

  return (
    <>
      {/* Backdrop */}
      <div className="cmd-overlay" onClick={() => setOpen(false)} />

      {/* Panel */}
      <div className="cmd-panel" role="dialog" aria-modal="true">
        {/* Search input */}
        <div
          className="flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKeyDown}
            placeholder={t.cmd.placeholder}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: "var(--text)" }}
          />
          <kbd
            className="hidden sm:inline-flex text-[10px] px-1.5 py-0.5 rounded font-mono"
            style={{ background: "var(--bg-inset)", color: "var(--text-subtle)", border: "1px solid var(--border)" }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="py-2 max-h-96 overflow-y-auto">
          {Object.keys(grouped).length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--text-subtle)" }}>
              {t.cmd.noResults}
            </div>
          ) : (
            Object.entries(grouped).map(([section, items]) => (
              <div key={section} className="mb-1">
                <p
                  className="px-4 py-1 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-subtle)" }}
                >
                  {section}
                </p>
                {items.map((item) => {
                  const isSelected = idx === cursor;
                  const currentIdx = idx++;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      onMouseEnter={() => setCursor(currentIdx)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                      style={{
                        background: isSelected ? "var(--bg-subtle)" : "transparent",
                        color: isSelected ? "var(--brand)" : "var(--text)",
                      }}
                    >
                      <Icon
                        className="w-4 h-4 flex-shrink-0"
                        style={{ color: isSelected ? "var(--brand)" : "var(--text-muted)" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.label}</p>
                        {item.sublabel && (
                          <p className="text-xs truncate" style={{ color: "var(--text-subtle)" }}>
                            {item.sublabel}
                          </p>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center gap-4 px-4 py-2 text-[10px]"
          style={{
            borderTop: "1px solid var(--border)",
            color: "var(--text-subtle)",
          }}
        >
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span className="ml-auto">{t.cmd.tip}</span>
        </div>
      </div>
    </>
  );
}
