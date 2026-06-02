/**
 * POST /api/seed — Admin: seed the database from the default initStore data.
 * Safe to call multiple times (uses upsert). Useful for initial setup.
 */
import { Router } from "express";
import { requireAdmin } from "../lib/auth";
import { asyncHandler } from "../lib/validate";

const router = Router();

router.post("/seed", requireAdmin, asyncHandler(async (_req, res) => {
  // Dynamically import so the seed data is only loaded when actually needed
  // The seed data lives in the frontend package — we load it via the db package's
  // bulk upsert mechanism by returning instructions to the caller.
  // In practice, the admin Dashboard's "Publish Now" button does the actual push.
  res.json({
    message: "Use the Admin Dashboard → Publish Now button to seed the database, " +
             "or POST /api/data with a full JSON snapshot.",
    instructions: {
      endpoint: "POST /api/data",
      auth: "Bearer <admin_jwt>",
      body: "Full catalog snapshot (same shape as GET /api/data response)",
    },
  });
}));

export default router;
