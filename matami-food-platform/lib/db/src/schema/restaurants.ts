import { pgTable, text, real, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const restaurantsTable = pgTable("restaurants", {
  id: text("id").primaryKey(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  logo: text("logo").notNull().default("🍽️"),
  logo_type: text("logo_type").notNull().default("emoji"),
  color: text("color").notNull().default("#FF7A00"),
  description_en: text("description_en").notNull().default(""),
  description_ar: text("description_ar").notNull().default(""),
  tagline_en: text("tagline_en"),
  tagline_ar: text("tagline_ar"),
  cover_image: text("cover_image"),
  bg_image: text("bg_image"),
  overlay_color: text("overlay_color"),
  overlay_opacity: real("overlay_opacity"),
  sort_order: integer("sort_order").notNull().default(0),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRestaurantSchema = createInsertSchema(restaurantsTable).omit({ created_at: true, updated_at: true });
export type InsertRestaurant = z.infer<typeof insertRestaurantSchema>;
export type Restaurant = typeof restaurantsTable.$inferSelect;
