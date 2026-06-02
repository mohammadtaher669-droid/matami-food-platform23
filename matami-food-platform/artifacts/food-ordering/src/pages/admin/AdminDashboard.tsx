import { useCallback, useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  restaurantStore, branchStore, menuStore, reviewStore, couponStore,
  resetStore,
} from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import {
  UtensilsCrossed, MapPin, BookOpen, Star, Tag,
  Download, Upload, RotateCcw, Wifi, CheckCircle2,
  AlertCircle, Loader2, AlertTriangle, ExternalLink,
  ArrowRight, Globe,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { publishCatalog, getStoreSnapshot, loadStoreSnapshot } from "@/lib/store";

const isDevEnvironment = import.meta.env.DEV || window.location.hostname.includes("replit.dev");

function forceReseed() {
  localStorage.removeItem("store_initialized");
  window.location.reload();
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [syncStatus, setSyncStatus] = useState<"idle" | "pushing" | "ok" | "error">("idle");
  const [syncError, setSyncError] = useState("");
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [serverHasData, setServerHasData] = useState<boolean | null>(null);

  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const branches    = useStore(useCallback(() => branchStore.getAll(), []));
  const menuItems   = useStore(useCallback(() => menuStore.getAll(), []));
  const reviews     = useStore(useCallback(() => reviewStore.getAll(), []));
  const coupons     = useStore(useCallback(() => couponStore.getAll(), []));

  const pendingReviews = reviews.filter((r) => !r.approved).length;

  // Check whether the server already has catalog data
  useEffect(() => {
    fetch(`${window.location.origin}/api/data`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) { setServerHasData(false); return; }
        const d = await r.json() as Record<string, unknown[]>;
        const hasData = Object.values(d).some((v) => Array.isArray(v) && v.length > 0);
        setServerHasData(hasData);
      })
      .catch(() => setServerHasData(false));
  }, []);

  const stats = [
    { label_en: "Restaurants", label_ar: "المطاعم",          value: restaurants.length, icon: UtensilsCrossed, color: "#FF7A00" },
    { label_en: "Branches",    label_ar: "الفروع",            value: branches.length,    icon: MapPin,          color: "#6A0DAD" },
    { label_en: "Menu Items",  label_ar: "عناصر القائمة",    value: menuItems.length,   icon: BookOpen,        color: "#C1121F" },
    { label_en: "Reviews",     label_ar: "التقييمات المعلقة", value: pendingReviews,     icon: Star,            color: "#FF5722" },
    { label_en: "Coupons",     label_ar: "الأكواد",           value: coupons.length,     icon: Tag,             color: "#10B981" },
  ];

  /* ─── Publish ─────────────────────────────────────────────────────── */
  const handlePublish = async () => {
    setSyncStatus("pushing");
    setSyncError("");
    const result = await publishCatalog();
    if (result.ok) {
      setSyncStatus("ok");
      setServerHasData(true);
      const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      setLastSyncTime(now);
      toast({
        title: t("Published successfully!", "تم النشر بنجاح!"),
        description: t("All devices will now show the latest data.", "جميع الأجهزة ستعرض البيانات المحدثة الآن."),
      });
      setTimeout(() => setSyncStatus("idle"), 5000);
    } else {
      setSyncStatus("error");
      setSyncError(result.error ?? "Unknown error");
      toast({
        title: t("Publish failed", "فشل النشر"),
        description: result.error,
        variant: "destructive",
      });
      setTimeout(() => setSyncStatus("idle"), 8000);
    }
  };

  /* ─── Export (all catalog data from in-memory store) ──────── */
  const handleExport = () => {
    const data = getStoreSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `matami-full-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({
      title: t("Exported!", "تم التصدير!"),
      description: t(
        "All data + images exported. Import this file on the live site.",
        "تم تصدير جميع البيانات والصور. استورد هذا الملف على الموقع المنشور."
      ),
    });
  };

  /* ─── Import ─────────────────────────────────────────────────────── */
  const handleImport = () => {
    const input   = document.createElement("input");
    input.type    = "file";
    input.accept  = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
          // Support both new format (store_* keys) and legacy format (plain entity names)
          const isNewFormat = data["store_restaurants"] !== undefined;
          if (isNewFormat) {
            loadStoreSnapshot(data as Record<string, any>);
          } else {
            // Legacy format — map old keys to new store format
            const mapped: Record<string, any> = {};
            if (data["restaurants"]) mapped["store_restaurants"] = data["restaurants"];
            if (data["branches"])    mapped["store_branches"]    = data["branches"];
            if (data["categories"])  mapped["store_categories"]  = data["categories"];
            if (data["menuItems"])   mapped["store_menu_items"]  = data["menuItems"];
            if (data["offers"])      mapped["store_offers"]      = data["offers"];
            if (data["coupons"])     mapped["store_coupons"]     = data["coupons"];
            if (data["modifierGroups"])  mapped["store_modifier_groups"]  = data["modifierGroups"];
            if (data["modifierOptions"]) mapped["store_modifier_options"] = data["modifierOptions"];
            if (data["addOns"])      mapped["store_add_ons"]     = data["addOns"];
            loadStoreSnapshot(mapped);
          }
          toast({
            title: t("Imported!", "تم الاستيراد!"),
            description: t(
              "Data loaded. Click Publish Now to sync all devices.",
              "تم تحميل البيانات. اضغط 'انشر الآن' لمزامنة جميع الأجهزة."
            ),
          });
        } catch {
          toast({ title: t("Error", "خطأ"), description: t("Invalid JSON file", "ملف JSON غير صالح"), variant: "destructive" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* ─── Reset ──────────────────────────────────────────────────────── */
  const handleReset = () => {
    if (!confirm(t("Reset all data to defaults? This cannot be undone.", "إعادة تعيين جميع البيانات؟ لا يمكن التراجع."))) return;
    resetStore();
    setTimeout(() => forceReseed(), 100);
    toast({ title: t("Reset complete", "تمت إعادة التعيين") });
  };

  return (
    <div>
      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("Dashboard", "لوحة التحكم")}</h1>
        <div className="flex gap-2">
          <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground transition" data-testid="btn-import">
            <Upload size={14} /> {t("Import", "استيراد")}
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground transition" data-testid="btn-export">
            <Download size={14} /> {t("Export", "تصدير")}
          </button>
          <button onClick={handleReset} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-destructive/30 text-sm text-destructive/70 hover:text-destructive transition">
            <RotateCcw size={14} /> {t("Reset", "إعادة تعيين")}
          </button>
        </div>
      </div>

      {/* ── Dev environment: first-time production sync guide ────────── */}
      {isDevEnvironment && (
        <div className="mb-5 rounded-2xl border border-amber-500/25 bg-amber-500/6 overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">
                  {t(
                    "Changes made here won't appear on the live public site",
                    "التغييرات هنا لا تظهر على الموقع العام المنشور"
                  )}
                </p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  {t(
                    "This is the development preview. To publish your menu, images and offers to customers, follow these 4 steps:",
                    "هذه معاينة التطوير. لنشر قائمتك والصور والعروض للعملاء، اتبع هذه الخطوات الأربع:"
                  )}
                </p>
              </div>
            </div>

            {/* Step-by-step guide */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 mb-4">
              {[
                {
                  step: "1",
                  en: "Export your data",
                  ar: "صدّر بياناتك",
                  desc_en: "Click Export below — downloads JSON with all images included",
                  desc_ar: "اضغط تصدير أدناه — يُنزّل JSON يتضمن جميع الصور",
                  action: handleExport,
                  actionLabel_en: "Export Now",
                  actionLabel_ar: "صدّر الآن",
                },
                {
                  step: "2",
                  en: "Open live site admin",
                  ar: "افتح إدارة الموقع المنشور",
                  desc_en: "Go to your deployed URL and add /admin",
                  desc_ar: "اذهب إلى رابط موقعك المنشور وأضف /admin",
                  action: null,
                  actionLabel_en: null,
                  actionLabel_ar: null,
                },
                {
                  step: "3",
                  en: "Import the JSON file",
                  ar: "استورد ملف JSON",
                  desc_en: "Log in → click Import → select the file you just exported",
                  desc_ar: "سجّل الدخول ← اضغط استيراد ← اختر الملف الذي صدّرته",
                  action: null,
                  actionLabel_en: null,
                  actionLabel_ar: null,
                },
                {
                  step: "4",
                  en: "Click Publish Now",
                  ar: "اضغط انشر الآن",
                  desc_en: "Pushes all data + images to the server for all devices",
                  desc_ar: "يرسل جميع البيانات والصور للخادم لتظهر على كل الأجهزة",
                  action: null,
                  actionLabel_en: null,
                  actionLabel_ar: null,
                },
              ].map((s) => (
                <div key={s.step} className="bg-amber-500/8 border border-amber-500/15 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {s.step}
                    </div>
                    <p className="text-xs font-semibold text-amber-300">{t(s.en, s.ar)}</p>
                  </div>
                  <p className="text-[10px] text-amber-400/60 leading-relaxed">{t(s.desc_en, s.desc_ar)}</p>
                  {s.action && (
                    <button
                      onClick={s.action}
                      className="mt-2 flex items-center gap-1 px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-[11px] font-semibold text-amber-300 transition"
                    >
                      <Download size={10} />
                      {t(s.actionLabel_en!, s.actionLabel_ar!)}
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-amber-500/50">
              <ArrowRight size={10} />
              {t(
                "After step 4, every phone and browser worldwide will show your latest menu and images instantly.",
                "بعد الخطوة 4، كل جوال ومتصفح في العالم سيعرض أحدث قائمتك وصورك فوراً."
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Publish to all devices (production-mode card) ────────────── */}
      <div className="mb-6 bg-card border border-white/8 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${isDevEnvironment ? "bg-amber-500/15" : "bg-green-500/15"}`}>
              {isDevEnvironment ? <Globe size={18} className="text-amber-400" /> : <Wifi size={18} className="text-green-400" />}
            </div>
            <div>
              <h2 className="font-semibold text-foreground">
                {t("Publish to all devices", "نشر التحديثات على جميع الأجهزة")}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isDevEnvironment
                  ? t(
                      "This pushes dev data to the dev server (for testing). To publish to the live site, follow the guide above.",
                      "يرسل بيانات التطوير لخادم التطوير (للاختبار). لنشر الموقع المباشر، اتبع الدليل أعلاه."
                    )
                  : t(
                      "Send your latest changes to mobiles, tablets, and all browsers instantly.",
                      "أرسل أحدث تغييراتك إلى الجوالات والأجهزة اللوحية وجميع المتصفحات فوراً."
                    )}
              </p>

              {/* Server status indicator */}
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${serverHasData === null ? "bg-white/20 animate-pulse" : serverHasData ? "bg-green-400" : "bg-red-400"}`} />
                <p className={`text-xs ${serverHasData === null ? "text-muted-foreground" : serverHasData ? "text-green-400" : "text-red-400"}`}>
                  {serverHasData === null
                    ? t("Checking server…", "جارٍ التحقق من الخادم…")
                    : serverHasData
                    ? t("Server has published data ✓", "الخادم يحتوي على بيانات منشورة ✓")
                    : t("Server has no data yet — press Publish Now", "الخادم لا يحتوي على بيانات بعد — اضغط انشر الآن")}
                </p>
              </div>

              {syncStatus === "ok" && lastSyncTime && (
                <p className="text-xs text-green-400 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  {t(`Last published at ${lastSyncTime}`, `آخر نشر الساعة ${lastSyncTime}`)}
                </p>
              )}
              {syncStatus === "error" && syncError && (
                <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                  <AlertCircle size={11} /> {syncError}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handlePublish}
            disabled={syncStatus === "pushing"}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0 ${
              syncStatus === "pushing"
                ? "bg-white/5 text-muted-foreground cursor-not-allowed"
                : syncStatus === "ok"
                ? "bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30"
                : syncStatus === "error"
                ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                : isDevEnvironment
                ? "bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30"
                : "bg-green-600 text-white hover:bg-green-700"
            }`}
            data-testid="btn-publish"
          >
            {syncStatus === "pushing" ? (
              <><Loader2 size={14} className="animate-spin" /> {t("Publishing…", "جارٍ النشر…")}</>
            ) : syncStatus === "ok" ? (
              <><CheckCircle2 size={14} /> {t("Published!", "تم النشر!")}</>
            ) : syncStatus === "error" ? (
              <><AlertCircle size={14} /> {t("Retry", "إعادة المحاولة")}</>
            ) : (
              <><Wifi size={14} /> {t("Publish Now", "انشر الآن")}</>
            )}
          </button>
        </div>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label_en} className="bg-card border border-white/5 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${stat.color}15` }}>
                <Icon size={18} style={{ color: stat.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t(stat.label_en, stat.label_ar)}</p>
            </div>
          );
        })}
      </div>

      {/* ── Bottom tools ───────────────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border border-white/5 rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4">{t("Quick Info", "معلومات سريعة")}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {t("Available coupons: SAVE10, FIRST20, FREESHIP", "الأكواد المتاحة: SAVE10, FIRST20, FREESHIP")}</li>
            <li>• {t("Auto discount: 10% for orders over 50 SAR", "خصم تلقائي: 10% للطلبات فوق 50 ريال")}</li>
            <li>• {t("After import → always press Publish Now", "بعد الاستيراد ← اضغط دائماً انشر الآن")}</li>
          </ul>
        </div>
        <div className="bg-card border border-white/5 rounded-2xl p-5">
          <h2 className="font-semibold text-foreground mb-4">{t("Data Tools", "أدوات البيانات")}</h2>
          <p className="text-sm text-muted-foreground mb-3">
            {t(
              "Export all data + images as a single JSON file. Import it on the live site to transfer everything.",
              "صدّر جميع البيانات والصور كملف JSON واحد. استورده على الموقع المنشور لنقل كل شيء."
            )}
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExport} className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium">
              <Download size={14} /> {t("Export JSON", "تصدير JSON")}
            </button>
            <button onClick={handleImport} className="flex items-center gap-1.5 px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground hover:text-foreground">
              <Upload size={14} /> {t("Import JSON", "استيراد JSON")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
