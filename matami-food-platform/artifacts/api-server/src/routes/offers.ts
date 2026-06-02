/**
 * /api/offers, /api/coupons
 */
import { Router } from "express";
import { eq as _eq } from "drizzle-orm";
const eq = _eq as unknown as (a: any, b: any) => any;
import { db } from "@workspace/db";
import { offersTable, insertOfferSchema, couponsTable, insertCouponSchema } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { validateBody, asyncHandler } from "../lib/validate";

const router = Router();

const q = db as any;

// ── Offers ────────────────────────────────────────────────────────────────────

router.get("/offers", asyncHandler(async (_req, res) => {
  res.json(await q.select().from(offersTable));
}));

router.post("/offers", requireAdmin, validateBody(insertOfferSchema), asyncHandler(async (req, res) => {
  const body = req.body as any;
  let row;
  try {
    [row] = await q.insert(offersTable).values(body).returning();
  } catch {
    [row] = await q.update(offersTable)
      .set({ ...body, updated_at: new Date() })
      .where(eq(offersTable.id, body.id))
      .returning();
  }
  res.status(201).json(row);
}));

router.put("/offers/:id", requireAdmin, validateBody(insertOfferSchema.partial()), asyncHandler(async (req, res) => {
  const [row] = await q.update(offersTable)
    .set({ ...req.body, updated_at: new Date() })
    .where(eq(offersTable.id, req.params.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/offers/:id", requireAdmin, asyncHandler(async (req, res) => {
  await q.delete(offersTable).where(eq(offersTable.id, req.params.id));
  res.json({ success: true });
}));

// ── Coupons ───────────────────────────────────────────────────────────────────

router.get("/coupons", requireAdmin, asyncHandler(async (_req, res) => {
  res.json(await q.select().from(couponsTable));
}));

router.get("/coupons/:code/validate", asyncHandler(async (req, res) => {
  const code = String(req.params.code).toUpperCase();
  const rows = await q.select().from(couponsTable).where(eq(couponsTable.code, code));
  const row = rows[0];
  if (!row || !row.active) {
    res.status(404).json({ valid: false, error: "Coupon not found or inactive" });
    return;
  }
  res.json({ valid: true, coupon: row });
}));

router.post("/coupons/validate", asyncHandler(async (req, res) => {
  const code = String((req.body as any)?.code ?? "").toUpperCase();
  if (!code) { res.status(400).json({ valid: false, error: "code is required" }); return; }
  const rows = await q.select().from(couponsTable).where(eq(couponsTable.code, code));
  const row = rows[0];
  if (!row || !row.active) {
    res.status(404).json({ valid: false, error: "Coupon not found or inactive" });
    return;
  }
  res.json({ valid: true, coupon: row });
}));

router.post("/coupons", requireAdmin, validateBody(insertCouponSchema), asyncHandler(async (req, res) => {
  const body = { ...(req.body as any), code: String((req.body as any).code ?? "").toUpperCase() };
  let row;
  try {
    [row] = await q.insert(couponsTable).values(body).returning();
  } catch {
    [row] = await q.update(couponsTable)
      .set({ ...body, updated_at: new Date() })
      .where(eq(couponsTable.code, body.code))
      .returning();
  }
  res.status(201).json(row);
}));

router.put("/coupons/:code", requireAdmin, validateBody(insertCouponSchema.partial()), asyncHandler(async (req, res) => {
  const [row] = await q.update(couponsTable)
    .set({ ...req.body, updated_at: new Date() })
    .where(eq(couponsTable.code, req.params.code))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/coupons/:code", requireAdmin, asyncHandler(async (req, res) => {
  await q.delete(couponsTable).where(eq(couponsTable.code, req.params.code));
  res.json({ success: true });
}));

export default router;
