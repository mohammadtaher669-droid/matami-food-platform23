import { pgTable, text, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const couponsTable = pgTable("coupons", {
  code: text("code").primaryKey(),
  type: text("type").notNull().default("percentage"),
  value: real("value").notNull().default(0),
  active: boolean("active").notNull().default(true),
  description_en: text("description_en").notNull().default(""),
  description_ar: text("description_ar").notNull().default(""),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCouponSchema = createInsertSchema(couponsTable).omit({ created_at: true, updated_at: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
