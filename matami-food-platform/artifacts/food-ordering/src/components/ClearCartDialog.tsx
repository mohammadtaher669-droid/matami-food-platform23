import { useCart } from "@/contexts/CartContext";
import { useLanguage } from "@/contexts/LanguageContext";

export default function ClearCartDialog() {
  const { pendingAdd, confirmClearAndAdd, cancelPendingAdd } = useCart();
  const { t } = useLanguage();

  if (!pendingAdd) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 max-w-sm w-full">
        <h3 className="text-lg font-bold text-foreground mb-2">
          {t("Clear your cart?", "هل تريد مسح سلتك؟")}
        </h3>
        <p className="text-sm text-muted-foreground mb-6">
          {t(
            "Your cart has items from a different restaurant/branch. Starting a new order will clear your current cart.",
            "سلتك تحتوي على عناصر من مطعم أو فرع مختلف. سيؤدي بدء طلب جديد إلى مسح سلتك الحالية."
          )}
        </p>
        <div className="flex gap-3">
          <button
            onClick={cancelPendingAdd}
            className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-medium text-muted-foreground hover:text-foreground transition"
            style={{ touchAction: "manipulation" }}
            data-testid="btn-cancel-clear"
          >
            {t("Keep Cart", "الاحتفاظ بالسلة")}
          </button>
          <button
            onClick={confirmClearAndAdd}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            style={{ touchAction: "manipulation" }}
            data-testid="btn-confirm-clear"
          >
            {t("Start New Order", "بدء طلب جديد")}
          </button>
        </div>
      </div>
    </div>
  );
}
