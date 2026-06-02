import { pgTable, text, real, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const offersTable = pgTable("offers", {
  id: text("id").primaryKey(),
  title_en: text("title_en").notNull(),
  title_ar: text("title_ar").notNull(),
  description_en: text("description_en").notNull().default(""),
  description_ar: text("description_ar").notNull().default(""),
  image: text("image"),
  image_url: text("image_url"),
  type: text("type").notNull().default("percentage"),
  value: real("value").notNull().default(0),
  restaurant_id: text("restaurant_id").notNull().default("global"),
  active: boolean("active").notNull().default(true),
  code: text("code"),
  show_as_banner: boolean("show_as_banner").notNull().default(false),
  banner_cta_en: text("banner_cta_en"),
  banner_cta_ar: text("banner_cta_ar"),
  expiry_date: text("expiry_date"),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOfferSchema = createInsertSchema(offersTable).omit({ created_at: true, updated_at: true });
export type InsertOffer = z.infer<typeof insertOfferSchema>;
export type Offer = typeof offersTable.$inferSelect;
