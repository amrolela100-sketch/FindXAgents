/**
 * SettingsPage — Notifications Tab (Telegram)
 *
 * Configure Telegram bot for pipeline notifications.
 *
 * @module SettingsPage/NotificationsTab
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Loader2, Check, TestTube } from "lucide-react";
import { getTelegramSettings, saveTelegramSettings, testTelegram, toastError } from "@/lib/api";
import { FADE_UP } from "./provider-config";
import { SectionCard, SectionHeader, FieldLabel, StatusBadge, Alert, PasswordField } from "./shared";

export function NotificationsTab() {
  const [telegramSettings, setTelegramSettingsState] = useState<{ configured: boolean; chatId?: string } | null>(null);
  const [telegramForm, setTelegramForm] = useState({ botToken: "", chatId: "" });
  const [telegramSaving, setTelegramSaving] = useState(false);
  const [telegramTesting, setTelegramTesting] = useState(false);
  const [telegramTestResult, setTelegramTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [telegramSaveError, setTelegramSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const d = await getTelegramSettings();
        const raw = d as any;
        const configured = raw.configured ?? !!(raw.settings?.botToken && raw.settings?.chatId);
        const chatId: string | undefined = raw.chatId ?? raw.settings?.chatId;
        setTelegramSettingsState({ configured, chatId });
        if (chatId) setTelegramForm((f) => ({ ...f, chatId }));
      } catch (err) { toastError(err, "Failed to load Telegram settings"); }
    }
    load();
  }, []);

  async function handleSaveTelegram() {
    setTelegramSaving(true); setTelegramSaveError(null);
    try {
      if (!telegramSettings?.configured && !telegramForm.botToken) { setTelegramSaveError("Bot Token is required"); return; }
      await saveTelegramSettings({ botToken: telegramForm.botToken || "__keep__", chatId: telegramForm.chatId });
      // Reload
      const d = await getTelegramSettings();
      const raw = d as any;
      setTelegramSettingsState({ configured: raw.configured ?? true, chatId: raw.chatId ?? telegramForm.chatId });
    } catch (err) { setTelegramSaveError(err instanceof Error ? err.message : "Failed to save settings"); }
    finally { setTelegramSaving(false); }
  }

  async function handleTestTelegram() {
    setTelegramTesting(true); setTelegramTestResult(null);
    try { setTelegramTestResult(await testTelegram({ botToken: telegramForm.botToken || "__keep__", chatId: telegramForm.chatId })); }
    catch (err) { setTelegramTestResult({ success: false, error: err instanceof Error ? err.message : "Failed" }); }
    finally { setTelegramTesting(false); }
  }

  return (
    <motion.div custom={2} variants={FADE_UP} initial="hidden" animate="visible" className="space-y-4">
      <SectionCard>
        <SectionHeader icon={MessageSquare} title="Telegram Notifications" subtitle="Get pipeline updates in Telegram" accent="#F97316"
          action={telegramSettings?.configured ? <StatusBadge ok={true} label="Configured" /> : undefined}
        />
        <div className="p-5 space-y-3">
          <div className="flex flex-col gap-1 px-3.5 py-3 rounded-xl text-[12px]" style={{ background: "var(--glass-raised)", border: "1px solid var(--glass-border)" }}>
            <p className="font-semibold" style={{ color: "var(--text)" }}>Setup steps:</p>
            <ol className="list-decimal list-inside space-y-1" style={{ color: "var(--text-muted)" }}>
              <li>Message <a href="https://t.me/BotFather" target="_blank" className="underline font-medium" style={{ color: "#F97316" }}>@BotFather</a> to create a bot and get your token</li>
              <li>Start a chat with your bot</li>
              <li>Get your Chat ID from <a href="https://t.me/userinfobot" target="_blank" className="underline font-medium" style={{ color: "#F97316" }}>@userinfobot</a></li>
            </ol>
          </div>
          <div><FieldLabel>Bot Token</FieldLabel><PasswordField value={telegramForm.botToken} onChange={(v) => setTelegramForm({ ...telegramForm, botToken: v })} placeholder={telegramSettings?.configured ? "••••••••••" : "123456789:ABCdef..."} /></div>
          <div><FieldLabel>Chat ID</FieldLabel><input type="text" value={telegramForm.chatId} onChange={(e) => setTelegramForm({ ...telegramForm, chatId: e.target.value })} placeholder="123456789" className="input text-[13px]" /></div>
          {telegramSaveError && <Alert type="error" message={telegramSaveError} />}
          {telegramTestResult && <Alert type={telegramTestResult.success ? "success" : "error"} message={telegramTestResult.success ? "Test message sent!" : telegramTestResult.error ?? "Test failed"} />}
          <div className="flex gap-2 pt-1">
            <button onClick={handleSaveTelegram} disabled={telegramSaving || (!telegramSettings?.configured && !telegramForm.botToken) || !telegramForm.chatId} className="btn btn-primary text-[13px] px-4 py-2 gap-2">
              {telegramSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.5} />} Save Settings
            </button>
            <button onClick={handleTestTelegram} disabled={telegramTesting || !telegramForm.botToken || !telegramForm.chatId} className="btn btn-secondary text-[13px] px-4 py-2 gap-2">
              {telegramTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <TestTube className="w-3.5 h-3.5" strokeWidth={1.8} />} Test
            </button>
          </div>
        </div>
      </SectionCard>
    </motion.div>
  );
}
