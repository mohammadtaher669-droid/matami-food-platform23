/**
 * /api/restaurants, /api/branches, /api/categories, /api/menu-items
 * Full CRUD — writes require admin JWT.
 */
import { Router } from "express";
import { eq as _eq, asc as _asc } from "drizzle-orm";
const eq = _eq as unknown as (a: any, b: any) => any;
const asc = _asc as any;
import { db } from "@workspace/db";
import {
  restaurantsTable, insertRestaurantSchema,
  branchesTable, insertBranchSchema,
  categoriesTable, insertCategorySchema,
  menuItemsTable, insertMenuItemSchema,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { validateBody, asyncHandler } from "../lib/validate";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

type AnyTable = Parameters<typeof db.insert>[0];

async function dbInsert(table: AnyTable, body: any) {
  const [row] = await (db.insert(table) as any).values(body).returning();
  return row;
}

async function dbUpdate(table: AnyTable, body: any, col: any, val: any) {
  const [row] = await (db.update(table) as any)
    .set({ ...body, updated_at: new Date() })
    .where(eq(col, val))
    .returning();
  return row;
}

async function dbDelete(table: AnyTable, col: any, val: any) {
  await (db.delete(table) as any).where(eq(col, val));
}

async function upsertById(table: AnyTable, pkCol: any, body: any) {
  try {
    return await dbInsert(table, body);
  } catch {
    const [row] = await (db.update(table) as any)
      .set({ ...body, updated_at: new Date() })
      .where(eq(pkCol, body.id))
      .returning();
    return row;
  }
}

// ── Restaurants ──────────────────────────────────────────────────────────────

router.get("/restaurants", asyncHandler(async (_req, res) => {
  const rows = await (db.select().from(restaurantsTable) as any)
    .orderBy(asc(restaurantsTable.sort_order));
  res.json(rows);
}));

router.get("/restaurants/:id", asyncHandler(async (req, res) => {
  const rows = await (db.select().from(restaurantsTable) as any)
    .where(eq(restaurantsTable.id, req.params.id));
  const row = rows[0];
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.post("/restaurants", requireAdmin, validateBody(insertRestaurantSchema), asyncHandler(async (req, res) => {
  const row = await upsertById(restaurantsTable, restaurantsTable.id, req.body);
  res.status(201).json(row);
}));

router.put("/restaurants/:id", requireAdmin, validateBody(insertRestaurantSchema.partial()), asyncHandler(async (req, res) => {
  const row = await dbUpdate(restaurantsTable, req.body, restaurantsTable.id, req.params.id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/restaurants/:id", requireAdmin, asyncHandler(async (req, res) => {
  await dbDelete(restaurantsTable, restaurantsTable.id, req.params.id);
  res.json({ success: true });
}));

// ── Branches ─────────────────────────────────────────────────────────────────

router.get("/branches", asyncHandler(async (_req, res) => {
  res.json(await db.select().from(branchesTable));
}));

router.get("/branches/:id", asyncHandler(async (req, res) => {
  const rows = await (db.select().from(branchesTable) as any)
    .where(eq(branchesTable.id, req.params.id));
  const row = rows[0];
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.post("/branches", requireAdmin, validateBody(insertBranchSchema), asyncHandler(async (req, res) => {
  const row = await upsertById(branchesTable, branchesTable.id, req.body);
  res.status(201).json(row);
}));

router.put("/branches/:id", requireAdmin, validateBody(insertBranchSchema.partial()), asyncHandler(async (req, res) => {
  const row = await dbUpdate(branchesTable, req.body, branchesTable.id, req.params.id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/branches/:id", requireAdmin, asyncHandler(async (req, res) => {
  await dbDelete(branchesTable, branchesTable.id, req.params.id);
  res.json({ success: true });
}));

// ── Categories ────────────────────────────────────────────────────────────────

router.get("/categories", asyncHandler(async (_req, res) => {
  const rows = await (db.select().from(categoriesTable) as any)
    .orderBy(asc(categoriesTable.sort_order));
  res.json(rows);
}));

router.post("/categories", requireAdmin, validateBody(insertCategorySchema), asyncHandler(async (req, res) => {
  const row = await upsertById(categoriesTable, categoriesTable.id, req.body);
  res.status(201).json(row);
}));

router.put("/categories/:id", requireAdmin, validateBody(insertCategorySchema.partial()), asyncHandler(async (req, res) => {
  const row = await dbUpdate(categoriesTable, req.body, categoriesTable.id, req.params.id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/categories/:id", requireAdmin, asyncHandler(async (req, res) => {
  await dbDelete(categoriesTable, categoriesTable.id, req.params.id);
  res.json({ success: true });
}));

// ── Menu Items ────────────────────────────────────────────────────────────────

router.get("/menu-items", asyncHandler(async (_req, res) => {
  const rows = await (db.select().from(menuItemsTable) as any)
    .orderBy(asc(menuItemsTable.sort_order));
  res.json(rows);
}));

router.post("/menu-items", requireAdmin, validateBody(insertMenuItemSchema), asyncHandler(async (req, res) => {
  const row = await upsertById(menuItemsTable, menuItemsTable.id, req.body);
  res.status(201).json(row);
}));

router.put("/menu-items/:id", requireAdmin, validateBody(insertMenuItemSchema.partial()), asyncHandler(async (req, res) => {
  const row = await dbUpdate(menuItemsTable, req.body, menuItemsTable.id, req.params.id);
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/menu-items/:id", requireAdmin, asyncHandler(async (req, res) => {
  await dbDelete(menuItemsTable, menuItemsTable.id, req.params.id);
  res.json({ success: true });
}));

export default router;
