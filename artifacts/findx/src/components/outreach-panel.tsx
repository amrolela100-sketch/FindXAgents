import { useState } from "react";
import { generateOutreach, updateOutreach, sendOutreach, toastError } from "../lib/api";
import { useLang } from "../lib/lang-context";
import type { Lead, Outreach } from "../lib/types";
import { Send, RefreshCw, Loader2, Check, Edit2, Globe } from "lucide-react";

interface OutreachPanelProps {
  lead: Lead;
  outreaches: Outreach[];
  onUpdate: () => void;
}

export function OutreachPanel({ lead, outreaches, onUpdate }: OutreachPanelProps) {
  const { t } = useLang();
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [language, setLanguage] = useState<"ar" | "en" | "nl" | "fr" | "es" | "de">("en");

  const LANG_OPTIONS = [
    { value: "ar", label: "🇸🇦 Arabic" },
    { value: "en", label: "🇬🇧 English" },
    { value: "nl", label: "🇳🇱 Dutch" },
    { value: "fr", label: "🇫🇷 French" },
    { value: "es", label: "🇪🇸 Spanish" },
    { value: "de", label: "🇩🇪 German" },
  ];

  async function handleGenerate() {
    setGenerating(true);
    try {
      await generateOutreach(lead.id, language);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to generate email");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSend(outreachId: string) {
    setSending(outreachId);
    try {
      const result = await sendOutreach(lead.id, outreachId) as Record<string, unknown> | null;
      if (result) onUpdate();
    } catch (err) {
      toastError(err, "Failed to send email");
    } finally {
      setSending(null);
    }
  }

  function startEditing(o: Outreach) {
    setEditingId(o.id);
    setEditSubject(o.subject);
    setEditBody(o.body);
  }

  async function handleSave(outreachId: string) {
    try {
      await updateOutreach(outreachId, { subject: editSubject, body: editBody });
      setEditingId(null);
      onUpdate();
    } catch (err) {
      toastError(err, "Failed to save changes");
    }
  }

  const locale = language === "ar" ? "ar-SA" : language === "nl" ? "nl-NL" : language === "fr" ? "fr-FR" : language === "de" ? "de-DE" : language === "es" ? "es-ES" : "en-US";

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl glass-sm">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium">Email Language</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as typeof language)}
            className="ml-auto input text-xs !w-auto !py-1 !px-2"
          >
            {LANG_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {generating ? "Generating..." : outreaches.length > 0 ? "Regenerate Email" : "Generate Email"}
        </button>
      </div>

      {outreaches.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          No emails generated yet. Click "Generate Email" above.
        </div>
      ) : (
        <div className="space-y-3">
          {outreaches.map((o) => (
            <div key={o.id} className="p-4 rounded-xl glass-sm">
              {editingId === o.id ? (
                <div className="space-y-2">
                  <input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg text-sm"
                    placeholder="Subject"
                  />
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-100 rounded-lg text-sm resize-none"
                    dir={language === "ar" ? "rtl" : "ltr"}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleSave(o.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium">Save</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-xs">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-500 mb-0.5">
                        {new Date(o.createdAt).toLocaleString(locale)} \u00b7 <span className="capitalize">{o.status}</span>
                      </p>
                      <p className="text-sm font-medium text-slate-200 truncate">{o.subject}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                      <button onClick={() => startEditing(o)} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors" title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      <button
                        disabled={!!sending || o.status === "sent"}
                        onClick={() => handleSend(o.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        {sending === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : o.status === "sent" ? <Check className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                        {o.status === "sent" ? "Sent" : "Send"}
                      </button>
                    </div>
                  </div>
                  <p
                    className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap line-clamp-4"
                    dir={(o.personalizedDetails as any)?.language === "ar" ? "rtl" : "ltr"}
                  >
                    {o.body}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
