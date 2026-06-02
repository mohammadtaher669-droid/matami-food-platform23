import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  MapPin, Save, Trash2, Navigation, Circle, PenLine, Info,
  Truck, Store, Plus, Clock, ShoppingBag, DollarSign,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore, branchStore } from "@/lib/store";
import type { Branch, DeliveryFeeTier } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";
import { haversineDistance } from "@/lib/deliveryZones";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, TileLayer, Circle as LeafletCircle, Polygon, Marker, useMapEvents, useMap } from "react-leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];
const DEFAULT_ZOOM = 11;

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onMapClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function RecenterMap({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [center, zoom, map]);
  return null;
}

interface ZoneState {
  is_delivery_enabled: boolean;
  pickup_enabled: boolean;
  pickup_time: number;
  min_order_delivery: number;
  delivery_fee_tiers: DeliveryFeeTier[];
  delivery_type: "radius" | "polygon";
  center_lat: number | null;
  center_lng: number | null;
  delivery_radius_km: number;
  polygon_coordinates: { lat: number; lng: number }[];
}

function defaultZone(branch: Branch): ZoneState {
  return {
    is_delivery_enabled: branch.is_delivery_enabled ?? false,
    pickup_enabled: branch.pickup_enabled ?? false,
    pickup_time: branch.pickup_time ?? 20,
    min_order_delivery: branch.min_order_delivery ?? 0,
    delivery_fee_tiers: branch.delivery_fee_tiers ?? [],
    delivery_type: branch.delivery_type ?? "radius",
    center_lat: branch.center_lat ?? null,
    center_lng: branch.center_lng ?? null,
    delivery_radius_km: branch.delivery_radius_km ?? 5,
    polygon_coordinates: branch.polygon_coordinates ?? [],
  };
}

export default function AdminDeliveryZones() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const branches = useStore(useCallback(() => branchStore.getAll(), []));

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [zone, setZone] = useState<ZoneState>({
    is_delivery_enabled: false,
    pickup_enabled: false,
    pickup_time: 20,
    min_order_delivery: 0,
    delivery_fee_tiers: [],
    delivery_type: "radius",
    center_lat: null,
    center_lng: null,
    delivery_radius_km: 5,
    polygon_coordinates: [],
  });

  const [newTierKm, setNewTierKm] = useState<number>(5);
  const [newTierFee, setNewTierFee] = useState<number>(10);

  const selectedBranch = branches.find((b) => b.id === selectedBranchId);

  useEffect(() => {
    if (selectedBranch) setZone(defaultZone(selectedBranch));
  }, [selectedBranchId]);

  const handleMapClick = (lat: number, lng: number) => {
    if (!zone.is_delivery_enabled) return;
    if (zone.delivery_type === "radius") {
      setZone((z) => ({ ...z, center_lat: lat, center_lng: lng }));
    } else {
      setZone((z) => ({ ...z, polygon_coordinates: [...z.polygon_coordinates, { lat, lng }] }));
    }
  };

  const handleAddTier = () => {
    if (newTierKm <= 0 || newTierFee < 0) return;
    const existing = zone.delivery_fee_tiers.find((t) => t.max_km === newTierKm);
    if (existing) return;
    setZone((z) => ({
      ...z,
      delivery_fee_tiers: [...z.delivery_fee_tiers, { max_km: newTierKm, fee: newTierFee }]
        .sort((a, b) => a.max_km - b.max_km),
    }));
  };

  const handleRemoveTier = (maxKm: number) => {
    setZone((z) => ({
      ...z,
      delivery_fee_tiers: z.delivery_fee_tiers.filter((tier) => tier.max_km !== maxKm),
    }));
  };

  const handleSave = () => {
    if (!selectedBranch) return;
    const updated: Branch = {
      ...selectedBranch,
      is_delivery_enabled: zone.is_delivery_enabled,
      pickup_enabled: zone.pickup_enabled,
      pickup_time: zone.pickup_time,
      min_order_delivery: zone.min_order_delivery,
      delivery_fee_tiers: zone.delivery_fee_tiers,
      delivery_type: zone.delivery_type,
      center_lat: zone.center_lat ?? undefined,
      center_lng: zone.center_lng ?? undefined,
      delivery_radius_km: zone.delivery_radius_km,
      polygon_coordinates: zone.polygon_coordinates,
    };
    branchStore.save(updated);
    toast({ title: t("Delivery zone saved!", "تم حفظ إعدادات التوصيل!") });
  };

  const mapCenter: [number, number] =
    zone.center_lat != null && zone.center_lng != null
      ? [zone.center_lat, zone.center_lng]
      : selectedBranch?.center_lat != null
      ? [selectedBranch.center_lat, selectedBranch.center_lng!]
      : DEFAULT_CENTER;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground mb-1">{t("📍 Delivery Zones", "📍 مناطق التوصيل")}</h1>
        <p className="text-sm text-muted-foreground">{t("Configure delivery coverage, pickup, and zone-based pricing per branch.", "قم بإعداد نطاق التوصيل والاستلام والتسعير حسب المنطقة لكل فرع.")}</p>
      </motion.div>

      {/* Branch selector */}
      <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-3">
        <label className="text-xs text-muted-foreground block mb-1">{t("Select Branch", "اختر الفرع")}</label>
        <select
          value={selectedBranchId}
          onChange={(e) => setSelectedBranchId(e.target.value)}
          className="w-full bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none"
          data-testid="select-branch-zone"
        >
          <option value="">{t("-- Choose a branch --", "-- اختر فرعاً --")}</option>
          {restaurants.map((r) => (
            <optgroup key={r.id} label={t(r.name_en, r.name_ar)}>
              {branches.filter((b) => b.restaurant_id === r.id).map((b) => (
                <option key={b.id} value={b.id}>{t(b.name_en, b.name_ar)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selectedBranch && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* ── Delivery Section ── */}
          <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Truck size={15} className="text-primary" />
              <span className="text-sm font-bold text-foreground">{t("Delivery Settings", "إعدادات التوصيل")}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">{t("Enable Delivery", "تفعيل التوصيل")}</span>
                <p className="text-xs text-muted-foreground">{t("Allow delivery orders for this branch", "السماح بطلبات التوصيل لهذا الفرع")}</p>
              </div>
              <button
                onClick={() => setZone((z) => ({ ...z, is_delivery_enabled: !z.is_delivery_enabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${zone.is_delivery_enabled ? "bg-primary" : "bg-white/10"}`}
                data-testid="toggle-delivery-enabled"
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${zone.is_delivery_enabled ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>

            {zone.is_delivery_enabled && (
              <>
                {/* Zone type */}
                <div className="flex gap-2">
                  {(["radius", "polygon"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setZone((z) => ({ ...z, delivery_type: type }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition ${zone.delivery_type === type ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground"}`}
                      data-testid={`btn-mode-${type}`}
                    >
                      {type === "radius" ? <Circle size={14} /> : <PenLine size={14} />}
                      {type === "radius" ? t("Radius Circle", "دائرة") : t("Custom Polygon", "مضلع")}
                    </button>
                  ))}
                </div>

                {zone.delivery_type === "radius" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{t("Delivery radius", "نطاق التوصيل")}</span>
                      <span className="font-mono text-primary font-bold">{zone.delivery_radius_km} km</span>
                    </div>
                    <input
                      type="range" min={1} max={50} step={0.5}
                      value={zone.delivery_radius_km}
                      onChange={(e) => setZone((z) => ({ ...z, delivery_radius_km: Number(e.target.value) }))}
                      className="w-full accent-primary"
                      data-testid="input-radius-km"
                    />
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Navigation size={11} />
                      {zone.center_lat != null
                        ? t("Center set — click map to relocate it", "تم تحديد المركز — انقر الخريطة لتغييره")
                        : t("Click on the map to set the branch center", "انقر على الخريطة لتحديد موقع الفرع")}
                    </div>
                  </div>
                )}

                {zone.delivery_type === "polygon" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Info size={11} />
                        {t(`${zone.polygon_coordinates.length} point(s) added — click map to add more`, `${zone.polygon_coordinates.length} نقطة — انقر الخريطة للإضافة`)}
                      </div>
                      {zone.polygon_coordinates.length > 0 && (
                        <button
                          onClick={() => setZone((z) => ({ ...z, polygon_coordinates: [] }))}
                          className="text-xs text-destructive/70 hover:text-destructive flex items-center gap-1"
                          data-testid="btn-clear-polygon"
                        >
                          <Trash2 size={11} /> {t("Clear", "مسح")}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Min order for delivery */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShoppingBag size={12} className="text-muted-foreground" />
                    <label className="text-xs text-muted-foreground">{t("Minimum order for delivery (SAR)", "الحد الأدنى للتوصيل (ر.س)")}</label>
                  </div>
                  <input
                    type="number" min={0} step={1}
                    value={zone.min_order_delivery}
                    onChange={(e) => setZone((z) => ({ ...z, min_order_delivery: Number(e.target.value) }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                    placeholder="0"
                    data-testid="input-min-order"
                  />
                  {zone.min_order_delivery > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t(`Orders below ${zone.min_order_delivery} SAR cannot be delivered.`, `الطلبات أقل من ${zone.min_order_delivery} ر.س لا يمكن توصيلها.`)}
                    </p>
                  )}
                </div>

                {/* Distance-based fee tiers */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{t("Delivery Fee Tiers (by distance)", "رسوم التوصيل حسب المسافة")}</span>
                  </div>

                  {zone.delivery_fee_tiers.length === 0 && (
                    <p className="text-xs text-muted-foreground bg-white/3 rounded-xl px-3 py-2">
                      {t("No tiers set — flat delivery fee from branch settings will be used.", "لا توجد طبقات — سيتم استخدام رسوم التوصيل الثابتة من إعدادات الفرع.")}
                    </p>
                  )}

                  {zone.delivery_fee_tiers.map((tier, i) => (
                    <div key={i} className="flex items-center gap-2 bg-background border border-white/8 rounded-xl px-3 py-2">
                      <div className="flex-1 text-xs">
                        <span className="text-foreground font-medium">
                          {i === 0 ? "0" : zone.delivery_fee_tiers[i - 1].max_km} – {tier.max_km} km
                        </span>
                        <span className="text-muted-foreground mx-2">→</span>
                        <span className="text-primary font-bold">{tier.fee} {t("SAR", "ر.س")}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveTier(tier.max_km)}
                        className="text-destructive/60 hover:text-destructive transition p-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}

                  {/* Add new tier */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] text-muted-foreground">{t("Up to (km)", "حتى (كم)")}</label>
                      <input
                        type="number" min={1} max={100} step={0.5}
                        value={newTierKm}
                        onChange={(e) => setNewTierKm(Number(e.target.value))}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                        data-testid="input-tier-km"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[11px] text-muted-foreground">{t("Fee (SAR)", "الرسوم (ر.س)")}</label>
                      <input
                        type="number" min={0} step={1}
                        value={newTierFee}
                        onChange={(e) => setNewTierFee(Number(e.target.value))}
                        className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                        data-testid="input-tier-fee"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] opacity-0">.</div>
                      <button
                        onClick={handleAddTier}
                        className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-medium hover:bg-primary/20 transition"
                        data-testid="btn-add-tier"
                      >
                        <Plus size={12} /> {t("Add", "إضافة")}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* ── Pickup Section ── */}
          <div className="bg-card border border-white/5 rounded-2xl p-4 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Store size={15} className="text-blue-400" />
              <span className="text-sm font-bold text-foreground">{t("Pickup Settings", "إعدادات الاستلام")}</span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium text-foreground">{t("Enable Pickup", "تفعيل الاستلام")}</span>
                <p className="text-xs text-muted-foreground">{t("Allow customers to pick up orders from this branch", "السماح للعملاء باستلام طلباتهم من الفرع")}</p>
              </div>
              <button
                onClick={() => setZone((z) => ({ ...z, pickup_enabled: !z.pickup_enabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${zone.pickup_enabled ? "bg-blue-500" : "bg-white/10"}`}
                data-testid="toggle-pickup-enabled"
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${zone.pickup_enabled ? "right-0.5" : "left-0.5"}`} />
              </button>
            </div>

            {zone.pickup_enabled && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-muted-foreground" />
                  <label className="text-xs text-muted-foreground">{t("Estimated pickup time (minutes)", "وقت التجهيز المتوقع (دقائق)")}</label>
                </div>
                <input
                  type="number" min={5} max={120} step={5}
                  value={zone.pickup_time}
                  onChange={(e) => setZone((z) => ({ ...z, pickup_time: Number(e.target.value) }))}
                  className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                  data-testid="input-pickup-time"
                />
                <p className="text-xs text-muted-foreground">
                  {t(`Customers will see "Ready in ~${zone.pickup_time} min"`, `سيظهر للعملاء "جاهز خلال ~${zone.pickup_time} دقيقة"`)}
                </p>
              </div>
            )}
          </div>

          {/* ── Map ── */}
          {(zone.is_delivery_enabled || zone.pickup_enabled) && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-1">
                {zone.delivery_type === "radius"
                  ? t("Click the map to set the branch/center location.", "انقر على الخريطة لتحديد موقع الفرع.")
                  : t("Click the map to add polygon vertices.", "انقر الخريطة لإضافة نقاط المضلع.")}
              </p>
              <div className="rounded-2xl overflow-hidden border border-white/10" style={{ height: 400 }}>
                <MapContainer
                  center={mapCenter}
                  zoom={DEFAULT_ZOOM}
                  style={{ height: "100%", width: "100%" }}
                  className="z-0"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapClickHandler onMapClick={handleMapClick} />
                  <RecenterMap center={mapCenter} zoom={DEFAULT_ZOOM} />

                  {zone.is_delivery_enabled && zone.delivery_type === "radius" && zone.center_lat != null && zone.center_lng != null && (
                    <>
                      <Marker position={[zone.center_lat, zone.center_lng]} />
                      <LeafletCircle
                        center={[zone.center_lat, zone.center_lng]}
                        radius={zone.delivery_radius_km * 1000}
                        pathOptions={{ color: "#FF7A00", fillColor: "#FF7A00", fillOpacity: 0.12, weight: 2, dashArray: "6 4" }}
                      />
                      {/* Fee tier rings */}
                      {zone.delivery_fee_tiers.map((tier, i) => (
                        <LeafletCircle
                          key={i}
                          center={[zone.center_lat!, zone.center_lng!]}
                          radius={tier.max_km * 1000}
                          pathOptions={{ color: "#3B82F6", fillColor: "#3B82F6", fillOpacity: 0.04, weight: 1.5, dashArray: "4 6" }}
                        />
                      ))}
                    </>
                  )}

                  {zone.is_delivery_enabled && zone.delivery_type === "polygon" && zone.polygon_coordinates.length > 0 && (
                    <>
                      {zone.polygon_coordinates.map((pt, i) => (
                        <Marker key={i} position={[pt.lat, pt.lng]} />
                      ))}
                      {zone.polygon_coordinates.length >= 3 && (
                        <Polygon
                          positions={zone.polygon_coordinates.map((p) => [p.lat, p.lng])}
                          pathOptions={{ color: "#FF7A00", fillColor: "#FF7A00", fillOpacity: 0.12, weight: 2 }}
                        />
                      )}
                    </>
                  )}
                </MapContainer>
              </div>
              {zone.delivery_fee_tiers.length > 0 && zone.delivery_type === "radius" && (
                <div className="flex flex-wrap gap-2 px-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-3 h-3 rounded-full border-2 border-primary/60" />
                    {t("Delivery Zone", "نطاق التوصيل")}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className="w-3 h-3 rounded-full border-2 border-blue-400/60 border-dashed" />
                    {t("Fee Tiers", "طبقات الرسوم")}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition flex items-center justify-center gap-2"
            data-testid="btn-save-zone"
          >
            <Save size={15} />
            {t("Save Zone Settings", "حفظ إعدادات المنطقة")}
          </button>
        </motion.div>
      )}

      {branches.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <MapPin size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t("No branches yet. Add a branch first.", "لا توجد فروع بعد. أضف فرعاً أولاً.")}</p>
        </div>
      )}
    </div>
  );
}
