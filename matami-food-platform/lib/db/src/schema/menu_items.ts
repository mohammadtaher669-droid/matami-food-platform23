import { pgTable, text, real, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const menuItemsTable = pgTable("menu_items", {
  id: text("id").primaryKey(),
  restaurant_id: text("restaurant_id").notNull(),
  category_id: text("category_id").notNull(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  description_en: text("description_en").notNull().default(""),
  description_ar: text("description_ar").notNull().default(""),
  price: real("price").notNull().default(0),
  image: text("image"),
  image_url: text("image_url"),
  calories: integer("calories"),
  is_available: boolean("is_available").notNull().default(true),
  is_popular: boolean("is_popular").notNull().default(false),
  is_new: boolean("is_new").notNull().default(false),
  is_best_seller: boolean("is_best_seller").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  pinned: boolean("pinned").notNull().default(false),
  hidden: boolean("hidden").notNull().default(false),
  image_ai_generated: boolean("image_ai_generated").notNull().default(false),
  image_locked: boolean("image_locked").notNull().default(false),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ created_at: true, updated_at: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;
