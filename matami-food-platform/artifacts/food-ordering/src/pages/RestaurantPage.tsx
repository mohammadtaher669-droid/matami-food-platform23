import { useParams, Link } from "wouter";
import { useCallback } from "react";
import { motion } from "framer-motion";
import { restaurantStore, branchStore, menuStore, offerStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useLanguage } from "@/contexts/LanguageContext";
import WorkingHoursStatus, { isBranchOpen } from "@/components/WorkingHoursStatus";
import { ChevronRight, ChevronLeft, MapPin, Star, Sparkles, ArrowLeft, ArrowRight } from "lucide-react";
import ImageWithFallback from "@/components/ImageWithFallback";
import HeroBannerSlider from "@/components/HeroBannerSlider";

export default function RestaurantPage() {
  const params = useParams<{ restaurantId: string }>();
  const { t, isRTL } = useLanguage();
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  const ArrowIcon = isRTL ? ArrowRight : ArrowLeft;

  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const allBranches = useStore(useCallback(() => branchStore.getAll(), []));

  const restaurant = restaurants.find((r) => r.id === params.restaurantId);

  const popularItems = useStore(useCallback(
    () => restaurant ? menuStore.getPopular(restaurant.id) : [],
    [restaurant?.id]
  ));
  const newItems = useStore(useCallback(
    () => restaurant ? menuStore.getNew(restaurant.id) : [],
    [restaurant?.id]
  ));
  const restaurantOffers = useStore(useCallback(
    () => offerStore.getActive().filter(
      (o) => o.show_as_banner && o.image && (o.restaurant_id === params.restaurantId || o.restaurant_id === "global")
    ),
    [params.restaurantId]
  ));

  if (!restaurant) return (
    <div className="pt-16 text-center text-muted-foreground">
      {t("Restaurant not found", "المطعم غير موجود")}
    </div>
  );

  const branches = allBranches.filter((b) => b.restaurant_id === restaurant.id);

  return (
    <div className="min-h-screen bg-[#0F0F0F]">
      {/* Hero Cover */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {restaurant.cover_image ? (
          <img
            src={restaurant.cover_image}
            alt={restaurant.name_en}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${restaurant.color}30 0%, ${restaurant.color}10 40%, #0F0F0F 100%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(circle at 25% 50%, ${restaurant.color} 1px, transparent 1px)`,
                backgroundSize: "32px 32px",
              }}
            />
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-[#0F0F0F]/40 to-transparent" />
        {/* Color stripe */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: restaurant.color }} />

        {/* Back button */}
        <div className="absolute top-16 left-4">
          <Link href="/">
            <button className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 text-sm text-foreground hover:bg-black/60 transition">
              <ArrowIcon size={14} />
              {t("Back", "رجوع")}
            </button>
          </Link>
        </div>

        {/* Restaurant Identity */}
        <div className="absolute bottom-6 left-0 right-0 px-4 max-w-5xl mx-auto">
          <div className="flex items-end gap-4">
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl border-2 flex-shrink-0 overflow-hidden flex items-center justify-center shadow-xl"
              style={{ borderColor: `${restaurant.color}60`, background: `${restaurant.color}20` }}
            >
              {restaurant.logoType === "image" && restaurant.logo
                ? <ImageWithFallback src={restaurant.logo} alt={restaurant.name_en} className="w-full h-full object-cover" preset="thumbnail" />
                : <span className="text-3xl">{restaurant.logo}</span>
              }
            </div>
            <div className="pb-1">
              <h1 className="text-2xl md:text-3xl font-black text-foreground drop-shadow-lg">
                {t(restaurant.name_en, restaurant.name_ar)}
              </h1>
              <p className="text-sm text-white/70 mt-0.5">
                {t(restaurant.tagline_en || restaurant.description_en, restaurant.tagline_ar || restaurant.description_ar)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Restaurant Banner Slider */}
      {restaurantOffers.length > 0 && (
        <div className="max-w-5xl mx-auto px-4 pt-5">
          <HeroBannerSlider offers={restaurantOffers} restaurantId={params.restaurantId} />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 pt-8 pb-28">
        {/* New Items */}
        {newItems.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-yellow-400" />
              <h2 className="text-lg font-bold text-foreground">{t("New Items", "جديدنا")}</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {newItems.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 rounded-xl border border-yellow-400/15 overflow-hidden w-44"
                  style={{ background: "#1A1A1A" }}
                >
                  <ImageWithFallback src={item.image_url || item.image} alt={t(item.name_en, item.name_ar)} className="w-full h-24 object-cover" preset="product" />
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] bg-yellow-400/15 text-yellow-400 px-1.5 py-0.5 rounded-full font-medium">{t("New", "جديد")}</span>
                    </div>
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{t(item.name_en, item.name_ar)}</p>
                    <p className="text-xs font-bold mt-1.5" style={{ color: restaurant.color }}>{item.price} ﷼</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Most Ordered */}
        {popularItems.length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <Star size={16} className="text-primary fill-primary" />
              <h2 className="text-lg font-bold text-foreground">{t("Most Ordered", "الأكثر طلباً")}</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {popularItems.map((item) => (
                <div
                  key={item.id}
                  className="flex-shrink-0 rounded-xl border border-white/5 overflow-hidden w-44"
                  style={{ background: "#1A1A1A" }}
                  data-testid={`card-popular-${item.id}`}
                >
                  {(item.image_url || item.image) ? (
                    <img src={item.image_url || item.image} alt="" className="w-full h-24 object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-24 flex items-center justify-center text-3xl" style={{ background: `${restaurant.color}10` }}>🍽️</div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-foreground line-clamp-2 leading-snug">{t(item.name_en, item.name_ar)}</p>
                    <p className="text-xs font-bold mt-1.5" style={{ color: restaurant.color }}>{item.price} ﷼</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Branches */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-bold text-foreground mb-4">{t("Select a Branch", "اختر الفرع")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {branches.map((branch, i) => {
              const isOpen = isBranchOpen(branch);
              return (
                <Link key={branch.id} href={`/restaurant/${restaurant.id}/branch/${branch.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className="rounded-2xl p-5 cursor-pointer group transition-all duration-300"
                    style={{
                      background: "#1A1A1A",
                      border: `1px solid ${isOpen ? `${restaurant.color}25` : "rgba(255,255,255,0.05)"}`,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${restaurant.color}20`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "none";
                    }}
                    data-testid={`card-branch-${branch.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-bold text-foreground">{t(branch.name_en, branch.name_ar)}</h3>
                      <WorkingHoursStatus branch={branch} />
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-4">
                      <MapPin size={13} />
                      <span>{t(branch.address_en, branch.address_ar)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">
                          {t("Delivery:", "التوصيل:")} <span className="text-foreground font-semibold">{branch.delivery_fee} ﷼</span>
                        </span>
                        {branch.delivery_time && branch.delivery_time > 0 && (
                          <span className="text-xs text-muted-foreground">
                            ⏱ <span className="text-foreground font-semibold">{branch.delivery_time} {t("min", "د")}</span>
                          </span>
                        )}
                      </div>
                      <div
                        className="flex items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2"
                        style={{ color: restaurant.color }}
                      >
                        <span>{t("Order Now", "اطلب الآن")}</span>
                        <ChevronIcon size={14} />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
