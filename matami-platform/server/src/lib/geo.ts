/**
 * Pure geo + zone-matching helpers (unit tested).
 * Polygons are stored as rings of [lat, lng] pairs.
 */

export type LatLng = { lat: number; lng: number };

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Ray-casting point-in-polygon. Ring: [[lat,lng], ...] (closing point optional). */
export function pointInPolygon(point: LatLng, ring: Array<[number, number]>): boolean {
  if (ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i]![0];
    const xi = ring[i]![1];
    const yj = ring[j]![0];
    const xj = ring[j]![1];
    const intersects =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export interface ZoneLike {
  id: string;
  type: "POLYGON" | "RADIUS";
  polygon: unknown;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
  isActive: boolean;
  schedule: unknown;
  sortOrder: number;
}

export function zoneContains(zone: ZoneLike, point: LatLng): boolean {
  if (!zone.isActive) return false;
  if (zone.type === "RADIUS") {
    if (zone.centerLat == null || zone.centerLng == null || zone.radiusKm == null) return false;
    return haversineKm(point, { lat: zone.centerLat, lng: zone.centerLng }) <= zone.radiusKm;
  }
  const ring = zone.polygon as Array<[number, number]> | null;
  if (!Array.isArray(ring)) return false;
  return pointInPolygon(point, ring);
}

/** schedule: {} = always open; or { days:[0..6], from:"10:00", to:"23:30" } (to may pass midnight). */
export function isZoneOpen(schedule: unknown, now = new Date()): boolean {
  const s = (schedule ?? {}) as { days?: number[]; from?: string; to?: string };
  if (!s.from || !s.to) return !s.days || s.days.length === 0 || s.days.includes(now.getDay());
  if (s.days && s.days.length > 0 && !s.days.includes(now.getDay())) return false;
  const minutes = now.getHours() * 60 + now.getMinutes();
  const [fh = 0, fm = 0] = s.from.split(":").map(Number);
  const [th = 0, tm = 0] = s.to.split(":").map(Number);
  const from = fh * 60 + fm;
  const to = th * 60 + tm;
  if (from <= to) return minutes >= from && minutes <= to;
  return minutes >= from || minutes <= to; // crosses midnight
}

/** First open zone (by sortOrder) containing the point. */
export function matchZone<T extends ZoneLike>(zones: T[], point: LatLng, now = new Date()): T | null {
  const sorted = [...zones].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const z of sorted) {
    if (zoneContains(z, point) && isZoneOpen(z.schedule, now)) return z;
  }
  return null;
}
