import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { Clock, Tag, Flame, ChevronRight, Timer } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { offerStore, restaurantStore, bannerStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import type { Offer } from "@/lib/store";
import ImageWithFallback from "@/components/ImageWithFallback";

function CountdownTimer({ expiry }: { expiry: string }) {
  const [timeLeft, setTimeLeft] = useState<{ h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    const calc = () => {
      const expiryTime = expiry ? new Date(expiry).getTime() : NaN;
      const diff = isNaN(expiryTime) ? -1 : expiryTime - Date.now();
      if (diff <= 0) { setTimeLeft(null); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimeLeft({ h, m, s });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [expiry]);

  if (!timeLeft) return <span className="text-xs text-destructive font-medium">Expired</span>;

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1 text-orange-400">
      <Timer size={11} className="flex-shrink-0" />
      <span className="font-mono text-xs font-bold">
        {pad(timeLeft.h)}:{pad(timeLeft.m)}:{pad(timeLeft.s)}
      </span>
    </div>
  );
}

function OfferCard({ offer, restaurantColor }: { offer: Offer; restaurantColor: string }) {
  const { t } = useLanguage();
  const expiryMs = offer.expiry_date ? new Date(offer.expiry_date).getTime() : NaN;
  const isExpiringSoon = !isNaN(expiryMs) && (expiryMs - Date.now()) < 3 * 3_600_000;

  return (
    <motion.div
      layout
      whileHover={{ y: -3 }}
      className="bg-card border border-white/5 rounded-2xl overflow-hidden"
      data-testid={`offer-card-${offer.id}`}
    >
      {offer.image ? (
        <div className="relative h-44 overflow-hidden">
          <ImageWithFallback src={offer.image} alt={t(offer.title_en, offer.title_ar)} className="w-full h-full object-cover" preset="offer" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <div className="absolute top-3 right-3">
            {offer.value > 0 && (
              <span
                className="text-xs font-black text-white px-3 py-1.5 rounded-full shadow-lg"
                style={{ background: restaurantColor }}
              >
                {offer.type === "percentage" ? `${offer.value}% OFF` : offer.type === "fixed" ? `-${offer.value} SAR` : "FREE DELIVERY"}
              </span>
            )}
          </div>
          {isExpiringSoon && offer.expiry_date && (
            <div className="absolute bottom-3 left-3">
              <div className="bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
                <CountdownTimer expiry={offer.expiry_date} />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="relative h-24 flex items-center justify-center"
          style={{ background: `${restaurantColor}15` }}
        >
          <Tag size={32} style={{ color: restaurantColor }} className="opacity-30" />
          {offer.value > 0 && (
            <div className="absolute top-3 right-3">
              <span
                className="text-xs font-black text-white px-3 py-1.5 rounded-full"
                style={{ background: restaurantColor }}
              >
                {offer.type === "percentage" ? `${offer.value}% OFF` : offer.type === "fixed" ? `-${offer.value} SAR` : "FREE DELIVERY"}
              </span>
            </div>
          )}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-foreground text-sm leading-tight mb-1">{t(offer.title_en, offer.title_ar)}</h3>
        {(offer.description_en || offer.description_ar) && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{t(offer.description_en, offer.description_ar)}</p>
        )}
        <div className="flex items-center justify-between">
          {offer.expiry_date ? (
            <CountdownTimer expiry={offer.expiry_date} />
          ) : (
            <span className="text-xs text-muted-foreground">{t("Limited time offer", "عرض لوقت محدود")}</span>
          )}
          {offer.code && (
            <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-lg border border-primary/20">
              {offer.code}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default function OffersPage() {
  const { t, isRTL } = useLanguage();
  const allOffers = useStore(useCallback(() => offerStore.getAll(), []));
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const heroBanners = useStore(useCallback(() => bannerStore.getActive("offer"), []));
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("all");

  const activeOffers = allOffers.filter((o) => {
    if (!o.active) return false;
    if (o.expiry_date) {
      const t = new Date(o.expiry_date).getTime();
      if (!isNaN(t) && t < Date.now()) return false;
    }
    return true;
  });

  const limitedOffers = activeOffers.filter((o) => o.expiry_date);
  const featuredOffers = activeOffers.filter((o) => o.image).slice(0, 6);

  const filteredOffers = selectedRestaurant === "all"
    ? activeOffers
    : activeOffers.filter((o) => o.restaurant_id === selectedRestaurant || o.restaurant_id === "global");

  const byRestaurant: Record<string, Offer[]> = {};
  for (const o of filteredOffers) {
    const key = o.restaurant_id === "global" ? "global" : o.restaurant_id;
    if (!byRestaurant[key]) byRestaurant[key] = [];
    byRestaurant[key].push(o);
  }

  const heroSettings = heroBanners[0];

  return (
    <div
      className="min-h-screen pb-28 bg-background"
      style={{ direction: isRTL ? "rtl" : "ltr" }}
    >
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
        {heroSettings?.video_url ? (
          <video src={heroSettings.video_url} className="absolute inset-0 w-full h-full object-cover" autoPlay muted loop playsInline />
        ) : (heroSettings?.image_url || heroSettings?.image) ? (
          <img src={heroSettings.image_url || heroSettings.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-background" />
        <div className="relative pt-24 pb-10 px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl font-black text-white mb-2">
              {heroSettings ? t(heroSettings.title_en, heroSettings.title_ar) : t("🔥 Best Offers Today", "🔥 أفضل العروض اليوم")}
            </h1>
            <p className="text-white/70 text-sm">
              {heroSettings ? t(heroSettings.subtitle_en || "", heroSettings.subtitle_ar || "") : t("Exclusive discounts for a limited time", "خصومات حصرية لفترة محدودة")}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-4 space-y-8">
        {/* Limited Time Offers */}
        {limitedOffers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Clock size={18} className="text-orange-400" />
              <h2 className="text-base font-bold text-foreground">{t("⏳ Limited Time", "⏳ عروض محدودة الوقت")}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {limitedOffers.map((offer) => {
                const rest = restaurants.find((r) => r.id === offer.restaurant_id);
                return (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    restaurantColor={rest?.color || "hsl(28 100% 50%)"}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Featured Offers (with images) */}
        {featuredOffers.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Flame size={18} className="text-primary" />
              <h2 className="text-base font-bold text-foreground">{t("🌟 Featured Offers", "🌟 العروض المميزة")}</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {featuredOffers.map((offer) => {
                const rest = restaurants.find((r) => r.id === offer.restaurant_id);
                return (
                  <OfferCard
                    key={offer.id}
                    offer={offer}
                    restaurantColor={rest?.color || "hsl(28 100% 50%)"}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Filter tabs */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Tag size={18} className="text-primary" />
            <h2 className="text-base font-bold text-foreground">{t("🏪 All Offers", "🏪 جميع العروض")}</h2>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4" style={{ direction: "ltr" }}>
            <button
              onClick={() => setSelectedRestaurant("all")}
              className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition ${selectedRestaurant === "all" ? "bg-primary text-white border-primary" : "border-white/10 text-muted-foreground"}`}
            >
              {t("All", "الكل")}
            </button>
            {restaurants.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRestaurant(r.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-medium border transition ${selectedRestaurant === r.id ? "text-white border-transparent" : "border-white/10 text-muted-foreground"}`}
                style={selectedRestaurant === r.id ? { background: r.color, borderColor: r.color } : {}}
              >
                {t(r.name_en, r.name_ar)}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedRestaurant}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {Object.entries(byRestaurant).map(([restId, offers]) => {
                const rest = restaurants.find((r) => r.id === restId);
                return (
                  <div key={restId}>
                    {restId !== "global" && rest && (
                      <Link href={`/restaurant/${rest.id}`}>
                        <div className="flex items-center gap-2 mb-3 cursor-pointer group">
                          <div
                            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                            style={{ background: `${rest.color}20` }}
                          >
                            {rest.logoType === "image" && rest.logo
                              ? <img src={rest.logo} className="w-6 h-6 object-cover rounded" />
                              : rest.logo || "🍽️"}
                          </div>
                          <span className="text-sm font-semibold text-foreground group-hover:text-primary transition">
                            {t(rest.name_en, rest.name_ar)}
                          </span>
                          <ChevronRight size={14} className="text-muted-foreground" />
                        </div>
                      </Link>
                    )}
                    {restId === "global" && (
                      <p className="text-xs text-muted-foreground mb-3">{t("Global Offers", "عروض عامة")}</p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {offers.map((offer) => (
                        <OfferCard
                          key={offer.id}
                          offer={offer}
                          restaurantColor={rest?.color || "hsl(28 100% 50%)"}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
              {Object.keys(byRestaurant).length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Tag size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t("No active offers at the moment", "لا توجد عروض نشطة في الوقت الحالي")}</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
