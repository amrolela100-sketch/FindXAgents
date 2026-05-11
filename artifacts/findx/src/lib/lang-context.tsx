import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { en, ar, type Translations } from "./i18n";

type Lang = "en" | "ar";

interface LangContextValue {
  lang: Lang;
  t: Translations;
  isRtl: boolean;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextValue | null>(null);

const TRANSLATIONS: Record<Lang, Translations> = { en, ar };
const STORAGE_KEY = "findx-lang";

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "ar") return stored;
    // Auto-detect from browser
    const browser = navigator.language.toLowerCase();
    return browser.startsWith("ar") ? "ar" : "en";
  });

  const isRtl = lang === "ar";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    // Update font for Arabic
    document.body.style.fontFamily = isRtl
      ? '"Noto Sans Arabic", "Inter", sans-serif'
      : '"Inter", sans-serif';
  }, [lang, isRtl]);

  const setLang = (l: Lang) => setLangState(l);
  const toggleLang = () => setLangState((prev) => (prev === "en" ? "ar" : "en"));

  return (
    <LangContext.Provider value={{ lang, t: TRANSLATIONS[lang], isRtl, setLang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
