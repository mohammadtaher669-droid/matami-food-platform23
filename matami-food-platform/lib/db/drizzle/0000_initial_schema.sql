CREATE TABLE "restaurants" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"logo" text DEFAULT '🍽️' NOT NULL,
	"logo_type" text DEFAULT 'emoji' NOT NULL,
	"color" text DEFAULT '#FF7A00' NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ar" text DEFAULT '' NOT NULL,
	"tagline_en" text,
	"tagline_ar" text,
	"cover_image" text,
	"bg_image" text,
	"overlay_color" text,
	"overlay_opacity" real,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"whatsapp" text NOT NULL,
	"open" text DEFAULT '08:00' NOT NULL,
	"close" text DEFAULT '23:00' NOT NULL,
	"delivery_fee" real DEFAULT 0 NOT NULL,
	"delivery_time" integer,
	"address_en" text DEFAULT '' NOT NULL,
	"address_ar" text DEFAULT '' NOT NULL,
	"is_delivery_enabled" boolean DEFAULT true NOT NULL,
	"pickup_enabled" boolean DEFAULT false NOT NULL,
	"pickup_time" integer,
	"min_order_delivery" real,
	"delivery_fee_tiers" jsonb,
	"delivery_type" text DEFAULT 'radius',
	"center_lat" real,
	"center_lng" real,
	"delivery_radius_km" real,
	"polygon_coordinates" jsonb,
	"google_maps_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ar" text DEFAULT '' NOT NULL,
	"price" real DEFAULT 0 NOT NULL,
	"image" text,
	"image_url" text,
	"calories" integer,
	"is_available" boolean DEFAULT true NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_best_seller" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"image_ai_generated" boolean DEFAULT false NOT NULL,
	"image_locked" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_ar" text NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ar" text DEFAULT '' NOT NULL,
	"image" text,
	"image_url" text,
	"type" text DEFAULT 'percentage' NOT NULL,
	"value" real DEFAULT 0 NOT NULL,
	"restaurant_id" text DEFAULT 'global' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"code" text,
	"show_as_banner" boolean DEFAULT false NOT NULL,
	"banner_cta_en" text,
	"banner_cta_ar" text,
	"expiry_date" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"code" text PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'percentage' NOT NULL,
	"value" real DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"description_en" text DEFAULT '' NOT NULL,
	"description_ar" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" text PRIMARY KEY NOT NULL,
	"image" text,
	"image_url" text,
	"video_url" text,
	"title_en" text DEFAULT '' NOT NULL,
	"title_ar" text DEFAULT '' NOT NULL,
	"subtitle_en" text,
	"subtitle_ar" text,
	"button_text_en" text,
	"button_text_ar" text,
	"link" text,
	"active" boolean DEFAULT true NOT NULL,
	"type" text DEFAULT 'homepage' NOT NULL,
	"restaurant_id" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer DEFAULT 1 PRIMARY KEY NOT NULL,
	"slogan_en" text DEFAULT 'Order food from the best restaurants' NOT NULL,
	"slogan_ar" text DEFAULT 'اطلب الطعام من أفضل المطاعم' NOT NULL,
	"homepage_bg_image" text,
	"homepage_bg_type" text DEFAULT 'color' NOT NULL,
	"homepage_overlay_opacity" real DEFAULT 0.4 NOT NULL,
	"homepage_overlay_color" text DEFAULT 'rgba(0,0,0,0.4)' NOT NULL,
	"primary_color" text DEFAULT '#FF7A00' NOT NULL,
	"show_calories" boolean DEFAULT true NOT NULL,
	"platform_name_en" text DEFAULT 'Mat''ami' NOT NULL,
	"platform_name_ar" text DEFAULT 'مطعمي' NOT NULL,
	"platform_logo_url" text,
	"logo_size" text DEFAULT 'md' NOT NULL,
	"font_family" text,
	"ar_font_family" text,
	"font_size_scale" real DEFAULT 1 NOT NULL,
	"home_columns" integer DEFAULT 2 NOT NULL,
	"home_sections_config" jsonb,
	"nav_items_config" jsonb,
	"restaurant_order" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_id" text NOT NULL,
	"restaurant_id" text NOT NULL,
	"restaurant_name" text NOT NULL,
	"branch_id" text NOT NULL,
	"branch_name" text NOT NULL,
	"items" jsonb NOT NULL,
	"total" real DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'delivery' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"delivery_address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"location" text,
	"notes" text,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" real DEFAULT 0 NOT NULL,
	"last_order_date" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "modifier_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"min_select" integer DEFAULT 0 NOT NULL,
	"max_select" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modifier_options" (
	"id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"price_addition" real DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "add_ons" (
	"id" text PRIMARY KEY NOT NULL,
	"restaurant_id" text NOT NULL,
	"name_en" text NOT NULL,
	"name_ar" text NOT NULL,
	"price" real DEFAULT 0 NOT NULL,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "item_modifier_links" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"group_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_item_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"item_id" text NOT NULL,
	"price" real,
	"is_available" boolean DEFAULT true NOT NULL,
	"schedule" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branch_category_overrides" (
	"id" text PRIMARY KEY NOT NULL,
	"branch_id" text NOT NULL,
	"category_id" text NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
