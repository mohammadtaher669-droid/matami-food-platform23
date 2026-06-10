/**
 * Google Maps integration: address pin picker + delivery-zone editor.
 * Degrades gracefully to manual coordinate inputs when no API key is set.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Field, Input } from "./ui";

let mapsPromise: Promise<boolean> | null = null;

export function loadGoogleMaps(): Promise<boolean> {
  mapsPromise ??= (async () => {
    if (typeof google !== "undefined" && google.maps) return true;
    try {
      const { googleMapsApiKey } = await api<{ googleMapsApiKey: string }>("/api/public/platform", { scope: null });
      if (!googleMapsApiKey) return false;
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=drawing,marker&loading=async`;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("maps load failed"));
        document.head.appendChild(script);
      });
      return true;
    } catch {
      return false;
    }
  })();
  return mapsPromise;
}

const RIYADH = { lat: 24.7136, lng: 46.6753 };

export function PinPicker({ value, onChange }: { value: { lat: number; lng: number } | null; onChange: (v: { lat: number; lng: number }) => void }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [hasMaps, setHasMaps] = useState<boolean | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((ok) => {
      if (cancelled) return;
      setHasMaps(ok);
      if (!ok || !ref.current) return;
      const center = value ?? RIYADH;
      const map = new google.maps.Map(ref.current, {
        center,
        zoom: 13,
        disableDefaultUI: true,
        zoomControl: true,
      });
      const marker = new google.maps.Marker({ position: center, map, draggable: true });
      markerRef.current = marker;
      marker.addListener("dragend", () => {
        const pos = marker.getPosition();
        if (pos) onChange({ lat: pos.lat(), lng: pos.lng() });
      });
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        marker.setPosition(e.latLng);
        onChange({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
      if (!value && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          map.setCenter(p);
          marker.setPosition(p);
          onChange(p);
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (hasMaps === false) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("Latitude", "خط العرض")}>
          <Input
            type="number"
            step="0.0001"
            value={value?.lat ?? ""}
            onChange={(e) => onChange({ lat: Number(e.target.value), lng: value?.lng ?? RIYADH.lng })}
          />
        </Field>
        <Field label={t("Longitude", "خط الطول")}>
          <Input
            type="number"
            step="0.0001"
            value={value?.lng ?? ""}
            onChange={(e) => onChange({ lat: value?.lat ?? RIYADH.lat, lng: Number(e.target.value) })}
          />
        </Field>
        <p className="col-span-2 text-[11px] text-[var(--th-muted)]">
          {t("Set GOOGLE_MAPS_API_KEY to enable the interactive map.", "أضف GOOGLE_MAPS_API_KEY لتفعيل الخريطة التفاعلية.")}
        </p>
      </div>
    );
  }

  return <div ref={ref} className="h-64 w-full rounded-[var(--th-radius)] bg-black/5" />;
}

export interface ZoneShape {
  type: "POLYGON" | "RADIUS";
  polygon: Array<[number, number]> | null;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
}

export function ZoneEditor({ shape, onChange, branchPos }: { shape: ZoneShape; onChange: (s: ZoneShape) => void; branchPos: { lat: number; lng: number } | null }) {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);
  const [hasMaps, setHasMaps] = useState<boolean | null>(null);
  const overlayRef = useRef<google.maps.Polygon | google.maps.Circle | null>(null);
  const shapeRef = useRef(shape);
  shapeRef.current = shape;

  const syncFromOverlay = useCallback(() => {
    const ov = overlayRef.current;
    if (!ov) return;
    if (ov instanceof google.maps.Polygon) {
      const ring = ov
        .getPath()
        .getArray()
        .map((p): [number, number] => [p.lat(), p.lng()]);
      onChange({ ...shapeRef.current, type: "POLYGON", polygon: ring });
    } else {
      const center = ov.getCenter();
      onChange({
        ...shapeRef.current,
        type: "RADIUS",
        centerLat: center?.lat() ?? null,
        centerLng: center?.lng() ?? null,
        radiusKm: Math.round(((ov.getRadius() ?? 0) / 1000) * 100) / 100,
      });
    }
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps().then((ok) => {
      if (cancelled) return;
      setHasMaps(ok);
      if (!ok || !ref.current) return;
      const center = branchPos ?? RIYADH;
      const map = new google.maps.Map(ref.current, { center, zoom: 12, disableDefaultUI: true, zoomControl: true });

      if (shape.type === "POLYGON") {
        const ring = shape.polygon?.length
          ? shape.polygon.map(([lat, lng]) => ({ lat, lng }))
          : [
              { lat: center.lat + 0.02, lng: center.lng - 0.02 },
              { lat: center.lat + 0.02, lng: center.lng + 0.02 },
              { lat: center.lat - 0.02, lng: center.lng + 0.02 },
              { lat: center.lat - 0.02, lng: center.lng - 0.02 },
            ];
        const polygon = new google.maps.Polygon({
          paths: ring,
          map,
          editable: true,
          fillColor: "#16a34a",
          fillOpacity: 0.15,
          strokeColor: "#16a34a",
        });
        overlayRef.current = polygon;
        if (!shape.polygon?.length) {
          onChange({ ...shape, polygon: ring.map((p): [number, number] => [p.lat, p.lng]) });
        }
        const path = polygon.getPath();
        ["set_at", "insert_at", "remove_at"].forEach((ev) => path.addListener(ev, syncFromOverlay));
      } else {
        const circle = new google.maps.Circle({
          map,
          center: shape.centerLat != null && shape.centerLng != null ? { lat: shape.centerLat, lng: shape.centerLng } : center,
          radius: (shape.radiusKm ?? 3) * 1000,
          editable: true,
          fillColor: "#16a34a",
          fillOpacity: 0.15,
          strokeColor: "#16a34a",
        });
        overlayRef.current = circle;
        if (shape.centerLat == null) {
          onChange({ ...shape, centerLat: center.lat, centerLng: center.lng, radiusKm: shape.radiusKm ?? 3 });
        }
        circle.addListener("center_changed", syncFromOverlay);
        circle.addListener("radius_changed", syncFromOverlay);
      }
    });
    return () => {
      cancelled = true;
    };
    // re-init when switching shape type only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shape.type]);

  if (hasMaps === false) {
    return shape.type === "RADIUS" ? (
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("Center lat", "مركز - عرض")}>
          <Input type="number" step="0.0001" value={shape.centerLat ?? ""} onChange={(e) => onChange({ ...shape, centerLat: Number(e.target.value) })} />
        </Field>
        <Field label={t("Center lng", "مركز - طول")}>
          <Input type="number" step="0.0001" value={shape.centerLng ?? ""} onChange={(e) => onChange({ ...shape, centerLng: Number(e.target.value) })} />
        </Field>
        <Field label={t("Radius (km)", "نصف القطر (كم)")}>
          <Input type="number" step="0.1" value={shape.radiusKm ?? ""} onChange={(e) => onChange({ ...shape, radiusKm: Number(e.target.value) })} />
        </Field>
      </div>
    ) : (
      <Field label={t("Polygon points (lat,lng per line)", "نقاط المضلع (عرض,طول لكل سطر)")}>
        <textarea
          className="min-h-[120px] w-full rounded-[var(--th-radius)] border border-black/10 p-3 text-xs font-mono"
          value={(shape.polygon ?? []).map(([a, b]) => `${a},${b}`).join("\n")}
          onChange={(e) => {
            const ring = e.target.value
              .split("\n")
              .map((line) => line.split(",").map(Number))
              .filter((p): p is [number, number] => p.length === 2 && p.every((n) => Number.isFinite(n)))
              .map((p): [number, number] => [p[0]!, p[1]!]);
            onChange({ ...shape, polygon: ring });
          }}
        />
      </Field>
    );
  }

  return <div ref={ref} className="h-72 w-full rounded-[var(--th-radius)] bg-black/5" />;
}
