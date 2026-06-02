import { createContext, useContext, useEffect, useState } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
  t: (en: string, ar: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  toggleLang: () => {},
  t: (en) => en,
  isRTL: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem("lang") as Language) || "en";
  });

  useEffect(() => {
    localStorage.setItem("lang", lang);
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const toggleLang = () => setLang((l) => (l === "en" ? "ar" : "en"));
  const t = (en: string, ar: string) => (lang === "ar" ? ar : en);
  const isRTL = lang === "ar";

  return (
    <LanguageContext.Provider value={{ lang, toggleLang, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
