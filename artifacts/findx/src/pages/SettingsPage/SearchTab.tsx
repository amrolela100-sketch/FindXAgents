/**
 * SettingsPage — Search Configuration Tab
 *
 * Configure Tavily search API key for lead discovery.
 *
 * @module SettingsPage/SearchTab
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Key, Loader2, Check, Trash2, TestTube, ExternalLink } from "lucide-react";
import { getSearchConfig, saveSearchConfig, deleteSearchConfig, testSearchConfig, toastError } from "@/lib/api";
import type { SearchConfigResponse } from "@/lib/types";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, FieldLabel, StatusBadge, Alert, PasswordField } from "./shared";

export function SearchTab() {
  const [searchConfig, setSearchConfig] = useState<SearchConfigResponse | null>(null);
  const [searchForm, setSearchForm] = useState({ apiKey: "" });
  const [searchSaving, setSearchSaving] = useState(false);
  const [searchTesting, setSearchTesting] = useState(false);
  const [searchDeleting, setSearchDeleting] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSuccess, setSearchSuccess] = useState<string | null>(null);
  const [showSearchForm, setShowSearchForm] = useState(false);

  useEffect(() => {
    async function load() { try { setSearchConfig(await getSearchConfig()); } catch (err) { toastError(err, "Failed to load search config"); } }
    load();
  }, []);

  async function handleSaveSearch() {
    setSearchSaving(true); setSearchError(null); setSearchSuccess(null);
    try { const d = await saveSearchConfig({ apiKey: searchForm.apiKey, provider: "tavily" }); setSearchConfig(d); setShowSearchForm(false); setSearchForm({ apiKey: "" }); setSearchSuccess("Tavily key saved."); }
    catch (err) { setSearchError(err instanceof Error ? err.message : "Failed"); }
    finally { setSearchSaving(false); }
  }
  async function handleTestSearch() {
    setSearchTesting(true); setSearchError(null); setSearchSuccess(null);
    try { const r = await testSearchConfig(); if (r.ok) setSearchSuccess(r.message ?? "OK"); else setSearchError(r.error ?? "Failed"); }
    catch (err) { setSearchError(err instanceof Error ? err.message : "Failed"); }
    finally { setSearchTesting(false); }
  }
  async function handleDeleteSearch() {
    setSearchDeleting(true); setSearchError(null);
    try { await deleteSearchConfig(); setSearchConfig({ configured: false }); setSearchForm({ apiKey: "" }); setShowSearchForm(false); }
    catch (err) { setSearchError(err instanceof Error ? err.message : "Failed"); }
    finally { setSearchDeleting(false); }
  }

  return (
    <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
      <SectionCard>
        <SectionHeader icon={Search} title="Tavily Search" subtitle="Powers the lead discovery step" accent="#FBBF24"
          action={
            <div className="flex items-center gap-2">
              {searchConfig?.configured && <StatusBadge ok={true} label={searchConfig.source === "env" ? "via ENV" : "Configured"} />}
              <button onClick={() => { setShowSearchForm(!showSearchForm); setSearchError(null); setSearchSuccess(null); }} className="btn btn-secondary text-[12px] px-3 py-1.5">
                {showSearchForm ? "Cancel" : searchConfig?.configured ? "Update" : "Configure"}
              </button>
              {searchConfig?.configured && (
                <>
                  <button onClick={handleTestSearch} disabled={searchTesting} className="btn btn-ghost text-[12px] px-3 py-1.5 gap-1.5">
                    {searchTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" strokeWidth={1.8} />} Test
                  </button>
                  <button onClick={handleDeleteSearch} disabled={searchDeleting} className="btn btn-ghost text-[12px] px-3 py-1.5" style={{ color: "#F87171" }}>
                    {searchDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" strokeWidth={1.8} />}
                  </button>
                </>
              )}
            </div>
          }
        />
        <AnimatePresence>
          {showSearchForm && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-[12px]" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)", color: "#FBBF24" }}>
                  <Key className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.8} />
                  Get your free key at{" "}
                  <a href="https://tavily.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold flex items-center gap-1">tavily.com <ExternalLink className="w-3 h-3" strokeWidth={1.8} /></a>
                </div>
                <div><FieldLabel>Tavily API Key</FieldLabel><PasswordField value={searchForm.apiKey} onChange={(v) => setSearchForm({ apiKey: v })} placeholder="tvly-..." /></div>
                {searchError && <Alert type="error" message={searchError} onClose={() => setSearchError(null)} />}
                {searchSuccess && <Alert type="success" message={searchSuccess} onClose={() => setSearchSuccess(null)} />}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveSearch} disabled={searchSaving || !searchForm.apiKey} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
                    {searchSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />} Save
                  </button>
                  <button onClick={() => setShowSearchForm(false)} className="btn btn-ghost text-[13px] px-4 py-2">Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {searchSuccess && !showSearchForm && <div className="px-5 pb-4"><Alert type="success" message={searchSuccess} onClose={() => setSearchSuccess(null)} /></div>}
      </SectionCard>
    </motion.div>
  );
}
