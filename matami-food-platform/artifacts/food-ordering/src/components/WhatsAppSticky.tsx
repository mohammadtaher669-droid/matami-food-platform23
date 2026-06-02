import { motion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { branchStore } from "@/lib/store";
import { getEffectiveBranchWhatsApp, formatWhatsAppNumber } from "@/lib/whatsappSettings";

interface WhatsAppStickyProps {
  branchId?: string;
}

export default function WhatsAppSticky({ branchId }: WhatsAppStickyProps) {
  const { t } = useLanguage();

  if (!branchId) return null;

  const branch = branchStore.getAll().find((b) => b.id === branchId);
  const effectiveNumber = getEffectiveBranchWhatsApp(branchId, branch?.whatsapp || "");

  if (!effectiveNumber) return null;

  const handleClick = () => {
    const cleaned = formatWhatsAppNumber(effectiveNumber);
    const msg = encodeURIComponent(t("Hi! I'd like to place an order", "مرحبا! أريد تقديم طلب"));
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.5, type: "spring" }}
      onClick={handleClick}
      className="fixed right-4 z-40 flex items-center gap-2 bg-[#25D366] text-white rounded-full px-4 py-3 shadow-lg shadow-[#25D366]/30 hover:bg-[#20BD5C] transition-colors"
      data-testid="btn-whatsapp-sticky"
      style={{ bottom: "96px" }}
    >
      <MessageCircle size={20} fill="white" />
      <span className="text-sm font-bold hidden sm:block">{t("Order via WhatsApp", "اطلب عبر واتساب")}</span>
    </motion.button>
  );
}
