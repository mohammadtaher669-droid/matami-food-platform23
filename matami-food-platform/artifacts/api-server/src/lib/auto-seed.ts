/**
 * Auto-seeds the PostgreSQL database on first startup.
 * Runs only when the restaurants table is empty — safe to call every boot.
 */
import { db } from "@workspace/db";
import {
  restaurantsTable, branchesTable, categoriesTable, menuItemsTable,
  offersTable, couponsTable,
} from "@workspace/db";
import {
  seedRestaurants, seedBranches, seedCategories,
  seedMenuItems, seedOffers, seedCoupons,
} from "./seed-data";

async function upsertAll(table: any, rows: any[], pk: string) {
  const q = db as any;
  for (const row of rows) {
    await q.insert(table).values(row)
      .onConflictDoUpdate({ target: table[pk], set: row })
      .catch(() => {});
  }
}

export async function autoSeedIfEmpty(): Promise<void> {
  try {
    const q = db as any;
    const existing = await q.select().from(restaurantsTable);
    if (existing.length > 0) return; // already seeded

    console.log("[auto-seed] Database is empty — seeding default restaurant data…");

    await upsertAll(restaurantsTable, seedRestaurants, "id");
    await upsertAll(branchesTable,    seedBranches,    "id");
    await upsertAll(categoriesTable,  seedCategories,  "id");
    await upsertAll(menuItemsTable,   seedMenuItems,   "id");
    await upsertAll(offersTable,      seedOffers,      "id");
    await upsertAll(couponsTable,     seedCoupons,     "code");

    console.log(`[auto-seed] Done — seeded ${seedRestaurants.length} restaurants, ${seedBranches.length} branches, ${seedCategories.length} categories, ${seedMenuItems.length} menu items, ${seedOffers.length} offers, ${seedCoupons.length} coupons.`);
  } catch (err) {
    console.error("[auto-seed] Failed:", err instanceof Error ? err.message : err);
  }
}
