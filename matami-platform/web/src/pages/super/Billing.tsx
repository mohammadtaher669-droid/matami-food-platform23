/** Plans management + subscriptions table with renew/cancel and revenue header. */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Pencil, Plus } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney, useI18n } from "@/lib/i18n";
import { Badge, Button, Card, DataTable, EmptyState, Field, Input, Modal, Select, Spinner, Toggle, useToast } from "@/components/ui";

type Tab = "plans" | "subscriptions";

interface Plan {
  id: string; name_en: string; name_ar: string; price: number; interval: "MONTHLY" | "YEARLY";
  trialDays: number; maxBranches: number; maxProducts: number; maxStaff: number;
  isActive: boolean; sortOrder: number; _count?: { subscriptions: number };
}
interface Sub {
  id: string; status: string; periodStart: string; periodEnd: string; trialEndsAt: string | null;
  pricePaid: number; notes: string | null;
  plan: { id: string; name_en: string; name_ar: string; price: number; interval: string };
  restaurant: { slug: string; name_en: string; name_ar: string; logoUrl: string };
}

export default function Billing() {
  const params = useParams<{ tab?: Tab }>();
  const tab: Tab = params.tab === "subscriptions" ? "subscriptions" : "plans";
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          ["plans", t("Plans", "الباقات")],
          ["subscriptions", t("Subscriptions", "الاشتراكات")],
        ] as Array<[Tab, string]>).map(([k, label]) => (
          <Link key={k} href={`/super/billing/${k}`} className={`rounded-full px-4 py-2 text-xs font-bold ${tab === k ? "bg-[var(--th-primary)] text-white" : "bg-black/5"}`}>
            {label}
          </Link>
        ))}
      </div>
      {tab === "plans" ? <PlansTab /> : <SubsTab />}
    </div>
  );
}

function PlansTab() {
  const { t, tr, lang } = useI18n();
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [editing, setEditing] = useState<Plan | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name_ar: "", name_en: "", price: 99, interval: "MONTHLY" as "MONTHLY" | "YEARLY",
    trialDays: 14, maxBranches: 1, maxProducts: 100, maxStaff: 5, isActive: true, sortOrder: 0,
  });

  const load = useCallback(() => {
    api<{ items: Plan[] }>("/api/super/plans").then((d) => setPlans(d.items)).catch(() => setPlans([]));
  }, []);
  useEffect(() => void load(), [load]);

  const open = (p: Plan | "new") => {
    setEditing(p);
    if (p === "new") {
      setForm({ name_ar: "", name_en: "", price: 99, interval: "MONTHLY", trialDays: 14, maxBranches: 1, maxProducts: 100, maxStaff: 5, isActive: true, sortOrder: plans?.length ?? 0 });
    } else {
      setForm({ name_ar: p.name_ar, name_en: p.name_en, price: p.price, interval: p.interval, trialDays: p.trialDays, maxBranches: p.maxBranches, maxProducts: p.maxProducts, maxStaff: p.maxStaff, isActive: p.isActive, sortOrder: p.sortOrder });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, price: Number(form.price) };
      if (editing === "new") await api("/api/super/plans", { method: "POST", body });
      else if (editing) await api(`/api/super/plans/${editing.id}`, { method: "PUT", body });
      toast(t("Plan saved", "تم حفظ الباقة"));
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (plans === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Subscription plans", "باقات الاشتراك")}</h1>
        <Button size="sm" onClick={() => open("new")}>
          <Plus size={15} /> {t("New plan", "باقة جديدة")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={`p-5 ${!p.isActive ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between">
              <h2 className="font-extrabold">{tr(p as unknown as Record<string, unknown>, "name")}</h2>
              <button onClick={() => open(p)} className="rounded-full p-1.5 hover:bg-black/5"><Pencil size={14} /></button>
            </div>
            <p className="mt-1 text-2xl font-black text-[var(--th-primary)]">
              {formatMoney(p.price, "SAR", lang)}
              <span className="text-xs font-bold text-[var(--th-muted)]"> / {p.interval === "YEARLY" ? t("year", "سنة") : t("month", "شهر")}</span>
            </p>
            <ul className="mt-3 space-y-1 text-xs text-[var(--th-muted)]">
              <li>✓ {p.maxBranches} {t("branches", "فروع")}</li>
              <li>✓ {p.maxProducts} {t("products", "منتج")}</li>
              <li>✓ {p.maxStaff} {t("staff accounts", "حساب موظف")}</li>
              <li>✓ {p.trialDays} {t("trial days", "يوم تجريبي")}</li>
            </ul>
            <p className="mt-3 text-[11px] font-bold text-[var(--th-muted)]">{p._count?.subscriptions ?? 0} {t("subscriptions", "اشتراك")}</p>
          </Card>
        ))}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("New plan", "باقة جديدة") : t("Edit plan", "تعديل الباقة")} wide>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
          <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
          <Field label={t("Price", "السعر")}><Input type="number" dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></Field>
          <Field label={t("Interval", "الدورة")}>
            <Select value={form.interval} onChange={(e) => setForm({ ...form, interval: e.target.value as "MONTHLY" | "YEARLY" })}>
              <option value="MONTHLY">{t("Monthly", "شهري")}</option>
              <option value="YEARLY">{t("Yearly", "سنوي")}</option>
            </Select>
          </Field>
          <Field label={t("Trial days", "أيام التجربة")}><Input type="number" dir="ltr" value={form.trialDays} onChange={(e) => setForm({ ...form, trialDays: Number(e.target.value) })} /></Field>
          <Field label={t("Max branches", "أقصى فروع")}><Input type="number" dir="ltr" value={form.maxBranches} onChange={(e) => setForm({ ...form, maxBranches: Number(e.target.value) })} /></Field>
          <Field label={t("Max products", "أقصى منتجات")}><Input type="number" dir="ltr" value={form.maxProducts} onChange={(e) => setForm({ ...form, maxProducts: Number(e.target.value) })} /></Field>
          <Field label={t("Max staff", "أقصى موظفين")}><Input type="number" dir="ltr" value={form.maxStaff} onChange={(e) => setForm({ ...form, maxStaff: Number(e.target.value) })} /></Field>
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label={t("Available for new subscriptions", "متاحة للاشتراكات الجديدة")} />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</Button>
          <Button onClick={() => void save()} loading={saving}>{t("Save", "حفظ")}</Button>
        </div>
      </Modal>
    </div>
  );
}

function SubsTab() {
  const { t, tr, lang } = useI18n();
  const toast = useToast();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [filter, setFilter] = useState("");
  const [renewing, setRenewing] = useState<Sub | null>(null);
  const [months, setMonths] = useState(1);
  const [pricePaid, setPricePaid] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ items: Sub[]; totalRevenue: number }>(`/api/super/subscriptions${filter ? `?status=${filter}` : ""}`)
      .then((d) => {
        setSubs(d.items);
        setTotalRevenue(d.totalRevenue);
      })
      .catch(() => setSubs([]));
  }, [filter]);
  useEffect(() => void load(), [load]);

  const renew = async () => {
    if (!renewing) return;
    setSaving(true);
    try {
      await api(`/api/super/subscriptions/${renewing.id}/renew`, { method: "POST", body: { months, pricePaid: Number(pricePaid) } });
      toast(t("Subscription renewed", "تم تجديد الاشتراك"));
      setRenewing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (s: Sub) => {
    await api(`/api/super/subscriptions/${s.id}/cancel`, { method: "POST", body: {} });
    toast(t("Subscription canceled", "تم إلغاء الاشتراك"));
    void load();
  };

  if (subs === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">{t("Subscriptions", "الاشتراكات")}</h1>
          <p className="text-xs text-[var(--th-muted)]">
            {t("Total collected revenue", "إجمالي الإيراد المحصّل")}: <b className="text-[var(--th-primary)]">{formatMoney(totalRevenue, "SAR", lang)}</b>
          </p>
        </div>
        <div className="flex gap-1.5">
          {["", "TRIAL", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${filter === s ? "bg-[var(--th-primary)] text-white" : "bg-black/5"}`}>
              {s || t("All", "الكل")}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        rows={subs}
        keyOf={(s) => s.id}
        empty={<EmptyState title={t("No subscriptions", "لا توجد اشتراكات")} />}
        columns={[
          {
            header: t("Restaurant", "المطعم"),
            render: (s) => (
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 overflow-hidden rounded-lg bg-black/5">
                  {s.restaurant.logoUrl && <img src={s.restaurant.logoUrl} alt="" className="h-full w-full object-contain" />}
                </div>
                <b>{tr(s.restaurant as unknown as Record<string, unknown>, "name")}</b>
              </div>
            ),
          },
          {
            header: t("Plan", "الباقة"),
            render: (s) => (
              <span className="text-xs">
                {lang === "ar" ? s.plan.name_ar : s.plan.name_en} · {formatMoney(s.plan.price, "SAR", lang)}/{s.plan.interval === "YEARLY" ? t("yr", "سنة") : t("mo", "شهر")}
              </span>
            ),
          },
          {
            header: t("Status", "الحالة"),
            render: (s) => (
              <div>
                <Badge tone={["TRIAL", "ACTIVE"].includes(s.status) ? "success" : s.status === "PAST_DUE" ? "warn" : "danger"}>{s.status}</Badge>
                <p className="mt-0.5 text-[10px] text-[var(--th-muted)]">→ {formatDate(s.periodEnd, lang)}</p>
              </div>
            ),
          },
          { header: t("Paid", "المدفوع"), className: "w-28", render: (s) => <b>{formatMoney(s.pricePaid, "SAR", lang)}</b> },
          {
            header: "",
            className: "w-44",
            render: (s) => (
              <div className="flex justify-end gap-1.5">
                <Button size="sm" onClick={() => { setRenewing(s); setMonths(1); setPricePaid(s.plan.price); }}>
                  {t("Renew", "تجديد")}
                </Button>
                {s.status !== "CANCELED" && (
                  <Button size="sm" variant="danger" onClick={() => void cancel(s)}>
                    {t("Cancel", "إلغاء")}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />

      <Modal open={renewing !== null} onClose={() => setRenewing(null)} title={t("Renew subscription", "تجديد الاشتراك")}>
        <div className="space-y-3">
          <Field label={t("Months", "عدد الأشهر")}>
            <Input type="number" min={1} max={24} dir="ltr" value={months} onChange={(e) => setMonths(Number(e.target.value))} />
          </Field>
          <Field label={t("Amount collected (SAR)", "المبلغ المحصّل (ريال)")}>
            <Input type="number" step="0.01" dir="ltr" value={pricePaid} onChange={(e) => setPricePaid(Number(e.target.value))} />
          </Field>
          <Button className="w-full" onClick={() => void renew()} loading={saving}>
            {t("Confirm renewal", "تأكيد التجديد")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
