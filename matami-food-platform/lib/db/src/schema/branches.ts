import { pgTable, text, real, boolean, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const branchesTable = pgTable("branches", {
  id: text("id").primaryKey(),
  restaurant_id: text("restaurant_id").notNull(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  whatsapp: text("whatsapp").notNull(),
  open: text("open").notNull().default("08:00"),
  close: text("close").notNull().default("23:00"),
  delivery_fee: real("delivery_fee").notNull().default(0),
  delivery_time: integer("delivery_time"),
  address_en: text("address_en").notNull().default(""),
  address_ar: text("address_ar").notNull().default(""),
  is_delivery_enabled: boolean("is_delivery_enabled").notNull().default(true),
  pickup_enabled: boolean("pickup_enabled").notNull().default(false),
  pickup_time: integer("pickup_time"),
  min_order_delivery: real("min_order_delivery"),
  delivery_fee_tiers: jsonb("delivery_fee_tiers"),
  delivery_type: text("delivery_type").default("radius"),
  center_lat: real("center_lat"),
  center_lng: real("center_lng"),
  delivery_radius_km: real("delivery_radius_km"),
  polygon_coordinates: jsonb("polygon_coordinates"),
  google_maps_url: text("google_maps_url"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBranchSchema = createInsertSchema(branchesTable).omit({ created_at: true, updated_at: true });
export type InsertBranch = z.infer<typeof insertBranchSchema>;
export type Branch = typeof branchesTable.$inferSelect;
