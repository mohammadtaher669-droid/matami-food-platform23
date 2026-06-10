/**
 * Checkout: delivery/pickup, map-pin address with live zone resolution,
 * scheduling, payment method, coupon, loyalty redemption, server-priced bill.
 */
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowRight, Banknote, CalendarClock, CreditCard, MapPin, Smartphone, Ticket, Wallet } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatMoney, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart, lineUnitPrice } from "@/lib/cart";
import { themeToCssVars } from "@/lib/theme";
import { Badge, Button, Card, Field, Input, Modal, Spinner, useToast } from "@/components/ui";
import { PinPicker } from "@/components/MapPicker";
import type { StorePayload } from "@/lib/types";
import { CustomerAuthForm } from "./CustomerAuth";

const PAYMENT_METHODS = [
  { key: "CASH", icon: Banknote, en: "Cash on delivery", ar: "الدفع عند الاستلام", live: true },
  { key: "MADA", icon: CreditCard, en: "Mada", ar: "مدى", live: false },
  { key: "STC_PAY", icon: Smartphone, en: "STC Pay", ar: "STC Pay", live: false },
  { key: "APPLE_PAY", icon: Wallet, en: "Apple Pay", ar: "Apple Pay", live: false },
  { key: "GOOGLE_PAY", icon: Wallet, en: "Google Pay", ar: "Google Pay", live: false },
  { key: "VISA", icon: CreditCard, en: "Visa", ar: "فيزا", live: false },
  { key: "MASTERCARD", icon: CreditCard, en: "Mastercard", ar: "ماستركارد", live: false },
] as const;

interface ResolvedZone {
  branchId: string | null;
  branchName_en?: string;
  branchName_ar?: string;
  zone: { id: string; name_en: string; name_ar: string; fee: number; minOrder: number; freeOver: number | null } | null;
}

export default function Checkout() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { t, tr, lang } = useI18n();
  const { customer } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const [, navigate] = useLocation();

  const [data, setData] = useState<StorePayload | null>(null);
  const [type, setType] = useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [branchId, setBranchId] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [addressText, setAddressText] = useState("");
  const [resolved, setResolved] = useState<ResolvedZone | null>(null);
  const [resolving, setResolving] = useState(false);
  const [payment, setPayment] = useState<(typeof PAYMENT_METHODS)[number]["key"]>("CASH");
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [coupon, setCoupon] = useState("");
  const [redeemPoints, setRedeemPoints] = useState(0);
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [schedule, setSchedule] = useState("");
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    api<StorePayload>(`/api/public/r/${slug}`, { scope: null })
      .then((d) => {
        setData(d);
        setBranchId(d.branches[0]?.id ?? "");
      })
      .catch(() => navigate(`/r/${slug}`));
  }, [slug, navigate]);

  useEffect(() => {
    if (customer) {
      setName((n) => n || customer.name);
      setPhone((p) => p || customer.phone);
      api<{ accounts: Array<{ points: number; restaurant: { slug: string } }> }>("/api/public/me/loyalty")
        .then((d) => setLoyaltyBalance(d.accounts.find((a) => a.restaurant.slug === slug)?.points ?? 0))
        .catch(() => undefined);
    }
  }, [customer, slug]);

  // Live zone resolution when the pin moves
  useEffect(() => {
    if (!pin || type !== "DELIVERY") return;
    setResolving(true);
    const handle = setTimeout(() => {
      api<ResolvedZone>(`/api/public/r/${slug}/resolve-zone`, { body: pin, scope: null })
        .then((d) => {
          setResolved(d);
          if (d.branchId) setBranchId(d.branchId);
        })
        .catch(() => setResolved(null))
        .finally(() => setResolving(false));
    }, 350);
    return () => clearTimeout(handle);
  }, [pin, slug, type]);

  const loyaltyCfg = data?.restaurant.settings.loyalty;
  const redeemPerPoint = loyaltyCfg?.redeemPerPoint ?? 0.05;

  const bill = useMemo(() => {
    const subtotal = cart.subtotal;
    const zone = type === "DELIVERY" ? resolved?.zone : null;
    let fee = zone ? zone.fee : 0;
    if (zone?.freeOver != null && subtotal >= zone.freeOver) fee = 0;
    const loyaltyDiscount = Math.min(subtotal, Math.round(redeemPoints * redeemPerPoint * 100) / 100);
    const vatRate = data?.restaurant.vatRate ?? 15;
    const taxable = Math.max(0, subtotal - loyaltyDiscount);
    const vat = Math.round(((taxable * vatRate) / (100 + vatRate)) * 100) / 100;
    return { subtotal, fee, loyaltyDiscount, vat, estimate: Math.round((taxable + fee) * 100) / 100 };
  }, [cart.subtotal, resolved, type, redeemPoints, redeemPerPoint, data]);

  if (!data) return <Spinner />;
  if (cart.count === 0 || cart.slug !== slug) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="font-bold">{t("Your cart is empty", "سلتك فارغة")}</p>
        <Link href={`/r/${slug}`} className="text-sm font-bold text-[var(--th-primary)]">
          {t("Back to menu", "العودة للمنيو")}
        </Link>
      </div>
    );
  }

  const r = data.restaurant;
  const vars = themeToCssVars(r.theme);
  const belowMin = type === "DELIVERY" && resolved?.zone != null && cart.subtotal < resolved.zone.minOrder;

  const placeOrder = async () => {
    if (!name.trim() || phone.replace(/\D/g, "").length < 8) {
      toast(t("Enter your name and a valid phone", "أدخل اسمك ورقم جوال صحيح"), "error");
      return;
    }
    if (type === "DELIVERY" && (!pin || !resolved?.zone)) {
      toast(t("Pick a delivery location inside our zones", "حدد موقع توصيل داخل مناطق التغطية"), "error");
      return;
    }
    setPlacing(true);
    try {
      const res = await api<{ orderNo: number; trackUrl: string }>(`/api/public/r/${slug}/orders`, {
        scope: customer ? "customer" : null,
        body: {
          branchId,
          type,
          paymentMethod: payment,
          customerName: name.trim(),
          customerPhone: phone.trim(),
          address: type === "DELIVERY" && pin ? { text: addressText, lat: pin.lat, lng: pin.lng } : undefined,
          couponCode: coupon.trim() || undefined,
          scheduledAt: schedule ? new Date(schedule).toISOString() : undefined,
          notes,
          redeemPoints: redeemPoints || 0,
          items: cart.lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            addonIds: l.addons.map((a) => a.id),
            qty: l.qty,
            notes: l.notes,
          })),
        },
      });
      cart.clear();
      navigate(`/r/${slug}/track/${res.orderNo}?phone=${encodeURIComponent(phone.trim().replace(/[\s-]/g, ""))}`);
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : t("Could not place the order", "تعذر إرسال الطلب"), "error");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen pb-32" style={{ ...(vars as CSSProperties), background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "var(--th-font)" }}>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[var(--th-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href={`/r/${slug}`} className="rounded-full p-1.5 hover:bg-black/5">
            <ArrowRight size={18} className="rtl:rotate-0 ltr:rotate-180" />
          </Link>
          <h1 className="text-lg font-extrabold">{t("Checkout", "إتمام الطلب")}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-5 px-4 py-5">
        {/* Sign-in nudge */}
        {!customer && (
          <Card className="flex items-center justify-between gap-3 p-4">
            <p className="text-xs text-[var(--th-muted)]">
              {t("Sign in to earn loyalty points & track orders easily", "سجّل الدخول لتكسب نقاط ولاء وتتابع طلباتك بسهولة")}
            </p>
            <Button size="sm" variant="outline" onClick={() => setAuthOpen(true)}>
              {t("Sign in", "تسجيل الدخول")}
            </Button>
          </Card>
        )}

        {/* Type toggle */}
        <div className="grid grid-cols-2 gap-2 rounded-full bg-black/5 p-1">
          {(["DELIVERY", "PICKUP"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setType(k)}
              className={`rounded-full py-2.5 text-sm font-bold transition-colors ${type === k ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : ""}`}
            >
              {k === "DELIVERY" ? t("Delivery 🛵", "توصيل 🛵") : t("Pickup 🛍", "استلام 🛍")}
            </button>
          ))}
        </div>

        {/* Address / branch */}
        {type === "DELIVERY" ? (
          <Card className="space-y-3 p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <MapPin size={16} className="text-[var(--th-primary)]" /> {t("Delivery location", "موقع التوصيل")}
            </p>
            <PinPicker value={pin} onChange={setPin} />
            <Input value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder={t("Building, street, details…", "المبنى، الشارع، تفاصيل…")} />
            {resolving && <p className="text-xs text-[var(--th-muted)]">{t("Checking coverage…", "جارٍ التحقق من التغطية…")}</p>}
            {!resolving && pin && resolved?.zone && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="success">
                  ✓ {tr(resolved.zone as unknown as Record<string, unknown>, "name")} — {t("fee", "رسوم")} {formatMoney(resolved.zone.fee, r.currency, lang)}
                </Badge>
                {resolved.zone.freeOver != null && (
                  <Badge tone="info">
                    {t(`Free over ${resolved.zone.freeOver}`, `توصيل مجاني فوق ${resolved.zone.freeOver}`)}
                  </Badge>
                )}
                {belowMin && (
                  <Badge tone="danger">
                    {t(`Min order ${resolved.zone.minOrder}`, `الحد الأدنى ${resolved.zone.minOrder}`)}
                  </Badge>
                )}
              </div>
            )}
            {!resolving && pin && resolved && !resolved.zone && (
              <Badge tone="danger">{t("Outside delivery zones", "خارج مناطق التوصيل")}</Badge>
            )}
          </Card>
        ) : (
          <Card className="space-y-2 p-4">
            <p className="text-sm font-bold">{t("Pickup branch", "فرع الاستلام")}</p>
            <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full rounded-[var(--th-radius)] border border-black/10 bg-[var(--th-surface)] px-3 py-2.5 text-sm">
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {tr(b as unknown as Record<string, unknown>, "name")} — {tr(b as unknown as Record<string, unknown>, "address")}
                </option>
              ))}
            </select>
          </Card>
        )}

        {/* Contact */}
        <Card className="grid gap-3 p-4 sm:grid-cols-2">
          <Field label={t("Your name", "الاسم")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("Phone (WhatsApp)", "الجوال (واتساب)")}>
            <Input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05xxxxxxxx" />
          </Field>
        </Card>

        {/* Schedule */}
        <Card className="space-y-2 p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <CalendarClock size={16} className="text-[var(--th-primary)]" /> {t("Schedule (optional)", "جدولة الطلب (اختياري)")}
          </p>
          <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} min={new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16)} />
        </Card>

        {/* Payment */}
        <Card className="space-y-2 p-4">
          <p className="text-sm font-bold">{t("Payment method", "طريقة الدفع")}</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.key}
                disabled={!m.live}
                onClick={() => setPayment(m.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors disabled:opacity-40 ${
                  payment === m.key ? "border-[var(--th-primary)] bg-[var(--th-primary)]/5" : "border-black/10"
                }`}
              >
                <m.icon size={15} /> {lang === "ar" ? m.ar : m.en}
                {!m.live && <span className="ms-auto text-[9px] text-[var(--th-muted)]">{t("Soon", "قريباً")}</span>}
              </button>
            ))}
          </div>
        </Card>

        {/* Coupon + loyalty */}
        <Card className="space-y-3 p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Ticket size={16} className="text-[var(--th-primary)]" /> {t("Coupon & points", "كوبون ونقاط")}
          </p>
          <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder={t("Coupon code", "كود الخصم")} dir="ltr" className="uppercase" />
          {customer && loyaltyCfg?.enabled !== false && loyaltyBalance > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span>
                  {t("Redeem points", "استبدال النقاط")} ({loyaltyBalance} {t("available", "متاحة")})
                </span>
                <b>
                  -{formatMoney(Math.round(redeemPoints * redeemPerPoint * 100) / 100, r.currency, lang)}
                </b>
              </div>
              <input
                type="range"
                min={0}
                max={loyaltyBalance}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))}
                className="w-full accent-[var(--th-primary)]"
              />
            </div>
          )}
        </Card>

        {/* Cart summary */}
        <Card className="divide-y divide-black/5 p-4">
          {cart.lines.map((l) => (
            <div key={l.uid} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate font-bold">
                  {l.qty}× {lang === "ar" ? l.name_ar : l.name_en}
                  {l.variantId && <span className="text-xs text-[var(--th-muted)]"> ({lang === "ar" ? l.variantName_ar : l.variantName_en})</span>}
                </p>
                {l.addons.length > 0 && (
                  <p className="truncate text-[11px] text-[var(--th-muted)]">+ {l.addons.map((a) => (lang === "ar" ? a.name_ar : a.name_en)).join("، ")}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatMoney(lineUnitPrice(l) * l.qty, r.currency, lang)}</span>
                <button onClick={() => cart.updateQty(l.uid, l.qty - 1)} className="rounded-full bg-black/5 px-2 text-sm font-black">−</button>
                <button onClick={() => cart.updateQty(l.uid, l.qty + 1)} className="rounded-full bg-black/5 px-2 text-sm font-black">+</button>
              </div>
            </div>
          ))}
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("Order notes…", "ملاحظات على الطلب…")}
            className="mt-3 min-h-[50px] w-full rounded-[var(--th-radius)] border border-black/10 p-3 text-sm"
          />
        </Card>

        {/* Bill */}
        <Card className="space-y-1.5 p-4 text-sm">
          <Row label={t("Subtotal", "المجموع الفرعي")} value={formatMoney(bill.subtotal, r.currency, lang)} />
          <Row label={t("Delivery fee", "رسوم التوصيل")} value={type === "PICKUP" ? t("Free", "مجاني") : resolved?.zone ? formatMoney(bill.fee, r.currency, lang) : "—"} />
          {bill.loyaltyDiscount > 0 && <Row label={t("Points discount", "خصم النقاط")} value={`-${formatMoney(bill.loyaltyDiscount, r.currency, lang)}`} />}
          {coupon && <Row label={t("Coupon", "الكوبون")} value={t("Applied at confirmation", "يُحسم عند التأكيد")} muted />}
          <Row label={`${t("VAT", "الضريبة")} (${r.vatRate}%) ${t("included", "مشمولة")}`} value={formatMoney(bill.vat, r.currency, lang)} muted />
          <div className="border-t border-black/10 pt-2">
            <Row label={<b>{t("Estimated total", "الإجمالي التقريبي")}</b>} value={<b className="text-base">{formatMoney(bill.estimate, r.currency, lang)}</b>} />
            <p className="text-[10px] text-[var(--th-muted)]">{t("Final total (incl. coupon) is confirmed by the server", "الإجمالي النهائي (شامل الكوبون) يُحتسب من الخادم")}</p>
          </div>
        </Card>
      </main>

      {/* Place order */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-black/5 bg-[var(--th-surface)]/95 p-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button className="w-full" size="lg" loading={placing} disabled={belowMin} onClick={placeOrder}>
            {t("Place order", "إرسال الطلب")} · {formatMoney(bill.estimate, r.currency, lang)}
          </Button>
        </div>
      </div>

      <Modal open={authOpen} onClose={() => setAuthOpen(false)} title={t("Sign in", "تسجيل الدخول")}>
        <CustomerAuthForm onDone={() => setAuthOpen(false)} />
      </Modal>
    </div>
  );

  function Row({ label, value, muted }: { label: React.ReactNode; value: React.ReactNode; muted?: boolean }) {
    return (
      <div className={`flex items-center justify-between ${muted ? "text-xs text-[var(--th-muted)]" : ""}`}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
    );
  }
}
