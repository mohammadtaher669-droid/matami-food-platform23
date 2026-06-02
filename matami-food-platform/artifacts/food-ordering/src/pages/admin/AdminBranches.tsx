import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore, branchStore } from "@/lib/store";
import type { Branch } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import WorkingHoursStatus from "@/components/WorkingHoursStatus";
import BranchMapPicker from "@/components/BranchMapPicker";
import type { MapAddress } from "@/components/BranchMapPicker";
import {
  Phone, MapPin, DollarSign, Plus, Trash2, Edit2,
  Check, X, ExternalLink, AlertCircle, Navigation,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function extractCoordsFromMapsUrl(url: string): { lat: number; lng: number } | null {
  try {
    const atMatch = url.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
    const qMatch = url.match(/[?&](?:q|ll)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
    return null;
  } catch { return null; }
}

function isValidMapsUrl(url: string): boolean {
  if (!url.trim()) return true;
  try { new URL(url); } catch { return false; }
  return (
    url.includes("google.com/maps") ||
    url.includes("maps.google.com") ||
    url.includes("goo.gl/maps") ||
    url.includes("maps.app.goo.gl")
  );
}

function F({ label, value, onChange, ...p }: { label: string; value: string | number; onChange: (v: string) => void; [k: string]: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" {...p} />
    </div>
  );
}

const emptyForm: Partial<Branch> = {
  restaurant_id: "", name_en: "", name_ar: "",
  whatsapp: "", open: "09:00", close: "00:00",
  delivery_fee: 10, address_en: "", address_ar: "",
  google_maps_url: "",
};

export default function AdminBranches() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const branches = useStore(useCallback(() => branchStore.getAll(), []));
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Branch>>({ ...emptyForm, restaurant_id: "" });

  const urlValid = !form.google_maps_url || isValidMapsUrl(form.google_maps_url);

  const handleMapsUrlChange = (url: string) => {
    const coords = url ? extractCoordsFromMapsUrl(url) : null;
    setForm((f) => ({
      ...f,
      google_maps_url: url,
      ...(coords ? { center_lat: coords.lat, center_lng: coords.lng } : {}),
    }));
  };

  const handleMapChange = (lat: number, lng: number, address?: MapAddress) => {
    setForm((f) => ({
      ...f,
      center_lat: lat,
      center_lng: lng,
      google_maps_url: `https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`,
      ...(address?.en ? { address_en: address.en } : {}),
      ...(address?.ar ? { address_ar: address.ar } : {}),
    }));
  };

  const handleSave = () => {
    if (!form.restaurant_id || !form.name_en?.trim() || !form.name_ar?.trim() || !form.whatsapp?.trim()) {
      toast({ title: t("Required fields missing", "حقول مطلوبة مفقودة"), variant: "destructive" }); return;
    }
    if (form.google_maps_url && !isValidMapsUrl(form.google_maps_url)) {
      toast({ title: t("Invalid Google Maps URL", "رابط Google Maps غير صحيح"), variant: "destructive" }); return;
    }
    const branch: Branch = {
      id: editingId || `branch-${Date.now()}`,
      restaurant_id: form.restaurant_id!,
      name_en: form.name_en!, name_ar: form.name_ar!,
      whatsapp: form.whatsapp!,
      open: form.open || "09:00", close: form.close || "00:00",
      delivery_fee: form.delivery_fee || 0,
      delivery_time: form.delivery_time,
      address_en: form.address_en || "", address_ar: form.address_ar || "",
      center_lat: form.center_lat, center_lng: form.center_lng,
      google_maps_url: form.google_maps_url?.trim() || undefined,
    };
    try {
      branchStore.save(branch);
      toast({ title: editingId ? t("Updated!", "تم التحديث!") : t("Added!", "تمت الإضافة!") });
      setShowAdd(false); setEditingId(null);
      setForm({ ...emptyForm, restaurant_id: "" });
    } catch (err) {
      toast({ title: t("Save failed", "فشل الحفظ"), description: err instanceof Error ? err.message : t("Unknown error", "خطأ غير معروف"), variant: "destructive" });
    }
  };

  const handleEdit = (b: Branch) => { setEditingId(b.id); setForm({ ...b }); setShowAdd(true); };
  const handleDelete = (id: string) => {
    if (!confirm(t("Delete this branch?", "حذف هذا الفرع؟"))) return;
    branchStore.delete(id);
    toast({ title: t("Deleted", "تم الحذف") });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("Branches", "الفروع")}</h1>
        <button
          onClick={() => { setShowAdd(true); setEditingId(null); setForm({ ...emptyForm, restaurant_id: restaurants[0]?.id || "" }); }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition"
          data-testid="btn-add-branch"
        >
          <Plus size={14} /> {t("Add Branch", "إضافة فرع")}
        </button>
      </div>

      {showAdd && (
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="bg-card border border-white/10 rounded-2xl p-5 mb-6 space-y-4">
          <h3 className="font-semibold text-foreground">{editingId ? t("Edit Branch", "تعديل الفرع") : t("New Branch", "فرع جديد")}</h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Restaurant selector */}
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">{t("Restaurant", "المطعم")}</label>
              <select
                value={form.restaurant_id || ""}
                onChange={(e) => setForm({ ...form, restaurant_id: e.target.value })}
                className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
              >
                <option value="">{t("Select restaurant...", "اختر المطعم...")}</option>
                {restaurants.map((r) => <option key={r.id} value={r.id}>{t(r.name_en, r.name_ar)}</option>)}
              </select>
            </div>

            <F label={t("Branch Name (EN)", "اسم الفرع (EN)")} value={form.name_en || ""} onChange={(v) => setForm({ ...form, name_en: v })} data-testid="input-branch-name-en" />
            <F label={t("Branch Name (AR)", "اسم الفرع (AR)")} value={form.name_ar || ""} onChange={(v) => setForm({ ...form, name_ar: v })} />
            <F label={t("WhatsApp Number", "رقم واتساب")} value={form.whatsapp || ""} onChange={(v) => setForm({ ...form, whatsapp: v })} placeholder="966XXXXXXXXX" />
            <F label={t("Delivery Fee (﷼)", "رسوم التوصيل (﷼)")} value={form.delivery_fee || ""} onChange={(v) => setForm({ ...form, delivery_fee: Number(v) })} type="number" min="0" />
            <F label={t("Delivery Time (min)", "وقت التوصيل (دقيقة)")} value={form.delivery_time || ""} onChange={(v) => setForm({ ...form, delivery_time: v ? Number(v) : undefined })} type="number" min="0" placeholder="e.g. 30" />

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Opens At", "يفتح الساعة")}</label>
              <input type="time" value={form.open || "09:00"} onChange={(e) => setForm({ ...form, open: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Closes At", "يغلق الساعة")}</label>
              <input type="time" value={form.close || "00:00"} onChange={(e) => setForm({ ...form, close: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
            </div>

            {/* Address — auto-filled from map, editable */}
            <F label={t("Address (EN)", "العنوان (EN)")} value={form.address_en || ""} onChange={(v) => setForm({ ...form, address_en: v })} placeholder={t("Auto-filled from map", "يُملأ تلقائياً من الخريطة")} />
            <F label={t("Address (AR)", "العنوان (AR)")} value={form.address_ar || ""} onChange={(v) => setForm({ ...form, address_ar: v })} placeholder={t("Auto-filled from map", "يُملأ تلقائياً من الخريطة")} />
          </div>

          {/* ─── Google Maps URL ─── */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
              <Navigation size={11} />
              {t("Google Maps URL", "رابط Google Maps")}
              <span className="text-muted-foreground/40 ml-1 text-[10px]">{t("(optional — paste or auto-generated from map)", "(اختياري — الصق أو يُولَّد تلقائياً)")}</span>
            </label>
            <div className="flex gap-2">
              <input
                value={form.google_maps_url || ""}
                onChange={(e) => handleMapsUrlChange(e.target.value)}
                placeholder="https://maps.google.com/..."
                dir="ltr"
                className={`flex-1 bg-background border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 font-mono ${
                  form.google_maps_url && !urlValid ? "border-red-500/50" : "border-white/10"
                }`}
              />
              {form.google_maps_url && urlValid && (
                <a
                  href={form.google_maps_url} target="_blank" rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition flex items-center gap-1.5 text-xs font-medium flex-shrink-0"
                >
                  <ExternalLink size={12} /> {t("Test", "اختبر")}
                </a>
              )}
            </div>
            {form.google_maps_url && !urlValid && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                <AlertCircle size={11} />
                {t("Must be a valid Google Maps link", "يجب أن يكون رابط Google Maps صحيحاً")}
              </p>
            )}
          </div>

          {/* ─── Coordinates display ─── */}
          {form.center_lat && form.center_lng && (
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl">
              <Check size={13} className="text-green-400 flex-shrink-0" />
              <span className="text-xs text-green-400 flex-1">
                {t("Coordinates set:", "الإحداثيات:")}
                {" "}<span dir="ltr" className="font-mono">{form.center_lat.toFixed(6)}, {form.center_lng.toFixed(6)}</span>
              </span>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, center_lat: undefined, center_lng: undefined, google_maps_url: "" }))}
                className="text-muted-foreground/40 hover:text-muted-foreground transition"
              >
                <X size={11} />
              </button>
            </div>
          )}

          {/* ─── Interactive Map ─── */}
          <BranchMapPicker
            lat={form.center_lat}
            lng={form.center_lng}
            onChange={handleMapChange}
          />

          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium" data-testid="btn-save-branch">
              <Check size={14} className="inline mr-1" /> {t("Save", "حفظ")}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setEditingId(null); }} className="px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground">
              <X size={14} className="inline mr-1" /> {t("Cancel", "إلغاء")}
            </button>
          </div>
        </form>
      )}

      {/* ─── Branch List ─── */}
      <div className="space-y-6">
        {restaurants.map((restaurant) => {
          const restBranches = branches.filter((b) => b.restaurant_id === restaurant.id);
          return (
            <div key={restaurant.id}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0" style={{ background: `${restaurant.color}20` }}>
                  {restaurant.logoType === "image" && restaurant.logo
                    ? <img src={restaurant.logo} alt="" className="w-full h-full object-cover" />
                    : <span className="text-sm">{restaurant.logo}</span>}
                </div>
                <h2 className="font-bold text-foreground">{t(restaurant.name_en, restaurant.name_ar)}</h2>
                <span className="text-xs text-muted-foreground">({restBranches.length} {t("branches", "فروع")})</span>
              </div>
              {restBranches.length === 0 && (
                <p className="text-sm text-muted-foreground pl-9">{t("No branches yet", "لا توجد فروع بعد")}</p>
              )}
              <div className="space-y-3">
                {restBranches.map((branch) => (
                  <div key={branch.id} className="bg-card border border-white/5 rounded-2xl p-5" data-testid={`admin-branch-${branch.id}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{t(branch.name_en, branch.name_ar)}</h3>
                        {branch.center_lat && branch.center_lng && (
                          <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5" dir="ltr">
                            {branch.center_lat.toFixed(5)}, {branch.center_lng.toFixed(5)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <WorkingHoursStatus branch={branch} />
                        <button onClick={() => handleEdit(branch)} className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(branch.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive/60 hover:text-destructive transition">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone size={13} />
                        <span className="font-mono text-xs">+{branch.whatsapp}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <DollarSign size={13} />
                        <span>{branch.delivery_fee} ﷼</span>
                      </div>
                      {(branch.address_en || branch.address_ar) && (
                        <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                          <MapPin size={13} />
                          <span className="text-xs">{t(branch.address_en, branch.address_ar)}</span>
                        </div>
                      )}
                    </div>
                    {branch.google_maps_url && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <a
                          href={branch.google_maps_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition font-medium"
                        >
                          <Navigation size={11} />
                          {t("Open in Google Maps", "فتح في Google Maps")}
                          <ExternalLink size={9} className="opacity-60" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
