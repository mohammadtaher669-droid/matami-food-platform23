/** Order tracking: live status timeline, driver card, invoice + WhatsApp share. */
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Link, useParams } from "wouter";
import { ArrowRight, CheckCircle2, ChefHat, CircleDashed, FileText, PackageCheck, Phone, Share2, Truck, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatMoney, useI18n } from "@/lib/i18n";
import { themeToCssVars } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, Spinner } from "@/components/ui";
import type { StorePayload, TrackedOrder } from "@/lib/types";

const STATUS_FLOW = [
  { key: "NEW", icon: CircleDashed, en: "Received", ar: "تم الاستلام" },
  { key: "ACCEPTED", icon: CheckCircle2, en: "Accepted", ar: "تم القبول" },
  { key: "PREPARING", icon: ChefHat, en: "Preparing", ar: "قيد التحضير" },
  { key: "READY", icon: PackageCheck, en: "Ready", ar: "جاهز" },
  { key: "OUT_FOR_DELIVERY", icon: Truck, en: "On the way", ar: "في الطريق" },
  { key: "DELIVERED", icon: CheckCircle2, en: "Delivered", ar: "تم التوصيل" },
];

export default function Track() {
  const params = useParams<{ slug: string; orderNo: string }>();
  const slug = params.slug ?? "";
  const orderNo = params.orderNo ?? "";
  const { t, lang, tr } = useI18n();
  const phone = new URLSearchParams(window.location.search).get("phone") ?? "";

  const [data, setData] = useState<{ order: TrackedOrder; invoiceUrl: string; whatsappShare: string } | null>(null);
  const [store, setStore] = useState<StorePayload | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<{ order: TrackedOrder; invoiceUrl: string; whatsappShare: string }>(
      `/api/public/r/${slug}/track/${orderNo}?phone=${encodeURIComponent(phone)}`,
    )
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "error"));
  }, [slug, orderNo, phone]);

  useEffect(() => {
    load();
    api<StorePayload>(`/api/public/r/${slug}`, { scope: null }).then(setStore).catch(() => undefined);
    const interval = setInterval(load, 15000); // live tracking poll
    return () => clearInterval(interval);
  }, [load, slug]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <EmptyState title={t("Order not found", "الطلب غير موجود")} hint={error} />
        <div className="mt-4 text-center">
          <Link href={`/r/${slug}`} className="text-sm font-bold text-[var(--th-primary)]">
            {t("Back to restaurant", "العودة للمطعم")}
          </Link>
        </div>
      </div>
    );
  }
  if (!data) return <Spinner label={t("Loading order…", "جارٍ تحميل الطلب…")} />;

  const o = data.order;
  const vars = store ? themeToCssVars(store.restaurant.theme) : {};
  const canceled = o.status === "CANCELED";
  const currentIdx = STATUS_FLOW.findIndex((s) => s.key === o.status);
  const visibleFlow = o.type === "PICKUP" ? STATUS_FLOW.filter((s) => s.key !== "OUT_FOR_DELIVERY") : STATUS_FLOW;

  return (
    <div className="min-h-screen pb-16" style={{ ...(vars as CSSProperties), background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "var(--th-font)" }}>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[var(--th-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href={`/r/${slug}`} className="rounded-full p-1.5 hover:bg-black/5">
            <ArrowRight size={18} className="rtl:rotate-0 ltr:rotate-180" />
          </Link>
          <div>
            <h1 className="text-lg font-extrabold">
              {t("Order", "طلب")} #{o.orderNo}
            </h1>
            <p className="text-[11px] text-[var(--th-muted)]">{formatDate(o.createdAt, lang)}</p>
          </div>
          <span className="ms-auto">
            {canceled ? <Badge tone="danger">{t("Canceled", "ملغي")}</Badge> : o.status === "DELIVERED" ? <Badge tone="success">{t("Delivered", "تم التوصيل")}</Badge> : <Badge tone="info">{t("In progress", "جارٍ التنفيذ")}</Badge>}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        {/* Status timeline */}
        <Card className="p-5">
          {canceled ? (
            <div className="flex items-center gap-3 text-red-600">
              <XCircle size={28} />
              <div>
                <p className="font-extrabold">{t("Order canceled", "تم إلغاء الطلب")}</p>
                {o.cancelReason && <p className="text-xs text-[var(--th-muted)]">{o.cancelReason}</p>}
              </div>
            </div>
          ) : (
            <ol className="relative space-y-5">
              {visibleFlow.map((s, i) => {
                const flowIdx = STATUS_FLOW.findIndex((x) => x.key === s.key);
                const done = currentIdx >= flowIdx;
                const event = o.timeline.find((e) => e.status === s.key);
                return (
                  <li key={s.key} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${done ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5 text-[var(--th-muted)]"}`}>
                        <s.icon size={16} />
                      </span>
                      {i < visibleFlow.length - 1 && <span className={`h-6 w-0.5 ${done ? "bg-[var(--th-primary)]" : "bg-black/10"}`} />}
                    </div>
                    <div className="pt-1.5">
                      <p className={`text-sm font-bold ${done ? "" : "text-[var(--th-muted)]"}`}>{lang === "ar" ? s.ar : s.en}</p>
                      {event && <p className="text-[11px] text-[var(--th-muted)]">{formatDate(event.at, lang)}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
          {o.scheduledAt && (
            <p className="mt-4 rounded-xl bg-amber-50 p-2.5 text-xs font-bold text-amber-800">
              🕐 {t("Scheduled for", "مجدول إلى")}: {formatDate(o.scheduledAt, lang)}
            </p>
          )}
        </Card>

        {/* Driver */}
        {(o.driverName || o.driverPhone) && (
          <Card className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--th-primary)]/10 text-[var(--th-primary)]">
                <Truck size={18} />
              </span>
              <div>
                <p className="text-sm font-bold">{o.driverName || t("Driver", "السائق")}</p>
                <p className="text-xs text-[var(--th-muted)]" dir="ltr">{o.driverPhone}</p>
              </div>
            </div>
            {o.driverPhone && (
              <a href={`tel:${o.driverPhone}`} className="rounded-full bg-[var(--th-primary)] p-2.5 text-[var(--th-primary-fg)]">
                <Phone size={16} />
              </a>
            )}
          </Card>
        )}

        {/* Items + totals */}
        <Card className="divide-y divide-black/5 p-4 text-sm">
          {o.items.map((it, i) => (
            <div key={i} className="py-2.5">
              <div className="flex items-center justify-between">
                <p className="font-bold">
                  {it.qty}× {lang === "ar" ? it.name_ar : it.name_en}
                  {(it.variant_en || it.variant_ar) && (
                    <span className="text-xs text-[var(--th-muted)]"> ({lang === "ar" ? it.variant_ar : it.variant_en})</span>
                  )}
                </p>
                <span className="font-bold">{formatMoney(it.lineTotal, store?.restaurant.currency, lang)}</span>
              </div>
              {it.addons.length > 0 && (
                <p className="text-[11px] text-[var(--th-muted)]">+ {it.addons.map((a) => (lang === "ar" ? a.name_ar : a.name_en)).join("، ")}</p>
              )}
              {it.notes && <p className="text-[11px] text-[var(--th-muted)]">📝 {it.notes}</p>}
            </div>
          ))}
          <div className="space-y-1 pt-3 text-xs">
            <Row label={t("Subtotal", "المجموع الفرعي")} v={formatMoney(o.subtotal, store?.restaurant.currency, lang)} />
            <Row label={t("Delivery", "التوصيل")} v={formatMoney(o.deliveryFee, store?.restaurant.currency, lang)} />
            {o.discount > 0 && <Row label={t("Discount", "الخصم")} v={`-${formatMoney(o.discount, store?.restaurant.currency, lang)}`} />}
            <Row label={t("VAT (included)", "الضريبة (مشمولة)")} v={formatMoney(o.vatAmount, store?.restaurant.currency, lang)} />
            <div className="flex items-center justify-between border-t border-black/10 pt-2 text-sm font-extrabold">
              <span>{t("Total", "الإجمالي")}</span>
              <span>{formatMoney(o.total, store?.restaurant.currency, lang)}</span>
            </div>
            {o.loyaltyEarned > 0 && (
              <p className="pt-1 text-[11px] font-bold text-emerald-600">
                🎁 {t(`You earn ${o.loyaltyEarned} points on delivery`, `ستكسب ${o.loyaltyEarned} نقطة عند التوصيل`)}
              </p>
            )}
          </div>
        </Card>

        {/* Invoice actions */}
        <div className="grid grid-cols-2 gap-3">
          <a href={data.invoiceUrl} target="_blank" rel="noreferrer">
            <Button variant="outline" className="w-full">
              <FileText size={16} /> {t("Invoice", "الفاتورة")}
            </Button>
          </a>
          <a href={data.whatsappShare} target="_blank" rel="noreferrer">
            <Button className="w-full">
              <Share2 size={16} /> {t("Share on WhatsApp", "مشاركة واتساب")}
            </Button>
          </a>
        </div>

        <p className="text-center text-[11px] text-[var(--th-muted)]">
          {t("Branch", "الفرع")}: {store ? tr(o.branch as unknown as Record<string, unknown>, "name") : ""} {o.branch.phone && <span dir="ltr">· ☎ {o.branch.phone}</span>}
        </p>
      </main>
    </div>
  );

  function Row({ label, v }: { label: React.ReactNode; v: React.ReactNode }) {
    return (
      <div className="flex items-center justify-between">
        <span className="text-[var(--th-muted)]">{label}</span>
        <span>{v}</span>
      </div>
    );
  }
}
