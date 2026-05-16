import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings2 } from "lucide-react";
import { TABS, SPRING, FADE_UP, type TabId } from "./provider-config";
import { AIProvidersTab } from "./AIProvidersTab";
import { EmailTab } from "./EmailTab";
import { SearchTab } from "./SearchTab";
import { NotificationsTab } from "./NotificationsTab";
import { DataTab } from "./DataTab";
import { cn } from "@/lib/utils";
import { PageShell } from "@/components/page-shell";

const TAB_COMPONENTS: Record<TabId, React.ComponentType> = {
  ai:            AIProvidersTab,
  email:         EmailTab,
  search:        SearchTab,
  notifications: NotificationsTab,
  data:          DataTab,
};

// Map provider colors to Tailwind semantic classes where possible, 
// or use inline style for brand colors but in a safe way.
const TAB_COLOR_MAP: Record<TabId, string> = {
  ai:            "text-primary",
  email:         "text-info",
  search:        "text-warning",
  notifications: "text-orange-500",
  data:          "text-danger",
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("ai");
  const ActiveTabComponent = TAB_COMPONENTS[activeTab];

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-8">

        {/* Page Header */}
        <motion.div custom={0} variants={FADE_UP} initial="hidden" animate="visible" className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/10 border border-primary/20 shadow-sm">
              <Settings2 className="w-5 h-5 text-primary" strokeWidth={2} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-text">Settings</h1>
          </div>
          <p className="text-sm text-text-muted max-w-lg">
            Configure your workspace, AI engine, and connected channels to optimize your prospecting workflow.
          </p>
        </motion.div>

        {/* Tab Bar Navigation */}
        <motion.div custom={1} variants={FADE_UP} initial="hidden" animate="visible">
          <div className="flex gap-1.5 p-1.5 rounded-2xl bg-glass border border-glass-border shadow-sm overflow-x-auto scrollbar-none">
            {TABS.map((tab, i) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClass = TAB_COLOR_MAP[tab.id];

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap border",
                    isActive 
                      ? "bg-primary text-white border-primary shadow-glow-brand" 
                      : "text-text-muted hover:text-text hover:bg-glass-raised border-transparent"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : colorClass)} strokeWidth={2} />
                  {tab.label.toUpperCase()}
                  {isActive && (
                    <motion.div layoutId="activeTabPill" className="w-1.5 h-1.5 rounded-full bg-white ml-1 shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 5 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -5 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          <ActiveTabComponent />
        </motion.div>
      </div>
    </PageShell>
  );
}
