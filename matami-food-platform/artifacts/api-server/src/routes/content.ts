/**
 * /api/banners, /api/settings
 */
import { Router } from "express";
import { eq as _eq } from "drizzle-orm";
const eq = _eq as unknown as (a: any, b: any) => any;
import { db } from "@workspace/db";
import { bannersTable, insertBannerSchema, appSettingsTable } from "@workspace/db";
import { requireAdmin } from "../lib/auth";
import { validateBody, asyncHandler } from "../lib/validate";

const router = Router();

const q = db as any;

// ── Banners ───────────────────────────────────────────────────────────────────

router.get("/banners", asyncHandler(async (req, res) => {
  const rows = await q.select().from(bannersTable);
  const type = req.query.type as string | undefined;
  res.json(type ? rows.filter((b: any) => b.type === type) : rows);
}));

router.post("/banners", requireAdmin, validateBody(insertBannerSchema), asyncHandler(async (req, res) => {
  const body = req.body as any;
  let row;
  try {
    [row] = await q.insert(bannersTable).values(body).returning();
  } catch {
    [row] = await q.update(bannersTable)
      .set({ ...body, updated_at: new Date() })
      .where(eq(bannersTable.id, body.id))
      .returning();
  }
  res.status(201).json(row);
}));

router.put("/banners/:id", requireAdmin, validateBody(insertBannerSchema.partial()), asyncHandler(async (req, res) => {
  const [row] = await q.update(bannersTable)
    .set({ ...req.body, updated_at: new Date() })
    .where(eq(bannersTable.id, req.params.id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
}));

router.delete("/banners/:id", requireAdmin, asyncHandler(async (req, res) => {
  await q.delete(bannersTable).where(eq(bannersTable.id, req.params.id));
  res.json({ success: true });
}));

// ── App Settings (singleton, id=1) ────────────────────────────────────────────

router.get("/settings", asyncHandler(async (_req, res) => {
  const rows = await q.select().from(appSettingsTable).where(eq(appSettingsTable.id, 1));
  res.json(rows[0] ?? { id: 1 });
}));

router.put("/settings", requireAdmin, asyncHandler(async (req, res) => {
  const body = req.body as any;
  const existing = await q.select().from(appSettingsTable).where(eq(appSettingsTable.id, 1));
  let row: any;
  if (existing[0]) {
    [row] = await q.update(appSettingsTable)
      .set({ ...body, id: 1, updated_at: new Date() })
      .where(eq(appSettingsTable.id, 1))
      .returning();
  } else {
    [row] = await q.insert(appSettingsTable).values({ ...body, id: 1 }).returning();
  }
  res.json(row);
}));

export default router;
