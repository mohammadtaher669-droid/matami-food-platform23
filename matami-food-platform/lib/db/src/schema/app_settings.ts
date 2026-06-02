import { pgTable, text, real, boolean, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const appSettingsTable = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  slogan_en: text("slogan_en").notNull().default("Order food from the best restaurants"),
  slogan_ar: text("slogan_ar").notNull().default("اطلب الطعام من أفضل المطاعم"),
  homepage_bg_image: text("homepage_bg_image"),
  homepage_bg_type: text("homepage_bg_type").notNull().default("color"),
  homepage_overlay_opacity: real("homepage_overlay_opacity").notNull().default(0.4),
  homepage_overlay_color: text("homepage_overlay_color").notNull().default("rgba(0,0,0,0.4)"),
  primary_color: text("primary_color").notNull().default("#FF7A00"),
  show_calories: boolean("show_calories").notNull().default(true),
  platform_name_en: text("platform_name_en").notNull().default("Mat'ami"),
  platform_name_ar: text("platform_name_ar").notNull().default("مطعمي"),
  platform_logo_url: text("platform_logo_url"),
  logo_size: text("logo_size").notNull().default("md"),
  font_family: text("font_family"),
  ar_font_family: text("ar_font_family"),
  font_size_scale: real("font_size_scale").notNull().default(1),
  home_columns: integer("home_columns").notNull().default(2),
  home_sections_config: jsonb("home_sections_config"),
  nav_items_config: jsonb("nav_items_config"),
  restaurant_order: jsonb("restaurant_order"),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertAppSettingsSchema = createInsertSchema(appSettingsTable);
export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettingsTable.$inferSelect;
