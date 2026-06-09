import { describe, expect, it } from "vitest";
import {
  computeSubtotal,
  computeTotals,
  couponDiscount,
  deliveryFee,
  lineTotal,
  offerDiscount,
} from "../src/lib/pricing";

const item = (qty: number, base: number, variant = 0, addonPrices: number[] = []) => ({
  qty,
  basePrice: base,
  variantDelta: variant,
  addons: addonPrices.map((price, i) => ({ id: String(i), name_en: "a", name_ar: "أ", price })),
});

describe("lineTotal / subtotal", () => {
  it("multiplies base + variant + addons by qty", () => {
    expect(lineTotal(item(2, 10, 2.5, [1, 0.5]))).toBe(28);
  });

  it("sums lines into subtotal with 2dp rounding", () => {
    expect(computeSubtotal([item(1, 10.105), item(1, 5)])).toBe(15.11);
  });
});

describe("couponDiscount", () => {
  it("ignores coupon below minOrder", () => {
    expect(couponDiscount(40, { type: "PERCENT", value: 10, minOrder: 50, maxDiscount: null })).toBe(0);
  });

  it("applies percent with cap", () => {
    expect(couponDiscount(200, { type: "PERCENT", value: 20, minOrder: 0, maxDiscount: 30 })).toBe(30);
  });

  it("fixed discount never exceeds subtotal", () => {
    expect(couponDiscount(15, { type: "FIXED", value: 50, minOrder: 0, maxDiscount: null })).toBe(15);
  });
});

describe("offerDiscount", () => {
  it("picks the best eligible offer and skips FREE_DELIVERY", () => {
    const offers = [
      { type: "PERCENT_OFF" as const, value: 10, minOrder: 0 },
      { type: "FIXED_OFF" as const, value: 25, minOrder: 100 },
      { type: "FREE_DELIVERY" as const, value: 0, minOrder: 0 },
    ];
    expect(offerDiscount(200, offers)).toBe(25);
    expect(offerDiscount(50, offers)).toBe(5);
  });
});

describe("deliveryFee", () => {
  const zone = { fee: 12, freeOver: 100 };

  it("is zero for pickup", () => {
    expect(deliveryFee(50, zone, [], "PICKUP")).toBe(0);
  });

  it("charges zone fee below freeOver", () => {
    expect(deliveryFee(50, zone, [], "DELIVERY")).toBe(12);
  });

  it("free above zone freeOver threshold", () => {
    expect(deliveryFee(150, zone, [], "DELIVERY")).toBe(0);
  });

  it("free when a FREE_DELIVERY offer matches", () => {
    expect(deliveryFee(60, zone, [{ type: "FREE_DELIVERY", value: 0, minOrder: 50 }], "DELIVERY")).toBe(0);
  });
});

describe("computeTotals", () => {
  it("VAT-inclusive (KSA): vat is the included portion, not added", () => {
    const t = computeTotals({
      items: [item(2, 50)], // subtotal 100
      zone: { fee: 10, freeOver: null },
      coupon: { type: "FIXED", value: 20, minOrder: 0, maxDiscount: null },
      offers: [],
      orderType: "DELIVERY",
      vatRate: 15,
      vatInclusive: true,
    });
    expect(t.subtotal).toBe(100);
    expect(t.discount).toBe(20);
    expect(t.deliveryFee).toBe(10);
    expect(t.vatAmount).toBe(10.43); // 80 * 15/115
    expect(t.total).toBe(90); // 80 + 10
  });

  it("VAT-exclusive adds vat on top", () => {
    const t = computeTotals({
      items: [item(1, 100)],
      zone: null,
      coupon: null,
      offers: [],
      orderType: "PICKUP",
      vatRate: 15,
      vatInclusive: false,
    });
    expect(t.vatAmount).toBe(15);
    expect(t.total).toBe(115);
  });

  it("loyalty discount stacks but never exceeds subtotal", () => {
    const t = computeTotals({
      items: [item(1, 30)],
      zone: null,
      coupon: { type: "FIXED", value: 25, minOrder: 0, maxDiscount: null },
      offers: [],
      orderType: "PICKUP",
      vatRate: 15,
      vatInclusive: true,
      loyaltyDiscount: 20,
    });
    expect(t.discount).toBe(30);
    expect(t.total).toBe(0);
  });
});
