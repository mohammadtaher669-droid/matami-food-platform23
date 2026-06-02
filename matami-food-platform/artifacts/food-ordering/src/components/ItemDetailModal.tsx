import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ChevronDown, MessageSquare, ShoppingCart, Check } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import { modifierGroupStore, modifierOptionStore, addOnStore } from "@/lib/store";
import type { MenuItem, ModifierGroup, ModifierOption, AddOn } from "@/lib/store";
import type { MenuItem as CartMenuItem } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";

interface PriceBreakdownProps {
  basePrice: number;
  selectedOptions: Record<string, ModifierOption[]>;
  selectedAddOns: AddOn[];
  quantity: number;
  totalPrice: number;
  restaurantColor: string;
  t: (en: string, ar: string) => string;
}

function PriceBreakdown({ basePrice, selectedOptions, selectedAddOns, quantity, totalPrice, restaurantColor, t }: PriceBreakdownProps) {
  const allSelectedOptions = Object.values(selectedOptions).flat().filter((o) => o.price_addition > 0);
  const paidAddOns = selectedAddOns.filter((a) => !a.is_free && a.price > 0);
  const hasExtras = allSelectedOptions.length > 0 || paidAddOns.length > 0 || quantity > 1;

  if (!hasExtras) return null;

  const rowVariants = {
    hidden: { opacity: 0, height: 0, marginBottom: 0 },
    visible: { opacity: 1, height: "auto", marginBottom: 4 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.25 }}
      className="mb-5 rounded-2xl bg-white/4 border border-white/8 overflow-hidden"
    >
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t("Price Breakdown", "تفاصيل السعر")}
        </p>

        {/* Base price row */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-muted-foreground">{t("Base price", "السعر الأساسي")}</span>
          <span className="text-sm text-foreground font-medium">{basePrice.toFixed(0)} ﷼</span>
        </div>

        {/* Selected modifier options */}
        <AnimatePresence initial={false}>
          {allSelectedOptions.map((opt) => (
            <motion.div
              key={opt.id}
              variants={rowVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground truncate flex-1 pr-2">{t(opt.name_en, opt.name_ar)}</span>
              <span className="text-sm font-medium flex-shrink-0" style={{ color: restaurantColor }}>
                +{opt.price_addition.toFixed(0)} ﷼
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Selected paid add-ons */}
        <AnimatePresence initial={false}>
          {paidAddOns.map((addOn) => (
            <motion.div
              key={addOn.id}
              variants={rowVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between"
            >
              <span className="text-sm text-muted-foreground truncate flex-1 pr-2">{t(addOn.name_en, addOn.name_ar)}</span>
              <span className="text-sm font-medium flex-shrink-0" style={{ color: restaurantColor }}>
                +{addOn.price.toFixed(0)} ﷼
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Quantity multiplier */}
        {quantity > 1 && (
          <motion.div
            key="qty-row"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between mt-1"
          >
            <span className="text-sm text-muted-foreground">
              {t(`Quantity × ${quantity}`, `الكمية × ${quantity}`)}
            </span>
            <span className="text-sm text-muted-foreground">×{quantity}</span>
          </motion.div>
        )}

        {/* Divider + Total */}
        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-sm font-bold text-foreground">{t("Total", "الإجمالي")}</span>
          <motion.span
            key={totalPrice}
            initial={{ scale: 1.12, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="text-base font-bold"
            style={{ color: restaurantColor }}
          >
            {totalPrice.toFixed(0)} ﷼
          </motion.span>
        </div>
      </div>
    </motion.div>
  );
}

interface Props {
  item: MenuItem | null;
  restaurantId: string;
  branchId: string;
  restaurantColor: string;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: (itemId: string) => void;
}

export default function ItemDetailModal({ item, restaurantId, branchId, restaurantColor, isOpen, onClose, onAdded }: Props) {
  const { t, isRTL } = useLanguage();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [groups, setGroups] = useState<ModifierGroup[]>([]);
  const [optionsByGroup, setOptionsByGroup] = useState<Record<string, ModifierOption[]>>({});
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, ModifierOption[]>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [customerNote, setCustomerNote] = useState("");
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (!item) return;
    const gs = modifierGroupStore.getByItem(item.id).filter((g) => g.is_active);
    const opts: Record<string, ModifierOption[]> = {};
    for (const g of gs) {
      opts[g.id] = modifierOptionStore.getByGroup(g.id).filter((o) => o.is_available);
    }
    const aos = addOnStore.getByItem(item.id).filter((a) => a.is_available);
    setGroups(gs);
    setOptionsByGroup(opts);
    setAddOns(aos);
    setSelectedOptions({});
    setSelectedAddOns([]);
    setCustomerNote("");
    setQuantity(1);
  }, [item]);

  if (!item) return null;

  const basePrice = item.price;
  const optionsPrice = Object.values(selectedOptions).flat().reduce((s, o) => s + o.price_addition, 0);
  const addOnsPrice = selectedAddOns.filter((a) => !a.is_free).reduce((s, a) => s + a.price, 0);
  const unitPrice = basePrice + optionsPrice + addOnsPrice;
  const totalPrice = unitPrice * quantity;

  const requiredGroups = groups.filter((g) => g.is_required);
  const unsatisfied = requiredGroups.filter((g) => {
    const sel = selectedOptions[g.id] || [];
    return sel.length < g.min_selections;
  });
  const canAdd = unsatisfied.length === 0;

  const handleSelectOption = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedOptions((prev) => {
      const current = prev[group.id] || [];
      if (group.type === "single") {
        const alreadySelected = current.find((o) => o.id === option.id);
        return { ...prev, [group.id]: alreadySelected ? [] : [option] };
      } else {
        const isSelected = current.find((o) => o.id === option.id);
        if (isSelected) {
          return { ...prev, [group.id]: current.filter((o) => o.id !== option.id) };
        } else {
          if (group.max_selections > 0 && current.length >= group.max_selections) return prev;
          return { ...prev, [group.id]: [...current, option] };
        }
      }
    });
  };

  const handleToggleAddOn = (addOn: AddOn) => {
    setSelectedAddOns((prev) => {
      const exists = prev.find((a) => a.id === addOn.id);
      return exists ? prev.filter((a) => a.id !== addOn.id) : [...prev, addOn];
    });
  };

  const handleAddToCart = () => {
    if (!canAdd) {
      const firstName = unsatisfied[0];
      toast({
        title: t("Required selection missing", "يرجى اختيار خيار مطلوب"),
        description: t(firstName.name_en, firstName.name_ar),
        variant: "destructive",
      });
      return;
    }
    const cartItem: CartMenuItem = {
      id: item.id,
      restaurant_id: item.restaurant_id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      price: item.price,
      category_id: item.category_id,
      description_en: item.description_en,
      description_ar: item.description_ar,
      image: item.image_url || item.image,
    };

    const cleanOptions: Record<string, ModifierOption[]> = {};
    for (const [gid, opts] of Object.entries(selectedOptions)) {
      if (opts.length > 0) cleanOptions[gid] = opts;
    }

    for (let i = 0; i < quantity; i++) {
      addToCart(cartItem, restaurantId, branchId, cleanOptions, selectedAddOns, customerNote);
    }

    onAdded?.(item.id);
    toast({
      title: t("Added to cart", "تمت الإضافة للسلة"),
      description: t(item.name_en, item.name_ar),
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-[60]"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[70] max-h-[92vh] overflow-y-auto bg-[#1a1a1a] rounded-t-3xl"
            style={{ direction: isRTL ? "rtl" : "ltr", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {/* Hero Image */}
            <div className="relative h-52 flex-shrink-0 overflow-hidden rounded-t-3xl" style={{ background: `${restaurantColor}15` }}>
              {item.image_url || item.image ? (
                <img
                  src={item.image_url || item.image}
                  alt={t(item.name_en, item.name_ar)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl opacity-20">🍽️</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-11 h-11 rounded-full bg-black/60 flex items-center justify-center text-white/80 hover:text-white transition"
                style={{ touchAction: "manipulation" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 pb-36 pt-3">
              {/* Item name & price */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <h2 className="text-xl font-bold text-foreground flex-1">{t(item.name_en, item.name_ar)}</h2>
                <span className="text-lg font-bold flex-shrink-0" style={{ color: restaurantColor }}>
                  {item.price} ﷼
                </span>
              </div>
              {(item.description_en || item.description_ar) && (
                <p className="text-sm text-muted-foreground mb-4">{t(item.description_en, item.description_ar)}</p>
              )}

              {/* Modifier Groups */}
              {groups.map((group) => {
                const opts = optionsByGroup[group.id] || [];
                const selected = selectedOptions[group.id] || [];
                return (
                  <div key={group.id} className="mb-5">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground text-sm">{t(group.name_en, group.name_ar)}</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {group.is_required
                            ? t("Required", "مطلوب")
                            : t("Optional", "اختياري")}
                          {group.type === "multi" && group.max_selections > 0
                            ? ` · ${t(`Max ${group.max_selections}`, `حد أقصى ${group.max_selections}`)}`
                            : ""}
                        </p>
                      </div>
                      {group.is_required && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${selected.length >= group.min_selections ? "bg-green-500/20 text-green-400" : "bg-primary/20 text-primary"}`}>
                          {selected.length >= group.min_selections ? t("Done", "تم") : t("Required", "مطلوب")}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      {opts.map((opt) => {
                        const isSelected = !!selected.find((o) => o.id === opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleSelectOption(group, opt)}
                            style={{ minHeight: 48, touchAction: "manipulation" }}
                            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isSelected ? "border-primary/60 bg-primary/10" : "border-white/8 bg-white/4 hover:border-white/15"}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? "border-primary bg-primary" : "border-white/25"}`}>
                                {isSelected && <Check size={11} className="text-white" strokeWidth={3} />}
                              </div>
                              <span className="text-sm text-foreground">{t(opt.name_en, opt.name_ar)}</span>
                            </div>
                            {opt.price_addition > 0 && (
                              <span className="text-xs text-muted-foreground font-medium">+{opt.price_addition} ﷼</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Add-ons */}
              {addOns.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-semibold text-foreground text-sm mb-1">{t("Add-ons", "الإضافات")}</h3>
                  <p className="text-[11px] text-muted-foreground mb-2">{t("Optional extras", "إضافات اختيارية")}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {addOns.map((addOn) => {
                      const isSelected = !!selectedAddOns.find((a) => a.id === addOn.id);
                      return (
                        <button
                          key={addOn.id}
                          onClick={() => handleToggleAddOn(addOn)}
                          style={{ minHeight: 52, touchAction: "manipulation" }}
                          className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${isSelected ? "border-primary/60 bg-primary/10" : "border-white/8 bg-white/4 hover:border-white/15"}`}
                        >
                          {addOn.image && (
                            <img src={addOn.image} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground leading-tight truncate">{t(addOn.name_en, addOn.name_ar)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {addOn.is_free ? t("Free", "مجاني") : `+${addOn.price} ﷼`}
                            </p>
                          </div>
                          <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-all ${isSelected ? "bg-primary border-primary" : "border-white/25"}`}>
                            {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Customer Note */}
              <div className="mb-5">
                <label className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2">
                  <MessageSquare size={14} className="text-muted-foreground" />
                  {t("Special Instructions", "تعليمات خاصة")}
                  <span className="text-[11px] font-normal text-muted-foreground">({t("optional", "اختياري")})</span>
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder={t("e.g. No onions, extra sauce...", "مثل: بدون بصل، صوص زيادة...")}
                  rows={2}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                />
              </div>

              {/* Price Breakdown */}
              <PriceBreakdown
                basePrice={basePrice}
                selectedOptions={selectedOptions}
                selectedAddOns={selectedAddOns}
                quantity={quantity}
                totalPrice={totalPrice}
                restaurantColor={restaurantColor}
                t={t}
              />
            </div>

            {/* Sticky bottom bar */}
            <div
              className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1a1a1a]/95 backdrop-blur border-t border-white/8"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)", paddingTop: 12, paddingLeft: 16, paddingRight: 16 }}
            >
              <div className="flex items-center gap-3 max-w-xl mx-auto">
                {/* Quantity */}
                <div className="flex items-center gap-1.5 bg-white/8 rounded-xl p-1">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-11 h-11 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center transition active:scale-90"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center font-bold text-base">{quantity}</span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-11 h-11 rounded-lg flex items-center justify-center transition active:scale-90"
                    style={{ background: restaurantColor, touchAction: "manipulation" }}
                  >
                    <Plus size={16} className="text-white" />
                  </button>
                </div>

                {/* Add to cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canAdd}
                  className="flex-1 py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-between px-4 transition-all disabled:opacity-40 active:scale-[0.98]"
                  style={{ background: canAdd ? restaurantColor : "#555", touchAction: "manipulation", minHeight: 48 }}
                >
                  <ShoppingCart size={16} />
                  <span>{t("Add to Cart", "أضف للسلة")}</span>
                  <span className="font-bold">{totalPrice.toFixed(0)} ﷼</span>
                </button>
              </div>
              {unsatisfied.length > 0 && (
                <p className="text-center text-xs text-destructive mt-2">
                  {t(`Please select: ${unsatisfied.map((g) => g.name_en).join(", ")}`,
                     `يرجى الاختيار: ${unsatisfied.map((g) => g.name_ar).join("، ")}`)}
                </p>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
