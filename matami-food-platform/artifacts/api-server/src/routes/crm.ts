/**
 * /api/orders, /api/customers
 */
import { Router } from "express";
import { eq as _eq, desc as _desc } from "drizzle-orm";
const eq = _eq as unknown as (a: any, b: any) => any;
const desc = _desc as any;
import { db } from "@workspace/db";
import { ordersTable, customersTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { asyncHandler } from "../lib/validate";

const router = Router();

const q = db as any;

// ── Reviews ────────────────────────────────────────────────────────────────────
// Reviews are client-side only (localStorage). This endpoint exists for API
// completeness and returns an empty array; the admin panel reads from localStorage.

router.get("/reviews", requireAdmin, asyncHandler(async (_req, res) => {
  res.json([]);
}));

// ── Orders ─────────────────────────────────────────────────────────────────────

router.get("/orders", requireAdmin, asyncHandler(async (_req, res) => {
  const rows = await q.select().from(ordersTable).orderBy(desc(ordersTable.created_at));
  res.json(rows);
}));

router.post("/orders", asyncHandler(async (req, res) => {
  const body = req.body as any;
  const { customer_name, customer_phone, customer_address, ...orderData } = body;

  if (!customer_phone || !orderData.id) {
    res.status(400).json({ error: "customer_phone and order id are required" });
    return;
  }

  const customerId = `cust-${String(customer_phone).replace(/\D/g, "")}`;

  const existingRows = await q.select().from(customersTable).where(eq(customersTable.id, customerId));
  const existing = existingRows[0];

  if (existing) {
    await q.update(customersTable)
      .set({
        name: customer_name ?? existing.name,
        location: customer_address ?? existing.location,
        total_orders: (existing.total_orders ?? 0) + 1,
        total_spent: (existing.total_spent ?? 0) + (orderData.total ?? 0),
        last_order_date: new Date().toISOString(),
        updated_at: new Date(),
      })
      .where(eq(customersTable.id, customerId));
  } else {
    await q.insert(customersTable).values({
      id: customerId,
      name: customer_name ?? "Guest",
      phone: customer_phone,
      location: customer_address,
      total_orders: 1,
      total_spent: orderData.total ?? 0,
      last_order_date: new Date().toISOString(),
    }).catch(() => {});
  }

  const [row] = await q.insert(ordersTable)
    .values({ ...orderData, customer_id: customerId })
    .returning();

  res.status(201).json({ order: row, customer_id: customerId });
}));

router.put("/orders/:id", requireAdmin, asyncHandler(async (req, res) => {
  const [row] = await q.update(ordersTable)
    .set(req.body)
    .where(eq(ordersTable.id, req.params.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/orders/:id", requireAdmin, asyncHandler(async (req, res) => {
  await q.delete(ordersTable).where(eq(ordersTable.id, req.params.id));
  res.json({ success: true });
}));

// ── Customers ──────────────────────────────────────────────────────────────────

router.get("/customers", requireAdmin, asyncHandler(async (_req, res) => {
  const rows = await q.select().from(customersTable).orderBy(desc(customersTable.last_order_date));
  res.json(rows);
}));

router.put("/customers/:id", requireAdmin, asyncHandler(async (req, res) => {
  const [row] = await q.update(customersTable)
    .set({ ...req.body, updated_at: new Date() })
    .where(eq(customersTable.id, req.params.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/customers/:id", requireAdmin, asyncHandler(async (req, res) => {
  await q.delete(customersTable).where(eq(customersTable.id, req.params.id));
  res.json({ success: true });
}));

export default router;
