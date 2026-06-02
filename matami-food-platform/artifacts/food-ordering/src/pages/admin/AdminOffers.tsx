import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore, offerStore } from "@/lib/store";
import type { Offer } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { Plus, Trash2, Edit2, Check, X, ToggleLeft, ToggleRight, Percent, Truck, Banknote, Link, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function F({ label, value, onChange, ...p }: { label: string; value: string | number; onChange: (v: string) => void; [k: string]: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" {...p} />
    </div>
  );
}

const emptyForm: Partial<Offer> = {
  title_en: "", title_ar: "", description_en: "", description_ar: "",
  type: "percentage", value: 10, restaurant_id: "global", active: true, code: "",
  image: undefined, image_url: undefined,
};

function OfferTypeIcon({ type }: { type: Offer["type"] }) {
  if (type === "percentage") return <Percent size={16} className="text-primary" />;
  if (type === "free_delivery") return <Truck size={16} className="text-primary" />;
  return <Banknote size={16} className="text-primary" />;
}

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

export default function AdminOffers() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const offers = useStore(useCallback(() => offerStore.getAll(), []));
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Offer>>(emptyForm);
  const [imgUrlError, setImgUrlError] = useState("");

  const imgSrc = form.image_url || form.image;

  const handleSave = () => {
    if (!form.title_en?.trim() || !form.title_ar?.trim()) {
      toast({ title: t("Required: titles (EN & AR)", "مطلوب: العنوان بالعربي والإنجليزي"), variant: "destructive" }); return;
    }
    if (form.image_url) {
      const err = validateUrl(form.image_url);
      if (err) { setImgUrlError(err); return; }
    }
    const offer: Offer = {
      id: editingId || `offer-${Date.now()}`,
      title_en: form.title_en!, title_ar: form.title_ar!,
      description_en: form.description_en || "", description_ar: form.description_ar || "",
      image: form.image_url || form.image,
      image_url: form.image_url,
      type: form.type || "percentage",
      value: form.value || 0,
      restaurant_id: form.restaurant_id || "global",
      active: form.active ?? true,
      code: form.code?.trim() || undefined,
      expiry_date: form.expiry_date,
      show_as_banner: form.show_as_banner,
      banner_cta_en: form.banner_cta_en,
      banner_cta_ar: form.banner_cta_ar,
    };
    try {
      offerStore.save(offer);
      toast({ title: editingId ? t("Offer updated!", "تم تحديث العرض!") : t("Offer added!", "تمت إضافة العرض!") });
      setShowForm(false); setEditingId(null); setForm(emptyForm); setImgUrlError("");
    } catch (err) {
      toast({ title: t("Save failed", "فشل الحفظ"), description: err instanceof Error ? err.message : "", variant: "destructive" });
    }
  };

  const handleEdit = (o: Offer) => {
    setEditingId(o.id);
    setForm({ ...o, image_url: o.image_url || (o.image?.startsWith("http") ? o.image : undefined) });
    setImgUrlError("");
    setShowForm(true);
  };
  const handleDelete = (id: string) => {
    if (!confirm(t("Delete this offer?", "حذف هذا العرض؟"))) return;
    offerStore.delete(id);
    toast({ title: t("Deleted", "تم الحذف") });
  };
  const toggleActive = (o: Offer) => { offerStore.save({ ...o, active: !o.active }); };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("Offers & Promotions", "العروض والترقيات")}</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm); setImgUrlError(""); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition" data-testid="btn-add-offer">
          <Plus size={14} /> {t("Add Offer", "إضافة عرض")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-card border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-foreground">{editingId ? t("Edit Offer", "تعديل العرض") : t("New Offer", "عرض جديد")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <F label={t("Title (EN)", "العنوان (EN)")} value={form.title_en || ""} onChange={(v) => setForm({ ...form, title_en: v })} />
            <F label={t("Title (AR)", "العنوان (AR)")} value={form.title_ar || ""} onChange={(v) => setForm({ ...form, title_ar: v })} />
            <F label={t("Description (EN)", "الوصف (EN)")} value={form.description_en || ""} onChange={(v) => setForm({ ...form, description_en: v })} />
            <F label={t("Description (AR)", "الوصف (AR)")} value={form.description_ar || ""} onChange={(v) => setForm({ ...form, description_ar: v })} />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Type", "النوع")}</label>
              <select value={form.type || "percentage"} onChange={(e) => setForm({ ...form, type: e.target.value as Offer["type"] })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
                <option value="percentage">{t("Percentage %", "نسبة مئوية %")}</option>
                <option value="fixed">{t("Fixed SAR", "مبلغ ثابت ريال")}</option>
                <option value="free_delivery">{t("Free Delivery", "توصيل مجاني")}</option>
              </select>
            </div>
            {form.type !== "free_delivery" && (
              <F label={t("Value", "القيمة")} value={form.value || ""} onChange={(v) => setForm({ ...form, value: Number(v) })} type="number" min="0" />
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Restaurant", "المطعم")}</label>
              <select value={form.restaurant_id || "global"} onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
                <option value="global">{t("🌐 All Restaurants (Global)", "🌐 جميع المطاعم")}</option>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{t(r.name_en, r.name_ar)}</option>)}
              </select>
            </div>
            <F label={t("Coupon Code (optional)", "كود العرض (اختياري)")} value={form.code || ""} onChange={(v) => setForm({ ...form, code: v.toUpperCase() })} placeholder="e.g. SAVE10" />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Expiry Date (optional)", "تاريخ الانتهاء (اختياري)")}</label>
              <input type="datetime-local" value={form.expiry_date || ""} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
            </div>
          </div>

          {/* Banner Image URL */}
          <div className="border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ImageIcon size={13} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Banner Image (optional)", "صورة البانر (اختياري)")}</span>
            </div>

            {imgSrc && (
              <div className="relative rounded-xl overflow-hidden border border-white/10" style={{ height: 120 }}>
                <img
                  src={imgSrc}
                  alt="preview"
                  className="w-full h-full object-cover"
                  onError={() => setImgUrlError(t("Image failed to load. Check the URL.", "تعذّر تحميل الصورة. تحقق من الرابط."))}
                />
                <button
                  type="button"
                  onClick={() => { setForm((f) => ({ ...f, image: undefined, image_url: undefined })); setImgUrlError(""); }}
                  className="absolute top-2 right-2 w-6 h-6 bg-black/70 rounded-full flex items-center justify-center text-white hover:text-red-400 transition"
                >
                  <X size={11} />
                </button>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Link size={11} /> {t("Image URL", "رابط الصورة")}
              </label>
              <input
                type="url"
                placeholder="https://example.com/offer-banner.webp"
                value={form.image_url || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => ({ ...f, image_url: v || undefined, image: v || undefined }));
                  setImgUrlError("");
                }}
                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                data-testid="input-offer-image-url"
              />
              {imgUrlError && <p className="text-xs text-red-400">{imgUrlError}</p>}
              {imgSrc && !imgUrlError && (
                <p className="text-[11px] text-green-400">{t("Image URL set — no file stored locally", "تم تعيين رابط الصورة — لا يُخزَّن ملف محلياً")}</p>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active ?? true} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-primary" />
            <span className="text-muted-foreground">{t("Active (show to customers)", "نشط (يظهر للعملاء)")}</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.show_as_banner ?? false} onChange={(e) => setForm({ ...form, show_as_banner: e.target.checked })} className="accent-primary" />
            <span className="text-muted-foreground">{t("Show as Hero Banner on homepage (requires image URL)", "عرض كبانر رئيسي في الصفحة الرئيسية (يتطلب رابط صورة)")}</span>
          </label>
          {form.show_as_banner && (
            <div className="grid grid-cols-2 gap-3 mt-1">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Button text (EN)", "نص الزر (EN)")}</label>
                <input value={form.banner_cta_en || ""} onChange={(e) => setForm({ ...form, banner_cta_en: e.target.value })} placeholder="Order Now" className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Button text (AR)", "نص الزر (AR)")}</label>
                <input value={form.banner_cta_ar || ""} onChange={(e) => setForm({ ...form, banner_cta_ar: e.target.value })} placeholder="اطلب الآن" className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium" data-testid="btn-save-offer"><Check size={13} className="inline mr-1" />{t("Save", "حفظ")}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setImgUrlError(""); }} className="px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground"><X size={13} className="inline mr-1" />{t("Cancel", "إلغاء")}</button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {offers.length === 0 && <p className="text-center text-muted-foreground py-8">{t("No offers yet", "لا توجد عروض بعد")}</p>}
        {offers.map((offer) => {
          const restName = offer.restaurant_id === "global"
            ? t("All Restaurants", "جميع المطاعم")
            : t(restaurants.find((r) => r.id === offer.restaurant_id)?.name_en || "", restaurants.find((r) => r.id === offer.restaurant_id)?.name_ar || "");
          const offerImg = offer.image_url || offer.image;
          return (
            <div key={offer.id} className="bg-card border border-white/5 rounded-2xl p-4" data-testid={`admin-offer-${offer.id}`}>
              <div className="flex items-start gap-3">
                {offerImg && (
                  <img src={offerImg} alt="" className="h-14 w-20 rounded-lg object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <OfferTypeIcon type={offer.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t(offer.title_en, offer.title_ar)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(offer.description_en, offer.description_ar)}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full text-muted-foreground">{restName}</span>
                        {offer.type !== "free_delivery" && offer.value > 0 && (
                          <span className="text-xs font-bold text-primary">{offer.value}{offer.type === "percentage" ? "%" : " SAR"}</span>
                        )}
                        {offer.code && <code className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded font-mono">{offer.code}</code>}
                        {offerImg && <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Link size={8} /> URL</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${offer.active ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"}`}>
                          {offer.active ? t("Active", "نشط") : t("Inactive", "غير نشط")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => toggleActive(offer)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition" data-testid={`btn-toggle-offer-${offer.id}`}>
                        {offer.active ? <ToggleRight size={20} className="text-primary" /> : <ToggleLeft size={20} />}
                      </button>
                      <button onClick={() => handleEdit(offer)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => handleDelete(offer.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition" data-testid={`btn-delete-offer-${offer.id}`}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
