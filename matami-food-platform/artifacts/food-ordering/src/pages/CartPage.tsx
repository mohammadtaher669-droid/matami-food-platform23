import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore, branchStore, couponStore, modifierGroupStore } from "@/lib/store";
import RecommendationRow from "@/components/RecommendationRow";
import { Trash2, Plus, Minus, ShoppingCart, Tag, ChevronRight, ChevronLeft, MessageSquare } from "lucide-react";
import type { CartItem } from "@/contexts/CartContext";

function calculateDiscounts(subtotal: number, deliveryFee: number, orderType: "delivery" | "pickup", couponCode: string) {
  const activeCoupons = couponStore.getAll();

  let couponDiscount = 0;
  let couponError = "";
  let appliedCoupon = null;

  if (couponCode) {
    const coupon = activeCoupons.find((c) => c.code.toUpperCase() === couponCode.toUpperCase() && c.active);
    if (coupon) {
      appliedCoupon = coupon;
      if (coupon.type === "percentage") couponDiscount = (subtotal * coupon.value) / 100;
      else if (coupon.type === "free_delivery") couponDiscount = deliveryFee;
      else if (coupon.type === "fixed") couponDiscount = coupon.value;
    } else {
      couponError = couponCode ? "Invalid or inactive coupon code" : "";
    }
  }

  let autoDiscount = 0;
  if (subtotal > 50) autoDiscount += (subtotal * 10) / 100;
  if (orderType === "pickup") autoDiscount += 2;

  const totalDiscount = couponDiscount + autoDiscount;
  const finalTotal = Math.max(0, subtotal + deliveryFee - totalDiscount);

  return { couponDiscount, autoDiscount, totalDiscount, finalTotal, couponError, appliedCoupon };
}

function getEffectiveUnitPrice(ci: CartItem): number {
  let price = ci.item.price;
  if (ci.selectedOptions) {
    for (const opts of Object.values(ci.selectedOptions)) {
      for (const opt of opts) price += opt.price_addition;
    }
  }
  if (ci.selectedAddOns) {
    for (const a of ci.selectedAddOns) {
      if (!a.is_free) price += a.price;
    }
  }
  return price;
}

function CartItemModifierSummary({ ci }: { ci: CartItem }) {
  const { t, lang } = useLanguage();
  const lines: string[] = [];

  if (ci.selectedOptions) {
    const allGroups = modifierGroupStore.getAll();
    for (const [groupId, opts] of Object.entries(ci.selectedOptions)) {
      if (opts.length === 0) continue;
      const group = allGroups.find((g) => g.id === groupId);
      const groupName = group ? (lang === "ar" ? group.name_ar : group.name_en) : "";
      const optNames = opts.map((o) => lang === "ar" ? o.name_ar : o.name_en).join(", ");
      lines.push(groupName ? `${groupName}: ${optNames}` : optNames);
    }
  }

  if (ci.selectedAddOns && ci.selectedAddOns.length > 0) {
    const addOnNames = ci.selectedAddOns.map((a) => lang === "ar" ? a.name_ar : a.name_en).join(", ");
    lines.push(`${t("Add-ons", "إضافات")}: ${addOnNames}`);
  }

  if (ci.customerNote) {
    lines.push(`📝 ${ci.customerNote}`);
  }

  if (lines.length === 0) return null;

  return (
    <div className="mt-1 space-y-0.5">
      {lines.map((line, i) => (
        <p key={i} className="text-[11px] text-muted-foreground leading-snug">{line}</p>
      ))}
    </div>
  );
}

function buildWhatsAppMessage(cartItems: CartItem[], lang: string, restaurant: { name_en: string; name_ar: string } | undefined, branch: { name_en: string; name_ar: string; address_en: string; address_ar: string } | undefined, orderType: string, finalTotal: number, deliveryFee: number): string {
  const isAr = lang === "ar";
  const header = isAr
    ? `🛒 طلب جديد — ${restaurant ? restaurant.name_ar : ""} / ${branch ? branch.name_ar : ""}`
    : `🛒 New Order — ${restaurant ? restaurant.name_en : ""} / ${branch ? branch.name_en : ""}`;

  const itemLines = cartItems.map((ci) => {
    const name = isAr ? ci.item.name_ar : ci.item.name_en;
    let line = `• ${name} x${ci.quantity} — ${(ci.item.price * ci.quantity).toFixed(0)} ﷼`;

    if (ci.selectedOptions) {
      const allGroups = modifierGroupStore.getAll();
      for (const [groupId, opts] of Object.entries(ci.selectedOptions)) {
        if (opts.length === 0) continue;
        const group = allGroups.find((g) => g.id === groupId);
        const groupName = group ? (isAr ? group.name_ar : group.name_en) : "";
        const optNames = opts.map((o) => {
          const n = isAr ? o.name_ar : o.name_en;
          return o.price_addition > 0 ? `${n} (+${o.price_addition} ﷼)` : n;
        }).join(", ");
        line += `\n  — ${groupName}: ${optNames}`;
      }
    }

    if (ci.selectedAddOns && ci.selectedAddOns.length > 0) {
      const addOnStr = ci.selectedAddOns.map((a) => {
        const n = isAr ? a.name_ar : a.name_en;
        return a.is_free ? n : `${n} (+${a.price} ﷼)`;
      }).join(", ");
      line += `\n  — ${isAr ? "إضافات" : "Add-ons"}: ${addOnStr}`;
    }

    if (ci.customerNote) {
      line += `\n  — 📝 ${ci.customerNote}`;
    }

    return line;
  }).join("\n");

  const orderTypeStr = isAr
    ? (orderType === "delivery" ? "توصيل" : "استلام")
    : (orderType === "delivery" ? "Delivery" : "Pickup");

  const footer = isAr
    ? `\n📦 نوع الطلب: ${orderTypeStr}\n${orderType === "delivery" ? `🚚 رسوم التوصيل: ${deliveryFee} ﷼\n` : ""}💰 الإجمالي: ${finalTotal.toFixed(0)} ﷼`
    : `\n📦 Order type: ${orderTypeStr}\n${orderType === "delivery" ? `🚚 Delivery fee: ${deliveryFee} ﷼\n` : ""}💰 Total: ${finalTotal.toFixed(0)} ﷼`;

  return `${header}\n\n${itemLines}${footer}`;
}

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, selectedRestaurantId, selectedBranchId } = useCart();
  const { t, isRTL, lang } = useLanguage();
  const [, setLocation] = useLocation();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const restaurant = restaurantStore.getAll().find((r) => r.id === selectedRestaurantId);
  const branch = branchStore.getAll().find((b) => b.id === selectedBranchId);

  const deliveryFee = orderType === "delivery" ? (branch?.delivery_fee || 0) : 0;
  const { couponDiscount, autoDiscount, totalDiscount, finalTotal, couponError, appliedCoupon } = calculateDiscounts(
    cartTotal, deliveryFee, orderType, appliedCode
  );

  const handleApplyCoupon = () => {
    setAppliedCode(couponCode.trim().toUpperCase());
  };

  const handleCheckout = () => {
    localStorage.setItem("checkout_order_type", orderType);
    localStorage.setItem("checkout_applied_coupon", appliedCode);
    localStorage.setItem("checkout_delivery_fee", String(deliveryFee));
    localStorage.setItem("checkout_discount", String(totalDiscount));
    localStorage.setItem("checkout_final_total", String(finalTotal));
    setLocation("/checkout");
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCart size={64} className="text-white/10 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">{t("Your cart is empty", "سلتك فارغة")}</h2>
          <p className="text-muted-foreground mb-6">{t("Add items from a restaurant to get started", "أضف عناصر من مطعم للبدء")}</p>
          <Link href="/">
            <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium">{t("Browse Restaurants", "تصفح المطاعم")}</button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-16 pb-28">
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-foreground">{t("Your Cart", "سلتك")}</h1>
            <button onClick={clearCart} className="text-sm text-destructive hover:text-destructive/80 transition" data-testid="btn-clear-cart">
              {t("Clear All", "مسح الكل")}
            </button>
          </div>

          {/* Restaurant info */}
          {restaurant && branch && (
            <div className="bg-card border border-white/5 rounded-xl p-3 mb-5 flex items-center gap-3">
              {restaurant.logoType === "image" && restaurant.logo
                ? <img src={restaurant.logo} alt="" className="w-7 h-7 rounded-lg object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <span className="text-xl">{restaurant.logo}</span>}
              <div>
                <p className="text-sm font-medium text-foreground">{t(restaurant.name_en, restaurant.name_ar)}</p>
                <p className="text-xs text-muted-foreground">{t(branch.name_en, branch.name_ar)}</p>
              </div>
            </div>
          )}

          {/* Order Type */}
          <div className="bg-card border border-white/5 rounded-2xl p-4 mb-5">
            <p className="text-sm font-medium text-foreground mb-3">{t("Order Type", "نوع الطلب")}</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setOrderType("delivery")}
                className={`py-3 rounded-xl text-sm font-medium border transition-all ${orderType === "delivery" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                data-testid="btn-order-delivery"
              >
                {t("Delivery", "توصيل")}
              </button>
              <button
                onClick={() => setOrderType("pickup")}
                className={`py-3 rounded-xl text-sm font-medium border transition-all ${orderType === "pickup" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}
                data-testid="btn-order-pickup"
              >
                {t("Pickup", "استلام")}
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden mb-5">
            {cartItems.map((ci, i) => {
              const key = ci.cartKey || ci.item.id;
              const unitPrice = getEffectiveUnitPrice(ci);
              const lineTotal = unitPrice * ci.quantity;
              return (
                <div
                  key={key}
                  className={`p-4 ${i < cartItems.length - 1 ? "border-b border-white/5" : ""}`}
                  data-testid={`cart-item-${ci.item.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm">{t(ci.item.name_en, ci.item.name_ar)}</p>
                      <p className="text-sm text-primary font-bold mt-0.5">{unitPrice.toFixed(2).replace(/\.00$/, "")} ﷼</p>
                      <CartItemModifierSummary ci={ci} />
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => updateQuantity(key, ci.quantity - 1)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition active:scale-90" style={{ touchAction: "manipulation" }} data-testid={`btn-decrease-${ci.item.id}`}><Minus size={14} /></button>
                      <span className="text-sm font-bold w-6 text-center" data-testid={`qty-${ci.item.id}`}>{ci.quantity}</span>
                      <button onClick={() => updateQuantity(key, ci.quantity + 1)} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition active:scale-90" style={{ touchAction: "manipulation" }} data-testid={`btn-increase-${ci.item.id}`}><Plus size={14} /></button>
                    </div>
                    <div className="text-right min-w-[60px] flex-shrink-0">
                      <p className="text-sm font-bold text-foreground">{lineTotal.toFixed(0)} ﷼</p>
                      <button onClick={() => removeFromCart(key)} className="text-destructive/60 hover:text-destructive mt-1 transition" data-testid={`btn-remove-${ci.item.id}`}><Trash2 size={13} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coupon */}
          <div className="bg-card border border-white/5 rounded-2xl p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={14} className="text-primary" />
              <span className="text-sm font-medium text-foreground">{t("Promo Code", "كود الخصم")}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder={t("Enter code", "أدخل الكود")}
                className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                data-testid="input-coupon"
              />
              <button onClick={handleApplyCoupon} className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition" data-testid="btn-apply-coupon">
                {t("Apply", "تطبيق")}
              </button>
            </div>
            {appliedCode && couponError && <p className="text-xs text-destructive mt-2" data-testid="coupon-error">{t(couponError, "كود غير صالح أو غير نشط")}</p>}
            {appliedCoupon && <p className="text-xs text-green-400 mt-2" data-testid="coupon-success">{t("Coupon applied!", "تم تطبيق الكود!")}</p>}
          </div>

          {/* Order Summary */}
          <div className="bg-card border border-white/5 rounded-2xl p-4 mb-6">
            <h3 className="font-semibold text-foreground mb-4">{t("Order Summary", "ملخص الطلب")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>{t("Subtotal", "المجموع الفرعي")}</span>
                <span>{cartTotal.toFixed(0)} ﷼</span>
              </div>
              {orderType === "delivery" && (
                <div className="flex justify-between text-muted-foreground">
                  <span>{t("Delivery Fee", "رسوم التوصيل")}</span>
                  <span>{deliveryFee} ﷼</span>
                </div>
              )}
              {totalDiscount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>{t("Discount", "الخصم")}</span>
                  <span>-{totalDiscount.toFixed(0)} ﷼</span>
                </div>
              )}
              {autoDiscount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {cartTotal > 50 && t("Auto 10% for order over 50 ﷼", "خصم تلقائي 10% للطلبات فوق 50 ﷼")}
                  {orderType === "pickup" && ", " + t("2 ﷼ pickup discount", "خصم 2 ﷼ للاستلام")}
                </p>
              )}
              <div className="border-t border-white/5 pt-2 flex justify-between font-bold text-base">
                <span className="text-foreground">{t("Total", "الإجمالي")}</span>
                <span className="text-primary">{finalTotal.toFixed(0)} ﷼</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            className="w-full py-4 bg-primary text-primary-foreground rounded-2xl font-bold text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition"
            data-testid="btn-checkout"
          >
            {t("Proceed to Checkout", "المتابعة للدفع")}
            <ChevronIcon size={18} />
          </button>
        </motion.div>

        {/* Upsell recommendations */}
        <div className="mt-6 pb-4">
          <RecommendationRow
            title_en="🔥 You might also like"
            title_ar="🔥 قد يعجبك أيضاً"
            restaurantId={selectedRestaurantId || undefined}
            excludeIds={cartItems.map((ci) => ci.item.id)}
          />
        </div>
      </div>
    </div>
  );
}
