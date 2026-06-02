import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Timer, Percent, Truck, Minus, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore } from "@/lib/store";
import type { Offer, Restaurant } from "@/lib/store";
import { useStore } from "@/hooks/useStore";

function useCountdown(expiryDate?: string) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!expiryDate) return;
    const compute = () => {
      const expiryMs = new Date(expiryDate).getTime();
      const diff = isNaN(expiryMs) ? -1 : expiryMs - Date.now();
      if (diff <= 0) { setLabel("expired"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (d > 0) setLabel(`${d}d ${h}h`);
      else if (h > 0) setLabel(`${h}h ${m}m`);
      else setLabel(`${m}m`);
    };
    compute();
    const id = setInterval(compute, 30000);
    return () => clearInterval(id);
  }, [expiryDate]);
  return label;
}

function OfferCard({
  offer, restaurant, index,
}: {
  offer: Offer;
  restaurant: Restaurant | undefined;
  index: number;
}) {
  const { t } = useLanguage();
  const countdown = useCountdown(offer.expiry_date);
  const imgSrc = offer.image_url || offer.image;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const badgeBg =
    offer.type === "percentage" ? "#FF7A00"
    : offer.type === "fixed" ? "#8b5cf6"
    : "#22c55e";

  const badgeLabel =
    offer.type === "percentage" ? `${offer.value}% OFF`
    : offer.type === "fixed" ? `-${offer.value} ﷼`
    : t("Free Delivery", "توصيل مجاني");

  const BadgeIcon =
    offer.type === "percentage" ? Percent
    : offer.type === "fixed" ? Minus
    : Truck;

  const href = restaurant ? `/restaurant/${restaurant.id}` : "/offers";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="group flex flex-col rounded-2xl overflow-hidden"
      style={{
        background: "#1A1A1A",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "0 2px 16px rgba(0,0,0,0.3)",
      }}
      data-testid={`offer-card-${offer.id}`}
    >
      <Link href={href} className="flex flex-col flex-1">
        {/* Image area */}
        <div className="relative overflow-hidden flex-shrink-0" style={{ height: 160 }}>
          {imgSrc && !imgError ? (
            <>
              {!imgLoaded && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/4 via-white/8 to-white/4 animate-pulse" />
              )}
              <img
                src={imgSrc}
                alt={t(offer.title_en, offer.title_ar)}
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
              />
            </>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-5xl"
              style={{ background: `${badgeBg}12` }}
            >
              {offer.type === "percentage" ? "🎁" : offer.type === "free_delivery" ? "🛵" : "💰"}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Discount badge */}
          <div
            className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-lg shadow-black/30"
            style={{ background: badgeBg }}
          >
            <BadgeIcon size={10} />
            {badgeLabel}
          </div>

          {/* Countdown */}
          {countdown && countdown !== "expired" && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold text-white bg-black/65 backdrop-blur-sm">
              <Timer size={9} />
              {countdown}
            </div>
          )}

          {/* Expired overlay */}
          {countdown === "expired" && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white/70 text-xs font-bold bg-black/50 px-3 py-1.5 rounded-full">
                {t("Expired", "منتهي")}
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3.5 flex flex-col flex-1">
          {/* Restaurant row */}
          {restaurant && (
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="w-5 h-5 rounded-md overflow-hidden flex-shrink-0 flex items-center justify-center text-xs"
                style={{ background: `${restaurant.color}20`, border: `1px solid ${restaurant.color}30` }}
              >
                {restaurant.logoType === "image" && restaurant.logo
                  ? <img src={restaurant.logo} alt="" className="w-full h-full object-cover" />
                  : <span style={{ fontSize: 10 }}>{restaurant.logo || "🍽"}</span>}
              </div>
              <span className="text-[10px] text-muted-foreground truncate" style={{ color: restaurant.color }}>
                {t(restaurant.name_en, restaurant.name_ar)}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 mb-1.5">
            {t(offer.title_en, offer.title_ar)}
          </h3>

          {/* Description */}
          {(offer.description_en || offer.description_ar) && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2.5 leading-relaxed">
              {t(offer.description_en, offer.description_ar)}
            </p>
          )}

          {/* Promo code */}
          {offer.code && (
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-[10px] text-muted-foreground">{t("Code:", "الكود:")}</span>
              <code className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md font-mono tracking-wide">
                {offer.code}
              </code>
            </div>
          )}

          {/* CTA */}
          <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-white/5">
            <span
              className="text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all"
              style={{ color: restaurant?.color ?? "#FF7A00" }}
            >
              {t("Order Now", "اطلب الآن")}
              <ArrowRight size={12} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function OfferCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden animate-pulse" style={{ background: "#1A1A1A", border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ height: 160, background: "rgba(255,255,255,0.04)" }} />
      <div className="p-3.5 space-y-2.5">
        <div className="h-2 w-20 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-3 w-full rounded-full" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="h-3 w-3/4 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
        <div className="h-2.5 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }} />
      </div>
    </div>
  );
}

export default function OffersGrid({ offers }: { offers: Offer[] }) {
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));

  if (offers.length === 0) return null;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}
    >
      {offers.map((offer, i) => {
        const restaurant = offer.restaurant_id !== "global"
          ? restaurants.find((r) => r.id === offer.restaurant_id)
          : undefined;
        return (
          <OfferCard key={offer.id} offer={offer} restaurant={restaurant} index={i} />
        );
      })}
    </div>
  );
}
