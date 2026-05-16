/**
 * SettingsPage — Thin Wrapper
 *
 * The main settings page that renders tab navigation and delegates
 * to modular tab components. This file is intentionally lightweight.
 *
 * Before: 76KB single file (1340 lines)
 * After:  ~3KB wrapper + 6 modular files
 *
 * @module pages/SettingsPage
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings2 } from "lucide-react";
import { TABS, SPRING, FADE_UP, type TabId } from "./provider-config";
import { AIProvidersTab } from "./AIProvidersTab";
import { EmailTab } from "./EmailTab";
import { SearchTab } from "./SearchTab";
import { NotificationsTab } from "./NotificationsTab";
import { DataTab } from "./DataTab";

// ─── Tab Component Map ───────────────────────────────────────────────────────
const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  ai:            AIProvidersTab,
  email:         EmailTab,
  search:        SearchTab,
  notifications: NotificationsTab,
  data:          DataTab,
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ai");
  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 space-y-6">

        {/* ── Page Header ──────────────────────────────── */}
        <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.22)" }}>
              <Settings2 className="w-4 h-4" style={{ color: "var(--brand)" }} strokeWidth={1.8} />
            </div>
            <h1 className="text-[22px] font-bold tracking-tight" style={{ color: "var(--text)" }}>Settings</h1>
          </div>
          <p className="text-[13px] ml-[42px]" style={{ color: "var(--text-muted)" }}>
            Configure AI providers, email, search, and manage data.
          </p>
        </motion.div>

        {/* ── Tab Bar ──────────────────────────────────── */}
        <motion.div custom={1} variants={FADE_UP} initial="hidden" animate="visible">
          <div className="flex gap-1 p-1 rounded-2xl overflow-x-auto"
            style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}>
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...SPRING, delay: i * 0.05 }}
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12px] font-semibold whitespace-nowrap flex-shrink-0"
                  style={isActive ? {
                    background: `${tab.color}18`, color: tab.color,
                    border: `1px solid ${tab.color}30`, boxShadow: `0 2px 12px ${tab.color}20`,
                  } : { color: "var(--text-muted)", border: "1px solid transparent" }}
                >
                  <motion.span animate={isActive ? { rotate: [0, -8, 8, 0] } : { rotate: 0 }} transition={{ duration: 0.35 }}>
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={isActive ? 2.2 : 1.8} />
                  </motion.span>
                  {tab.label}
                  {isActive && (
                    <motion.span layoutId="activeTabDot" className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: tab.color }} transition={SPRING} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Active Tab Content ────────────────────────── */}
        <ActiveTabComponent />
      </div>
    </div>
  );
}
