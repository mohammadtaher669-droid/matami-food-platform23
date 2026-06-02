import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LayoutDashboard, UtensilsCrossed, MapPin, BookOpen, Tag, Star, LogOut, Menu, X, Percent, Settings, Navigation, Users, BarChart2, Image, Megaphone, Printer, Palette, ListOrdered, Store, SlidersHorizontal, Layers, FileUp, AlertTriangle, ExternalLink } from "lucide-react";
import matAmiLogo from "@assets/لوجو_الموقع_مطعمي_1776635393637.png";

const NAV = [
  { path: "/admin", label_en: "Dashboard", label_ar: "لوحة التحكم", icon: LayoutDashboard, exact: true },
  { path: "/admin/restaurants", label_en: "Restaurants", label_ar: "المطاعم", icon: UtensilsCrossed },
  { path: "/admin/branches", label_en: "Branches", label_ar: "الفروع", icon: MapPin },
  { path: "/admin/menu", label_en: "Menu Builder", label_ar: "قائمة الطعام", icon: BookOpen },
  { path: "/admin/modifiers", label_en: "Options & Add-ons", label_ar: "الخيارات والإضافات", icon: SlidersHorizontal },
  { path: "/admin/sorting", label_en: "Menu Sorting", label_ar: "ترتيب المنيو", icon: ListOrdered },
  { path: "/admin/branch-menu", label_en: "Branch Stock", label_ar: "مخزون الفروع", icon: Store },
  { path: "/admin/offers", label_en: "Offers", label_ar: "العروض", icon: Percent },
  { path: "/admin/coupons", label_en: "Coupons", label_ar: "الأكواد", icon: Tag },
  { path: "/admin/reviews", label_en: "Reviews", label_ar: "التقييمات", icon: Star },
  { path: "/admin/delivery-zones", label_en: "Delivery Zones", label_ar: "مناطق التوصيل", icon: Navigation },
  { path: "/admin/customers", label_en: "Customers", label_ar: "العملاء", icon: Users },
  { path: "/admin/analytics", label_en: "Analytics", label_ar: "التحليلات", icon: BarChart2 },
  { path: "/admin/banners", label_en: "Banners", label_ar: "البانرات", icon: Megaphone },
  { path: "/admin/backgrounds", label_en: "Backgrounds", label_ar: "الخلفيات", icon: Image },
  { path: "/admin/content", label_en: "Content Control", label_ar: "التحكم بالمحتوى", icon: Layers },
  { path: "/admin/import", label_en: "Excel Import", label_ar: "استيراد Excel", icon: FileUp },
  { path: "/admin/appearance", label_en: "Appearance", label_ar: "المظهر", icon: Palette },
  { path: "/admin/settings", label_en: "Settings", label_ar: "الإعدادات", icon: Settings },
];

// Detect if we are running in the Replit development preview (not the live published site)
const isDevEnvironment = import.meta.env.DEV || window.location.hostname.includes("replit.dev");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [devBannerDismissed, setDevBannerDismissed] = useState(
    () => sessionStorage.getItem("dev_banner_dismissed") === "1"
  );

  const currentPage = NAV.find((item) =>
    item.exact ? location === item.path : location.startsWith(item.path) && item.path !== "/admin"
  );
  const pageTitle = currentPage ? t(currentPage.label_en, currentPage.label_ar) : t("Dashboard", "لوحة التحكم");

  const handleLogout = () => {
    sessionStorage.removeItem("admin_token");
    window.location.href = "/admin";
  };

  const dismissDevBanner = () => {
    sessionStorage.setItem("dev_banner_dismissed", "1");
    setDevBannerDismissed(true);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {mobileOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden print:hidden" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-60 bg-sidebar border-r border-sidebar-border z-50 transition-transform md:translate-x-0 flex flex-col print:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-4 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={matAmiLogo} alt="Mat'ami" className="h-9 w-9 object-contain rounded-full" />
              <span className="font-bold text-primary text-base">{t("Admin", "الإدارة")}</span>
            </div>
            <button onClick={() => setMobileOpen(false)} className="md:hidden text-muted-foreground"><X size={18} /></button>
          </div>
          {/* Environment badge in sidebar */}
          <div className={`mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${isDevEnvironment ? "bg-amber-500/15 text-amber-400" : "bg-green-500/15 text-green-400"}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isDevEnvironment ? "bg-amber-400" : "bg-green-400"}`} />
            {isDevEnvironment ? t("Development Preview", "معاينة التطوير") : t("Live Site", "الموقع المنشور")}
          </div>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {NAV.map((item) => {
            const active = item.exact ? location === item.path : location.startsWith(item.path) && item.path !== "/admin";
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
                  data-testid={`nav-admin-${item.label_en.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon size={16} />
                  {t(item.label_en, item.label_ar)}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-3 flex-shrink-0 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition"
            data-testid="btn-admin-logout"
          >
            <LogOut size={16} />
            {t("Logout", "تسجيل الخروج")}
          </button>
        </div>
      </aside>

      <div className="flex-1 md:ml-60 print:ml-0">
        {/* Top bar */}
        <header className="sticky top-0 bg-[#0F0F0F]/95 backdrop-blur border-b border-white/5 px-4 h-14 flex items-center gap-3 z-30 print:hidden">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-muted-foreground"><Menu size={20} /></button>
          <span className="text-sm text-muted-foreground flex-1">{t("Mat'ami Admin Panel", "لوحة إدارة مطعمي")}</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/20 transition"
            title={t("Print this page", "طباعة هذه الصفحة")}
            data-testid="btn-print"
          >
            <Printer size={14} />
            {t("Print", "طباعة")}
          </button>
        </header>

        {/* Print-only header */}
        <div className="hidden print:block print-header px-8 pt-6 pb-4 border-b border-gray-300 mb-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">Mat'ami Admin Panel</p>
              <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
            </div>
            <div className="text-right text-xs text-gray-500 leading-relaxed">
              <p>{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
              <p>{new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        </div>

        {/* ⚠️ Dev environment warning banner */}
        {isDevEnvironment && !devBannerDismissed && (
          <div className="print:hidden mx-6 mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/8 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-amber-300">
                    {t("You are in Development Preview — changes here are NOT visible on the live site", "أنت في وضع التطوير — التغييرات هنا لا تظهر على الموقع المنشور")}
                  </p>
                  <p className="text-xs text-amber-400/80 leading-relaxed">
                    {t(
                      "To publish your menu, images, and offers to all customers: Export your data → open the live URL /admin → Import → click Publish Now.",
                      "لنشر قائمتك وصورك وعروضك لجميع العملاء: صدّر البيانات ← افتح رابط الموقع المنشور /admin ← استورد ← اضغط انشر الآن."
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <a
                      href="https://replit.com/@/my-repls"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded-xl text-xs font-medium text-amber-300 transition"
                    >
                      <ExternalLink size={11} />
                      {t("Open deployed site", "افتح الموقع المنشور")}
                    </a>
                    <button
                      onClick={dismissDevBanner}
                      className="px-3 py-1.5 rounded-xl text-xs text-amber-500/60 hover:text-amber-400 transition"
                    >
                      {t("Got it, dismiss", "فهمت، أغلق")}
                    </button>
                  </div>
                </div>
              </div>
              <button onClick={dismissDevBanner} className="text-amber-500/50 hover:text-amber-400 flex-shrink-0 mt-0.5 transition">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <main className="p-6 print:px-8 print:py-2">{children}</main>
      </div>
    </div>
  );
}
