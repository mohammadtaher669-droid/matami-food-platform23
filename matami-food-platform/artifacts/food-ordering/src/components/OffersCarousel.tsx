import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tag, ChevronLeft, ChevronRight, Percent, Truck, Banknote } from "lucide-react";
import type { Offer } from "@/lib/store";

function OfferIcon({ type }: { type: Offer["type"] }) {
  if (type === "percentage") return <Percent size={18} className="text-primary" />;
  if (type === "free_delivery") return <Truck size={18} className="text-primary" />;
  return <Banknote size={18} className="text-primary" />;
}

export default function OffersCarousel({ offers }: { offers: Offer[] }) {
  const { t, isRTL } = useLanguage();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (offers.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % offers.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [offers.length]);

  if (offers.length === 0) return null;

  const offer = offers[current];

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} className="text-primary" />
        <span className="text-sm font-semibold text-primary">{t("🔥 Offers & Discounts", "🔥 العروض والخصومات")}</span>
      </div>

      <div className="relative overflow-hidden rounded-2xl bg-primary/10 border border-primary/20">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.3 }}
            className="px-5 py-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <OfferIcon type={offer.type} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{t(offer.title_en, offer.title_ar)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(offer.description_en, offer.description_ar)}</p>
              {offer.code && (
                <div className="mt-1.5 inline-flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">{t("Code:", "الكود:")}</span>
                  <code className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg font-mono">{offer.code}</code>
                </div>
              )}
            </div>
            {offer.type === "percentage" && offer.value > 0 && (
              <div className="flex-shrink-0 text-2xl font-black text-primary">{offer.value}%</div>
            )}
          </motion.div>
        </AnimatePresence>

        {offers.length > 1 && (
          <>
            <button
              onClick={() => setCurrent((c) => (c - 1 + offers.length) % offers.length)}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition"
            >
              <ChevronLeft size={14} className="text-white" />
            </button>
            <button
              onClick={() => setCurrent((c) => (c + 1) % offers.length)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/30 flex items-center justify-center hover:bg-black/50 transition"
            >
              <ChevronRight size={14} className="text-white" />
            </button>
            <div className="flex justify-center gap-1.5 pb-3">
              {offers.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`h-1.5 rounded-full transition-all ${i === current ? "w-5 bg-primary" : "w-1.5 bg-white/20"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
