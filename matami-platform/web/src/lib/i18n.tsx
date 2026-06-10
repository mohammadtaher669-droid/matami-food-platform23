import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "ar" | "en";

interface I18nContextValue {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  /** t("English", "العربية") */
  t: (en: string, ar: string) => string;
  /** pick bilingual fields off an object: tr(obj, "name") → obj.name_ar | obj.name_en */
  tr: (obj: Record<string, unknown>, field: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem("matami_lang") as Lang) || "ar");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("matami_lang", l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      t: (en, ar) => (lang === "ar" ? ar : en),
      tr: (obj, field) => String(obj[`${field}_${lang}`] ?? obj[`${field}_en`] ?? ""),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

export function formatMoney(value: number, currency = "SAR", lang: Lang = "ar"): string {
  const formatted = value.toLocaleString(lang === "ar" ? "ar-SA" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const symbol = currency === "SAR" ? (lang === "ar" ? "ر.س" : "SAR") : currency;
  return `${formatted} ${symbol}`;
}

export function formatDate(value: string | Date, lang: Lang = "ar"): string {
  return new Date(value).toLocaleString(lang === "ar" ? "ar-SA" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
