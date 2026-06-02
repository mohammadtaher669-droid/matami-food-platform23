import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShoppingBag, Star, ChevronRight, MessageSquare, RotateCcw, Clock, Phone, ChevronDown, ChevronUp, Pencil, Check, X, Truck, Store, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { orderStore, customerStore, menuStore } from "@/lib/store";
import type { Order } from "@/lib/store";
import type { CartItem } from "@/contexts/CartContext";

function formatDate(iso: string | null | undefined, lang: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10) || "—";
  try {
    const locale = lang === "ar" ? "ar-SA" : "en-US";
    const datePart = d.toLocaleDateString(locale, { month: "short", day: "numeric" });
    const timePart = d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
    return `${datePart} · ${timePart}`;
  } catch {
    return String(iso).slice(0, 10);
  }
}

function OrderCard({ order, onReorder, lang, t }: {
  order: Order;
  onReorder: (order: Order) => void;
  lang: string;
  t: (en: string, ar: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const restaurantName = order.restaurant_name;
  const itemCount = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const itemSummary = order.items
    .slice(0, 2)
    .map((i) => (lang === "ar" ? i.name_ar : i.name_en))
    .join(", ");
  const extraCount = order.items.length > 2 ? order.items.length - 2 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-white/5 rounded-2xl overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-xs text-muted-foreground">
                #{order.id} · {formatDate(order.date, lang)}
              </p>
              {order.type === "delivery" ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium">
                  <Truck size={10} />
                  {t("Delivery", "توصيل")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                  <Store size={10} />
                  {t("Pickup", "استلام")}
                </span>
              )}
            </div>
            <p className="font-semibold text-foreground text-sm truncate">{restaurantName}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1">
              <MapPin size={10} className="flex-shrink-0" />
              {order.branch_name}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {itemSummary}
              {extraCount > 0 && ` +${extraCount} ${t("more", "أكثر")}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-bold text-primary text-sm">{order.total.toFixed(0)} ﷼</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itemCount} {t("item(s)", "عنصر")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onReorder(order)}
            className="flex-1 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 transition"
          >
            <RotateCcw size={13} />
            {t("Reorder", "أعد الطلب")}
          </button>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="px-3 py-2 border border-white/8 rounded-xl text-muted-foreground hover:text-foreground transition"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin size={11} />
                  <span>{order.branch_name}</span>
                </div>
                {order.type === "delivery" ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-medium">
                    <Truck size={10} />
                    {t("Delivery", "توصيل")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-medium">
                    <Store size={10} />
                    {t("Pickup", "استلام")}
                  </span>
                )}
              </div>
              <div className="flex items-start gap-1.5 text-xs pb-2 border-b border-white/5">
                {order.type === "delivery" ? (
                  <>
                    <Truck size={11} className="mt-0.5 flex-shrink-0 text-blue-400" />
                    <span className="text-muted-foreground">
                      {order.delivery_address
                        ? order.delivery_address
                        : t("No address recorded", "لم يُسجَّل عنوان")}
                    </span>
                  </>
                ) : (
                  <>
                    <Store size={11} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                    <span className="text-muted-foreground">{t("In-store pickup", "استلام من الفرع")}</span>
                  </>
                )}
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {lang === "ar" ? item.name_ar : item.name_en}
                    <span className="text-muted-foreground/60 ml-1">×{item.quantity}</span>
                  </span>
                  <span className="text-foreground font-medium">
                    {(item.price * item.quantity).toFixed(0)} ﷼
                  </span>
                </div>
              ))}
              <div className="pt-1 border-t border-white/5 flex justify-between text-xs">
                <span className="text-muted-foreground">{t("Total", "الإجمالي")}</span>
                <span className="text-primary font-bold">{order.total.toFixed(0)} ﷼</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ProfilePage() {
  const { t, lang, toggleLang } = useLanguage();
  const { replaceCart } = useCart();
  const [, setLocation] = useLocation();

  const storedPhone = localStorage.getItem("customer_phone") || "";
  const storedName = localStorage.getItem("customer_name") || "";

  const storedCustomerExists = storedPhone ? !!customerStore.getByPhone(storedPhone) : false;

  const [phoneInput, setPhoneInput] = useState("");
  const [lookupPhone, setLookupPhone] = useState(storedCustomerExists ? storedPhone : "");
  const [lookupError, setLookupError] = useState("");

  const [displayName, setDisplayName] = useState(storedName);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(storedName);
  const [editPhone, setEditPhone] = useState(storedPhone);
  const [editError, setEditError] = useState("");

  const customer = lookupPhone ? customerStore.getByPhone(lookupPhone) : null;
  const orders: Order[] = customer
    ? orderStore.getByCustomer(customer.id)
    : [];

  const handleEditSave = () => {
    const trimmedPhone = editPhone.trim();
    const trimmedName = editName.trim();
    if (!trimmedName) {
      setEditError(t("Please enter your name", "أدخل اسمك"));
      return;
    }
    setEditError("");
    localStorage.setItem("customer_name", trimmedName);
    setDisplayName(trimmedName);
    if (trimmedPhone !== lookupPhone) {
      if (trimmedPhone) {
        localStorage.setItem("customer_phone", trimmedPhone);
      } else {
        localStorage.removeItem("customer_phone");
      }
      setLookupPhone(trimmedPhone);
      setPhoneInput("");
    }
    setEditing(false);
  };

  const handleEditCancel = () => {
    setEditName(displayName);
    setEditPhone(lookupPhone || storedPhone);
    setEditError("");
    setEditing(false);
  };

  const handleLookup = () => {
    const trimmed = phoneInput.trim();
    if (!trimmed) {
      setLookupError(t("Please enter your phone number", "أدخل رقم جوالك"));
      return;
    }
    const found = customerStore.getByPhone(trimmed);
    if (!found) {
      setLookupError(t("No orders found for this number", "لا توجد طلبات لهذا الرقم"));
      return;
    }
    setLookupError("");
    setLookupPhone(trimmed);
    localStorage.setItem("customer_phone", trimmed);
  };

  const handleReorder = (order: Order) => {
    const allItems = menuStore.getAll();
    const cartItems: CartItem[] = [];
    for (const oi of order.items) {
      const menuItem = oi.item_id
        ? allItems.find((m) => m.id === oi.item_id)
        : allItems.find((m) => m.name_en === oi.name_en);
      if (!menuItem) continue;
      cartItems.push({
        item: {
          id: menuItem.id,
          restaurant_id: menuItem.restaurant_id,
          name_en: menuItem.name_en,
          name_ar: menuItem.name_ar,
          price: menuItem.price,
          category_id: menuItem.category_id,
          description_en: menuItem.description_en || "",
          description_ar: menuItem.description_ar || "",
          image: menuItem.image,
        },
        quantity: oi.quantity,
        restaurantId: order.restaurant_id,
        branchId: order.branch_id,
        cartKey: menuItem.id + "_reorder",
      });
    }

    if (cartItems.length === 0) return;
    replaceCart(cartItems);
    setLocation("/cart");
  };

  const lastOrderId = localStorage.getItem("last_order_id");
  const lastTotal = localStorage.getItem("last_order_total");

  const menuItems = [
    {
      icon: Star,
      label: t("Leave a Review", "اكتب تقييم"),
      desc: t("Share your experience", "شارك تجربتك"),
      onClick: () => setLocation("/review"),
    },
    {
      icon: MessageSquare,
      label: t("Language", "اللغة"),
      desc: lang === "en" ? "English" : "العربية",
      onClick: toggleLang,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F0F0F] pt-20 pb-28">
      <div className="max-w-lg mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <User size={28} className="text-primary" />
            </div>

            {editing ? (
              <div className="flex-1 min-w-0">
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t("Your name", "اسمك")}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder={t("Phone number", "رقم الجوال")}
                      className="w-full bg-background border border-white/10 rounded-xl pl-8 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 rtl:pl-3 rtl:pr-8"
                    />
                  </div>
                  {editError && (
                    <p className="text-xs text-destructive">{editError}</p>
                  )}
                  <div className="flex gap-2 pt-0.5">
                    <button
                      onClick={handleEditSave}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition"
                    >
                      <Check size={12} />
                      {t("Save", "حفظ")}
                    </button>
                    <button
                      onClick={handleEditCancel}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 text-muted-foreground rounded-lg text-xs hover:text-foreground transition"
                    >
                      <X size={12} />
                      {t("Cancel", "إلغاء")}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-foreground">
                      {displayName || t("Guest", "زائر")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {lookupPhone ? lookupPhone : t("Welcome back!", "أهلاً وسهلاً!")}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditName(displayName);
                      setEditPhone(lookupPhone || storedPhone);
                      setEditError("");
                      setEditing(true);
                    }}
                    className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition mt-0.5"
                    title={t("Edit profile", "تعديل الملف الشخصي")}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {lastOrderId && lastTotal && !lookupPhone && (
            <div
              className="rounded-2xl p-4 mb-6"
              style={{ background: "linear-gradient(135deg, rgba(255,122,0,0.12), rgba(255,122,0,0.04))", border: "1px solid rgba(255,122,0,0.2)" }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">{t("Last Order", "آخر طلب")}</p>
                  <p className="font-bold text-foreground">#{lastOrderId}</p>
                  <p className="text-sm text-primary font-semibold mt-0.5">{parseFloat(lastTotal).toFixed(0)} ﷼</p>
                </div>
                <ShoppingBag size={28} className="text-primary/40" />
              </div>
            </div>
          )}

          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={16} className="text-primary" />
              <h3 className="text-sm font-semibold text-foreground">{t("Order History", "سجل الطلبات")}</h3>
            </div>

            {!lookupPhone ? (
              <div className="bg-card border border-white/5 rounded-2xl p-5">
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  {t("Enter your phone number to view your past orders", "أدخل رقم جوالك لعرض طلباتك السابقة")}
                </p>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3" />
                    <input
                      type="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                      placeholder={t("e.g. 0501234567", "مثال: 0501234567")}
                      className="w-full bg-background border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 rtl:pl-3 rtl:pr-9"
                    />
                  </div>
                  <button
                    onClick={handleLookup}
                    className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition"
                  >
                    {t("Look up", "بحث")}
                  </button>
                </div>
                {lookupError && (
                  <p className="text-xs text-destructive mt-2 text-center">{lookupError}</p>
                )}
              </div>
            ) : orders.length === 0 ? (
              <div className="bg-card border border-white/5 rounded-2xl p-6 text-center">
                <ShoppingBag size={32} className="text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("No orders yet", "لا توجد طلبات بعد")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onReorder={handleReorder}
                    lang={lang}
                    t={t}
                  />
                ))}
              </div>
            )}

            {lookupPhone && (
              <button
                onClick={() => {
                  setLookupPhone("");
                  setPhoneInput("");
                  setDisplayName("");
                  setEditName("");
                  setEditPhone("");
                  localStorage.removeItem("customer_phone");
                  localStorage.removeItem("customer_name");
                }}
                className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition text-center"
              >
                {t("Not you? Switch account", "ليس أنت؟ تغيير الحساب")}
              </button>
            )}
          </div>

          <div className="bg-card border border-white/5 rounded-2xl overflow-hidden divide-y divide-white/5 mb-6">
            {menuItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.99 }}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/3 transition text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground/40 flex-shrink-0" />
                </motion.button>
              );
            })}
          </div>

          <div>
            <Link href="/admin">
              <button className="w-full py-3 rounded-2xl border border-white/8 text-sm text-muted-foreground hover:text-foreground hover:border-white/15 transition">
                {t("Admin Panel", "لوحة التحكم")}
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
