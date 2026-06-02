import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore } from "@/lib/store";
import type { Restaurant } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { Plus, Trash2, Edit2, Check, X, Link, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function Field({ label, value, onChange, ...props }: { label: string; value: string; onChange: (v: string) => void; [k: string]: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" {...props} />
    </div>
  );
}

function UrlImageInput({
  label,
  value,
  onChange,
  placeholder,
  previewHeight = 80,
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

  const handleChange = (url: string) => {
    setError("");
    onChange(url || undefined);
  };

  return (
    <div className="space-y-2">
      <label className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link size={11} /> {label}
      </label>
      {value && (
        <div className="relative rounded-xl overflow-hidden border border-white/10 group" style={{ height: previewHeight }}>
          <img
            src={value}
            alt="preview"
            className="w-full h-full object-cover"
            onError={() => setError("Image failed to load. Check the URL.")}
          />
          <button
            type="button"
            onClick={() => { onChange(undefined); setError(""); }}
            className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition hover:text-red-400"
          >
            <X size={11} />
          </button>
        </div>
      )}
      <input
        type="url"
        placeholder={placeholder || "https://example.com/image.webp"}
        value={value || ""}
        onChange={(e) => handleChange(e.target.value)}
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

const COLOR_PRESETS = ["#6A9B3B", "#C1121F", "#FF5722", "#FF7A00", "#6A0DAD", "#0EA5E9", "#10B981", "#F59E0B"];

const emptyForm: Partial<Restaurant> = {
  name_en: "", name_ar: "", logo: "", logoType: "emoji", color: "#FF7A00",
  description_en: "", description_ar: "", tagline_en: "", tagline_ar: "", cover_image: undefined,
};

function LogoDisplay({ restaurant }: { restaurant: Restaurant }) {
  if (restaurant.logoType === "image" && restaurant.logo) {
    return <img src={restaurant.logo} alt={restaurant.name_en} className="w-full h-full object-cover rounded-xl" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />;
  }
  return <span className="text-2xl">{restaurant.logo || "🍽️"}</span>;
}

export default function AdminRestaurants() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Restaurant>>(emptyForm);

  const handleSave = () => {
    if (!form.name_en?.trim() || !form.name_ar?.trim()) {
      toast({ title: t("Required fields missing", "حقول مطلوبة مفقودة"), variant: "destructive" }); return;
    }
    const restaurant: Restaurant = {
      id: editingId || `rest-${Date.now()}`,
      name_en: form.name_en!,
      name_ar: form.name_ar!,
      logo: form.logo || "",
      logoType: form.logoType || "emoji",
      color: form.color || "#FF7A00",
      description_en: form.description_en || "",
      description_ar: form.description_ar || "",
      cover_image: form.cover_image,
      tagline_en: form.tagline_en || "",
      tagline_ar: form.tagline_ar || "",
    };
    try {
      restaurantStore.save(restaurant);
      toast({ title: editingId ? t("Updated!", "تم التحديث!") : t("Added!", "تمت الإضافة!") });
      setShowAdd(false);
      setEditingId(null);
      setForm(emptyForm);
    } catch (err) {
      toast({ title: t("Save failed", "فشل الحفظ"), description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const handleEdit = (r: Restaurant) => {
    setEditingId(r.id);
    setForm({ ...r });
    setShowAdd(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    if (!confirm(t("Delete this restaurant?", "حذف هذا المطعم؟"))) return;
    restaurantStore.delete(id);
    toast({ title: t("Deleted", "تم الحذف") });
  };

  const handleCancel = () => { setShowAdd(false); setEditingId(null); setForm(emptyForm); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("Restaurants", "المطاعم")}</h1>
        <button onClick={() => { setShowAdd(true); setEditingId(null); setForm(emptyForm); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition" data-testid="btn-add-restaurant">
          <Plus size={14} /> {t("Add Restaurant", "إضافة مطعم")}
        </button>
      </div>

      {/* Form */}
      {showAdd && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-card border border-white/10 rounded-2xl p-5 mb-6 space-y-5">
          <h3 className="font-semibold text-foreground">{editingId ? t("Edit Restaurant", "تعديل المطعم") : t("New Restaurant", "مطعم جديد")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("Name (EN)", "الاسم (EN)")} value={form.name_en || ""} onChange={(v) => setForm({ ...form, name_en: v })} data-testid="input-rest-name-en" />
            <Field label={t("Name (AR)", "الاسم (AR)")} value={form.name_ar || ""} onChange={(v) => setForm({ ...form, name_ar: v })} />
            <div className="col-span-2">
              <Field label={t("Description (EN)", "الوصف (EN)")} value={form.description_en || ""} onChange={(v) => setForm({ ...form, description_en: v })} />
            </div>
            <div className="col-span-2">
              <Field label={t("Description (AR)", "الوصف (AR)")} value={form.description_ar || ""} onChange={(v) => setForm({ ...form, description_ar: v })} />
            </div>
            <Field label={t("Tagline (EN)", "الشعار القصير (EN)")} value={form.tagline_en || ""} onChange={(v) => setForm({ ...form, tagline_en: v })} placeholder="e.g. Fresh & crispy everyday" />
            <Field label={t("Tagline (AR)", "الشعار القصير (AR)")} value={form.tagline_ar || ""} onChange={(v) => setForm({ ...form, tagline_ar: v })} placeholder="مثال: الأفضل دائماً" />
          </div>

          {/* Cover Image URL */}
          <div className="border border-white/10 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <ImageIcon size={13} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Cover Image", "صورة الغلاف")}</span>
              <span className="text-[10px] text-muted-foreground/50">{t("shown on restaurant card & page", "تظهر على بطاقة المطعم والصفحة")}</span>
            </div>
            <UrlImageInput
              label={t("Cover Image URL (optional)", "رابط صورة الغلاف (اختياري)")}
              value={form.cover_image}
              onChange={(v) => setForm((f) => ({ ...f, cover_image: v }))}
              placeholder="https://example.com/restaurant-cover.webp"
              previewHeight={110}
              testId="input-cover-image-url"
            />
          </div>

          {/* Logo Section */}
          <div className="border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={13} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Logo", "الشعار")}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0" style={{ background: `${form.color}20` }}>
                {form.logoType === "image" && form.logo ? (
                  <img src={form.logo} alt="logo" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <span className="text-3xl">{form.logo || "🍽️"}</span>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Emoji logo", "إيموجي")}</label>
                  <input
                    placeholder={t("e.g. 🍗", "مثل 🍗")}
                    value={form.logoType === "emoji" ? form.logo || "" : ""}
                    onChange={(e) => setForm({ ...form, logo: e.target.value, logoType: "emoji" })}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                  />
                </div>
                <UrlImageInput
                  label={t("or: Logo Image URL", "أو: رابط صورة الشعار")}
                  value={form.logoType === "image" ? form.logo : undefined}
                  onChange={(v) => setForm((f) => ({ ...f, logo: v || "", logoType: v ? "image" : "emoji" }))}
                  placeholder="https://example.com/logo.png"
                  previewHeight={60}
                  testId="input-logo-url"
                />
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">{t("Theme Color", "لون القالب")}</label>
            <div className="flex items-center gap-3 flex-wrap">
              {COLOR_PRESETS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? "scale-125 ring-2 ring-white/40" : "hover:scale-110"}`}
                  style={{ background: c }}
                />
              ))}
              <input type="color" value={form.color || "#FF7A00"} onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-8 h-8 rounded-full border border-white/10 cursor-pointer" title={t("Custom color", "لون مخصص")} />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium" data-testid="btn-save-restaurant">
              <Check size={14} className="inline mr-1" />{t("Save", "حفظ")}
            </button>
            <button type="button" onClick={handleCancel} className="px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground">
              <X size={14} className="inline mr-1" />{t("Cancel", "إلغاء")}
            </button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {restaurants.map((restaurant) => (
          <div key={restaurant.id} className="bg-card border border-white/5 rounded-2xl overflow-hidden" data-testid={`admin-restaurant-${restaurant.id}`}>
            <div className="relative h-20 overflow-hidden">
              {restaurant.cover_image ? (
                <img src={restaurant.cover_image} alt="" className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${restaurant.color}25, ${restaurant.color}08)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A]/80 to-transparent" />
              <div className="absolute bottom-2 right-3 flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ background: restaurant.color }} />
                <span className="text-xs text-white/60">{restaurant.color}</span>
              </div>
              {restaurant.cover_image && (
                <span className="absolute top-2 left-2 text-[9px] bg-blue-600/80 text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Link size={8} /> URL
                </span>
              )}
            </div>
            <div className="p-4 flex items-start gap-3">
              <div className="-mt-8 w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-[#1A1A1A] relative z-10" style={{ background: `${restaurant.color}20` }}>
                <LogoDisplay restaurant={restaurant} />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-foreground">{t(restaurant.name_en, restaurant.name_ar)}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{t(restaurant.tagline_en || restaurant.description_en, restaurant.tagline_ar || restaurant.description_ar)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleEdit(restaurant)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition" data-testid={`btn-edit-restaurant-${restaurant.id}`}>
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(restaurant.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition" data-testid={`btn-delete-restaurant-${restaurant.id}`}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
