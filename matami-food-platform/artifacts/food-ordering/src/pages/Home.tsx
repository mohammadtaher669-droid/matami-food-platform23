import { useState, useCallback, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Star, Clock, Bike, Flame, ShoppingCart,
  ChevronLeft, ChevronRight, Sparkles, Tag, TrendingUp,
  MapPin, Plus,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  restaurantStore, branchStore, offerStore,
  menuStore, settingsStore, analyticsStore, bannerStore,
  HOME_SECTION_META,
} from "@/lib/store";
import type { MenuItem, Restaurant, Offer, Banner } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import ImageWithFallback from "@/components/ImageWithFallback";
import { isBranchOpen } from "@/components/WorkingHoursStatus";
import RecommendationRow from "@/components/RecommendationRow";
import OffersGrid from "@/components/OffersGrid";
import { SkeletonRestaurantCard, SkeletonItemCard, SkeletonBanner } from "@/components/SkeletonCard";

// ── Shared hover variants (matches BranchPage premium cards) ─────────────────

const EASE = [0.25, 0.1, 0.25, 1] as const;

const imgV = {
  rest:    { scale: 1,    transition: { duration: 0.45, ease: EASE } },
  hovered: { scale: 1.07, transition: { duration: 0.45, ease: EASE } },
};
const overlayV = {
  rest:    { opacity: 0, transition: { duration: 0.2 } },
  hovered: { opacity: 1, transition: { duration: 0.25 } },
};
const contentV = {
  rest:    { y: 16, opacity: 0, transition: { duration: 0.22 } },
  hovered: { y: 0,  opacity: 1, transition: { duration: 0.3, ease: EASE, delay: 0.05 } },
};
const labelV = {
  rest:    { opacity: 1, transition: { duration: 0.18 } },
  hovered: { opacity: 0, transition: { duration: 0.14 } },
};

// ── Compute effective section order ──────────────────────────────────────────

function getEffectiveSections(config?: { id: string; sort_order: number; hidden?: boolean }[]) {
  return HOME_SECTION_META.map((meta) => {
    const saved = config?.find((c) => c.id === meta.id);
    return {
      id: meta.id,
      sort_order: saved?.sort_order ?? meta.default_order,
      hidden: saved?.hidden ?? false,
    };
  }).sort((a, b) => a.sort_order - b.sort_order);
}

function getOrderedRestaurants(
  restaurants: ReturnType<typeof restaurantStore.getAll>,
  orderIds?: string[]
) {
  if (!orderIds || orderIds.length === 0) return restaurants;
  const map = new Map(restaurants.map((r) => [r.id, r]));
  const ordered: typeof restaurants = [];
  for (const id of orderIds) {
    const r = map.get(id);
    if (r) ordered.push(r);
  }
  for (const r of restaurants) {
    if (!orderIds.includes(r.id)) ordered.push(r);
  }
  return ordered;
}

// ── Promo Banner Slider ───────────────────────────────────────────────────────

function PromoSlider({ banners }: { banners: Banner[] }) {
  const { t, isRTL } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef(0);

  const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + banners.length) % banners.length), [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const id = setInterval(next, 4500);
    return () => clearInterval(id);
  }, [banners.length, paused, next]);

  useEffect(() => { setCurrent(0); }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[current];
  const href = banner.link || "/offers";
  const imgSrc = banner.image_url || banner.image;

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ height: 220 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        const diff = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) { diff > 0 ? next() : prev(); }
      }}
      data-testid="hero-banner-slider"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, x: isRTL ? -60 : 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 60 : -60 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          {banner.video_url ? (
            <video src={banner.video_url} className="w-full h-full object-cover" autoPlay muted loop playsInline />
          ) : imgSrc ? (
            <img src={imgSrc} alt={t(banner.title_en, banner.title_ar)} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="max-w-xs">
              <h3 className="text-white font-bold text-xl leading-tight line-clamp-2 mb-1">{t(banner.title_en, banner.title_ar)}</h3>
              {(banner.subtitle_en || banner.subtitle_ar) && (
                <p className="text-white/75 text-xs line-clamp-1 mb-3">{t(banner.subtitle_en || "", banner.subtitle_ar || "")}</p>
              )}
              {(banner.button_text_en || banner.button_text_ar || href !== "/offers") && (
                <Link href={href}>
                  <motion.button whileTap={{ scale: 0.95 }} className="px-5 py-2 bg-primary text-white text-sm font-bold rounded-full shadow-lg shadow-primary/40 hover:opacity-90 transition">
                    {t(banner.button_text_en || "Order Now", banner.button_text_ar || "اطلب الآن")}
                  </motion.button>
                </Link>
              )}
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      {banners.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition z-10">
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition z-10">
            <ChevronRight size={16} className="text-white" />
          </button>
          <div className="absolute bottom-4 right-4 flex items-center gap-1.5 z-10">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${i === current ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40 hover:bg-white/60"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Restaurant Card ───────────────────────────────────────────────────────────

function RestaurantCard({
  restaurant, branches, index,
}: {
  restaurant: ReturnType<typeof restaurantStore.getAll>[number];
  branches: ReturnType<typeof branchStore.getAll>;
  index: number;
}) {
  const { t, isRTL } = useLanguage();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;

  const restaurantBranches = branches.filter((b) => b.restaurant_id === restaurant.id);
  const openBranches = restaurantBranches.filter((b) => isBranchOpen(b));
  const isAnyOpen = openBranches.length > 0;
  const primary = restaurantBranches[0];
  const deliveryTime = primary?.delivery_time ? `${primary.delivery_time} min` : "20-35 min";
  const deliveryFee = primary?.delivery_fee ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      whileHover={{ y: -3 }}
    >
      <Link href={`/restaurant/${restaurant.id}`}>
        <div
          className="group relative overflow-hidden rounded-2xl cursor-pointer transition-shadow duration-300 bg-card"
          style={{ border: `1px solid ${restaurant.color}20`, boxShadow: "0 2px 16px rgba(0,0,0,0.35)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = `0 10px 36px ${restaurant.color}28, 0 2px 16px rgba(0,0,0,0.4)`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 16px rgba(0,0,0,0.35)"; }}
          data-testid={`card-restaurant-${restaurant.id}`}
        >
          {/* Cover */}
          <div className="relative overflow-hidden" style={{ height: 148 }}>
            {restaurant.cover_image ? (
              <img src={restaurant.cover_image} alt={restaurant.name_en} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            ) : (
              <div className="w-full h-full transition-transform duration-500 group-hover:scale-105 flex items-center justify-center"
                style={{ background: `linear-gradient(135deg, ${restaurant.color}30, ${restaurant.color}08)` }}>
                <span className="text-5xl opacity-20">🍽️</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <span className="bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-full translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                {t("Browse Menu →", "استعرض المنيو ←")}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-0.5 group-hover:h-1 transition-all" style={{ background: `linear-gradient(90deg, ${restaurant.color}, ${restaurant.color}60)` }} />
            <div className={`absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg ${isAnyOpen ? "bg-green-500 text-white" : "bg-red-500/85 text-white"}`}>
              {isAnyOpen ? t("Open", "مفتوح") : t("Closed", "مغلق")}
            </div>
          </div>

          {/* Info */}
          <div className="px-3.5 pb-3.5 pt-0 bg-card">
            <div className="flex items-start gap-3">
              <div className="-mt-7 rounded-xl border-2 flex-shrink-0 overflow-hidden shadow-xl relative z-10 flex items-center justify-center"
                style={{ borderColor: `${restaurant.color}40`, background: `${restaurant.color}18`, width: 52, height: 52 }}>
                {restaurant.logoType === "image" && restaurant.logo
                  ? <ImageWithFallback src={restaurant.logo} alt="" className="w-full h-full object-cover" preset="thumbnail" />
                  : <span className="text-2xl">{restaurant.logo || "🍽️"}</span>
                }
              </div>
              <div className="flex-1 min-w-0 pt-1.5">
                <h3 className="text-sm font-bold text-foreground leading-tight truncate">{t(restaurant.name_en, restaurant.name_ar)}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t(restaurant.tagline_en || restaurant.description_en, restaurant.tagline_ar || restaurant.description_ar)}</p>
              </div>
            </div>
            <div className="flex items-center gap-0 mt-2.5 pt-2.5 border-t border-white/5">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-1">
                <Star size={10} className="text-yellow-400 fill-yellow-400 flex-shrink-0" />
                <span>4.8</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-1">
                <Clock size={10} className="flex-shrink-0" />
                <span>{deliveryTime}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground flex-1">
                <Bike size={10} className="flex-shrink-0" />
                <span>{deliveryFee > 0 ? `${deliveryFee} ﷼` : t("Free", "مجاني")}</span>
              </div>
              <div className="flex items-center gap-0.5 text-[11px] font-semibold transition-all group-hover:gap-1" style={{ color: restaurant.color }}>
                {t("Order", "اطلب")}
                <ChevronIcon size={12} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// ── Best Seller Item Card — premium image-first ───────────────────────────────

function BestSellerItemCard({
  item, restaurant, badge,
}: { item: MenuItem; restaurant: Restaurant | undefined; badge?: string }) {
  const { t } = useLanguage();
  const [imgLoaded, setImgLoaded] = useState(false);
  if (!restaurant) return null;
  const imgSrc = item.image_url || item.image;
  const badgeLabel =
    badge === "best_seller" ? t("Best Seller", "الأكثر مبيعاً")
    : badge === "new"       ? t("New", "جديد")
    : badge === "offer"     ? t("Offer", "عرض")
    : badge === "featured"  ? t("Featured", "مميز")
    : undefined;
  const badgeColor =
    badge === "best_seller" ? "#FF7A00"
    : badge === "new"       ? "#22c55e"
    : badge === "offer"     ? "#8b5cf6"
    : "#f59e0b";

  return (
    <Link href={`/restaurant/${restaurant.id}`}>
      <motion.div
        initial="rest"
        whileHover="hovered"
        className="flex-shrink-0 w-44 aspect-square rounded-2xl overflow-hidden cursor-pointer relative select-none"
        style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.45)" }}
      >
        {/* Skeleton */}
        {!imgLoaded && (
          <div className="absolute inset-0 animate-pulse" style={{ background: `${restaurant.color}15` }}>
            <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        {/* Image */}
        <motion.div variants={imgV} className="absolute inset-0 will-change-transform">
          {imgSrc ? (
            <img src={imgSrc} alt={t(item.name_en, item.name_ar)} loading="lazy" decoding="async"
              onLoad={() => setImgLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: `${restaurant.color}18` }}>
              <span className="opacity-30">🍽️</span>
            </div>
          )}
        </motion.div>

        {/* Badge */}
        {badgeLabel && (
          <div className="absolute top-2 left-2 z-30 px-2 py-0.5 rounded-full text-[9px] font-bold text-white shadow" style={{ background: badgeColor }}>
            {badgeLabel}
          </div>
        )}

        {/* Desktop hover overlay */}
        <motion.div variants={overlayV} className="absolute inset-0 z-20 hidden md:block pointer-events-none"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.90) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0) 100%)" }}
        />
        <motion.div variants={contentV} className="absolute inset-x-0 bottom-0 z-20 hidden md:block pointer-events-none p-3">
          <p className="text-white font-bold text-[13px] line-clamp-1 leading-tight mb-0.5">{t(item.name_en, item.name_ar)}</p>
          <div className="flex items-center justify-between">
            <span className="font-bold text-[12px]" style={{ color: restaurant.color }}>{item.price} ﷼</span>
            <span className="text-white/50 text-[10px] truncate ml-2">{t(restaurant.name_en, restaurant.name_ar)}</span>
          </div>
        </motion.div>

        {/* Desktop minimal label (hidden on hover) */}
        <motion.div variants={labelV} className="absolute inset-x-0 bottom-0 z-10 pointer-events-none hidden md:block">
          <div className="h-16 bg-gradient-to-t from-black/75 to-transparent" />
          <div className="absolute bottom-2 inset-x-2.5 flex justify-between items-end gap-1">
            <p className="text-white text-[11px] font-semibold line-clamp-1 flex-1 drop-shadow">{t(item.name_en, item.name_ar)}</p>
            <span className="text-[11px] font-bold flex-shrink-0 drop-shadow" style={{ color: restaurant.color }}>{item.price} ﷼</span>
          </div>
        </motion.div>

        {/* Mobile bottom gradient — always visible */}
        <div className="absolute inset-x-0 bottom-0 z-20 md:hidden">
          <div className="h-20 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
          <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2.5">
            <p className="text-white text-[12px] font-bold line-clamp-1 drop-shadow">{t(item.name_en, item.name_ar)}</p>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold drop-shadow" style={{ color: restaurant.color }}>{item.price} ﷼</span>
              <span className="text-white/50 text-[9px] truncate ml-1">{t(restaurant.name_en, restaurant.name_ar)}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

// ── Best Sellers Section ──────────────────────────────────────────────────────

const BS_TABS = [
  { id: "popular",   label_en: "Most Popular", label_ar: "الأكثر مبيعاً", icon: "🔥" },
  { id: "new",       label_en: "New Items",    label_ar: "جديد",          icon: "✨" },
  { id: "featured",  label_en: "Featured",     label_ar: "مميز",          icon: "⭐" },
  { id: "offers",    label_en: "On Offer",     label_ar: "عروض",          icon: "🎁" },
];

function BestSellersSection({
  allMenuItems, restaurants, offers,
}: {
  allMenuItems: MenuItem[];
  restaurants: ReturnType<typeof restaurantStore.getAll>;
  offers: Offer[];
}) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("popular");

  const offerRestaurantIds = new Set(offers.filter((o) => o.active).map((o) => o.restaurant_id));

  const getItems = () => {
    const base = allMenuItems.filter((m) => m.is_available && !m.hidden);
    if (activeTab === "popular")  return base.filter((m) => m.is_popular).slice(0, 20);
    if (activeTab === "new")      return base.filter((m) => m.is_new).slice(0, 20);
    if (activeTab === "featured") return base.filter((m) => m.featured || m.is_best_seller).slice(0, 20);
    if (activeTab === "offers")   return base.filter((m) => offerRestaurantIds.has(m.restaurant_id)).slice(0, 20);
    return [];
  };

  const getBadge = () => {
    if (activeTab === "popular")  return "best_seller";
    if (activeTab === "new")      return "new";
    if (activeTab === "featured") return "featured";
    if (activeTab === "offers")   return "offer";
    return undefined;
  };

  const items = getItems();

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" style={{ direction: "ltr" }}>
        {BS_TABS.map((tab) => (
          <motion.button key={tab.id} whileTap={{ scale: 0.93 }} onClick={() => setActiveTab(tab.id)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === tab.id ? "bg-primary text-white shadow-md shadow-primary/30" : "bg-card border border-white/6 text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>{tab.icon}</span>
            {t(tab.label_en, tab.label_ar)}
          </motion.button>
        ))}
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 mt-4 no-scrollbar" style={{ direction: "ltr" }}>
        {items.length === 0 ? (
          <div className="flex gap-3">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonItemCard key={i} />)}
          </div>
        ) : (
          items.map((item, i) => {
            const restaurant = restaurants.find((r) => r.id === item.restaurant_id);
            return (
              <motion.div key={`${activeTab}-${item.id}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03, duration: 0.25 }}>
                <BestSellerItemCard item={item} restaurant={restaurant} badge={getBadge()} />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Quick Categories ──────────────────────────────────────────────────────────

const QUICK_CATS = [
  { emoji: "🥙", label_en: "Shawarma",  label_ar: "شاورما",  color: "#FF7A00" },
  { emoji: "🍔", label_en: "Burgers",   label_ar: "برغر",    color: "#E53935" },
  { emoji: "🍕", label_en: "Pizza",     label_ar: "بيتزا",   color: "#F4511E" },
  { emoji: "🍗", label_en: "Chicken",   label_ar: "دجاج",    color: "#FB8C00" },
  { emoji: "🍚", label_en: "Kabsa",     label_ar: "كبسة",    color: "#C1121F" },
  { emoji: "🥗", label_en: "Salads",    label_ar: "سلطة",    color: "#43A047" },
  { emoji: "☕", label_en: "Coffee",    label_ar: "قهوة",    color: "#795548" },
  { emoji: "🧁", label_en: "Desserts",  label_ar: "حلويات",  color: "#D81B60" },
  { emoji: "🍖", label_en: "Grills",    label_ar: "مشاوي",   color: "#8D6E63" },
  { emoji: "🌮", label_en: "Wraps",     label_ar: "لفائف",   color: "#FFA726" },
];

function CategoriesSection({ onFilter }: { onFilter: (q: string) => void }) {
  const { t } = useLanguage();
  const [active, setActive] = useState<string | null>(null);

  function handleClick(cat: typeof QUICK_CATS[0]) {
    if (active === cat.label_en) { setActive(null); onFilter(""); }
    else { setActive(cat.label_en); onFilter(t(cat.label_en, cat.label_ar)); }
  }

  return (
    <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar" style={{ direction: "ltr" }}>
      {QUICK_CATS.map((cat) => {
        const isActive = active === cat.label_en;
        return (
          <motion.button key={cat.label_en} whileTap={{ scale: 0.93 }} onClick={() => handleClick(cat)} className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-200 shadow-sm"
              style={{
                background: isActive ? cat.color : "rgba(255,255,255,0.04)",
                border: `1.5px solid ${isActive ? cat.color : "rgba(255,255,255,0.06)"}`,
                boxShadow: isActive ? `0 4px 16px ${cat.color}40` : "none",
              }}>
              {cat.emoji}
            </div>
            <span className="text-[10px] font-medium transition-colors" style={{ color: isActive ? cat.color : undefined }}>
              {t(cat.label_en, cat.label_ar)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

// ── Main Home ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { t, isRTL } = useLanguage();
  const { cartItems } = useCart();
  const [search, setSearch] = useState("");
  const [showAbandonedBanner, setShowAbandonedBanner] = useState(false);

  const settings    = useStore(useCallback(() => settingsStore.get(), []));
  const allRestaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const branches    = useStore(useCallback(() => branchStore.getAll(), []));
  const offers      = useStore(useCallback(() => offerStore.getActive(), []));
  const allMenuItems= useStore(useCallback(() => menuStore.getAll(), []));
  const homeBanners = useStore(useCallback(() => bannerStore.getActive("homepage"), []));

  useEffect(() => { analyticsStore.track({ type: "page_visit", page: "home" }); }, []);
  useEffect(() => {
    if (cartItems.length > 0 && !sessionStorage.getItem("abandoned_cart_dismissed")) setShowAbandonedBanner(true);
  }, [cartItems.length]);

  // Apply content control
  const restaurants = getOrderedRestaurants(allRestaurants, settings.restaurant_order);
  const sections = getEffectiveSections(settings.home_sections_config);
  const columns = settings.home_columns ?? 2;
  const gridCols =
    columns >= 4 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4"
    : columns === 3 ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";

  const filteredRestaurants = restaurants.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.name_en.toLowerCase().includes(q) || r.name_ar.includes(q) ||
      (r.description_en || "").toLowerCase().includes(q) || (r.tagline_en || "").toLowerCase().includes(q);
  });

  const bgStyle: React.CSSProperties = (() => {
    if (settings.homepage_bg_type === "image" && settings.homepage_bg_image)
      return { backgroundImage: `url(${settings.homepage_bg_image})`, backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" };
    if (settings.homepage_bg_type === "gradient")
      return { background: "linear-gradient(135deg, #1a0a00 0%, #0F0F0F 60%)" };
    return { background: "#0F0F0F" };
  })();

  // Section renderer
  function renderSection(id: string) {
    switch (id) {
      case "banners":
        if (homeBanners.length === 0) return null;
        return (
          <motion.div key="banners" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }} className="px-4 mb-7">
            <PromoSlider banners={homeBanners} />
          </motion.div>
        );

      case "restaurants":
        if (search) return null;
        return (
          <motion.div key="restaurants" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="px-4 mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">{t("Restaurants", "المطاعم")}</h2>
              </div>
              {restaurants.length > 0 && (
                <span className="text-xs text-muted-foreground bg-card border border-white/5 px-2.5 py-1 rounded-full">{restaurants.length}</span>
              )}
            </div>
            <div className={`grid gap-4 ${gridCols}`}>
              {restaurants.length === 0
                ? Array.from({ length: 3 }).map((_, i) => <SkeletonRestaurantCard key={i} />)
                : restaurants.map((r, i) => <RestaurantCard key={r.id} restaurant={r} branches={branches} index={i} />)
              }
            </div>
          </motion.div>
        );

      case "best_sellers":
        if (search || allMenuItems.length === 0) return null;
        return (
          <motion.div key="best_sellers" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.13 }} className="mb-8">
            <div className="flex items-center gap-2 px-4 mb-4">
              <TrendingUp size={16} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">{t("Best Sellers", "الأكثر مبيعاً")}</h2>
            </div>
            <BestSellersSection allMenuItems={allMenuItems} restaurants={restaurants} offers={offers} />
          </motion.div>
        );

      case "recommendations":
        if (search) return null;
        return (
          <motion.div key="recommendations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="mb-8">
            <RecommendationRow limit={8} />
          </motion.div>
        );

      case "categories":
        if (search) return null;
        return (
          <motion.div key="categories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.17 }} className="mb-8">
            <div className="flex items-center gap-2 px-4 mb-4">
              <Tag size={16} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">{t("Browse by Category", "تصفح حسب الفئة")}</h2>
            </div>
            <CategoriesSection onFilter={setSearch} />
          </motion.div>
        );

      case "offers_grid":
        if (search || offers.length === 0) return null;
        return (
          <motion.div key="offers_grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.19 }} className="px-4 mb-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <h2 className="text-base font-bold text-foreground">{t("Offers & Discounts", "العروض والخصومات")}</h2>
              </div>
              <Link href="/offers">
                <span className="text-xs text-primary font-semibold hover:underline">{t("View all", "عرض الكل")}</span>
              </Link>
            </div>
            <OffersGrid offers={offers} />
          </motion.div>
        );

      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen pb-28 relative" style={{ ...bgStyle, direction: isRTL ? "rtl" : "ltr" }}>
      {settings.homepage_bg_type === "image" && settings.homepage_bg_image && (
        <div className="fixed inset-0 pointer-events-none z-0" style={{ background: settings.homepage_overlay_color, opacity: settings.homepage_overlay_opacity }} />
      )}

      {/* Abandoned cart banner */}
      <AnimatePresence>
        {showAbandonedBanner && cartItems.length > 0 && (
          <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -60, opacity: 0 }}
            className="fixed top-14 left-0 right-0 z-40 px-4 pt-2">
            <div className="max-w-2xl mx-auto bg-primary/95 backdrop-blur-sm rounded-2xl p-3 flex items-center gap-3 shadow-xl shadow-primary/25">
              <ShoppingCart size={15} className="text-white flex-shrink-0" />
              <p className="text-white text-sm font-medium flex-1">
                {t(`You have ${cartItems.length} item(s) in your cart`, `لديك ${cartItems.length} منتج في سلتك`)}
              </p>
              <Link href="/cart">
                <span className="text-white text-xs font-bold bg-white/20 hover:bg-white/30 transition px-3 py-1.5 rounded-lg">{t("View Cart", "عرض السلة")}</span>
              </Link>
              <button onClick={() => { setShowAbandonedBanner(false); sessionStorage.setItem("abandoned_cart_dismissed", "1"); }} className="text-white/70 hover:text-white transition">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search header */}
      <div className="px-4 pt-20 pb-4 relative z-10">
        {/* Radial glow behind header */}
        <div className="absolute left-1/2 top-14 -translate-x-1/2 w-80 h-40 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, rgba(255,122,0,0.08) 0%, transparent 70%)" }} />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="mb-5">
          <p className="text-muted-foreground/70 text-sm mb-1">
            {t("👋 Welcome to", "👋 مرحباً بك في")}
            {" "}
            <span className="text-primary font-semibold">{t(settings.platform_name_en || "Mat'ami", settings.platform_name_ar || "مطعمي")}</span>
          </p>
          <h1 className="text-2xl font-extrabold text-foreground leading-tight">
            {t(settings.slogan_en || "What would you like today?",
               settings.slogan_ar || "ماذا تشتهي اليوم؟")}
          </h1>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07, duration: 0.35 }}
          className="relative flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200 focus-within:border-primary/40"
          style={{
            background: "rgba(26,26,26,0.95)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}
        >
          <Search size={16} className="text-primary/60 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search restaurants, food, categories…", "ابحث عن مطاعم، طعام، فئات…")}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            data-testid="input-search"
          />
          <AnimatePresence>
            {search && (
              <motion.button initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                onClick={() => setSearch("")}
                className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/20 transition flex-shrink-0">
                <X size={12} />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Dynamic sections */}
      {sections.filter((s) => !s.hidden).map((s) => renderSection(s.id))}

      {/* Search results overlay */}
      {search && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search size={14} className="text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{t(`Results for "${search}"`, `نتائج لـ "${search}"`)}</h2>
          </div>
          {filteredRestaurants.length > 0 ? (
            <div className={`grid gap-4 ${gridCols}`}>
              {filteredRestaurants.map((r, i) => <RestaurantCard key={r.id} restaurant={r} branches={branches} index={i} />)}
            </div>
          ) : (
            <div className="text-center py-14">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-foreground font-semibold">{t("No results found", "لا توجد نتائج")}</p>
              <button onClick={() => setSearch("")} className="mt-3 text-primary text-sm font-medium">{t("Clear search", "مسح البحث")}</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
