import {
  restaurantStore, branchStore, categoryStore, menuStore,
  offerStore, couponStore, modifierGroupStore, modifierOptionStore, addOnStore,
  itemModifierLinkStore, isInitialized, markInitialized,
} from "./store";
import type { ModifierGroup } from "./store";
import {
  seedRestaurants, seedBranches, seedCategories,
  seedMenuItems, seedOffers, seedCoupons,
} from "@/data/seedData";
import { seedModifierGroups, seedModifierOptions, seedAddOns } from "@/data/seedModifiers";

function migrateBranches(): void {
  const existing = branchStore.getAll();
  if (existing.length === 0) return;
  const needsMigration = existing.some((b) => b.is_delivery_enabled === undefined);
  if (!needsMigration) return;
  const seed = seedBranches;
  const migrated = existing.map((b) => {
    const s = seed.find((s) => s.id === b.id);
    if (!s) return b;
    return {
      ...b,
      is_delivery_enabled: b.is_delivery_enabled ?? s.is_delivery_enabled,
      pickup_enabled: b.pickup_enabled ?? s.pickup_enabled,
      pickup_time: b.pickup_time ?? s.pickup_time,
      min_order_delivery: b.min_order_delivery ?? s.min_order_delivery,
      delivery_fee_tiers: b.delivery_fee_tiers ?? s.delivery_fee_tiers,
      delivery_type: b.delivery_type ?? s.delivery_type,
      center_lat: b.center_lat ?? s.center_lat,
      center_lng: b.center_lng ?? s.center_lng,
      delivery_radius_km: b.delivery_radius_km ?? s.delivery_radius_km,
      delivery_time: b.delivery_time ?? s.delivery_time,
    };
  });
  branchStore.set(migrated);
}

function migrateModifierGroupsToGlobal(): void {
  if (localStorage.getItem("matami_modifiers_migrated") === "true") return;
  const groups = modifierGroupStore.getAll();
  for (const group of groups) {
    if (group.menu_item_id) {
      itemModifierLinkStore.link(group.menu_item_id, group.id);
      modifierGroupStore.save({ ...group, menu_item_id: undefined } as ModifierGroup);
    }
  }
  localStorage.setItem("matami_modifiers_migrated", "true");
}

function migrateGoogleMapsUrl(): void {
  if (localStorage.getItem("matami_maps_url_migrated") === "true") return;
  const branches = branchStore.getAll();
  let changed = false;
  const updated = branches.map((b) => {
    if (!b.google_maps_url && b.center_lat != null && b.center_lng != null) {
      changed = true;
      return {
        ...b,
        google_maps_url: `https://maps.google.com/?q=${b.center_lat.toFixed(6)},${b.center_lng.toFixed(6)}`,
      };
    }
    return b;
  });
  if (changed) branchStore.set(updated);
  localStorage.setItem("matami_maps_url_migrated", "true");
}

export function initializeStore(): void {
  if (isInitialized()) {
    migrateBranches();
    migrateModifierGroupsToGlobal();
    migrateGoogleMapsUrl();
    return;
  }
  restaurantStore.set(seedRestaurants);
  branchStore.set(seedBranches);
  categoryStore.set(seedCategories);
  menuStore.set(seedMenuItems);
  offerStore.set(seedOffers);
  couponStore.set(seedCoupons);
  modifierGroupStore.set(seedModifierGroups);
  modifierOptionStore.set(seedModifierOptions);
  addOnStore.set(seedAddOns);
  markInitialized();
}
