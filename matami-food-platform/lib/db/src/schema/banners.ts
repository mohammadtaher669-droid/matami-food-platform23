import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const bannersTable = pgTable("banners", {
  id: text("id").primaryKey(),
  image: text("image"),
  image_url: text("image_url"),
  video_url: text("video_url"),
  title_en: text("title_en").notNull().default(""),
  title_ar: text("title_ar").notNull().default(""),
  subtitle_en: text("subtitle_en"),
  subtitle_ar: text("subtitle_ar"),
  button_text_en: text("button_text_en"),
  button_text_ar: text("button_text_ar"),
  link: text("link"),
  active: boolean("active").notNull().default(true),
  type: text("type").notNull().default("homepage"),
  restaurant_id: text("restaurant_id"),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBannerSchema = createInsertSchema(bannersTable).omit({ created_at: true, updated_at: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof bannersTable.$inferSelect;
