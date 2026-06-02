import { useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart2, TrendingUp, Eye, ShoppingCart, ShoppingBag, Percent, RefreshCw, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { analyticsStore, menuStore, restaurantStore, customerStore, orderStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";
import ImageWithFallback from "@/components/ImageWithFallback";
import { safeLocalDateTime } from "@/lib/dateUtils";

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function HourBar({ hour, count, max }: { hour: number; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  const label = hour === 0 ? "12am" : hour < 12 ? `${hour}am` : hour === 12 ? "12pm" : `${hour - 12}pm`;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[9px] text-muted-foreground font-mono">{count || ""}</span>
      <div className="w-6 bg-white/5 rounded-t" style={{ height: 48 }}>
        <div
          className="w-full rounded-t bg-primary transition-all duration-500"
          style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }}
        />
      </div>
      <span className="text-[8px] text-muted-foreground">{label}</span>
    </div>
  );
}

export default function AdminAnalytics() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const allItems = useStore(useCallback(() => menuStore.getAll(), []));
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const customers = useStore(useCallback(() => customerStore.getAll(), []));
  const orders = useStore(useCallback(() => orderStore.getAll(), []));

  const summary = analyticsStore.getSummary();

  const mostViewed = Object.entries(summary.itemViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id, count]) => ({ item: allItems.find((m) => m.id === id), count }))
    .filter((x) => x.item);

  const mostOrdered = Object.entries(summary.itemOrders)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([id, count]) => ({ item: allItems.find((m) => m.id === id), count }))
    .filter((x) => x.item);

  const topRestaurants = Object.entries(summary.restaurantViews)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ rest: restaurants.find((r) => r.id === id), count }))
    .filter((x) => x.rest);

  const maxHour = Math.max(...Object.values(summary.hourCounts), 1);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const handleClear = () => {
    analyticsStore.clear();
    toast({ title: t("Analytics cleared", "تم مسح التحليلات") });
  };

  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("📊 Analytics Dashboard", "📊 لوحة التحليلات")}</h1>
            <p className="text-sm text-muted-foreground">{t("Behavior tracking & business insights", "تتبع السلوك والرؤى التجارية")}</p>
          </div>
          <button onClick={handleClear} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition border border-white/10 px-3 py-1.5 rounded-lg">
            <RefreshCw size={12} /> {t("Clear data", "مسح البيانات")}
          </button>
        </div>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Eye} label={t("Page Visits", "زيارات الصفحة")} value={summary.pageVisits} color="#6366f1" />
        <StatCard icon={ShoppingCart} label={t("Add to Cart", "إضافة للسلة")} value={summary.addToCartCount} color="#f59e0b" />
        <StatCard icon={ShoppingBag} label={t("Total Orders", "إجمالي الطلبات")} value={orders.length} color="#10b981" />
        <StatCard icon={Users} label={t("Customers", "العملاء")} value={customers.length} color="#ec4899" />
        <StatCard icon={TrendingUp} label={t("Revenue (﷼)", "الإيرادات (﷼)")} value={totalRevenue.toFixed(0)} color="#FF7A00" />
        <StatCard icon={Percent} label={t("Conversion %", "معدل التحويل %")} value={`${summary.conversionRate}%`} color="#3b82f6" />
        <StatCard icon={BarChart2} label={t("Event Count", "عدد الأحداث")} value={analyticsStore.getAll().length} color="#8b5cf6" />
        <StatCard icon={Eye} label={t("Item Views", "مشاهدات المنتجات")} value={Object.values(summary.itemViews).reduce((a, b) => a + b, 0)} color="#06b6d4" />
      </div>

      {/* Peak hours */}
      <div className="bg-card border border-white/5 rounded-2xl p-5">
        <h2 className="text-sm font-bold text-foreground mb-4">{t("⏰ Peak Hours", "⏰ ساعات الذروة")}</h2>
        <div className="flex items-end gap-1 overflow-x-auto pb-1">
          {hours.map((h) => (
            <HourBar key={h} hour={h} count={summary.hourCounts[h] || 0} max={maxHour} />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Most Viewed */}
        <div className="bg-card border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">{t("👁 Most Viewed Items", "👁 أكثر المنتجات مشاهدة")}</h2>
          <div className="space-y-2">
            {mostViewed.length === 0 && <p className="text-xs text-muted-foreground">{t("No data yet", "لا توجد بيانات بعد")}</p>}
            {mostViewed.map(({ item, count }, i) => (
              <div key={item!.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}.</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm overflow-hidden"
                  style={{ background: "#1A1A1A" }}
                >
                  <ImageWithFallback src={item!.image} alt={item!.name_en} className="w-full h-full object-cover" preset="thumbnail" fallbackEmoji="🍽️" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{item!.name_en}</p>
                </div>
                <span className="text-xs font-bold text-primary">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Most Ordered */}
        <div className="bg-card border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">{t("🔥 Most Ordered", "🔥 الأكثر طلباً")}</h2>
          <div className="space-y-2">
            {mostOrdered.length === 0 && <p className="text-xs text-muted-foreground">{t("No data yet", "لا توجد بيانات بعد")}</p>}
            {mostOrdered.map(({ item, count }, i) => (
              <div key={item!.id} className="flex items-center gap-3">
                <span className="w-5 text-xs text-muted-foreground font-mono">{i + 1}.</span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm overflow-hidden"
                  style={{ background: "#1A1A1A" }}
                >
                  <ImageWithFallback src={item!.image} alt={item!.name_en} className="w-full h-full object-cover" preset="thumbnail" fallbackEmoji="🍽️" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{item!.name_en}</p>
                  <p className="text-xs text-muted-foreground">{item!.price} ﷼</p>
                </div>
                <span className="text-xs font-bold text-green-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Restaurants */}
      {topRestaurants.length > 0 && (
        <div className="bg-card border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">{t("🏆 Top Restaurants", "🏆 أفضل المطاعم")}</h2>
          <div className="space-y-3">
            {topRestaurants.map(({ rest, count }, i) => {
              const maxCount = topRestaurants[0].count;
              const pct = (count / maxCount) * 100;
              return (
                <div key={rest!.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{i + 1}. {rest!.name_en}</span>
                    <span className="text-muted-foreground">{count} visits</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: rest!.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {orders.length > 0 && (
        <div className="bg-card border border-white/5 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-foreground mb-4">{t("📋 Recent Orders", "📋 آخر الطلبات")}</h2>
          <div className="space-y-2">
            {orders.slice(-10).reverse().map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-background rounded-xl border border-white/5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary">{order.id}</span>
                    <span className="text-xs text-muted-foreground">{order.restaurant_name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{safeLocalDateTime((order as any).date ?? (order as any).created_at)}</p>
                </div>
                <span className="text-sm font-bold text-foreground">{order.total} ﷼</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
