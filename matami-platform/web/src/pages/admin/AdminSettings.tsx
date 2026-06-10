/** Restaurant settings: identity, contact, VAT, loyalty config, branches, subscription. */
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import { Badge, Button, Card, Field, Input, Spinner, Toggle, useToast } from "@/components/ui";
import { ResourceManager, ActiveBadge } from "@/components/ResourceManager";
import { useAdmin } from "./AdminPanel";

interface SettingsData {
  restaurant: {
    slug: string; name_en: string; name_ar: string; description_en: string; description_ar: string;
    phone: string; whatsapp: string; email: string; website: string;
    vatNumber: string; vatRate: number; currency: string;
    settings: { vatInclusive?: boolean; orderingEnabled?: boolean; loyalty?: { enabled?: boolean; earnPerCurrency?: number; redeemPerPoint?: number } };
  };
  subscription: { status: string; periodEnd: string; plan: { name_en: string; name_ar: string; maxBranches: number; maxProducts: number; maxStaff: number } } | null;
}

interface Branch { id: string; name_en: string; name_ar: string; phone: string; isActive: boolean }

export default function AdminSettings() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name_en: "", name_ar: "", description_en: "", description_ar: "",
    phone: "", whatsapp: "", email: "", website: "", vatNumber: "", vatRate: 15,
    orderingEnabled: true, vatInclusive: true,
    loyaltyEnabled: true, earnPerCurrency: 1, redeemPerPoint: 0.05,
  });

  useEffect(() => {
    api<SettingsData>("/api/admin/settings", { headers }).then((d) => {
      setData(d);
      const r = d.restaurant;
      setForm({
        name_en: r.name_en, name_ar: r.name_ar,
        description_en: r.description_en, description_ar: r.description_ar,
        phone: r.phone, whatsapp: r.whatsapp, email: r.email, website: r.website,
        vatNumber: r.vatNumber, vatRate: r.vatRate,
        orderingEnabled: r.settings.orderingEnabled !== false,
        vatInclusive: r.settings.vatInclusive !== false,
        loyaltyEnabled: r.settings.loyalty?.enabled !== false,
        earnPerCurrency: r.settings.loyalty?.earnPerCurrency ?? 1,
        redeemPerPoint: r.settings.loyalty?.redeemPerPoint ?? 0.05,
      });
    });
  }, [headers]);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", {
        method: "PUT",
        headers,
        body: {
          name_en: form.name_en, name_ar: form.name_ar,
          description_en: form.description_en, description_ar: form.description_ar,
          phone: form.phone, whatsapp: form.whatsapp, email: form.email, website: form.website,
          vatNumber: form.vatNumber, vatRate: Number(form.vatRate),
          settings: {
            orderingEnabled: form.orderingEnabled,
            vatInclusive: form.vatInclusive,
            loyalty: { enabled: form.loyaltyEnabled, earnPerCurrency: Number(form.earnPerCurrency), redeemPerPoint: Number(form.redeemPerPoint) },
          },
        },
      });
      toast(t("Settings saved", "تم حفظ الإعدادات"));
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!data) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Settings", "الإعدادات")}</h1>
        <Button onClick={() => void save()} loading={saving}>{t("Save settings", "حفظ الإعدادات")}</Button>
      </div>

      {/* Subscription card */}
      {data.subscription && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-extrabold">
              {t("Plan", "الباقة")}: {lang === "ar" ? data.subscription.plan.name_ar : data.subscription.plan.name_en}{" "}
              <Badge tone={["TRIAL", "ACTIVE"].includes(data.subscription.status) ? "success" : "danger"}>{data.subscription.status}</Badge>
            </p>
            <p className="text-xs text-[var(--th-muted)]">
              {t("Renews / expires", "التجديد / الانتهاء")}: {formatDate(data.subscription.periodEnd, lang)} · {data.subscription.plan.maxBranches} {t("branches", "فروع")} · {data.subscription.plan.maxProducts} {t("products", "منتج")} · {data.subscription.plan.maxStaff} {t("staff", "موظف")}
            </p>
          </div>
          <a href={`/r/${data.restaurant.slug}`} target="_blank" rel="noreferrer" className="text-xs font-bold text-[var(--th-primary)]">
            {t("View my site ↗", "عرض موقعي ↗")}
          </a>
        </Card>
      )}

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="text-sm font-extrabold sm:col-span-2">{t("Identity", "الهوية")}</h2>
        <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
        <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
        <Field label={t("Description (AR)", "الوصف (عربي)")}><Input value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} /></Field>
        <Field label={t("Description (EN)", "الوصف (إنجليزي)")}><Input value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} /></Field>
        <Field label={t("Phone", "الهاتف")}><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label={t("WhatsApp", "واتساب")}><Input dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="9665xxxxxxxx" /></Field>
        <Field label={t("Email", "البريد")}><Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label={t("Website", "الموقع")}><Input dir="ltr" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Field>
      </Card>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="text-sm font-extrabold sm:col-span-2">{t("Ordering & VAT", "الطلبات والضريبة")}</h2>
        <Toggle checked={form.orderingEnabled} onChange={(v) => setForm({ ...form, orderingEnabled: v })} label={t("Accept online orders", "استقبال الطلبات أونلاين")} />
        <Toggle checked={form.vatInclusive} onChange={(v) => setForm({ ...form, vatInclusive: v })} label={t("Prices include VAT", "الأسعار شاملة الضريبة")} />
        <Field label={t("VAT rate %", "نسبة الضريبة %")}><Input type="number" dir="ltr" value={form.vatRate} onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })} /></Field>
        <Field label={t("VAT number", "الرقم الضريبي")}><Input dir="ltr" value={form.vatNumber} onChange={(e) => setForm({ ...form, vatNumber: e.target.value })} /></Field>
      </Card>

      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        <h2 className="text-sm font-extrabold sm:col-span-3">{t("Loyalty program", "برنامج الولاء")}</h2>
        <Toggle checked={form.loyaltyEnabled} onChange={(v) => setForm({ ...form, loyaltyEnabled: v })} label={t("Enabled", "مفعّل")} />
        <Field label={t("Points per 1 SAR spent", "نقاط لكل 1 ريال")} hint={t("Earned when order is delivered", "تُكسب عند توصيل الطلب")}>
          <Input type="number" step="0.1" dir="ltr" value={form.earnPerCurrency} onChange={(e) => setForm({ ...form, earnPerCurrency: Number(e.target.value) })} />
        </Field>
        <Field label={t("SAR value per point", "قيمة النقطة بالريال")} hint={t("Used when redeeming", "تُستخدم عند الاستبدال")}>
          <Input type="number" step="0.01" dir="ltr" value={form.redeemPerPoint} onChange={(e) => setForm({ ...form, redeemPerPoint: Number(e.target.value) })} />
        </Field>
      </Card>

      {/* Branches */}
      <ResourceManager<Branch>
        titleEn="Branches"
        titleAr="الفروع"
        apiPath="/api/admin/branches"
        headers={headers}
        emptyHintEn="Add your first branch with its location"
        emptyHintAr="أضف أول فرع مع موقعه"
        fields={[
          { key: "name_ar", label_en: "Name (AR)", label_ar: "الاسم (عربي)", type: "text", required: true, half: true },
          { key: "name_en", label_en: "Name (EN)", label_ar: "الاسم (إنجليزي)", type: "text", required: true, half: true },
          { key: "phone", label_en: "Phone", label_ar: "الهاتف", type: "text", half: true },
          { key: "sortOrder", label_en: "Sort", label_ar: "الترتيب", type: "number", half: true },
          { key: "address_ar", label_en: "Address (AR)", label_ar: "العنوان (عربي)", type: "text", half: true },
          { key: "address_en", label_en: "Address (EN)", label_ar: "العنوان (إنجليزي)", type: "text", half: true },
          { key: "lat", label_en: "Latitude", label_ar: "خط العرض", type: "number", half: true, defaultValue: null },
          { key: "lng", label_en: "Longitude", label_ar: "خط الطول", type: "number", half: true, defaultValue: null },
          { key: "isActive", label_en: "Active", label_ar: "مفعّل", type: "toggle" },
        ]}
        columns={[
          { header: "Branch / الفرع", render: (b) => <b>{tr(b as unknown as Record<string, unknown>, "name")}</b> },
          { header: "", render: (b) => <span className="text-xs text-[var(--th-muted)]" dir="ltr">{b.phone}</span> },
          { header: "", className: "w-28", render: (b) => <ActiveBadge active={b.isActive} /> },
        ]}
      />
    </div>
  );
}
