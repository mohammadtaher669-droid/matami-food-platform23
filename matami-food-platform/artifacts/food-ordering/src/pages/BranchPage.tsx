import { useParams } from "wouter";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  restaurantStore, branchStore, categoryStore, menuStore, offerStore,
  branchItemOverrideStore, branchCategoryOverrideStore, checkSchedule,
  settingsStore,
} from "@/lib/store";
import WhatsAppSticky from "@/components/WhatsAppSticky";
import HeroBannerSlider from "@/components/HeroBannerSlider";
import DeliveryModeSelector from "@/components/DeliveryModeSelector";
import type { MenuItem, BranchItemOverride } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import WorkingHoursStatus, { isBranchOpen } from "@/components/WorkingHoursStatus";
import { Plus, Check, Sparkles, Pin, Star, Trophy, TrendingUp, LayoutGrid, AlignJustify, Rows3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyticsStore, userBehaviorStore } from "@/lib/store";
import ItemDetailModal from "@/components/ItemDetailModal";
import type { DeliveryMode } from "@/hooks/useDeliveryMode";

type DisplayMode = "grid" | "list" | "compact_grid";

// ─── Variant definitions ─────────────────────────────────────────────────────

const EASE_OUT = [0.25, 0.1, 0.25, 1] as const;

const imgVariants = {
  rest:    { scale: 1,    transition: { duration: 0.5, ease: EASE_OUT } },
  hovered: { scale: 1.07, transition: { duration: 0.5, ease: EASE_OUT } },
};

const overlayVariants = {
  rest:    { opacity: 0, transition: { duration: 0.2 } },
  hovered: { opacity: 1, transition: { duration: 0.25 } },
};

const contentVariants = {
  rest:    { y: 18, opacity: 0, transition: { duration: 0.25 } },
  hovered: { y: 0,  opacity: 1, transition: { duration: 0.32, ease: EASE_OUT, delay: 0.06 } },
};

const labelVariants = {
  rest:    { opacity: 1, transition: { duration: 0.2 } },
  hovered: { opacity: 0, transition: { duration: 0.15 } },
};

// ─── Badge strip ─────────────────────────────────────────────────────────────

function Badges({ item }: { item: MenuItem }) {
  const { t } = useLanguage();
  const badges = [
    item.pinned          && { label: t("Pinned","مثبت"),          bg: "bg-purple-600/90", icon: <Pin size={7} /> },
    item.is_best_seller  && { label: t("Best Seller","الأكثر مبيعاً"), bg: "bg-red-500/90",    icon: <Trophy size={7} /> },
    item.featured && !item.pinned && !item.is_best_seller &&
                           { label: t("Featured","مميز"),         bg: "bg-amber-500/90", icon: <Star size={7} /> },
    item.is_new          && { label: t("New","جديد"),             bg: "bg-yellow-400/90 !text-black", icon: <Sparkles size={8} /> },
    item.is_popular && !item.featured && !item.is_best_seller &&
                           { label: t("Popular","الأكثر"),        bg: "bg-primary/90",   icon: <TrendingUp size={7} /> },
  ].filter(Boolean) as { label: string; bg: string; icon: React.ReactNode }[];

  if (!badges.length) return null;
  return (
    <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 items-start">
      {badges.slice(0, 2).map((b) => (
        <span key={b.label} className={`${b.bg} text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-md`}>
          {b.icon} {b.label}
        </span>
      ))}
    </div>
  );
}

// ─── Skeleton shimmer ─────────────────────────────────────────────────────────

function CardSkeleton({ restaurantColor }: { restaurantColor: string }) {
  return (
    <div className="absolute inset-0 z-10" style={{ background: `${restaurantColor}12` }}>
      <div className="absolute inset-0 animate-pulse bg-white/[0.04]" />
      <div className="absolute bottom-0 inset-x-0 h-14 bg-gradient-to-t from-black/40 to-transparent" />
      <div className="absolute bottom-3 left-3 right-3 space-y-1.5">
        <div className="h-2.5 bg-white/10 rounded-full w-3/4 animate-pulse" />
        <div className="h-2 bg-white/6 rounded-full w-1/3 animate-pulse" />
      </div>
    </div>
  );
}

// ─── Add button ───────────────────────────────────────────────────────────────

function AddBtn({
  isDisabled, added, onAdd, restaurantColor, size = "md", testId,
}: {
  isDisabled: boolean; added: boolean; onAdd: (e: React.MouseEvent) => void;
  restaurantColor: string; size?: "sm" | "md"; testId: string;
}) {
  const dim = size === "sm" ? "w-8 h-8" : "w-9 h-9";
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button
      onClick={onAdd}
      disabled={isDisabled}
      data-testid={testId}
      className={`${dim} rounded-xl flex items-center justify-center transition-all flex-shrink-0 shadow-lg ${
        isDisabled ? "opacity-30 cursor-not-allowed bg-black/40"
        : added     ? "bg-green-500 scale-95"
        :             "hover:brightness-110 active:scale-90"
      }`}
      style={!isDisabled && !added ? { background: restaurantColor } : {}}
    >
      {added
        ? <Check size={iconSize} className="text-white" />
        : <Plus  size={iconSize} className="text-white" />
      }
    </button>
  );
}

// ─── Mobile add button — pill-shaped, clearly labelled, min 44 px hit area ────

function MobileAddBtn({
  isDisabled, added, onAdd, restaurantColor, testId,
}: {
  isDisabled: boolean; added: boolean; onAdd: (e: React.MouseEvent) => void;
  restaurantColor: string; testId: string;
}) {
  const { t } = useLanguage();
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onAdd}
      disabled={isDisabled}
      data-testid={testId}
      className={`flex items-center gap-1.5 rounded-xl font-bold shadow-lg flex-shrink-0 transition-colors
        px-3.5 py-2 text-[12px] text-white ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
      style={{ background: isDisabled ? "rgba(0,0,0,0.4)" : added ? "#22c55e" : restaurantColor, minHeight: 36 }}
    >
      {added ? <Check size={13} /> : <Plus size={13} />}
      <span>{added ? t("Added", "أضيف") : t("Add", "أضف")}</span>
    </motion.button>
  );
}

// ─── Main grid card (premium, image-first) ────────────────────────────────────

function MenuItemCard({
  item, restaurantColor, isOpen, added, onAdd, onView, outOfStock, displayPrice,
}: {
  item: MenuItem; restaurantColor: string; isOpen: boolean;
  added: boolean; onAdd: () => void; onView: () => void; outOfStock?: boolean; displayPrice?: number;
}) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = item.image_url || item.image;
  const name = t(item.name_en, item.name_ar);
  const desc = t(item.description_en, item.description_ar);
  const effectivePrice = displayPrice ?? item.price;
  const isDisabled = !isOpen || !!outOfStock;

  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); onAdd(); };

  return (
    <motion.div
      layout
      initial="rest"
      whileHover={!outOfStock ? "hovered" : "rest"}
      data-testid={`card-menuitem-${item.id}`}
      onClick={!isDisabled ? onView : undefined}
      className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer select-none ${
        outOfStock ? "opacity-70" : ""
      }`}
      style={{ boxShadow: "0 6px 28px rgba(0,0,0,0.45), 0 2px 8px rgba(0,0,0,0.3)" }}
    >
      {/* ── Skeleton ── */}
      {!imgLoaded && <CardSkeleton restaurantColor={restaurantColor} />}

      {/* ── Image layer ── */}
      <motion.div variants={imgVariants} className="absolute inset-0 will-change-transform">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-6xl"
            style={{ background: `linear-gradient(135deg, ${restaurantColor}22 0%, ${restaurantColor}08 100%)` }}
          >
            <span className="opacity-30">🍽️</span>
          </div>
        )}
      </motion.div>

      {/* ── Out of stock full overlay ── */}
      {outOfStock && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center">
          <span className="bg-amber-500/90 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg">
            {t("Out of Stock", "غير متوفر")}
          </span>
        </div>
      )}

      {/* ── Badges ── */}
      <Badges item={item} />

      {/* ─────────────── DESKTOP: hover overlay ─────────────── */}
      {/* Faded label shown before hover */}
      <motion.div
        variants={labelVariants}
        className="absolute inset-x-0 bottom-0 z-20 pointer-events-none hidden md:block"
      >
        <div className="h-20 bg-gradient-to-t from-black/75 to-transparent" />
        <div className="absolute bottom-2.5 inset-x-3 flex items-end justify-between gap-2">
          <p className="text-white text-[13px] font-semibold line-clamp-1 flex-1 drop-shadow">{name}</p>
          <span className="text-[13px] font-bold flex-shrink-0 drop-shadow" style={{ color: restaurantColor }}>
            {effectivePrice} ﷼
          </span>
        </div>
      </motion.div>

      {/* Full hover overlay */}
      <motion.div
        variants={overlayVariants}
        className="absolute inset-0 z-20 hidden md:block pointer-events-none"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.05) 100%)" }}
      />
      <motion.div
        variants={contentVariants}
        className="absolute inset-x-0 bottom-0 z-20 hidden md:block"
        style={{ pointerEvents: "auto" }}
      >
        <div className="p-4">
          <h3 className="text-white font-bold text-[15px] leading-tight line-clamp-2 mb-1 drop-shadow-md">{name}</h3>
          {desc && (
            <p className="text-white/65 text-[11px] leading-relaxed line-clamp-2 mb-2.5">{desc}</p>
          )}
          {item.calories != null && item.calories > 0 && (
            <p className="text-white/40 text-[10px] mb-2">🔥 {item.calories} {t("kcal", "سعرة")}</p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-[15px]" style={{ color: restaurantColor }}>{effectivePrice} ﷼</span>
              {displayPrice && displayPrice !== item.price && (
                <span className="text-white/35 text-xs line-through ml-1.5">{item.price} ﷼</span>
              )}
            </div>
            <AddBtn isDisabled={isDisabled} added={added} onAdd={handleAdd} restaurantColor={restaurantColor} testId={`btn-add-${item.id}`} />
          </div>
        </div>
      </motion.div>

      {/* ─────────────── MOBILE: always-visible bottom bar ─────────────── */}
      <div className="absolute inset-x-0 bottom-0 z-20 md:hidden">
        <div className="h-24 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 px-3 pb-3 flex items-end justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-white text-[13px] font-bold line-clamp-1 leading-tight drop-shadow">{name}</p>
            <span className="text-[12px] font-bold drop-shadow" style={{ color: restaurantColor }}>{effectivePrice} ﷼</span>
          </div>
          {!outOfStock && (
            <MobileAddBtn isDisabled={isDisabled} added={added} onAdd={handleAdd} restaurantColor={restaurantColor} testId={`btn-add-${item.id}`} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compact grid card ────────────────────────────────────────────────────────

function MenuItemCompactCard({
  item, restaurantColor, isOpen, added, onAdd, onView, outOfStock, displayPrice,
}: {
  item: MenuItem; restaurantColor: string; isOpen: boolean;
  added: boolean; onAdd: () => void; onView: () => void; outOfStock?: boolean; displayPrice?: number;
}) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = item.image_url || item.image;
  const name = t(item.name_en, item.name_ar);
  const effectivePrice = displayPrice ?? item.price;
  const isDisabled = !isOpen || !!outOfStock;
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); onAdd(); };

  return (
    <motion.div
      layout
      initial="rest"
      whileHover={!outOfStock ? "hovered" : "rest"}
      data-testid={`card-menuitem-${item.id}`}
      onClick={!isDisabled ? onView : undefined}
      className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer select-none ${outOfStock ? "opacity-70" : ""}`}
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}
    >
      {!imgLoaded && <CardSkeleton restaurantColor={restaurantColor} />}

      <motion.div variants={imgVariants} className="absolute inset-0 will-change-transform">
        {imgSrc ? (
          <img src={imgSrc} alt={name} loading="lazy" decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: `${restaurantColor}18` }}>
            <span className="opacity-25">🍽️</span>
          </div>
        )}
      </motion.div>

      {outOfStock && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center">
          <span className="bg-amber-500/90 text-white text-[9px] font-bold px-2 py-1 rounded-full">{t("Out","نفد")}</span>
        </div>
      )}

      {/* Badge (just one, compact) */}
      {item.is_new && (
        <div className="absolute top-1.5 left-1.5 z-30">
          <span className="bg-yellow-400/90 text-black text-[8px] font-bold px-1.5 py-0.5 rounded-full">{t("New","جديد")}</span>
        </div>
      )}
      {item.is_best_seller && !item.is_new && (
        <div className="absolute top-1.5 left-1.5 z-30">
          <span className="bg-red-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">{t("Top","الأكثر")}</span>
        </div>
      )}

      {/* Desktop hover overlay */}
      <motion.div variants={overlayVariants} className="absolute inset-0 z-20 hidden md:block"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" }}
      />
      <motion.div variants={contentVariants} className="absolute inset-x-0 bottom-0 z-20 hidden md:block p-2.5">
        <p className="text-white font-bold text-[12px] line-clamp-1 mb-1">{name}</p>
        <div className="flex items-center justify-between">
          <span className="font-bold text-[12px]" style={{ color: restaurantColor }}>{effectivePrice} ﷼</span>
          <AddBtn isDisabled={isDisabled} added={added} onAdd={handleAdd} restaurantColor={restaurantColor} size="sm" testId={`btn-add-${item.id}`} />
        </div>
      </motion.div>

      {/* Mobile bottom bar — always shows name + Add button */}
      <div className="absolute inset-x-0 bottom-0 z-20 md:hidden">
        <div className="h-20 bg-gradient-to-t from-black/90 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 px-2 pb-2 flex items-end justify-between gap-1.5">
          <div className="flex-1 min-w-0">
            <p className="text-white text-[10px] font-bold line-clamp-1 drop-shadow">{name}</p>
            <span className="text-[10px] font-bold drop-shadow" style={{ color: restaurantColor }}>{effectivePrice} ﷼</span>
          </div>
          {!outOfStock && (
            <MobileAddBtn isDisabled={isDisabled} added={added} onAdd={handleAdd} restaurantColor={restaurantColor} testId={`btn-add-${item.id}`} />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── List card (horizontal, text always visible) ──────────────────────────────

function MenuItemListCard({
  item, restaurantColor, isOpen, added, onAdd, onView, outOfStock, displayPrice,
}: {
  item: MenuItem; restaurantColor: string; isOpen: boolean;
  added: boolean; onAdd: () => void; onView: () => void; outOfStock?: boolean; displayPrice?: number;
}) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  const imgSrc = item.image_url || item.image;
  const effectivePrice = displayPrice ?? item.price;
  const isDisabled = !isOpen || !!outOfStock;
  const handleAdd = (e: React.MouseEvent) => { e.stopPropagation(); onAdd(); };

  return (
    <motion.div
      layout
      onClick={!isDisabled ? onView : undefined}
      data-testid={`card-menuitem-${item.id}`}
      className={`relative flex flex-row items-center gap-3 p-3 rounded-2xl cursor-pointer select-none transition-colors ${
        outOfStock ? "opacity-70" : "hover:bg-white/[0.03]"
      }`}
      style={{
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      }}
      whileHover={{ x: 2 }}
      transition={{ duration: 0.18 }}
    >
      {/* Image */}
      <div className="relative rounded-xl overflow-hidden flex-shrink-0" style={{ width: 80, height: 80 }}>
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse rounded-xl" style={{ background: `${restaurantColor}15` }} />
        )}
        {imgSrc ? (
          <img src={imgSrc} alt={t(item.name_en, item.name_ar)} loading="lazy" decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={`w-full h-full object-cover transition-opacity duration-400 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ background: `${restaurantColor}18` }}>
            <span className="opacity-30">🍽️</span>
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
            <span className="text-[8px] text-white font-bold text-center px-1">{t("Out","نفد")}</span>
          </div>
        )}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-foreground text-[14px] font-semibold leading-tight line-clamp-1 mb-0.5">
          {t(item.name_en, item.name_ar)}
        </h3>
        {/* Badges inline */}
        <div className="flex gap-1 flex-wrap mb-1">
          {item.is_best_seller && <span className="text-[9px] bg-red-500/80 text-white font-bold px-1.5 py-0.5 rounded-full">{t("Best Seller","الأكثر")}</span>}
          {item.is_new         && <span className="text-[9px] bg-yellow-400/80 text-black font-bold px-1.5 py-0.5 rounded-full">{t("New","جديد")}</span>}
          {item.is_popular && !item.is_best_seller && <span className="text-[9px] bg-primary/70 text-white font-bold px-1.5 py-0.5 rounded-full">{t("Popular","الأكثر")}</span>}
        </div>
        {(item.description_en || item.description_ar) && (
          <p className="text-xs text-muted-foreground line-clamp-1">{t(item.description_en, item.description_ar)}</p>
        )}
        {item.calories != null && item.calories > 0 && (
          <p className="text-[10px] text-muted-foreground/50 mt-0.5">🔥 {item.calories} {t("kcal","سعرة")}</p>
        )}
      </div>

      {/* Price + button */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="text-right">
          <span className="font-bold text-[14px]" style={{ color: restaurantColor }}>{effectivePrice} ﷼</span>
          {displayPrice && displayPrice !== item.price && (
            <p className="text-[10px] text-muted-foreground/50 line-through">{item.price} ﷼</p>
          )}
        </div>
        <MobileAddBtn isDisabled={isDisabled} added={added} onAdd={handleAdd} restaurantColor={restaurantColor} testId={`btn-add-${item.id}`} />
      </div>
    </motion.div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BranchPage() {
  const params = useParams<{ restaurantId: string; branchId: string }>();
  const { t, isRTL } = useLanguage();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const settings    = useStore(useCallback(() => settingsStore.get(), []));
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const allBranches = useStore(useCallback(() => branchStore.getAll(), []));
  const categories  = useStore(useCallback(() => categoryStore.getByRestaurant(params.restaurantId), [params.restaurantId]));
  const allMenuItems= useStore(useCallback(() => menuStore.getByRestaurant(params.restaurantId), [params.restaurantId]));
  const allOffers   = useStore(useCallback(() => offerStore.getActive(), []));
  const branchItemOverrides  = useStore(useCallback(() => branchItemOverrideStore.getForBranch(params.branchId),  [params.branchId]));
  const branchCatOverrides   = useStore(useCallback(() => branchCategoryOverrideStore.getForBranch(params.branchId), [params.branchId]));

  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [modalItem, setModalItem]   = useState<MenuItem | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("delivery");
  const [displayMode, setDisplayMode]   = useState<DisplayMode>(
    () => (settings.menu_display_mode as DisplayMode) || "grid"
  );

  const restaurant = restaurants.find((r) => r.id === params.restaurantId);
  const branch     = allBranches.find((b) => b.id === params.branchId);

  if (!restaurant || !branch) {
    return <div className="pt-16 text-center text-muted-foreground">{t("Branch not found","الفرع غير موجود")}</div>;
  }

  const isOpen = isBranchOpen(branch);

  const overrideMap: Record<string, BranchItemOverride> = {};
  for (const o of branchItemOverrides) overrideMap[o.item_id] = o;
  const catHidden = new Set(branchCatOverrides.filter((o) => o.hidden).map((o) => o.category_id));

  const visibleCategories = categories.filter((c) => !c.hidden && !catHidden.has(c.id));
  const displayCategory   = activeCategory || (visibleCategories[0]?.id ?? null);

  const filteredItems = allMenuItems.filter((m) => {
    if (m.category_id !== displayCategory) return false;
    if (!m.is_available || m.hidden) return false;
    const ov = overrideMap[m.id];
    if (ov?.status === "hidden") return false;
    return true;
  });

  function getEffective(item: MenuItem) {
    const ov = overrideMap[item.id];
    const price = ov?.price_override ?? item.price;
    if (!ov) return { outOfStock: false, displayPrice: item.price };
    if (ov.status === "out_of_stock") return { outOfStock: true, displayPrice: price };
    if (ov.schedule?.enabled && !checkSchedule(ov.schedule)) return { outOfStock: true, displayPrice: price };
    return { outOfStock: false, displayPrice: price };
  }

  const handleItemClick = (item: MenuItem) => {
    if (!isOpen || getEffective(item).outOfStock) return;
    analyticsStore.track({ type: "view", item_id: item.id, restaurant_id: item.restaurant_id });
    userBehaviorStore.trackView(item.id);
    setModalItem(item);
    setModalOpen(true);
  };

  const handleDirectAdd = (item: MenuItem) => {
    if (!isOpen || getEffective(item).outOfStock) return;
    const result = addToCart(
      item,
      restaurant.id,
      branch.id,
      {},
      [],
      ""
    );
    if (result === "confirm_clear") return; // cart conflict — let CartContext handle the dialog
    markAdded(item.id);
    analyticsStore.track({ type: "add_to_cart", item_id: item.id, restaurant_id: item.restaurant_id });
    toast({ title: t("Added to cart", "تمت الإضافة للسلة"), description: t(item.name_en, item.name_ar) });
  };

  const markAdded = (itemId: string) => {
    setAddedItems((prev) => new Set(prev).add(itemId));
    setTimeout(() => setAddedItems((prev) => { const n = new Set(prev); n.delete(itemId); return n; }), 1500);
  };

  const gridClass =
    displayMode === "list"
      ? "flex flex-col gap-2"
      : displayMode === "compact_grid"
      ? "grid gap-2.5 grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
      : "grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  return (
    <div className="min-h-screen bg-background pt-16 pb-28" style={{ direction: isRTL ? "rtl" : "ltr" }}>
      <div className="max-w-5xl mx-auto px-4">

        {/* Branch header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${restaurant.color}15, transparent)`, border: `1px solid ${restaurant.color}25` }}>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0" style={{ background: `${restaurant.color}20` }}>
                  {restaurant.logoType === "image" && restaurant.logo ? (
                    <img src={restaurant.logo} alt={restaurant.name_en} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">{restaurant.logo || "🍽️"}</div>
                  )}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">{t(restaurant.name_en, restaurant.name_ar)}</h1>
                  <p className="text-sm text-muted-foreground">{t(branch.name_en, branch.name_ar)}</p>
                </div>
              </div>
              <WorkingHoursStatus branch={branch} />
            </div>
            {!isOpen && (
              <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium">
                {t("This branch is currently closed. Orders are not available.","هذا الفرع مغلق حالياً. الطلبات غير متاحة.")}
              </div>
            )}
            {(branch.is_delivery_enabled || branch.pickup_enabled) && (
              <DeliveryModeSelector branch={branch} restaurantColor={restaurant.color} restaurantId={restaurant.id} onModeChange={setDeliveryMode} />
            )}
          </div>
        </motion.div>

        {/* Offers banner */}
        {allOffers.some((o) => o.show_as_banner && o.image && (o.restaurant_id === restaurant.id || o.restaurant_id === "global")) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
            <HeroBannerSlider offers={allOffers} restaurantId={restaurant.id} />
          </motion.div>
        )}

        {/* Category tabs + display mode toggle */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex gap-2 overflow-x-auto pb-0.5 flex-1 no-scrollbar" style={{ direction: "ltr" }}>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  displayCategory === cat.id ? "text-white" : "bg-card border border-white/5 text-muted-foreground hover:text-foreground"
                }`}
                style={displayCategory === cat.id ? { background: restaurant.color } : {}}
                data-testid={`tab-category-${cat.id}`}
              >
                {t(cat.name_en, cat.name_ar)}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-shrink-0 bg-card border border-white/5 rounded-xl p-1">
            {([
              { mode: "grid"         as const, icon: <LayoutGrid size={14} /> },
              { mode: "compact_grid" as const, icon: <Rows3       size={14} /> },
              { mode: "list"         as const, icon: <AlignJustify size={14} /> },
            ]).map(({ mode, icon }) => (
              <button key={mode} type="button" onClick={() => setDisplayMode(mode)} title={mode}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${displayMode === mode ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Menu grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${displayCategory}-${displayMode}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={gridClass}
          >
            {filteredItems.length === 0 && (
              <p className="text-muted-foreground text-sm col-span-full text-center py-12">
                {t("No items in this category","لا توجد عناصر في هذه الفئة")}
              </p>
            )}
            {filteredItems.map((item) => {
              const { outOfStock, displayPrice } = getEffective(item);
              const cardProps = {
                item,
                restaurantColor: restaurant.color,
                isOpen,
                added: addedItems.has(item.id),
                onAdd:  () => handleDirectAdd(item),
                onView: () => handleItemClick(item),
                outOfStock,
                displayPrice: displayPrice !== item.price ? displayPrice : undefined,
              };
              if (displayMode === "list")         return <MenuItemListCard    key={item.id} {...cardProps} />;
              if (displayMode === "compact_grid") return <MenuItemCompactCard key={item.id} {...cardProps} />;
              return                                     <MenuItemCard        key={item.id} {...cardProps} />;
            })}
          </motion.div>
        </AnimatePresence>
      </div>

      <WhatsAppSticky branchId={params.branchId} />
      <ItemDetailModal
        item={modalItem}
        restaurantId={restaurant.id}
        branchId={branch.id}
        restaurantColor={restaurant.color}
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setModalItem(null); }}
        onAdded={(itemId) => markAdded(itemId)}
      />
    </div>
  );
}
