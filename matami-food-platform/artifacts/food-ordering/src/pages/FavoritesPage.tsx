import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FavoritesPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-[#0F0F0F] pt-20 pb-28 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center px-6"
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
          <Heart size={32} className="text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{t("No Favorites Yet", "لا مفضلات بعد")}</h2>
        <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
          {t("Save your favorite items and restaurants here for quick access.", "احفظ عناصرك ومطاعمك المفضلة هنا للوصول السريع.")}
        </p>
        <Link href="/">
          <button className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition">
            {t("Explore Restaurants", "استكشف المطاعم")}
          </button>
        </Link>
      </motion.div>
    </div>
  );
}
