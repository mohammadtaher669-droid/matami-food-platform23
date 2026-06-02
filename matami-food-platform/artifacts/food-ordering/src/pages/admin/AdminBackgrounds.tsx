import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Image, Palette, Save, X, Monitor, Link } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { settingsStore, restaurantStore } from "@/lib/store";
import type { AppSettings, Restaurant } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function UrlImageField({
  label,
  value,
  onChange,
  placeholder,
  previewHeight = 120,
  testId,
}: {
  label: string;
  value?: string;
  onChange: (v: string | undefined) => void;
  placeholder?: string;
  previewHeight?: number;
  testId?: string;
}) {
  const [error, setError] = useState("");
  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link size={11} /> {label}
      </label>
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-white/10 group" style={{ height: previewHeight }}>
          <img src={value} alt="preview" className="w-full h-full object-cover"
            onError={() => setError("Image failed to load. Check the URL.")} />
          <button
            type="button"
            onClick={() => { onChange(undefined); setError(""); }}
            className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:text-red-400"
          >
            <X size={12} />
          </button>
        </div>
      )}
      <input
        type="url"
        placeholder={placeholder || "https://example.com/image.webp"}
        value={value || ""}
        onChange={(e) => { setError(""); onChange(e.target.value || undefined); }}
        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
        data-testid={testId}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {value && !error && (
        <p className="text-[11px] text-green-400 flex items-center gap-1"><Link size={9} /> URL set — no file stored locally</p>
      )}
    </div>
  );
}

export default function AdminBackgrounds() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const [settings, setSettings] = useState<AppSettings>(() => settingsStore.get());
  const [selectedRestId, setSelectedRestId] = useState<string>("");
  const [restState, setRestState] = useState<Partial<Restaurant>>({});

  const selectedRest = restaurants.find((r) => r.id === selectedRestId);

  const handleRestSelect = (id: string) => {
    setSelectedRestId(id);
    const r = restaurants.find((x) => x.id === id);
    setRestState({
      bg_image: r?.bg_image,
      overlay_color: r?.overlay_color || "#000000",
      overlay_opacity: r?.overlay_opacity ?? 0.4,
    });
  };

  const handleSaveHome = () => {
    settingsStore.save(settings);
    if (settings.primary_color) {
      document.documentElement.style.setProperty("--primary", hexToHsl(settings.primary_color));
    }
    toast({ title: t("Homepage background saved!", "تم حفظ خلفية الصفحة الرئيسية!") });
  };

  const handleSaveRest = () => {
    if (!selectedRest) return;
    restaurantStore.save({
      ...selectedRest,
      bg_image: restState.bg_image,
      overlay_color: restState.overlay_color || "#000000",
      overlay_opacity: restState.overlay_opacity ?? 0.4,
    });
    toast({ title: t("Restaurant background saved!", "تم حفظ خلفية المطعم!") });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">{t("🎨 Design & Backgrounds", "🎨 التصميم والخلفيات")}</h1>
        <p className="text-sm text-muted-foreground">{t("Control homepage and restaurant backgrounds, overlays, and slogans.", "تحكم في خلفيات الصفحة الرئيسية والمطاعم والطبقات العلوية والشعارات.")}</p>
      </motion.div>

      {/* Theme Color */}
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t("🎨 Brand Color", "🎨 لون العلامة التجارية")}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{t("Change the primary accent color used across buttons, prices, and highlights.", "غيّر اللون الرئيسي المستخدم في الأزرار والأسعار والإبرازات.")}</p>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={settings.primary_color || "#FF7A00"}
            onChange={(e) => setSettings((s) => ({ ...s, primary_color: e.target.value }))}
            className="w-14 h-11 rounded-xl cursor-pointer border border-white/10 bg-background p-0.5"
            data-testid="input-primary-color"
          />
          <span className="text-sm font-mono text-muted-foreground">{settings.primary_color || "#FF7A00"}</span>
          <button
            onClick={() => setSettings((s) => ({ ...s, primary_color: "#FF7A00" }))}
            className="text-xs text-muted-foreground hover:text-foreground border border-white/10 px-3 py-1.5 rounded-lg transition"
          >
            {t("Reset default", "إعادة التعيين")}
          </button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {["#FF7A00", "#E63946", "#2196F3", "#4CAF50", "#9C27B0", "#FF5722"].map((color) => (
            <button
              key={color}
              onClick={() => setSettings((s) => ({ ...s, primary_color: color }))}
              className="w-8 h-8 rounded-full border-2 transition hover:scale-110"
              style={{ background: color, borderColor: settings.primary_color === color ? "white" : "transparent" }}
            />
          ))}
        </div>
        <button
          onClick={handleSaveHome}
          className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          data-testid="btn-save-theme"
        >
          <Save size={14} /> {t("Apply Theme Color", "تطبيق لون العلامة")}
        </button>
      </div>

      {/* Homepage Section */}
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Monitor size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t("Homepage Background", "خلفية الصفحة الرئيسية")}</h2>
        </div>

        {/* Slogan */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("Slogan (EN)", "الشعار (EN)")}</label>
            <input
              value={settings.slogan_en}
              onChange={(e) => setSettings((s) => ({ ...s, slogan_en: e.target.value }))}
              className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder="Order from the best..."
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("Slogan (AR)", "الشعار (AR)")}</label>
            <input
              value={settings.slogan_ar}
              onChange={(e) => setSettings((s) => ({ ...s, slogan_ar: e.target.value }))}
              className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
              placeholder="اطلب من أفضل..."
              dir="rtl"
            />
          </div>
        </div>

        {/* Background type */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">{t("Background Type", "نوع الخلفية")}</label>
          <div className="flex gap-2">
            {(["color", "image", "gradient"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSettings((s) => ({ ...s, homepage_bg_type: type }))}
                className={`flex-1 py-2 rounded-xl text-xs font-medium border transition ${settings.homepage_bg_type === type ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"}`}
              >
                {type === "color" ? t("Solid", "لون") : type === "image" ? t("Image URL", "رابط صورة") : t("Gradient", "تدرج")}
              </button>
            ))}
          </div>
        </div>

        {/* Image URL for homepage */}
        {settings.homepage_bg_type === "image" && (
          <UrlImageField
            label={t("Background Image URL", "رابط صورة الخلفية")}
            value={settings.homepage_bg_image}
            onChange={(v) => setSettings((s) => ({ ...s, homepage_bg_image: v }))}
            placeholder="https://example.com/homepage-bg.webp"
            previewHeight={130}
            testId="input-home-bg-url"
          />
        )}

        {/* Overlay controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t("Overlay color", "لون الطبقة")}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.homepage_overlay_color}
                onChange={(e) => setSettings((s) => ({ ...s, homepage_overlay_color: e.target.value }))}
                className="w-10 h-9 rounded-lg cursor-pointer border border-white/10 bg-background p-0.5"
              />
              <span className="text-xs font-mono text-muted-foreground">{settings.homepage_overlay_color}</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">
              <span>{t("Overlay opacity", "شفافية الطبقة")}</span>
              <span className="font-mono text-primary ml-2">{Math.round(settings.homepage_overlay_opacity * 100)}%</span>
            </label>
            <input
              type="range" min={0} max={1} step={0.05}
              value={settings.homepage_overlay_opacity}
              onChange={(e) => setSettings((s) => ({ ...s, homepage_overlay_opacity: Number(e.target.value) }))}
              className="w-full accent-primary"
            />
          </div>
        </div>

        <button
          onClick={handleSaveHome}
          className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
          data-testid="btn-save-home-bg"
        >
          <Save size={14} /> {t("Save Homepage Settings", "حفظ إعدادات الصفحة الرئيسية")}
        </button>
      </div>

      {/* Per-Restaurant Background */}
      <div className="bg-card border border-white/5 rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Image size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">{t("Restaurant Background", "خلفية المطعم")}</h2>
        </div>

        <select
          value={selectedRestId}
          onChange={(e) => handleRestSelect(e.target.value)}
          className="w-full bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none"
          data-testid="select-restaurant-bg"
        >
          <option value="">{t("-- Select a restaurant --", "-- اختر مطعماً --")}</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>{t(r.name_en, r.name_ar)}</option>
          ))}
        </select>

        {selectedRestId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <UrlImageField
              label={t("Background Image URL", "رابط صورة الخلفية")}
              value={restState.bg_image}
              onChange={(v) => setRestState((s) => ({ ...s, bg_image: v }))}
              placeholder="https://example.com/restaurant-bg.webp"
              previewHeight={110}
              testId="input-rest-bg-url"
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Overlay color", "لون الطبقة")}</label>
                <input
                  type="color"
                  value={restState.overlay_color || "#000000"}
                  onChange={(e) => setRestState((s) => ({ ...s, overlay_color: e.target.value }))}
                  className="w-full h-9 rounded-lg cursor-pointer border border-white/10 bg-background p-0.5"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">
                  <span>{t("Opacity", "الشفافية")}</span>
                  <span className="font-mono text-primary ml-2">{Math.round((restState.overlay_opacity ?? 0.4) * 100)}%</span>
                </label>
                <input
                  type="range" min={0} max={0.9} step={0.05}
                  value={restState.overlay_opacity ?? 0.4}
                  onChange={(e) => setRestState((s) => ({ ...s, overlay_opacity: Number(e.target.value) }))}
                  className="w-full accent-primary"
                />
              </div>
            </div>

            <button
              onClick={handleSaveRest}
              className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
              data-testid="btn-save-rest-bg"
            >
              <Save size={14} /> {t("Save Restaurant Background", "حفظ خلفية المطعم")}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
