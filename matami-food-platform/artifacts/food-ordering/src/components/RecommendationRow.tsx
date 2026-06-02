import { useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Plus, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { menuStore, restaurantStore, userBehaviorStore } from "@/lib/store";
import type { MenuItem } from "@/lib/store";

interface RecommendationRowProps {
  title_en?: string;
  title_ar?: string;
  restaurantId?: string;
  excludeIds?: string[];
  limit?: number;
  onAddToCart?: (item: MenuItem) => void;
}

export default function RecommendationRow({
  title_en,
  title_ar,
  restaurantId,
  excludeIds,
  limit = 8,
  onAddToCart,
}: RecommendationRowProps) {
  const { t } = useLanguage();
  const allItems = useMemo(() => {
    const items = restaurantId
      ? menuStore.getByRestaurant(restaurantId).filter((m) => m.is_available)
      : menuStore.getAll().filter((m) => m.is_available);
    return items;
  }, [restaurantId]);

  const restaurants = useMemo(() => restaurantStore.getAll(), []);

  const recommended = useMemo(
    () => userBehaviorStore.getRecommendations(allItems, excludeIds, limit),
    [allItems, excludeIds, limit]
  );

  const behavior = userBehaviorStore.get();
  const hasHistory = behavior.ordered_items.length > 0 || behavior.viewed_items.length > 0;

  if (recommended.length === 0) return null;

  const displayTitle = title_en || (hasHistory ? "💡 Recommended for You" : "🔥 Most Popular");
  const displayTitleAr = title_ar || (hasHistory ? "💡 موصى به لك" : "🔥 الأكثر طلباً");

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 px-4">
        <Sparkles size={15} className="text-primary" />
        <h2 className="text-sm font-bold text-foreground">{t(displayTitle, displayTitleAr)}</h2>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar" style={{ direction: "ltr" }}>
        {recommended.map((item) => {
          const rest = restaurants.find((r) => r.id === item.restaurant_id);
          return (
            <motion.div
              key={item.id}
              whileHover={{ y: -3 }}
              className="flex-shrink-0 w-36 rounded-2xl overflow-hidden bg-card border border-white/5"
              data-testid={`rec-card-${item.id}`}
            >
              <Link href={`/restaurant/${item.restaurant_id}`}>
                <div
                  className="relative h-24 overflow-hidden"
                  style={{ background: `${rest?.color || "#FF7A00"}15` }}
                >
                  {(item.image_url || item.image) ? (
                    <img src={item.image_url || item.image} alt={item.name_en} className="w-full h-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              </Link>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-foreground line-clamp-1 mb-1">{t(item.name_en, item.name_ar)}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold" style={{ color: rest?.color || "#FF7A00" }}>
                    {item.price} ﷼
                  </span>
                  {onAddToCart && (
                    <button
                      onClick={() => onAddToCart(item)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center bg-primary text-white hover:opacity-90 transition"
                      data-testid={`btn-rec-add-${item.id}`}
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
