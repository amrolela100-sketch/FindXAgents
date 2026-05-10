import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type Lang = "en" | "ar";

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
  isRtl: boolean;
}

const LangContext = createContext<LangContextType | null>(null);

const translations: Record<string, Record<Lang, string>> = {
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  agents: { en: "Agents", ar: "الوكلاء" },
  pipeline: { en: "Pipeline", ar: "خط الإنتاج" },
  workspaces: { en: "Workspaces", ar: "مساحات العمل" },
  settings: { en: "Settings", ar: "الإعدادات" },
  menu: { en: "Menu", ar: "القائمة" },
  admin: { en: "Admin", ar: "المسؤول" },
  adminDashboard: { en: "Admin dashboard", ar: "لوحة المسؤول" },
  ownerDashboard: { en: "Owner Dashboard", ar: "لوحة المالك" },
  signOut: { en: "Sign out", ar: "تسجيل الخروج" },
  noWorkspace: { en: "No workspace", ar: "لا توجد مساحة عمل" },
  ownerAccess: { en: "Owner access", ar: "دخول المالك" },
  ownerPageNote: { en: "This page is for the project owner only.", ar: "هذه الصفحة خاصة بصاحب المشروع فقط." },
  password: { en: "Password", ar: "كلمة السر" },
  unlock: { en: "Unlock", ar: "فتح" },
  projectOverview: { en: "Project Overview", ar: "نظرة عامة على المشروع" },
  allDetails: { en: "All project details in one page.", ar: "كل تفاصيل المشروع في صفحة واحدة." },
  refresh: { en: "Refresh", ar: "تحديث" },
  lockOwnerAccess: { en: "Lock owner access", ar: "قفل دخول المالك" },
  users: { en: "Users", ar: "المستخدمون" },
  leads: { en: "Leads", ar: "العملاء المحتملون" },
  runs: { en: "Runs", ar: "التشغيلات" },
  conversion: { en: "Conversion", ar: "التحويل" },
  onboarded: { en: "onboarded", ar: "مُدخَل" },
  thisWeek: { en: "this week", ar: "هذا الأسبوع" },
  contacted: { en: "contacted", ar: "تم التواصل معه" },
  wins: { en: "wins", ar: "فوز" },
  platformHealth: { en: "Platform health", ar: "صحة المنصة" },
  recentWorkspaces: { en: "Recent workspaces", ar: "آخر مساحات العمل" },
  recentRuns: { en: "Recent runs", ar: "آخر التشغيلات" },
  latestPipelineActivity: { en: "Latest pipeline activity", ar: "آخر نشاط في خط الإنتاج" },
  allIndustries: { en: "All industries", ar: "جميع الصناعات" },
  allNL: { en: "All NL", ar: "هولندا كاملة" },
  needsAttention: { en: "Needs attention", ar: "يحتاج انتباهاً" },
  tryAgain: { en: "Try again", ar: "حاول مجدداً" },
  noData: { en: "No data", ar: "لا توجد بيانات" },
  prospecting: { en: "Prospecting", ar: "التنقيب" },
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    return (localStorage.getItem("findx_lang") as Lang) ?? "en";
  });

  useEffect(() => {
    localStorage.setItem("findx_lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));

  const t = (key: string): string => {
    return translations[key]?.[lang] ?? key;
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, t, isRtl: lang === "ar" }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
