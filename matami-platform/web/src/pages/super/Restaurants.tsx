/** Super admin: restaurants table + onboarding wizard (restaurant → owner → plan). */
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ExternalLink, Plus, Settings2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import { Badge, Button, DataTable, EmptyState, Field, Input, Modal, Select, Spinner, Toggle, useToast } from "@/components/ui";

interface RestaurantRow {
  id: string; slug: string; name_en: string; name_ar: string; logoUrl: string;
  isActive: boolean; isFeatured: boolean; createdAt: string;
  branchCount: number; orders30d: number; products: number; users: number;
  subscription: { status: string; periodEnd: string; plan_en: string; plan_ar: string } | null;
}
interface Plan { id: string; name_en: string; name_ar: string; price: number; interval: string }

const TEMPLATES = [
  ["bukhari", "Bukhari", "بخاري"], ["burger", "Burger", "برجر"], ["pizza", "Pizza", "بيتزا"],
  ["cafe", "Cafe", "كافيه"], ["cloud-kitchen", "Cloud Kitchen", "مطبخ سحابي"],
  ["traditional-arabic", "Traditional Arabic", "شعبي"], ["lebanese", "Lebanese", "لبناني"],
  ["fast-food", "Fast Food", "وجبات سريعة"],
] as const;

export default function Restaurants() {
  const { t, tr, lang } = useI18n();
  const toast = useToast();
  const [, navigate] = useLocation();
  const [rows, setRows] = useState<RestaurantRow[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    slug: "", name_ar: "", name_en: "", description_ar: "", description_en: "",
    phone: "", whatsapp: "", templateKey: "traditional-arabic", planId: "",
    ownerName: "", ownerEmail: "", ownerPassword: "",
    branchName_ar: "", branchName_en: "",
  });

  const load = useCallback(() => {
    api<{ items: RestaurantRow[] }>(`/api/super/restaurants?q=${encodeURIComponent(q)}`).then((d) => setRows(d.items)).catch(() => setRows([]));
  }, [q]);

  useEffect(() => {
    const h = setTimeout(load, 250);
    return () => clearTimeout(h);
  }, [load]);

  useEffect(() => {
    api<{ items: Plan[] }>("/api/super/plans").then((d) => {
      setPlans(d.items);
      setForm((f) => ({ ...f, planId: f.planId || d.items[0]?.id || "" }));
    });
  }, []);

  const create = async () => {
    setSaving(true);
    try {
      await api("/api/super/restaurants", {
        method: "POST",
        body: {
          slug: form.slug.toLowerCase(), name_ar: form.name_ar, name_en: form.name_en,
          description_ar: form.description_ar, description_en: form.description_en,
          phone: form.phone, whatsapp: form.whatsapp,
          templateKey: form.templateKey, planId: form.planId,
          owner: { name: form.ownerName, email: form.ownerEmail, password: form.ownerPassword },
          firstBranch: form.branchName_ar || form.branchName_en
            ? { name_ar: form.branchName_ar || form.branchName_en, name_en: form.branchName_en || form.branchName_ar }
            : undefined,
        },
      });
      toast(t("Restaurant created with trial subscription 🎉", "تم إنشاء المطعم مع اشتراك تجريبي 🎉"));
      setCreating(false);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: RestaurantRow, patch: { isActive?: boolean; isFeatured?: boolean }) => {
    await api(`/api/super/restaurants/${r.id}`, { method: "PUT", body: patch });
    void load();
  };

  if (rows === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Restaurants", "المطاعم")}</h1>
        <div className="flex items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search…", "بحث…")} className="max-w-48" />
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus size={15} /> {t("Onboard restaurant", "إضافة مطعم")}
          </Button>
        </div>
      </div>

      <DataTable
        rows={rows}
        keyOf={(r) => r.id}
        empty={<EmptyState title={t("No restaurants yet", "لا توجد مطاعم بعد")} hint={t("Onboard your first paying restaurant", "أضف أول مطعم مشترك")} />}
        columns={[
          {
            header: t("Restaurant", "المطعم"),
            render: (r) => (
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 overflow-hidden rounded-lg bg-black/5">
                  {r.logoUrl && <img src={r.logoUrl} alt="" className="h-full w-full object-contain" />}
                </div>
                <div>
                  <b>{tr(r as unknown as Record<string, unknown>, "name")}</b>
                  <p className="text-[10px] text-[var(--th-muted)]" dir="ltr">/{r.slug}</p>
                </div>
              </div>
            ),
          },
          {
            header: t("Subscription", "الاشتراك"),
            render: (r) =>
              r.subscription ? (
                <div>
                  <Badge tone={["TRIAL", "ACTIVE"].includes(r.subscription.status) ? "success" : "danger"}>
                    {r.subscription.status} · {lang === "ar" ? r.subscription.plan_ar : r.subscription.plan_en}
                  </Badge>
                  <p className="mt-0.5 text-[10px] text-[var(--th-muted)]">{formatDate(r.subscription.periodEnd, lang)}</p>
                </div>
              ) : (
                <Badge tone="danger">{t("None", "بدون")}</Badge>
              ),
          },
          {
            header: t("Usage", "الاستخدام"),
            render: (r) => (
              <span className="text-xs text-[var(--th-muted)]">
                {r.branchCount} {t("br", "فرع")} · {r.products} {t("prod", "منتج")} · {r.orders30d} {t("orders/30d", "طلب/30ي")}
              </span>
            ),
          },
          {
            header: "",
            render: (r) => (
              <div className="flex items-center justify-end gap-1.5">
                <Toggle checked={r.isActive} onChange={(v) => void toggle(r, { isActive: v })} />
                <button title={t("Feature on marketplace", "تمييز في السوق")} onClick={() => void toggle(r, { isFeatured: !r.isFeatured })} className={`rounded-full px-2 py-1 text-sm ${r.isFeatured ? "bg-amber-100" : "bg-black/5 opacity-40"}`}>
                  ⭐
                </button>
                <a href={`/r/${r.slug}`} target="_blank" rel="noreferrer" className="rounded-full p-1.5 hover:bg-black/5" title={t("Open site", "فتح الموقع")}>
                  <ExternalLink size={14} />
                </a>
                <button
                  title={t("Manage panel", "إدارة اللوحة")}
                  onClick={() => {
                    sessionStorage.setItem("matami_admin_rid", r.id);
                    navigate("/admin");
                  }}
                  className="rounded-full p-1.5 hover:bg-black/5"
                >
                  <Settings2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
      />

      {/* Onboarding wizard */}
      <Modal open={creating} onClose={() => setCreating(false)} title={t("Onboard a restaurant", "إضافة مطعم جديد")} wide>
        <div className="space-y-5">
          <section>
            <p className="mb-2 text-xs font-extrabold text-[var(--th-primary)]">① {t("Restaurant", "المطعم")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
              <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
              <Field label={t("Slug (URL)", "المعرف (الرابط)")} hint={`matami.app/r/${form.slug || "my-restaurant"}`}>
                <Input dir="ltr" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="my-restaurant" />
              </Field>
              <Field label={t("Theme template", "قالب الثيم")}>
                <Select value={form.templateKey} onChange={(e) => setForm({ ...form, templateKey: e.target.value })}>
                  {TEMPLATES.map(([key, en, ar]) => (
                    <option key={key} value={key}>{lang === "ar" ? ar : en}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("Phone", "الهاتف")}><Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label={t("WhatsApp", "واتساب")}><Input dir="ltr" value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></Field>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-extrabold text-[var(--th-primary)]">② {t("Owner account", "حساب المالك")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("Name", "الاسم")}><Input value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} /></Field>
              <Field label={t("Email", "البريد")}><Input dir="ltr" type="email" value={form.ownerEmail} onChange={(e) => setForm({ ...form, ownerEmail: e.target.value })} /></Field>
              <Field label={t("Password", "كلمة المرور")}><Input dir="ltr" type="password" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} /></Field>
            </div>
          </section>

          <section>
            <p className="mb-2 text-xs font-extrabold text-[var(--th-primary)]">③ {t("Plan & first branch", "الباقة وأول فرع")}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={t("Plan (starts as trial)", "الباقة (تبدأ تجريبية)")}>
                <Select value={form.planId} onChange={(e) => setForm({ ...form, planId: e.target.value })}>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>{lang === "ar" ? p.name_ar : p.name_en} — {p.price}/{p.interval === "YEARLY" ? t("yr", "سنة") : t("mo", "شهر")}</option>
                  ))}
                </Select>
              </Field>
              <Field label={t("Branch (AR, optional)", "الفرع (عربي، اختياري)")}><Input value={form.branchName_ar} onChange={(e) => setForm({ ...form, branchName_ar: e.target.value })} /></Field>
              <Field label={t("Branch (EN, optional)", "الفرع (إنجليزي، اختياري)")}><Input value={form.branchName_en} onChange={(e) => setForm({ ...form, branchName_en: e.target.value })} /></Field>
            </div>
          </section>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setCreating(false)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={() => void create()} loading={saving}>{t("Create restaurant", "إنشاء المطعم")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
