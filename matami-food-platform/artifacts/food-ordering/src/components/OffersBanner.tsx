import { useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { offerStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { Tag } from "lucide-react";

export default function OffersBanner() {
  const { t } = useLanguage();
  const offers = useStore(useCallback(() => offerStore.getActive(), []));

  if (offers.length === 0) return null;

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-8 overflow-hidden relative">
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} className="text-primary" />
        <span className="text-sm font-semibold text-primary">{t("Special Offers", "العروض الخاصة")}</span>
      </div>
      <div className="flex flex-col gap-2">
        {offers.map((offer) => (
          <div key={offer.id} className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
            <span className="text-sm text-foreground/80">{t(offer.description_en || offer.title_en, offer.description_ar || offer.title_ar)}</span>
            {offer.code && <code className="text-xs text-primary font-bold font-mono bg-primary/10 px-1.5 rounded">{offer.code}</code>}
          </div>
        ))}
      </div>
    </div>
  );
}
