import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { getGlobalWhatsApp, formatWhatsAppNumber } from "@/lib/whatsappSettings";

export default function GlobalWhatsAppButton() {
  const { t } = useLanguage();
  const [number, setNumber] = useState(getGlobalWhatsApp());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => setNumber(getGlobalWhatsApp());
    window.addEventListener("whatsapp-settings-updated", handler);
    return () => window.removeEventListener("whatsapp-settings-updated", handler);
  }, []);

  if (!number || dismissed) return null;

  const handleClick = () => {
    const cleaned = formatWhatsAppNumber(number);
    const msg = encodeURIComponent(t("Hello! I need support.", "مرحباً! أحتاج إلى المساعدة."));
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 200 }}
        className="fixed left-4 z-40 flex items-center gap-0 print:hidden"
        style={{ bottom: "96px" }}
      >
        <motion.button
          whileTap={{ scale: 0.93 }}
          onClick={handleClick}
          className="flex items-center gap-2 rounded-full pl-3 pr-4 py-2.5 text-white font-semibold text-xs shadow-lg"
          style={{
            background: "#25D366",
            boxShadow: "0 4px 20px rgba(37,211,102,0.35)",
          }}
          data-testid="btn-global-whatsapp"
        >
          <MessageCircle size={18} fill="white" />
          <span className="hidden sm:block">{t("Contact Us", "تواصل معنا")}</span>
        </motion.button>
        <button
          onClick={() => setDismissed(true)}
          className="w-5 h-5 rounded-full bg-black/40 text-white flex items-center justify-center -ml-1 hover:bg-black/60 transition"
          aria-label="dismiss"
        >
          <X size={10} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
