import type { Branch } from "./store";

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsidePolygon(
  lat: number,
  lng: number,
  polygon: { lat: number; lng: number }[]
): boolean {
  if (polygon.length < 3) return true;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isInsideZone(
  userLat: number,
  userLng: number,
  branch: Branch
): boolean {
  if (!branch.is_delivery_enabled) return true;
  if (!branch.delivery_type) return true;

  if (branch.delivery_type === "radius") {
    if (branch.center_lat == null || branch.center_lng == null || !branch.delivery_radius_km) return true;
    const dist = haversineDistance(userLat, userLng, branch.center_lat, branch.center_lng);
    return dist <= branch.delivery_radius_km;
  }

  if (branch.delivery_type === "polygon") {
    if (!branch.polygon_coordinates || branch.polygon_coordinates.length < 3) return true;
    return isInsidePolygon(userLat, userLng, branch.polygon_coordinates);
  }

  return true;
}

/** Returns delivery fee for a given distance. Returns -1 if outside all tiers (too far). */
export function getDeliveryFee(branch: Branch, distanceKm: number): number {
  const tiers = branch.delivery_fee_tiers;
  if (tiers && tiers.length > 0) {
    const sorted = [...tiers].sort((a, b) => a.max_km - b.max_km);
    for (const tier of sorted) {
      if (distanceKm <= tier.max_km) return tier.fee;
    }
    return -1; // beyond all tiers = not serviceable
  }
  return branch.delivery_fee ?? 0;
}

export function getBranchZoneSummary(branch: Branch): string | null {
  if (!branch.is_delivery_enabled || !branch.delivery_type) return null;
  if (branch.delivery_type === "radius" && branch.delivery_radius_km) {
    return `Radius: ${branch.delivery_radius_km} km`;
  }
  if (branch.delivery_type === "polygon" && branch.polygon_coordinates?.length) {
    return `Polygon: ${branch.polygon_coordinates.length} points`;
  }
  return null;
}
