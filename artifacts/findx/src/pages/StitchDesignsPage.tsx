import { useState } from "react";
import { X, ExternalLink, Layers } from "lucide-react";

const screens = [
  {
    id: "d4e264bb5a2e47a79f95848b281284a3",
    title: "Intelligence Dashboard",
    safeName: "intelligence-dashboard",
    category: "Dashboard",
  },
  {
    id: "4d129950ed1b4bf6bfbef489b42a3d09",
    title: "FindX - Welcome to Warm Intelligence",
    safeName: "findx---welcome-to-warm-intelligence",
    category: "Onboarding",
  },
  {
    id: "6c9a695739844f1c8dc7eb9dfdb45806",
    title: "Client Profile - Aura Networks",
    safeName: "client-profile---aura-networks",
    category: "CRM",
  },
  {
    id: "33f48bb79f80448e9421687452c3c80b",
    title: "Lead Insights",
    safeName: "lead-insights",
    category: "Leads",
  },
  {
    id: "819d382e6a59437fa352842e9c25c746",
    title: "Business Prospects",
    safeName: "business-prospects",
    category: "Prospects",
  },
  {
    id: "b207cef2029a4817a40ff5a32fed5e85",
    title: "Sales Pipelines",
    safeName: "sales-pipelines",
    category: "Sales",
  },
  {
    id: "ebd1e4ae10d640e79a4cbd94741a2b6a",
    title: "FindX Landing Page - Dark Mode",
    safeName: "findx-landing-page---dark-mode",
    category: "Landing",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Dashboard: "bg-blue-100 text-blue-700",
  Onboarding: "bg-green-100 text-green-700",
  CRM: "bg-purple-100 text-purple-700",
  Leads: "bg-yellow-100 text-yellow-700",
  Prospects: "bg-orange-100 text-orange-700",
  Sales: "bg-red-100 text-red-700",
  Landing: "bg-gray-100 text-gray-700",
};

export default function StitchDesignsPage() {
  const [activeScreen, setActiveScreen] = useState<(typeof screens)[0] | null>(null);
  const [filter, setFilter] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(screens.map((s) => s.category)))];
  const filtered = filter === "All" ? screens : screens.filter((s) => s.category === filter);

  return (
    <div className="min-h-screen bg-[#F7F5F0] p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-lg bg-[#705724] flex items-center justify-center">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[#1A1A1A]">Basher Initiative Platform</h1>
            <p className="text-sm text-[#5F584F]">Stitch design screens — {screens.length} screens imported</p>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mt-4 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === cat
                  ? "bg-[#705724] text-white"
                  : "bg-white text-[#5F584F] border border-[#D0C5B5] hover:bg-[#F4EDE5]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filtered.map((screen) => (
          <div
            key={screen.id}
            className="bg-white rounded-xl border border-[#E9E1DA] overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            onClick={() => setActiveScreen(screen)}
          >
            {/* Preview image */}
            <div className="relative aspect-video bg-[#F4EDE5] overflow-hidden">
              <img
                src={`/stitch-screens/${screen.safeName}.png`}
                alt={screen.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#705724] text-xs font-semibold px-3 py-1.5 rounded-full shadow">
                  View Design
                </span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-[#1A1A1A] leading-snug">{screen.title}</h3>
                <ExternalLink className="w-3.5 h-3.5 text-[#998F81] flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span
                className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                  CATEGORY_COLORS[screen.category] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {screen.category}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Modal */}
      {activeScreen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setActiveScreen(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E9E1DA]">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    CATEGORY_COLORS[activeScreen.category] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {activeScreen.category}
                </span>
                <h2 className="text-base font-semibold text-[#1A1A1A]">{activeScreen.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/stitch-screens/${activeScreen.safeName}.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-[#705724] font-medium px-3 py-1.5 rounded-lg border border-[#E9E1DA] hover:bg-[#F4EDE5] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Full Page
                </a>
                <button
                  onClick={() => setActiveScreen(null)}
                  className="p-1.5 rounded-lg text-[#5F584F] hover:bg-[#F4EDE5] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* iframe */}
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`/stitch-screens/${activeScreen.safeName}.html`}
                className="w-full h-full border-0"
                title={activeScreen.title}
                style={{ minHeight: "600px" }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
