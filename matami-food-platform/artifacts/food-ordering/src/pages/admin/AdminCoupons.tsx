import { useState, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { couponStore } from "@/lib/store";
import type { Coupon } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminCoupons() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const coupons = useStore(useCallback(() => couponStore.getAll(), []));
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ code: "", type: "percentage" as Coupon["type"], value: 0, description_en: "", description_ar: "" });

  const toggle = (code: string) => {
    const c = coupons.find((x) => x.code === code);
    if (c) couponStore.save({ ...c, active: !c.active });
  };
  const remove = (code: string) => {
    if (!confirm(t("Delete this coupon?", "حذف هذا الكود؟"))) return;
    couponStore.delete(code);
    toast({ title: t("Deleted", "تم الحذف") });
  };
  const handleAdd = () => {
    if (!form.code.trim()) { toast({ title: t("Code required", "الكود مطلوب"), variant: "destructive" }); return; }
    couponStore.save({ ...form, code: form.code.toUpperCase(), active: true });
    toast({ title: t("Coupon added!", "تمت إضافة الكود!") });
    setForm({ code: "", type: "percentage", value: 0, description_en: "", description_ar: "" });
    setShowAdd(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">{t("Coupons", "الأكواد")}</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition" data-testid="btn-add-coupon">
          <Plus size={14} /> {t("Add Coupon", "إضافة كود")}
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-white/5 rounded-2xl p-5 mb-5 space-y-3">
          <h3 className="font-medium text-foreground">{t("New Coupon", "كود جديد")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Code", "الكود")}</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 uppercase font-mono" data-testid="input-coupon-code" placeholder="e.g. SAVE10" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Type", "النوع")}</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Coupon["type"] })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
                <option value="percentage">{t("Percentage %", "نسبة مئوية %")}</option>
                <option value="fixed">{t("Fixed SAR", "مبلغ ثابت ريال")}</option>
                <option value="free_delivery">{t("Free Delivery", "توصيل مجاني")}</option>
              </select>
            </div>
            {form.type !== "free_delivery" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("Value", "القيمة")}</label>
                <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50" />
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Description (EN)", "الوصف (EN)")}</label>
              <input value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("Description (AR)", "الوصف (AR)")}</label>
              <input value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium" data-testid="btn-save-coupon">{t("Save", "حفظ")}</button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground">{t("Cancel", "إلغاء")}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {coupons.length === 0 && <p className="text-center text-muted-foreground py-8">{t("No coupons yet", "لا توجد أكواد بعد")}</p>}
        {coupons.map((coupon) => (
          <div key={coupon.code} className="bg-card border border-white/5 rounded-2xl p-4 flex items-center justify-between" data-testid={`coupon-${coupon.code}`}>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary font-mono tracking-wide">{coupon.code}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${coupon.active ? "bg-green-500/10 text-green-400" : "bg-white/5 text-muted-foreground"}`}>
                  {coupon.active ? t("Active", "نشط") : t("Inactive", "غير نشط")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {coupon.type === "percentage" && `${coupon.value}% ${t("off", "خصم")}`}
                {coupon.type === "fixed" && `${coupon.value} SAR ${t("off", "خصم")}`}
                {coupon.type === "free_delivery" && t("Free delivery", "توصيل مجاني")}
                {coupon.description_en && ` — ${t(coupon.description_en, coupon.description_ar)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => toggle(coupon.code)} className="text-muted-foreground hover:text-foreground transition" data-testid={`btn-toggle-coupon-${coupon.code}`}>
                {coupon.active ? <ToggleRight size={22} className="text-primary" /> : <ToggleLeft size={22} />}
              </button>
              <button onClick={() => remove(coupon.code)} className="text-destructive/60 hover:text-destructive transition" data-testid={`btn-delete-coupon-${coupon.code}`}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
