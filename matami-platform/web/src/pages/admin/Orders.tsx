/** Orders board: status columns, search, order drawer with transitions & driver info. */
import { useCallback, useEffect, useState } from "react";
import { Phone, RefreshCcw, Search, Truck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney, useI18n } from "@/lib/i18n";
import { Badge, Button, Card, EmptyState, Field, Input, Modal, Spinner, useToast } from "@/components/ui";
import { useAdmin } from "./AdminPanel";

interface AdminOrder {
  id: string;
  orderNo: number;
  status: string;
  type: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  addressText: string;
  notes: string;
  driverName: string;
  driverPhone: string;
  cancelReason: string;
  scheduledAt: string | null;
  createdAt: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  vatAmount: number;
  total: number;
  couponCode: string | null;
  branch: { name_en: string; name_ar: string };
  zone: { name_en: string; name_ar: string } | null;
  items: Array<{
    name_en: string; name_ar: string; variant_en: string; variant_ar: string;
    qty: number; unitPrice: number; lineTotal: number;
    addons: Array<{ name_en: string; name_ar: string; price: number }>; notes: string;
  }>;
}

const STATUSES = ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"] as const;
const NEXT: Record<string, string[]> = {
  NEW: ["ACCEPTED", "CANCELED"],
  ACCEPTED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELED"],
};
const LABELS: Record<string, [string, string]> = {
  NEW: ["New", "جديد"], ACCEPTED: ["Accepted", "مقبول"], PREPARING: ["Preparing", "قيد التحضير"],
  READY: ["Ready", "جاهز"], OUT_FOR_DELIVERY: ["On the way", "في الطريق"],
  DELIVERED: ["Delivered", "تم التوصيل"], CANCELED: ["Canceled", "ملغي"],
};
const TONES: Record<string, "warn" | "info" | "success" | "danger"> = {
  NEW: "warn", ACCEPTED: "info", PREPARING: "info", READY: "info", OUT_FOR_DELIVERY: "info", DELIVERED: "success", CANCELED: "danger",
};

export default function Orders() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();

  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filter) params.set("status", filter);
    if (q.trim()) params.set("q", q.trim());
    api<{ orders: AdminOrder[]; statusCounts: Record<string, number> }>(`/api/admin/orders?${params}`, { headers })
      .then((d) => {
        setOrders(d.orders);
        setCounts(d.statusCounts);
      })
      .catch(() => setOrders([]));
  }, [filter, q, headers]);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const transition = async (order: AdminOrder, status: string) => {
    setUpdating(true);
    try {
      await api(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers,
        body: {
          status,
          driverName: driverName || undefined,
          driverPhone: driverPhone || undefined,
          cancelReason: status === "CANCELED" ? cancelReason : undefined,
        },
      });
      toast(t("Order updated", "تم تحديث الطلب"));
      setSelected(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Orders", "الطلبات")}</h1>
        <button onClick={load} className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold">
          <RefreshCcw size={13} /> {t("Refresh", "تحديث")}
        </button>
      </div>

      {/* Status filter chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Chip active={filter === ""} onClick={() => setFilter("")}>
          {t("All", "الكل")}
        </Chip>
        {STATUSES.map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)}>
            {lang === "ar" ? LABELS[s]?.[1] : LABELS[s]?.[0]} {counts[s] ? `(${counts[s]})` : ""}
          </Chip>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--th-muted)]" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search name / phone / order #", "بحث بالاسم / الجوال / رقم الطلب")} className="ps-9" />
      </div>

      {orders === null ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <EmptyState title={t("No orders", "لا توجد طلبات")} hint={t("Orders will appear here in real time", "ستظهر الطلبات هنا مباشرة")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {orders.map((o) => (
            <Card
              key={o.id}
              className={`cursor-pointer p-4 transition-shadow hover:shadow-md ${o.status === "NEW" ? "ring-2 ring-amber-400" : ""}`}
              // open drawer
            >
              <button className="w-full text-start" onClick={() => { setSelected(o); setDriverName(o.driverName); setDriverPhone(o.driverPhone); setCancelReason(""); }}>
                <div className="flex items-center justify-between">
                  <span className="font-extrabold">#{o.orderNo}</span>
                  <Badge tone={TONES[o.status] ?? "info"}>{lang === "ar" ? LABELS[o.status]?.[1] : LABELS[o.status]?.[0]}</Badge>
                </div>
                <p className="mt-1 text-sm font-bold">{o.customerName}</p>
                <p className="text-[11px] text-[var(--th-muted)]" dir="ltr">{o.customerPhone}</p>
                <p className="mt-1 text-[11px] text-[var(--th-muted)]">
                  {formatDate(o.createdAt, lang)} · {tr(o.branch as unknown as Record<string, unknown>, "name")} ·{" "}
                  {o.type === "DELIVERY" ? "🛵" : "🛍"}
                  {o.scheduledAt && <span className="font-bold text-amber-600"> · 🕐 {formatDate(o.scheduledAt, lang)}</span>}
                </p>
                <div className="mt-2 flex items-center justify-between border-t border-black/5 pt-2">
                  <span className="text-[11px] text-[var(--th-muted)]">{o.items.reduce((s, it) => s + it.qty, 0)} {t("items", "صنف")}</span>
                  <span className="font-extrabold">{formatMoney(o.total, "SAR", lang)}</span>
                </div>
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* Order drawer */}
      <Modal open={selected !== null} onClose={() => setSelected(null)} title={selected ? `${t("Order", "طلب")} #${selected.orderNo}` : ""} wide>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={TONES[selected.status] ?? "info"}>{lang === "ar" ? LABELS[selected.status]?.[1] : LABELS[selected.status]?.[0]}</Badge>
              <Badge>{selected.type === "DELIVERY" ? t("Delivery", "توصيل") : t("Pickup", "استلام")}</Badge>
              <Badge>{selected.paymentMethod}</Badge>
              <Badge tone={selected.paymentStatus === "PAID" ? "success" : "warn"}>{selected.paymentStatus}</Badge>
              {selected.couponCode && <Badge tone="info">🎟 {selected.couponCode}</Badge>}
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-black/[0.03] p-3">
                <p className="font-bold">{selected.customerName}</p>
                <a href={`tel:${selected.customerPhone}`} className="flex items-center gap-1 text-xs text-[var(--th-primary)]" dir="ltr">
                  <Phone size={12} /> {selected.customerPhone}
                </a>
                {selected.addressText && <p className="mt-1 text-xs text-[var(--th-muted)]">📍 {selected.addressText}</p>}
                {selected.zone && <p className="text-xs text-[var(--th-muted)]">{t("Zone", "المنطقة")}: {tr(selected.zone as unknown as Record<string, unknown>, "name")}</p>}
                {selected.notes && <p className="mt-1 text-xs">📝 {selected.notes}</p>}
              </div>
              <div className="rounded-xl bg-black/[0.03] p-3 text-xs">
                <Row l={t("Subtotal", "المجموع")} v={formatMoney(selected.subtotal, "SAR", lang)} />
                <Row l={t("Delivery", "التوصيل")} v={formatMoney(selected.deliveryFee, "SAR", lang)} />
                {selected.discount > 0 && <Row l={t("Discount", "الخصم")} v={`-${formatMoney(selected.discount, "SAR", lang)}`} />}
                <Row l={t("VAT", "الضريبة")} v={formatMoney(selected.vatAmount, "SAR", lang)} />
                <div className="mt-1 border-t border-black/10 pt-1 text-sm font-extrabold">
                  <Row l={t("Total", "الإجمالي")} v={formatMoney(selected.total, "SAR", lang)} />
                </div>
              </div>
            </div>

            <div className="divide-y divide-black/5 rounded-xl border border-black/5 text-sm">
              {selected.items.map((it, i) => (
                <div key={i} className="p-3">
                  <div className="flex justify-between font-bold">
                    <span>{it.qty}× {lang === "ar" ? it.name_ar : it.name_en} {(it.variant_ar || it.variant_en) && <span className="text-xs text-[var(--th-muted)]">({lang === "ar" ? it.variant_ar : it.variant_en})</span>}</span>
                    <span>{formatMoney(it.lineTotal, "SAR", lang)}</span>
                  </div>
                  {it.addons.length > 0 && <p className="text-[11px] text-[var(--th-muted)]">+ {it.addons.map((a) => (lang === "ar" ? a.name_ar : a.name_en)).join("، ")}</p>}
                  {it.notes && <p className="text-[11px] text-amber-600">📝 {it.notes}</p>}
                </div>
              ))}
            </div>

            {/* Driver info for delivery orders */}
            {selected.type === "DELIVERY" && selected.status !== "DELIVERED" && selected.status !== "CANCELED" && (
              <div className="grid grid-cols-2 gap-3">
                <Field label={<span className="flex items-center gap-1"><Truck size={12} /> {t("Driver name", "اسم السائق")}</span>}>
                  <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} />
                </Field>
                <Field label={t("Driver phone", "جوال السائق")}>
                  <Input dir="ltr" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
                </Field>
              </div>
            )}

            {/* Transitions */}
            {(NEXT[selected.status] ?? []).length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {(NEXT[selected.status] ?? []).filter((s) => s !== "CANCELED").map((s) => (
                    <Button key={s} size="sm" loading={updating} onClick={() => void transition(selected, s)}>
                      → {lang === "ar" ? LABELS[s]?.[1] : LABELS[s]?.[0]}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder={t("Cancel reason…", "سبب الإلغاء…")} />
                  <Button size="sm" variant="danger" loading={updating} onClick={() => void transition(selected, "CANCELED")}>
                    {t("Cancel order", "إلغاء الطلب")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );

  function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${active ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
      >
        {children}
      </button>
    );
  }

  function Row({ l, v }: { l: React.ReactNode; v: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between py-0.5">
        <span className="text-[var(--th-muted)]">{l}</span>
        <span>{v}</span>
      </div>
    );
  }
}
