import { useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Crosshair, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const MARKER_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DEFAULT_LAT = 24.7136;
const DEFAULT_LNG = 46.6753;

export interface MapAddress {
  en: string;
  ar: string;
}

async function reverseGeocode(lat: number, lng: number): Promise<MapAddress | undefined> {
  try {
    const [enRes, arRes] = await Promise.allSettled([
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=en`),
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`),
    ]);
    const fmt = (d: any) => {
      if (!d) return "";
      const a = d.address || {};
      const road = a.road || a.neighbourhood || a.suburb || a.quarter || "";
      const city = a.city || a.town || a.village || a.county || "";
      if (road && city) return `${road}, ${city}`;
      return d.display_name?.split(",").slice(0, 2).join(",").trim() || "";
    };
    const enData = enRes.status === "fulfilled" ? await enRes.value.json() : null;
    const arData = arRes.status === "fulfilled" ? await arRes.value.json() : null;
    return { en: fmt(enData), ar: fmt(arData) };
  } catch {
    return undefined;
  }
}

interface Props {
  lat?: number;
  lng?: number;
  onChange: (lat: number, lng: number, address?: MapAddress) => void;
}

export default function BranchMapPicker({ lat, lng, onChange }: Props) {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const initRef = useRef(false);
  const latRef = useRef(lat);
  const lngRef = useRef(lng);

  latRef.current = lat;
  lngRef.current = lng;

  useEffect(() => {
    if (!containerRef.current || initRef.current) return;
    initRef.current = true;

    const initLat = lat ?? DEFAULT_LAT;
    const initLng = lng ?? DEFAULT_LNG;
    const zoom = lat != null ? 15 : 10;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
    }).setView([initLat, initLng], zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker([initLat, initLng], { draggable: true, icon: MARKER_ICON }).addTo(map);

    const handlePositionChange = async (latlng: L.LatLng) => {
      marker.setLatLng(latlng);
      const address = await reverseGeocode(latlng.lat, latlng.lng);
      onChange(latlng.lat, latlng.lng, address);
    };

    marker.on("dragend", () => handlePositionChange(marker.getLatLng()));
    map.on("click", (e: L.LeafletMouseEvent) => handlePositionChange(e.latlng));

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      initRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerRef.current || lat == null || lng == null) return;
    const cur = markerRef.current.getLatLng();
    if (Math.abs(cur.lat - lat) > 0.00005 || Math.abs(cur.lng - lng) > 0.00005) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.flyTo([lat, lng], 15, { duration: 0.8 });
    }
  }, [lat, lng]);

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        const address = await reverseGeocode(latitude, longitude);
        onChange(latitude, longitude, address);
      },
      () => {}
    );
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs text-muted-foreground flex items-center gap-1">
          <MapPin size={11} />
          {t("Location on Map", "الموقع على الخريطة")}
          <span className="opacity-40 text-[10px] ml-1">
            {t("— click or drag pin", "— انقر أو حرّك الإبرة")}
          </span>
        </label>
        <button
          type="button"
          onClick={handleCurrentLocation}
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition font-medium"
        >
          <Crosshair size={11} />
          {t("Use Current Location", "استخدم موقعي")}
        </button>
      </div>

      <div
        ref={containerRef}
        className="h-52 rounded-xl overflow-hidden border border-white/10 [&_.leaflet-control-attribution]:text-[8px] [&_.leaflet-control-attribution]:opacity-60"
      />

      <p className="text-[10px] text-muted-foreground/50">
        {t(
          "Click the map or drag the pin to update coordinates and auto-fill address.",
          "انقر على الخريطة أو حرّك الإبرة لتحديث الإحداثيات وملء العنوان تلقائياً."
        )}
      </p>
    </div>
  );
}
