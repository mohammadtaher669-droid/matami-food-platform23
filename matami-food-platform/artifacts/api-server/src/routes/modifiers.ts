/**
 * /api/modifier-groups, /api/modifier-options, /api/add-ons
 * /api/item-modifier-links, /api/branch-item-overrides, /api/branch-category-overrides
 */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  modifierGroupsTable,
  modifierOptionsTable,
  addOnsTable,
  itemModifierLinksTable,
  branchItemOverridesTable,
  branchCategoryOverridesTable,
} from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { asyncHandler } from "../lib/validate";

const router = Router();

function makeCrud(path: string, table: any) {
  router.get(path, asyncHandler(async (_req, res) => {
    res.json(await db.select().from(table));
  }));

  router.post(path, requireAdmin, asyncHandler(async (req, res) => {
    const body = req.body as any;
    try {
      const [row] = await (db.insert(table).values(body) as any).returning();
      res.status(201).json(row);
    } catch {
      const [row] = await db.update(table).set(body as any)
        .where(eq(table.id, body.id)).returning();
      res.json(row);
    }
  }));

  router.put(`${path}/:id`, requireAdmin, asyncHandler(async (req, res) => {
    const [row] = await db.update(table).set(req.body as any)
      .where(eq(table.id, req.params.id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  }));

  router.delete(`${path}/:id`, requireAdmin, asyncHandler(async (req, res) => {
    await db.delete(table).where(eq(table.id, req.params.id));
    res.json({ success: true });
  }));
}

makeCrud("/modifier-groups", modifierGroupsTable);
makeCrud("/modifier-options", modifierOptionsTable);
makeCrud("/add-ons", addOnsTable);
makeCrud("/item-modifier-links", itemModifierLinksTable);
makeCrud("/branch-item-overrides", branchItemOverridesTable);
makeCrud("/branch-category-overrides", branchCategoryOverridesTable);

export default router;
