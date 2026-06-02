import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Offer } from "@/lib/store";

interface HeroBannerSliderProps {
  offers: Offer[];
  restaurantId?: string;
}

export default function HeroBannerSlider({ offers, restaurantId }: HeroBannerSliderProps) {
  const { t, isRTL } = useLanguage();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const banners = offers.filter(
    (o) => o.show_as_banner && o.active && o.image &&
    (restaurantId ? (o.restaurant_id === restaurantId || o.restaurant_id === "global") : true)
  );

  const next = useCallback(() => setCurrent((c) => (c + 1) % banners.length), [banners.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + banners.length) % banners.length), [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || paused) return;
    const t = setInterval(next, 4000);
    return () => clearInterval(t);
  }, [banners.length, paused, next]);

  useEffect(() => { setCurrent(0); }, [banners.length]);

  if (banners.length === 0) return null;

  const banner = banners[current];
  const href = banner.restaurant_id !== "global"
    ? `/restaurant/${banner.restaurant_id}`
    : "/";

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ height: "220px" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      data-testid="hero-banner-slider"
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current}
          initial={{ opacity: 0, x: isRTL ? -40 : 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 40 : -40 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <img
            src={banner.image}
            alt={t(banner.title_en, banner.title_ar)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 p-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {banner.value > 0 && (
                <span className="inline-block text-[10px] font-bold text-white bg-primary rounded-full px-2 py-0.5 mb-1.5">
                  {banner.type === "percentage" ? `${banner.value}% OFF` : banner.type === "fixed" ? `-${banner.value} SAR` : "FREE DELIVERY"}
                </span>
              )}
              <h3 className="text-white font-bold text-lg leading-tight line-clamp-1">
                {t(banner.title_en, banner.title_ar)}
              </h3>
              {(banner.description_en || banner.description_ar) && (
                <p className="text-white/70 text-xs mt-0.5 line-clamp-1">
                  {t(banner.description_en, banner.description_ar)}
                </p>
              )}
              <Link href={href}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="mt-2 px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-full shadow-lg shadow-primary/30"
                >
                  {t(banner.banner_cta_en || "Order Now", banner.banner_cta_ar || "اطلب الآن")}
                </motion.button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition z-10"
            aria-label="Previous"
          >
            <ChevronLeft size={16} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition z-10"
            aria-label="Next"
          >
            <ChevronRight size={16} className="text-white" />
          </button>

          <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`rounded-full transition-all duration-300 ${i === current ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
