import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FloatingCart() {
  const { cartCount, cartTotal } = useCart();
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {cartCount > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto"
          data-testid="floating-cart"
        >
          <Link href="/cart">
            <div className="bg-primary text-primary-foreground rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-lg shadow-primary/30 cursor-pointer hover:bg-primary/90 transition-colors">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ShoppingCart size={20} />
                  <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                </div>
                <span className="font-semibold text-sm">{t("View Cart", "عرض السلة")}</span>
              </div>
              <span className="font-black text-base">{cartTotal.toFixed(0)} ﷼</span>
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
