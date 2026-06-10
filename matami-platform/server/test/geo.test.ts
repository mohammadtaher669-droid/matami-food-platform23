import { describe, expect, it } from "vitest";
import { haversineKm, isZoneOpen, matchZone, pointInPolygon } from "../src/lib/geo";

// A square around Riyadh city center
const square: Array<[number, number]> = [
  [24.6, 46.6],
  [24.8, 46.6],
  [24.8, 46.8],
  [24.6, 46.8],
];

describe("haversineKm", () => {
  it("computes plausible Riyadh→Jeddah distance", () => {
    const d = haversineKm({ lat: 24.7136, lng: 46.6753 }, { lat: 21.4858, lng: 39.1925 });
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(900);
  });
});

describe("pointInPolygon", () => {
  it("detects inside / outside", () => {
    expect(pointInPolygon({ lat: 24.7, lng: 46.7 }, square)).toBe(true);
    expect(pointInPolygon({ lat: 24.9, lng: 46.7 }, square)).toBe(false);
  });

  it("rejects degenerate rings", () => {
    expect(pointInPolygon({ lat: 24.7, lng: 46.7 }, [[24.6, 46.6], [24.8, 46.8]])).toBe(false);
  });
});

describe("isZoneOpen", () => {
  it("empty schedule means always open", () => {
    expect(isZoneOpen({})).toBe(true);
    expect(isZoneOpen(null)).toBe(true);
  });

  it("respects day list", () => {
    const monday = new Date("2026-06-08T12:00:00"); // Monday
    expect(isZoneOpen({ days: [1] }, monday)).toBe(true);
    expect(isZoneOpen({ days: [5] }, monday)).toBe(false);
  });

  it("handles windows crossing midnight", () => {
    const lateNight = new Date("2026-06-08T01:30:00");
    expect(isZoneOpen({ from: "18:00", to: "03:00" }, lateNight)).toBe(true);
    const afternoon = new Date("2026-06-08T15:00:00");
    expect(isZoneOpen({ from: "18:00", to: "03:00" }, afternoon)).toBe(false);
  });
});

describe("matchZone", () => {
  const base = { isActive: true, schedule: {}, polygon: null, centerLat: null, centerLng: null, radiusKm: null };
  const polygonZone = { ...base, id: "p", type: "POLYGON" as const, polygon: square, sortOrder: 1 };
  const radiusZone = { ...base, id: "r", type: "RADIUS" as const, centerLat: 24.7, centerLng: 46.7, radiusKm: 5, sortOrder: 0 };

  it("prefers lower sortOrder when both match", () => {
    const z = matchZone([polygonZone, radiusZone], { lat: 24.7, lng: 46.7 });
    expect(z?.id).toBe("r");
  });

  it("falls through to polygon outside the radius", () => {
    const z = matchZone([polygonZone, radiusZone], { lat: 24.78, lng: 46.78 });
    expect(z?.id).toBe("p");
  });

  it("returns null when nothing matches or zone inactive", () => {
    expect(matchZone([{ ...polygonZone, isActive: false }], { lat: 24.7, lng: 46.7 })).toBeNull();
    expect(matchZone([radiusZone], { lat: 25.5, lng: 47.5 })).toBeNull();
  });
});
