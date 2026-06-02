import { pgTable, text, real, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const modifierGroupsTable = pgTable("modifier_groups", {
  id: text("id").primaryKey(),
  restaurant_id: text("restaurant_id").notNull(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  is_required: boolean("is_required").notNull().default(false),
  min_select: integer("min_select").notNull().default(0),
  max_select: integer("max_select").notNull().default(1),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const modifierOptionsTable = pgTable("modifier_options", {
  id: text("id").primaryKey(),
  group_id: text("group_id").notNull(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  price_addition: real("price_addition").notNull().default(0),
  is_default: boolean("is_default").notNull().default(false),
  sort_order: integer("sort_order").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const addOnsTable = pgTable("add_ons", {
  id: text("id").primaryKey(),
  restaurant_id: text("restaurant_id").notNull(),
  name_en: text("name_en").notNull(),
  name_ar: text("name_ar").notNull(),
  price: real("price").notNull().default(0),
  is_free: boolean("is_free").notNull().default(false),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const itemModifierLinksTable = pgTable("item_modifier_links", {
  id: text("id").primaryKey(),
  item_id: text("item_id").notNull(),
  group_id: text("group_id").notNull(),
  sort_order: integer("sort_order").notNull().default(0),
});

export const branchItemOverridesTable = pgTable("branch_item_overrides", {
  id: text("id").primaryKey(),
  branch_id: text("branch_id").notNull(),
  item_id: text("item_id").notNull(),
  price: real("price"),
  is_available: boolean("is_available").notNull().default(true),
  schedule: text("schedule"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const branchCategoryOverridesTable = pgTable("branch_category_overrides", {
  id: text("id").primaryKey(),
  branch_id: text("branch_id").notNull(),
  category_id: text("category_id").notNull(),
  is_available: boolean("is_available").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertModifierGroupSchema = createInsertSchema(modifierGroupsTable).omit({ created_at: true });
export const insertModifierOptionSchema = createInsertSchema(modifierOptionsTable).omit({ created_at: true });
export const insertAddOnSchema = createInsertSchema(addOnsTable).omit({ created_at: true });
export const insertItemModifierLinkSchema = createInsertSchema(itemModifierLinksTable);
export const insertBranchItemOverrideSchema = createInsertSchema(branchItemOverridesTable).omit({ created_at: true });
export const insertBranchCategoryOverrideSchema = createInsertSchema(branchCategoryOverridesTable).omit({ created_at: true });

export type ModifierGroup = typeof modifierGroupsTable.$inferSelect;
export type ModifierOption = typeof modifierOptionsTable.$inferSelect;
export type AddOn = typeof addOnsTable.$inferSelect;
export type ItemModifierLink = typeof itemModifierLinksTable.$inferSelect;
export type BranchItemOverride = typeof branchItemOverridesTable.$inferSelect;
export type BranchCategoryOverride = typeof branchCategoryOverridesTable.$inferSelect;

export type InsertModifierGroup = z.infer<typeof insertModifierGroupSchema>;
export type InsertModifierOption = z.infer<typeof insertModifierOptionSchema>;
export type InsertAddOn = z.infer<typeof insertAddOnSchema>;
