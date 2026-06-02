import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  restaurantStore, branchStore, orderStore, analyticsStore,
  userBehaviorStore, modifierGroupStore,
} from "@/lib/store";
import { MapPin, User, Phone, MessageSquare, Send, ShoppingBag, Truck, Store } from "lucide-react";
import type { CartItem } from "@/contexts/CartContext";

function generateOrderId(): string {
  return "ORD-" + Math.random().toString(36).toUpperCase().substring(2, 8);
}

/** Build a professional bilingual WhatsApp invoice */
function buildWhatsAppInvoice({
  orderId,
  restaurant,
  branch,
  orderType,
  cartItems,
  cartTotal,
  deliveryFee,
  discount,
  finalTotal,
  name,
  phone,
  address,
  notes,
}: {
  orderId: string;
  restaurant: { name_ar: string; name_en: string };
  branch: { name_ar: string; name_en: string };
  orderType: "delivery" | "pickup";
  cartItems: CartItem[];
  cartTotal: number;
  deliveryFee: number;
  discount: number;
  finalTotal: number;
  name: string;
  phone: string;
  address: string;
  notes: string;
}): string {
  const now = new Date();
  const dateAr = now.toLocaleDateString("ar-SA-u-nu-latn", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const dateEn = now.toLocaleDateString("en-US", {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const isDelivery = orderType === "delivery";
  const allModifierGroups = modifierGroupStore.getAll();
  const nums = ["1️⃣","2️⃣","3️⃣","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
  const SEP = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  // VAT is included in the price (Saudi standard). Extract it for display.
  const vatAmount = +(finalTotal * 15 / 115).toFixed(2);

  // Build each item block
  const itemLines = cartItems.map((ci, idx) => {
    let unitPrice = ci.item.price;
    if (ci.selectedOptions) {
      for (const opts of Object.values(ci.selectedOptions)) {
        for (const opt of opts) unitPrice += opt.price_addition;
      }
    }
    if (ci.selectedAddOns) {
      for (const a of ci.selectedAddOns) { if (!a.is_free) unitPrice += a.price; }
    }
    const lineTotal = (unitPrice * ci.quantity).toFixed(0);
    const num = nums[idx] ?? `${idx + 1}.`;

    const lines: string[] = [];
    lines.push(`${num} ${ci.item.name_ar} | ${ci.item.name_en}`);
    lines.push(`   ${ci.quantity} × ${unitPrice.toFixed(0)} ﷼ = *${lineTotal} ﷼*`);

    if (ci.selectedOptions) {
      for (const [groupId, opts] of Object.entries(ci.selectedOptions)) {
        if (!opts.length) continue;
        const grp = allModifierGroups.find((g) => g.id === groupId);
        const grpLabel = grp ? `${grp.name_ar} | ${grp.name_en}` : "";
        const optList = opts.map((o) => {
          const extra = o.price_addition > 0 ? ` (+${o.price_addition}﷼)` : "";
          return `${o.name_ar} | ${o.name_en}${extra}`;
        }).join(", ");
        lines.push(`   └ ${grpLabel}: ${optList}`);
      }
    }

    if (ci.selectedAddOns?.length) {
      const addOnStr = ci.selectedAddOns.map((a) => {
        const extra = !a.is_free && a.price > 0 ? ` (+${a.price}﷼)` : a.is_free ? " (مجاني | free)" : "";
        return `${a.name_ar} | ${a.name_en}${extra}`;
      }).join(", ");
      lines.push(`   └ ➕ إضافات | Add-ons: ${addOnStr}`);
    }

    if (ci.customerNote) {
      lines.push(`   └ 📝 ${ci.customerNote}`);
    }

    return lines.join("\n");
  }).join("\n\n");

  // Assemble full invoice
  const blocks: string[] = [];

  blocks.push(
    "╔══════════════════════════════════╗",
    "      🧾 فاتورة طلب | Order Receipt",
    "╚══════════════════════════════════╝",
    "",
    SEP,
    "📋 تفاصيل الطلب | Order Details",
    SEP,
    `🔢 رقم الطلب | Order #: *${orderId}*`,
    `📅 ${dateAr}`,
    `    ${dateEn}  •  ${timeStr}`,
    `🏪 المطعم | Restaurant: ${restaurant.name_ar} | ${restaurant.name_en}`,
    `🏬 الفرع | Branch: ${branch.name_ar} | ${branch.name_en}`,
    `📦 نوع | Type: ${isDelivery ? "🚗 توصيل | Delivery" : "🏪 استلام | Pickup"}`,
    "",
    SEP,
    "👤 بيانات العميل | Customer",
    SEP,
    `الاسم | Name:  ${name}`,
    `الجوال | Phone: ${phone}`,
  );

  if (isDelivery && address) {
    blocks.push(`📍 العنوان | Address: ${address}`);
  }

  blocks.push(
    "",
    SEP,
    "🛒 الطلبيات | Order Items",
    SEP,
    itemLines,
    "",
    SEP,
    "💰 الحساب | Bill Summary",
    SEP,
    `المجموع الفرعي | Subtotal:    ${cartTotal.toFixed(0)} ﷼`,
  );

  if (isDelivery) {
    blocks.push(`رسوم التوصيل | Delivery:     ${deliveryFee} ﷼`);
  }

  if (discount > 0) {
    blocks.push(`الخصم | Discount:           -${discount.toFixed(0)} ﷼`);
  }

  blocks.push(
    `ض.ق.م 15% | VAT (incl.):   ${vatAmount.toFixed(2)} ﷼`,
    SEP,
    `💳 *الإجمالي النهائي | TOTAL: ${finalTotal.toFixed(0)} ﷼*`,
    SEP,
  );

  if (notes) {
    blocks.push("", `📝 ملاحظات | Notes:`, notes);
  }

  blocks.push(
    "",
    "✅ شكراً لطلبكم! | Thank you for ordering!",
    "🌟 *مطعمي | Mat'ami*",
  );

  return blocks.join("\n");
}

export default function CheckoutPage() {
  const { cartItems, cartTotal, clearCart, selectedRestaurantId, selectedBranchId } = useCart();
  const { t, lang } = useLanguage();
  const [, setLocation] = useLocation();

  const orderType    = (localStorage.getItem("checkout_order_type") || "delivery") as "delivery" | "pickup";
  const deliveryFee  = parseFloat(localStorage.getItem("checkout_delivery_fee") || "0");
  const discount     = parseFloat(localStorage.getItem("checkout_discount") || "0");
  const finalTotal   = parseFloat(localStorage.getItem("checkout_final_total") || String(cartTotal));

  const [name, setName]          = useState(localStorage.getItem("customer_name") || "");
  const [phone, setPhone]        = useState(localStorage.getItem("customer_phone") || "");
  const [address, setAddress]    = useState("");
  const [notes, setNotes]        = useState("");
  const [agreeOffers, setAgreeOffers] = useState(false);
  const [errors, setErrors]      = useState<Record<string, string>>({});

  const restaurant = restaurantStore.getAll().find((r) => r.id === selectedRestaurantId);
  const branch     = branchStore.getAll().find((b) => b.id === selectedBranchId);

  if (!restaurant || !branch || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <p className="text-muted-foreground">{t("No items in cart", "لا توجد عناصر في السلة")}</p>
      </div>
    );
  }

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name  = t("Name is required", "الاسم مطلوب");
    if (!phone.trim()) errs.phone = t("Phone is required", "الجوال مطلوب");
    if (orderType === "delivery" && !address.trim())
      errs.address = t("Address is required for delivery", "العنوان مطلوب للتوصيل");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const orderId = generateOrderId();

    const message = buildWhatsAppInvoice({
      orderId, restaurant, branch, orderType, cartItems,
      cartTotal, deliveryFee, discount, finalTotal,
      name, phone, address, notes,
    });

    const whatsappUrl = `https://wa.me/${branch.whatsapp}?text=${encodeURIComponent(message)}`;

    // Persist for confirmation page
    localStorage.setItem("last_order_id",         orderId);
    localStorage.setItem("last_order_restaurant", JSON.stringify({ name_en: restaurant.name_en, name_ar: restaurant.name_ar }));
    localStorage.setItem("last_order_branch",     JSON.stringify({ name_en: branch.name_en, name_ar: branch.name_ar }));
    localStorage.setItem("last_order_total",      String(finalTotal));
    localStorage.setItem("last_order_whatsapp",   whatsappUrl);
    localStorage.setItem("last_order_items",      JSON.stringify(cartItems));
    localStorage.setItem("customer_phone",        phone);
    localStorage.setItem("customer_name",         name);

    // CRM: save customer + order
    orderStore.saveCustomerOrder(name, phone, address, {
      id: orderId,
      restaurant_id:   restaurant.id,
      restaurant_name: restaurant.name_en,
      branch_id:       branch.id,
      branch_name:     branch.name_en,
      items: cartItems.map((ci) => ({
        item_id:  ci.item.id,
        name_en:  ci.item.name_en,
        name_ar:  ci.item.name_ar,
        price:    ci.item.price,
        quantity: ci.quantity,
      })),
      total:            finalTotal,
      date:             new Date().toISOString(),
      type:             orderType,
      delivery_address: orderType === "delivery" ? address : undefined,
    });

    // Analytics
    for (const ci of cartItems) {
      analyticsStore.track({ type: "order", item_id: ci.item.id, restaurant_id: restaurant.id });
    }
    userBehaviorStore.trackOrder(cartItems.map((ci) => ci.item.id));

    clearCart();
    window.open(whatsappUrl, "_blank");
    setLocation("/confirmation");
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-28">
      <div className="max-w-xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          <h1 className="text-2xl font-bold text-foreground mb-6">{t("Checkout", "إتمام الطلب")}</h1>

          {/* Restaurant + branch badge */}
          <div className="bg-card border border-white/8 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={{ background: `${restaurant.color}18`, border: `1.5px solid ${restaurant.color}30` }}>
              {restaurant.logoType === "image" && restaurant.logo
                ? <img src={restaurant.logo} alt="" className="w-full h-full object-cover" loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                : <span className="text-xl">{restaurant.logo}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                {t(restaurant.name_en, restaurant.name_ar)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t(branch.name_en, branch.name_ar)} ·{" "}
                <span className={orderType === "delivery" ? "text-blue-400" : "text-green-400"}>
                  {orderType === "delivery"
                    ? t("🚗 Delivery", "🚗 توصيل")
                    : t("🏪 Pickup", "🏪 استلام")}
                </span>
              </p>
            </div>
            <div className="flex-shrink-0 text-right">
              <p className="text-xs text-muted-foreground">{t("Total", "الإجمالي")}</p>
              <p className="text-base font-bold text-primary">{finalTotal.toFixed(0)} ﷼</p>
            </div>
          </div>

          {/* Customer details form */}
          <div className="bg-card border border-white/8 rounded-2xl p-5 mb-5 space-y-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <User size={15} className="text-primary" />
              {t("Your Details", "بياناتك")}
            </h2>

            {/* Name */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">
                {t("Full Name", "الاسم الكامل")} *
              </label>
              <input
                type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={t("Your full name", "اسمك الكامل")}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                data-testid="input-name"
              />
              {errors.name && <p className="text-xs text-destructive mt-1.5">{errors.name}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <Phone size={11} /> {t("Phone Number", "رقم الجوال")} *
              </label>
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="05xxxxxxxx"
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                data-testid="input-phone"
              />
              {errors.phone && <p className="text-xs text-destructive mt-1.5">{errors.phone}</p>}
            </div>

            {/* Delivery address */}
            {orderType === "delivery" && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <MapPin size={11} /> {t("Delivery Address", "عنوان التوصيل")} *
                </label>
                <input
                  type="text" value={address} onChange={(e) => setAddress(e.target.value)}
                  placeholder={t("Neighbourhood, street, building…", "الحي، الشارع، المبنى…")}
                  className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors"
                  data-testid="input-location"
                />
                {errors.address && <p className="text-xs text-destructive mt-1.5">{errors.address}</p>}
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block flex items-center gap-1">
                <MessageSquare size={11} /> {t("Notes (optional)", "ملاحظات (اختياري)")}
              </label>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder={t("Any special requests, allergies, preferences…", "أي طلبات خاصة، حساسية، تفضيلات…")}
                rows={2}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                data-testid="input-notes"
              />
            </div>

            {/* Offers opt-in */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${agreeOffers ? "bg-primary border-primary" : "border-white/20 group-hover:border-white/40"}`}
                onClick={() => setAgreeOffers((v) => !v)}>
                {agreeOffers && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <input type="checkbox" checked={agreeOffers} onChange={(e) => setAgreeOffers(e.target.checked)}
                className="sr-only" data-testid="checkbox-offers" />
              <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                {t("I agree to receive offers and promotions", "أوافق على استقبال العروض والترويجات")}
              </span>
            </label>
          </div>

          {/* Items summary */}
          <div className="bg-card border border-white/8 rounded-2xl overflow-hidden mb-5">
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center gap-2">
              <ShoppingBag size={14} className="text-primary" />
              <h2 className="font-semibold text-foreground text-sm">
                {t("Order Summary", "ملخص الطلب")} ({cartItems.length})
              </h2>
            </div>
            {cartItems.map((ci, i) => {
              let unitPrice = ci.item.price;
              if (ci.selectedOptions) {
                for (const opts of Object.values(ci.selectedOptions)) {
                  for (const opt of opts) unitPrice += opt.price_addition;
                }
              }
              if (ci.selectedAddOns) {
                for (const a of ci.selectedAddOns) { if (!a.is_free) unitPrice += a.price; }
              }
              return (
                <div key={ci.cartKey || ci.item.id}
                  className={`px-5 py-3 flex items-start justify-between gap-3 ${i < cartItems.length - 1 ? "border-b border-white/4" : ""}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t(ci.item.name_en, ci.item.name_ar)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {ci.item.name_en !== ci.item.name_ar
                        ? (lang === "ar" ? ci.item.name_en : ci.item.name_ar)
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {ci.quantity} × {unitPrice.toFixed(0)} ﷼
                    </p>
                  </div>
                  <span className="text-sm font-bold text-foreground flex-shrink-0">
                    {(unitPrice * ci.quantity).toFixed(0)} ﷼
                  </span>
                </div>
              );
            })}
          </div>

          {/* Financial summary */}
          <div className="bg-card border border-white/8 rounded-2xl p-5 mb-6 space-y-2.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>{t("Subtotal", "المجموع الفرعي")}</span>
              <span>{cartTotal.toFixed(0)} ﷼</span>
            </div>
            {orderType === "delivery" && (
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1.5"><Truck size={12} /> {t("Delivery", "التوصيل")}</span>
                <span>{deliveryFee > 0 ? `${deliveryFee} ﷼` : t("Free", "مجاني")}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>{t("Discount", "الخصم")}</span>
                <span>-{discount.toFixed(0)} ﷼</span>
              </div>
            )}
            <div className="flex justify-between text-muted-foreground/60 text-xs">
              <span>{t("VAT 15% (included)", "ضريبة القيمة المضافة 15% (مشمولة)")}</span>
              <span>{(finalTotal * 15 / 115).toFixed(2)} ﷼</span>
            </div>
            <div className="border-t border-white/8 pt-3 flex justify-between font-bold text-base">
              <span className="text-foreground">{t("Total", "الإجمالي")}</span>
              <span className="text-primary text-lg">{finalTotal.toFixed(0)} ﷼</span>
            </div>
          </div>

          {/* WhatsApp CTA */}
          <motion.button
            onClick={handleSubmit}
            whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 text-base transition-all shadow-lg shadow-green-900/30"
            style={{ background: "linear-gradient(135deg, #25D366, #128C7E)" }}
            data-testid="btn-send-whatsapp"
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            {t("Send Order via WhatsApp", "إرسال الطلب عبر واتساب")}
          </motion.button>

          <p className="text-center text-xs text-muted-foreground/50 mt-3">
            {t(
              "A professional invoice will be sent to the restaurant via WhatsApp",
              "سيتم إرسال فاتورة احترافية للمطعم عبر واتساب"
            )}
          </p>

        </motion.div>
      </div>
    </div>
  );
}
