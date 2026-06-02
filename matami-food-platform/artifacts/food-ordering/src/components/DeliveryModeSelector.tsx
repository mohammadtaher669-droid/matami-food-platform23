import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Store, Navigation, MapPin, CheckCircle2, XCircle,
  Loader2, ExternalLink, Clock, Phone,
} from "lucide-react";
import type { Branch } from "@/lib/store";
import { branchStore } from "@/lib/store";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDeliveryMode } from "@/hooks/useDeliveryMode";
import type { DeliveryMode } from "@/hooks/useDeliveryMode";

export default function DeliveryModeSelector({
  branch,
  restaurantColor,
  restaurantId,
  onModeChange,
}: {
  branch: Branch;
  restaurantColor: string;
  restaurantId: string;
  onModeChange?: (mode: DeliveryMode) => void;
}) {
  const { t } = useLanguage();
  const {
    mode,
    setMode,
    canDeliver,
    canPickup,
    distance,
    deliveryFee,
    minOrderDelivery,
    pickupTime,
    isChecking,
    hasLocation,
    locationDenied,
    locationError,
    hasZoneConfig,
    requestLocation,
  } = useDeliveryMode(branch);

  useEffect(() => {
    onModeChange?.(mode);
    try { sessionStorage.setItem(`delivery_mode_${branch.id}`, mode); } catch {}
  }, [mode, branch.id, onModeChange]);

  const alternateBranches = branchStore
    .getByRestaurant(restaurantId)
    .filter((b) => b.id !== branch.id && b.id !== branch.id);

  const mapsUrl: string | null =
    branch.google_maps_url?.trim()
      ? branch.google_maps_url
      : branch.center_lat != null && branch.center_lng != null
      ? `https://maps.google.com/?q=${branch.center_lat},${branch.center_lng}`
      : branch.address_en || branch.address_ar
      ? `https://maps.google.com/?q=${encodeURIComponent((branch.address_en || branch.address_ar || "").trim())}`
      : null;

  const deliveryEnabled = branch.is_delivery_enabled !== false;
  const showTabs = deliveryEnabled || canPickup;
  const deliveryUnavailable = hasZoneConfig && hasLocation && canDeliver === false;

  return (
    <div className="mt-3 space-y-2">
      {/* Delivery / Pickup Tabs */}
      {showTabs && (
        <div className="flex gap-1 p-1 bg-black/20 rounded-xl border border-white/8">
          {(branch.is_delivery_enabled !== false) && (
            <button
              onClick={() => setMode("delivery")}
              disabled={canDeliver === false && !(!hasZoneConfig)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === "delivery"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              } ${canDeliver === false && hasZoneConfig ? "opacity-40 cursor-not-allowed" : ""}`}
              data-testid="btn-mode-delivery"
            >
              <Truck size={13} />
              {t("Delivery", "توصيل")}
              {hasLocation && canDeliver === true && (
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              )}
            </button>
          )}
          {canPickup && (
            <button
              onClick={() => setMode("pickup")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                mode === "pickup"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="btn-mode-pickup"
            >
              <Store size={13} />
              {t("Pickup", "استلام")}
            </button>
          )}
        </div>
      )}

      {/* Status Row */}
      <AnimatePresence mode="wait">
        {/* Checking location */}
        {isChecking && (
          <motion.div
            key="checking"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Loader2 size={12} className="animate-spin flex-shrink-0" />
            {t("Checking delivery to your location…", "جارٍ التحقق من التوصيل لموقعك…")}
          </motion.div>
        )}

        {/* Delivery available */}
        {!isChecking && hasLocation && canDeliver === true && mode === "delivery" && (
          <motion.div
            key="delivery-ok"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
          >
            <span className="flex items-center gap-1 text-green-400 font-medium">
              <CheckCircle2 size={12} />
              {t("Delivery available", "التوصيل متاح")}
            </span>
            {distance != null && (
              <span className="text-muted-foreground">
                📍 {distance.toFixed(1)} {t("km", "كم")}
              </span>
            )}
            {deliveryFee > 0 && (
              <span className="text-muted-foreground">
                🛵 {deliveryFee} {t("SAR", "ر.س")}
              </span>
            )}
            {deliveryFee === 0 && hasLocation && (
              <span className="text-green-400/80">
                {t("Free delivery", "توصيل مجاني")}
              </span>
            )}
            {minOrderDelivery > 0 && (
              <span className="text-muted-foreground">
                · {t("Min", "حد أدنى")} {minOrderDelivery} {t("SAR", "ر.س")}
              </span>
            )}
          </motion.div>
        )}

        {/* Pickup mode info */}
        {mode === "pickup" && canPickup && (
          <motion.div
            key="pickup-info"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-blue-500/10">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Store size={14} className="text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-blue-300">{t("Pickup from Branch", "الاستلام من الفرع")}</p>
                <p className="text-[11px] text-muted-foreground truncate">{t(branch.name_en, branch.name_ar)}</p>
              </div>
            </div>

            {/* Details */}
            <div className="px-4 py-3 space-y-2">
              {(branch.address_en || branch.address_ar) && (
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <MapPin size={11} className="mt-0.5 flex-shrink-0 text-blue-400/70" />
                  <span>{t(branch.address_en, branch.address_ar)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock size={11} className="flex-shrink-0 text-blue-400/70" />
                <span>{t(`Ready in ~${pickupTime} min`, `جاهز خلال ~${pickupTime} دقيقة`)}</span>
              </div>
              {branch.whatsapp && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone size={11} className="flex-shrink-0 text-blue-400/70" />
                  <span dir="ltr">+{branch.whatsapp}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {(mapsUrl || branch.whatsapp) && (
              <div className="flex gap-2 px-4 pb-4">
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-500/25 rounded-xl text-xs font-semibold text-blue-300 hover:bg-blue-500/35 transition"
                  >
                    <Navigation size={12} />
                    {t("Open in Maps", "فتح في الخرائط")}
                  </a>
                )}
                {branch.whatsapp && (
                  <a
                    href={`https://wa.me/${branch.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-white/20 transition"
                  >
                    <Phone size={12} />
                    {t("WhatsApp", "واتساب")}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Delivery unavailable card */}
        {deliveryUnavailable && mode === "delivery" && (
          <motion.div
            key="unavailable"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-500/8 border border-red-500/20 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
                <XCircle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t("Delivery not available", "التوصيل غير متاح")}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t(
                    "This restaurant doesn't deliver to your current location.",
                    "هذا المطعم لا يوصل لموقعك الحالي."
                  )}
                  {distance != null && (
                    <span className="text-muted-foreground/70">
                      {" "}({distance.toFixed(1)} {t("km away", "كم منك")})
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {canPickup && (
                <button
                  onClick={() => setMode("pickup")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-card border border-white/10 rounded-xl text-xs font-semibold text-foreground hover:border-white/20 transition"
                  data-testid="btn-switch-pickup"
                >
                  <Store size={12} />
                  {t("Pickup from Branch", "استلم من الفرع")}
                </button>
              )}
              {mapsUrl && (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-2 bg-card border border-white/10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-white/20 transition"
                >
                  <ExternalLink size={12} />
                  {t("View on Map", "عرض على الخريطة")}
                </a>
              )}
              <button
                onClick={() => { try { sessionStorage.removeItem("matami_user_location"); } catch {} requestLocation(); }}
                className="flex items-center gap-1.5 px-3 py-2 bg-card border border-white/10 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-white/20 transition"
                data-testid="btn-change-location"
              >
                <Navigation size={12} />
                {t("Change Location", "تغيير الموقع")}
              </button>
            </div>

            {alternateBranches.length > 0 && (
              <div className="pt-2 border-t border-white/5">
                <p className="text-[11px] text-muted-foreground mb-2">
                  {t("Other branches:", "فروع أخرى:")}
                </p>
                <div className="flex flex-col gap-1">
                  {alternateBranches.map((b) => (
                    <a
                      key={b.id}
                      href={`/restaurant/${restaurantId}/branch/${b.id}`}
                      className="flex items-center justify-between px-3 py-2 bg-card border border-white/5 rounded-xl hover:border-white/15 transition group"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin size={11} className="text-primary" />
                        <span className="text-xs font-medium text-foreground group-hover:text-primary transition">
                          {t(b.name_en, b.name_ar)}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {t(b.address_en, b.address_ar)}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Idle — prompt to check delivery zone */}
        {!isChecking && !hasLocation && !locationDenied && !locationError && hasZoneConfig && (
          <motion.div
            key="idle-check"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={requestLocation}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition font-medium"
              data-testid="btn-detect-location"
            >
              <Navigation size={12} />
              {t("Detect my location for accurate delivery fee", "تحديد موقعي لحساب رسوم التوصيل")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
