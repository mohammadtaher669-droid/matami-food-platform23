import { Link, useLocation } from "wouter";
import { Home, ShoppingCart, Heart, User, Tag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { useCallback } from "react";
import { settingsStore, NAV_ITEM_META } from "@/lib/store";
import { useStore } from "@/hooks/useStore";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>> = {
  home:      Home,
  cart:      ShoppingCart,
  offers:    Tag,
  favorites: Heart,
  profile:   User,
};

export default function BottomNav() {
  const [location] = useLocation();
  const { cartCount } = useCart();
  const { t } = useLanguage();
  const settings = useStore(useCallback(() => settingsStore.get(), []));

  // Build ordered, filtered nav items from config
  const effectiveTabs = [...NAV_ITEM_META]
    .map((meta) => {
      const saved = settings.nav_items_config?.find((c) => c.id === meta.id);
      return {
        ...meta,
        sort_order: saved?.sort_order ?? NAV_ITEM_META.findIndex((m) => m.id === meta.id),
        hidden: meta.essential ? false : (saved?.hidden ?? false),
      };
    })
    .filter((item) => !item.hidden)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((item) => ({
      id: item.id,
      href: item.href,
      icon: ICON_MAP[item.id] ?? Home,
      label: t(item.label_en, item.label_ar),
      count: item.id === "cart" ? cartCount : undefined,
    }));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none print:hidden">
      <div className="mx-auto max-w-lg px-4 pb-4 pt-1 pointer-events-auto">
        <div
          className="flex items-center justify-around rounded-2xl px-1 py-2 shadow-2xl"
          style={{
            background: "rgba(22,22,22,0.96)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "0 -2px 40px rgba(0,0,0,0.5), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          {effectiveTabs.map((tab) => {
            const isCart = tab.id === "cart";
            const isActive = location === tab.href || (tab.href !== "/" && location.startsWith(tab.href));
            const Icon = tab.icon;

            return (
              <Link key={tab.href} href={tab.href}>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  className="relative flex flex-col items-center gap-0.5 px-5 py-2 rounded-xl"
                  data-testid={`bottom-nav-${tab.href.replace("/", "") || "home"}`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="bnActive"
                      className="absolute inset-0 rounded-xl"
                      style={{ background: "rgba(255,122,0,0.12)" }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 1.8}
                      className={`transition-colors duration-200 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                    />
                    <AnimatePresence>
                      {isCart && tab.count != null && tab.count > 0 && (
                        <motion.span
                          key="badge"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-black min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center"
                        >
                          {tab.count}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className={`text-[10px] font-medium transition-colors duration-200 relative ${isActive ? "text-primary" : "text-muted-foreground/60"}`}>
                    {tab.label}
                  </span>
                </motion.button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
