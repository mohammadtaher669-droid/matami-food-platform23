/**
 * Server-authoritative pricing. Pure functions — unit tested.
 * All client-provided prices are ignored; everything derives from DB rows.
 */

export interface PricingAddon {
  id: string;
  name_en: string;
  name_ar: string;
  price: number;
}

export interface PricingItemInput {
  qty: number;
  basePrice: number;
  variantDelta: number;
  addons: PricingAddon[];
}

export interface CouponLike {
  type: "PERCENT" | "FIXED";
  value: number;
  minOrder: number;
  maxDiscount: number | null;
}

export interface OfferLike {
  type: "PERCENT_OFF" | "FIXED_OFF" | "FREE_DELIVERY";
  value: number;
  minOrder: number;
}

export interface ZoneFeeLike {
  fee: number;
  freeOver: number | null;
}

export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function lineTotal(item: PricingItemInput): number {
  const addons = item.addons.reduce((sum, a) => sum + a.price, 0);
  return round2((item.basePrice + item.variantDelta + addons) * item.qty);
}

export function computeSubtotal(items: PricingItemInput[]): number {
  return round2(items.reduce((sum, it) => sum + lineTotal(it), 0));
}

export function couponDiscount(subtotal: number, coupon: CouponLike | null): number {
  if (!coupon || subtotal < coupon.minOrder) return 0;
  const raw = coupon.type === "PERCENT" ? (subtotal * coupon.value) / 100 : coupon.value;
  const capped = coupon.maxDiscount != null ? Math.min(raw, coupon.maxDiscount) : raw;
  return round2(Math.min(capped, subtotal));
}

/** Best single auto-applied offer (FREE_DELIVERY handled via deliveryFee). */
export function offerDiscount(subtotal: number, offers: OfferLike[]): number {
  let best = 0;
  for (const o of offers) {
    if (o.type === "FREE_DELIVERY" || subtotal < o.minOrder) continue;
    const d = o.type === "PERCENT_OFF" ? (subtotal * o.value) / 100 : o.value;
    best = Math.max(best, Math.min(d, subtotal));
  }
  return round2(best);
}

export function deliveryFee(
  subtotal: number,
  zone: ZoneFeeLike | null,
  offers: OfferLike[],
  orderType: "DELIVERY" | "PICKUP",
): number {
  if (orderType === "PICKUP" || !zone) return 0;
  const freeByZone = zone.freeOver != null && subtotal >= zone.freeOver;
  const freeByOffer = offers.some((o) => o.type === "FREE_DELIVERY" && subtotal >= o.minOrder);
  return freeByZone || freeByOffer ? 0 : round2(zone.fee);
}

export interface PriceBreakdown {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  vatAmount: number;
  total: number;
}

/**
 * vatInclusive=true (KSA default): displayed prices already include VAT —
 * vatAmount is the included portion, not added on top.
 */
export function computeTotals(params: {
  items: PricingItemInput[];
  zone: ZoneFeeLike | null;
  coupon: CouponLike | null;
  offers: OfferLike[];
  orderType: "DELIVERY" | "PICKUP";
  vatRate: number;
  vatInclusive: boolean;
  loyaltyDiscount?: number;
}): PriceBreakdown {
  const subtotal = computeSubtotal(params.items);
  const fee = deliveryFee(subtotal, params.zone, params.offers, params.orderType);
  const discount = round2(
    Math.min(
      subtotal,
      couponDiscount(subtotal, params.coupon) +
        offerDiscount(subtotal, params.offers) +
        (params.loyaltyDiscount ?? 0),
    ),
  );
  const taxable = Math.max(0, subtotal - discount);
  let vatAmount: number;
  let total: number;
  if (params.vatInclusive) {
    vatAmount = round2((taxable * params.vatRate) / (100 + params.vatRate));
    total = round2(taxable + fee);
  } else {
    vatAmount = round2((taxable * params.vatRate) / 100);
    total = round2(taxable + vatAmount + fee);
  }
  return { subtotal, deliveryFee: fee, discount, vatAmount, total };
}
