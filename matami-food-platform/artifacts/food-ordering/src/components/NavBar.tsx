import { useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { settingsStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import matAmiLogo from "@assets/لوجو_الموقع_مطعمي_1776635393637.png";

const LOGO_SIZE = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

export default function NavBar() {
  const { lang, toggleLang, t } = useLanguage();
  const [location] = useLocation();
  const settings = useStore(useCallback(() => settingsStore.get(), []));

  const isHome = location === "/";
  const logoClass = LOGO_SIZE[settings.logo_size || "md"];

  const logoSrc = settings.platform_logo_url || matAmiLogo;
  const platformNameEn = settings.platform_name_en || "Mat'ami";
  const platformNameAr = settings.platform_name_ar || "مطعمي";

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 print:hidden"
      style={{
        background: "rgba(15,15,15,0.95)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer" data-testid="nav-logo">
            <img
              src={logoSrc}
              alt={platformNameEn}
              className={`${logoClass} object-contain rounded-full transition-all duration-300`}
            />
            {isHome && (
              <span className="text-sm font-bold text-primary tracking-tight hidden sm:block">
                {t(platformNameEn, platformNameAr)}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/offers">
            <span className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-primary hover:bg-primary/10 transition-all border border-primary/20">
              🔥 {t("Offers", "العروض")}
            </span>
          </Link>
          <button
            onClick={toggleLang}
            data-testid="btn-toggle-lang"
            className="px-3 py-1.5 rounded-lg border text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
            style={{ borderColor: "rgba(255,255,255,0.1)" }}
          >
            {lang === "en" ? "العربية" : "English"}
          </button>
        </div>
      </div>
    </nav>
  );
}
