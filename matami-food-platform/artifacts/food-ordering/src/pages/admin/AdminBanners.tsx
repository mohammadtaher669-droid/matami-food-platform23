import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Edit2, Trash2, GripVertical, Check, X, Link as LinkIcon, Image as ImageIcon, Video, Upload } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { bannerStore, restaurantStore } from "@/lib/store";
import type { Banner } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";
import ImageWithFallback from "@/components/ImageWithFallback";
import ImageUploader from "@/components/ImageUploader";

const EMPTY: Omit<Banner, "id"> = {
  title_en: "",
  title_ar: "",
  subtitle_en: "",
  subtitle_ar: "",
  button_text_en: "",
  button_text_ar: "",
  link: "",
  active: true,
  type: "homepage",
  sort_order: 0,
  image: undefined,
  image_url: undefined,
  video_url: undefined,
};

function validateUrl(url: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (!["http:", "https:"].includes(u.protocol)) return "URL must start with http:// or https://";
    return "";
  } catch {
    return "Invalid URL format";
  }
}

export default function AdminBanners() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const banners = useStore(useCallback(() => bannerStore.getAll(), []));
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Banner, "id">>(EMPTY);
  const [imgMode, setImgMode] = useState<"upload" | "url">("upload");
  const [imgUrlError, setImgUrlError] = useState("");
  const [videoUrlError, setVideoUrlError] = useState("");

  const handleEdit = (banner: Banner) => {
    const { id, ...rest } = banner;
    setForm(rest);
    setEditingId(id);
    setImgMode(rest.image ? "upload" : "url");
    setImgUrlError("");
    setVideoUrlError("");
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.title_en.trim() && !form.title_ar.trim()) {
      toast({ title: t("Title is required", "العنوان مطلوب"), variant: "destructive" });
      return;
    }
    const imgErr = form.image_url ? validateUrl(form.image_url) : "";
    const vidErr = form.video_url ? validateUrl(form.video_url) : "";
    if (imgErr) { setImgUrlError(imgErr); return; }
    if (vidErr) { setVideoUrlError(vidErr); return; }

    const id = editingId || ("b_" + Date.now());
    const saved: Banner = {
      id,
      ...form,
      sort_order: form.sort_order || banners.length,
    };
    try {
      bannerStore.save(saved);
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY);
      setImgUrlError("");
      setVideoUrlError("");
      toast({ title: t("Banner saved!", "تم حفظ البانر!") });
    } catch (err) {
      toast({ title: t("Save failed", "فشل الحفظ"), description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const handleDelete = (id: string) => {
    bannerStore.delete(id);
    toast({ title: t("Deleted", "تم الحذف") });
  };

  const toggleActive = (banner: Banner) => {
    bannerStore.save({ ...banner, active: !banner.active });
  };

  const typeColors: Record<Banner["type"], string> = {
    homepage: "#6366f1",
    restaurant: "#10b981",
    offer: "#f59e0b",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("📢 Banners & Marketing", "📢 البانرات والتسويق")}</h1>
            <p className="text-sm text-muted-foreground">{t("Manage homepage, restaurant, and offer banners.", "إدارة بانرات الصفحة الرئيسية والمطاعم والعروض.")}</p>
          </div>
          {!showForm && (
            <button
              onClick={() => { setForm({ ...EMPTY, sort_order: banners.length }); setEditingId(null); setImgUrlError(""); setVideoUrlError(""); setShowForm(true); }}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium"
              data-testid="btn-add-banner"
            >
              <Plus size={14} /> {t("Add Banner", "إضافة بانر")}
            </button>
          )}
        </div>
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            onSubmit={(e) => { e.preventDefault(); handleSave(); }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card border border-primary/20 rounded-2xl p-5 space-y-4"
          >
            <h2 className="text-sm font-bold text-foreground">{editingId ? t("Edit Banner", "تعديل البانر") : t("New Banner", "بانر جديد")}</h2>

            {/* Image — toggle between Upload and URL */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImageIcon size={11} /> {t("Banner Image", "صورة البانر")}
                </label>
                <div className="flex rounded-lg overflow-hidden border border-white/10 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setImgMode("upload")}
                    className={`px-2.5 py-1 flex items-center gap-1 transition ${imgMode === "upload" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Upload size={10} /> {t("Upload", "رفع")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setImgMode("url")}
                    className={`px-2.5 py-1 flex items-center gap-1 transition ${imgMode === "url" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <LinkIcon size={10} /> URL
                  </button>
                </div>
              </div>

              {imgMode === "upload" ? (
                <ImageUploader
                  preset="hero_banner"
                  value={form.image}
                  onChange={(url) => setForm((f) => ({ ...f, image: url, image_url: undefined }))}
                  onDelete={() => setForm((f) => ({ ...f, image: undefined }))}
                  label={t("Upload banner image (JPG/PNG/WebP, max 2MB)", "رفع صورة البانر (JPG/PNG/WebP، حد 2MB)")}
                />
              ) : (
                <div className="space-y-1">
                  <input
                    type="url"
                    placeholder="https://example.com/banner.webp"
                    value={form.image_url || ""}
                    onChange={(e) => { setForm((f) => ({ ...f, image_url: e.target.value || undefined, image: undefined })); setImgUrlError(""); }}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                  {imgUrlError && <p className="text-xs text-red-400">{imgUrlError}</p>}
                  {form.image_url && !imgUrlError && (
                    <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 110 }}>
                      <img
                        src={form.image_url}
                        alt="preview"
                        className="w-full h-full object-cover"
                        onError={() => setImgUrlError(t("Image failed to load. Check the URL.", "تعذّر تحميل الصورة. تحقق من الرابط."))}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Video URL */}
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Video size={11} /> {t("Promo Video URL (optional, overrides image)", "رابط فيديو ترويجي (اختياري، يُقدَّم على الصورة)")}
              </label>
              <input
                type="url"
                placeholder="https://example.com/promo.mp4"
                value={form.video_url || ""}
                onChange={(e) => { setForm((f) => ({ ...f, video_url: e.target.value || undefined })); setVideoUrlError(""); }}
                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
              />
              {videoUrlError && <p className="text-xs text-red-400">{videoUrlError}</p>}
              {form.video_url && !videoUrlError && (
                <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 110 }}>
                  <video src={form.video_url} className="w-full h-full object-cover" autoPlay muted loop playsInline
                    onError={() => setVideoUrlError(t("Video failed to load.", "تعذّر تحميل الفيديو."))} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                  <span className="absolute bottom-2 left-2 text-[10px] text-white/70 bg-black/40 px-2 py-0.5 rounded-full">
                    {t("Video preview", "معاينة الفيديو")}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Title (EN)", "العنوان (EN)")}</label>
                <input value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" placeholder="Summer Sale" data-testid="input-banner-title-en" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Title (AR)", "العنوان (AR)")}</label>
                <input value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" placeholder="تخفيضات الصيف" dir="rtl" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Subtitle (EN)", "العنوان الفرعي (EN)")}</label>
                <input value={form.subtitle_en || ""} onChange={(e) => setForm({ ...form, subtitle_en: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" placeholder="Limited offers" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Subtitle (AR)", "العنوان الفرعي (AR)")}</label>
                <input value={form.subtitle_ar || ""} onChange={(e) => setForm({ ...form, subtitle_ar: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" placeholder="عروض محدودة" dir="rtl" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Button (EN)", "زر (EN)")}</label>
                <input value={form.button_text_en || ""} onChange={(e) => setForm({ ...form, button_text_en: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" placeholder="Order Now" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Button (AR)", "زر (AR)")}</label>
                <input value={form.button_text_ar || ""} onChange={(e) => setForm({ ...form, button_text_ar: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" placeholder="اطلب الآن" dir="rtl" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Link URL (optional)", "رابط (اختياري)")}</label>
              <div className="flex items-center gap-2 bg-background border border-white/10 rounded-xl px-3 py-2">
                <LinkIcon size={13} className="text-muted-foreground" />
                <input value={form.link || ""} onChange={(e) => setForm({ ...form, link: e.target.value })} className="flex-1 bg-transparent text-sm text-foreground focus:outline-none" placeholder="/restaurant/..." />
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-32">
                <label className="text-xs text-muted-foreground mb-1 block">{t("Banner type", "نوع البانر")}</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Banner["type"] })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
                  <option value="homepage">{t("Homepage", "الصفحة الرئيسية")}</option>
                  <option value="restaurant">{t("Restaurant", "مطعم")}</option>
                  <option value="offer">{t("Offer page", "صفحة العروض")}</option>
                </select>
              </div>
              {form.type === "restaurant" && (
                <div className="flex-1 min-w-32">
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Restaurant", "المطعم")}</label>
                  <select value={form.restaurant_id || ""} onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
                    <option value="">{t("All restaurants", "جميع المطاعم")}</option>
                    {restaurants.map((r) => <option key={r.id} value={r.id}>{t(r.name_en, r.name_ar)}</option>)}
                  </select>
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-primary" />
              <span className="text-muted-foreground">{t("Active", "نشط")}</span>
            </label>

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium flex items-center gap-1" data-testid="btn-save-banner">
                <Check size={13} /> {t("Save", "حفظ")}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setImgUrlError(""); setVideoUrlError(""); }} className="px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground flex items-center gap-1">
                <X size={13} /> {t("Cancel", "إلغاء")}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Banner list */}
      <div className="space-y-3">
        {banners.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <span className="text-4xl opacity-30 block mb-3">📢</span>
            <p className="text-sm">{t("No banners yet. Add one to get started.", "لا توجد بانرات. أضف واحداً للبدء.")}</p>
          </div>
        ) : (
          banners.map((banner) => (
            <motion.div
              key={banner.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-white/5 rounded-2xl overflow-hidden"
              data-testid={`banner-row-${banner.id}`}
            >
              <div className="flex items-center gap-3 p-3">
                <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0" />
                <div className="w-16 h-10 rounded-lg flex-shrink-0 overflow-hidden border border-white/10">
                  {banner.video_url ? (
                    <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                      <Video size={16} className="text-purple-400" />
                    </div>
                  ) : (banner.image_url || banner.image) ? (
                    <ImageWithFallback src={banner.image_url || banner.image} alt="" className="w-full h-full object-cover" preset="hero_banner" />
                  ) : (
                    <div className="w-full h-full bg-white/5 flex items-center justify-center">
                      <span className="text-lg">📢</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground line-clamp-1">{banner.title_en || banner.title_ar}</p>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: typeColors[banner.type] }}>{banner.type}</span>
                    {banner.video_url && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white bg-purple-600">video</span>}
                    {banner.image_url && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-blue-400 bg-blue-500/10 flex items-center gap-0.5"><LinkIcon size={8} /> URL</span>}
                    {!banner.active && <span className="text-[10px] text-muted-foreground border border-white/10 px-1.5 py-0.5 rounded-full">{t("Inactive", "غير نشط")}</span>}
                  </div>
                  {(banner.subtitle_en || banner.subtitle_ar) && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{banner.subtitle_en}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => toggleActive(banner)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition ${banner.active ? "text-green-400 hover:bg-green-400/10" : "text-muted-foreground hover:bg-white/5"}`}>
                    <Check size={14} />
                  </button>
                  <button onClick={() => handleEdit(banner)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => handleDelete(banner.id)} className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
