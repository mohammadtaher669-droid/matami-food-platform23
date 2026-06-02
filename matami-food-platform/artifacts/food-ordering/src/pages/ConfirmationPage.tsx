import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCart } from "@/contexts/CartContext";
import type { CartItem } from "@/contexts/CartContext";
import { CheckCircle, MessageCircle, Home, RotateCcw } from "lucide-react";

export default function ConfirmationPage() {
  const { t } = useLanguage();
  const { replaceCart } = useCart();
  const [, setLocation] = useLocation();

  const orderId = localStorage.getItem("last_order_id") || "ORD-UNKNOWN";
  const finalTotal = localStorage.getItem("last_order_total") || "0";
  const whatsappUrl = localStorage.getItem("last_order_whatsapp") || "";
  const restaurant = (() => { try { return JSON.parse(localStorage.getItem("last_order_restaurant") || "{}"); } catch { return {}; } })();
  const branch = (() => { try { return JSON.parse(localStorage.getItem("last_order_branch") || "{}"); } catch { return {}; } })();

  const lastOrderItems: CartItem[] = (() => {
    try {
      return JSON.parse(localStorage.getItem("last_order_items") || "[]");
    } catch {
      return [];
    }
  })();

  const handleReorder = () => {
    if (lastOrderItems.length === 0) return;
    replaceCart(lastOrderItems);
    setLocation("/cart");
  };

  return (
    <div className="min-h-screen bg-background pt-16 pb-28 flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full text-center"
      >
        <div className="bg-card border border-white/5 rounded-3xl p-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={40} className="text-green-400" />
          </motion.div>

          <h1 className="text-2xl font-bold text-foreground mb-2">{t("Order Placed!", "تم الطلب!")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("Your order has been sent to the restaurant via WhatsApp.", "تم إرسال طلبك إلى المطعم عبر واتساب.")}
          </p>

          <div className="bg-background rounded-2xl p-4 mb-6 text-left rtl:text-right">
            <p className="text-xs text-muted-foreground mb-1">{t("Order ID", "رقم الطلب")}</p>
            <p className="text-lg font-bold text-primary mb-3" data-testid="order-id">{orderId}</p>
            {(restaurant.name_en || restaurant.name_ar) && (
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Restaurant", "المطعم")}</span>
                  <span className="text-foreground font-medium">{t(restaurant.name_en, restaurant.name_ar)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Branch", "الفرع")}</span>
                  <span className="text-foreground font-medium">{t(branch.name_en, branch.name_ar)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("Total Paid", "الإجمالي")}</span>
                  <span className="text-primary font-bold">{finalTotal} ﷼</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            {whatsappUrl && (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <button className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition" data-testid="btn-open-whatsapp">
                  <MessageCircle size={18} />
                  {t("Open WhatsApp", "فتح واتساب")}
                </button>
              </a>
            )}

            {lastOrderItems.length > 0 && (
              <button
                onClick={handleReorder}
                className="w-full py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xl font-medium flex items-center justify-center gap-2 transition"
                data-testid="btn-reorder"
              >
                <RotateCcw size={16} />
                {t("Reorder Same Items", "إعادة نفس الطلب")}
              </button>
            )}

            <Link href="/">
              <button className="w-full py-3 border border-white/10 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition flex items-center justify-center gap-2" data-testid="btn-back-home">
                <Home size={16} />
                {t("Back to Home", "العودة للرئيسية")}
              </button>
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
