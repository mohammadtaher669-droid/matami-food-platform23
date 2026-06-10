/** Platform settings & branding + recent audit log. */
import { useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import { Button, Card, Field, Input, Spinner, useToast } from "@/components/ui";
import { ImageInput } from "@/components/ImageInput";

interface AuditRow {
  id: string; action: string; entity: string; entityId: string; ip: string; createdAt: string;
  actor: { email: string; name: string; role: string } | null;
  restaurant: { slug: string; name_en: string } | null;
}

export default function PlatformSettings() {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [form, setForm] = useState({
    platformName_en: "Mat'ami", platformName_ar: "مطعمي",
    tagline_en: "", tagline_ar: "",
    logoUrl: "", primaryColor: "#16a34a",
    supportEmail: "", supportWhatsapp: "",
    referralRewardPoints: 50,
    termsUrl: "", privacyUrl: "",
  });

  useEffect(() => {
    api<{ data: Partial<typeof form> }>("/api/super/settings")
      .then((d) => {
        setForm((prev) => ({ ...prev, ...d.data }));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    api<{ items: AuditRow[] }>("/api/super/audit-logs?pageSize=30").then((d) => setLogs(d.items)).catch(() => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/super/settings", { method: "PUT", body: { ...form, referralRewardPoints: Number(form.referralRewardPoints) } });
      toast(t("Platform settings saved", "تم حفظ إعدادات المنصة"));
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Platform settings", "إعدادات المنصة")}</h1>
        <Button onClick={() => void save()} loading={saving}>{t("Save", "حفظ")}</Button>
      </div>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="text-sm font-extrabold sm:col-span-2">{t("Branding", "هوية المنصة")}</h2>
        <Field label={t("Platform name (AR)", "اسم المنصة (عربي)")}>
          <Input value={form.platformName_ar} onChange={(e) => setForm({ ...form, platformName_ar: e.target.value })} />
        </Field>
        <Field label={t("Platform name (EN)", "اسم المنصة (إنجليزي)")}>
          <Input value={form.platformName_en} onChange={(e) => setForm({ ...form, platformName_en: e.target.value })} />
        </Field>
        <Field label={t("Tagline (AR)", "الشعار النصي (عربي)")}>
          <Input value={form.tagline_ar} onChange={(e) => setForm({ ...form, tagline_ar: e.target.value })} placeholder="اطلب من أفضل المطاعم" />
        </Field>
        <Field label={t("Tagline (EN)", "الشعار النصي (إنجليزي)")}>
          <Input value={form.tagline_en} onChange={(e) => setForm({ ...form, tagline_en: e.target.value })} placeholder="Order from the best restaurants" />
        </Field>
        <Field label={t("Platform logo", "شعار المنصة")}>
          <ImageInput value={form.logoUrl} onChange={(url) => setForm({ ...form, logoUrl: url })} />
        </Field>
        <Field label={t("Primary color", "اللون الرئيسي")}>
          <div className="flex items-center gap-2">
            <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="h-10 w-14 cursor-pointer rounded-lg border border-black/10" />
            <Input dir="ltr" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} />
          </div>
        </Field>
      </Card>

      <Card className="grid gap-3 p-4 sm:grid-cols-2">
        <h2 className="text-sm font-extrabold sm:col-span-2">{t("Support & policies", "الدعم والسياسات")}</h2>
        <Field label={t("Support email", "بريد الدعم")}>
          <Input dir="ltr" value={form.supportEmail} onChange={(e) => setForm({ ...form, supportEmail: e.target.value })} />
        </Field>
        <Field label={t("Support WhatsApp", "واتساب الدعم")}>
          <Input dir="ltr" value={form.supportWhatsapp} onChange={(e) => setForm({ ...form, supportWhatsapp: e.target.value })} />
        </Field>
        <Field label={t("Terms URL", "رابط الشروط")}>
          <Input dir="ltr" value={form.termsUrl} onChange={(e) => setForm({ ...form, termsUrl: e.target.value })} />
        </Field>
        <Field label={t("Privacy URL", "رابط الخصوصية")}>
          <Input dir="ltr" value={form.privacyUrl} onChange={(e) => setForm({ ...form, privacyUrl: e.target.value })} />
        </Field>
        <Field label={t("Referral reward (points)", "مكافأة الإحالة (نقاط)")} hint={t("Granted to the referrer after the friend's first delivered order", "تُمنح للمُحيل بعد أول طلب مكتمل لصديقه")}>
          <Input type="number" dir="ltr" value={form.referralRewardPoints} onChange={(e) => setForm({ ...form, referralRewardPoints: Number(e.target.value) })} />
        </Field>
      </Card>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-extrabold">{t("Recent audit log", "آخر سجلات التدقيق")}</h2>
        <div className="divide-y divide-black/5 text-xs">
          {logs.length === 0 && <p className="py-4 text-center text-[var(--th-muted)]">—</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="font-bold">
                  {l.action} <span className="font-normal text-[var(--th-muted)]">({l.entity})</span>
                </p>
                <p className="truncate text-[var(--th-muted)]">
                  {l.actor ? `${l.actor.name} · ${l.actor.email}` : "—"} {l.restaurant ? ` · ${l.restaurant.name_en}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-end text-[var(--th-muted)]">
                <p>{formatDate(l.createdAt, lang)}</p>
                <p dir="ltr">{l.ip}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
