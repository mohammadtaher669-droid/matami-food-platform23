// ============================================================
// CENTRAL LOCALSTORAGE STORE
// ============================================================

export interface Restaurant {
  id: string;
  name_en: string;
  name_ar: string;
  logo: string;
  logoType: "emoji" | "image";
  color: string;
  description_en: string;
  description_ar: string;
  cover_image?: string;
  tagline_en?: string;
  tagline_ar?: string;
  bg_image?: string;
  overlay_color?: string;
  overlay_opacity?: number;
}

export interface DeliveryFeeTier {
  max_km: number;
  fee: number;
}

export interface Branch {
  id: string;
  restaurant_id: string;
  name_en: string;
  name_ar: string;
  whatsapp: string;
  open: string;
  close: string;
  delivery_fee: number;
  delivery_time?: number;
  address_en: string;
  address_ar: string;
  is_delivery_enabled?: boolean;
  pickup_enabled?: boolean;
  pickup_time?: number;
  min_order_delivery?: number;
  delivery_fee_tiers?: DeliveryFeeTier[];
  delivery_type?: "radius" | "polygon";
  center_lat?: number;
  center_lng?: number;
  delivery_radius_km?: number;
  polygon_coordinates?: { lat: number; lng: number }[];
  google_maps_url?: string;
}

export interface Category {
  id: string;
  restaurant_id: string;
  name_en: string;
  name_ar: string;
  sort_order: number;
  hidden?: boolean;
  featured?: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  price: number;
  image?: string;
  image_url?: string;
  calories?: number;
  is_available: boolean;
  is_popular: boolean;
  is_new: boolean;
  is_best_seller?: boolean;
  sort_order?: number;
  hidden?: boolean;
  featured?: boolean;
  pinned?: boolean;
  image_ai_generated?: boolean;
  image_locked?: boolean;
}

export interface Offer {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  image?: string;
  image_url?: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  restaurant_id: string | "global";
  active: boolean;
  code?: string;
  show_as_banner?: boolean;
  banner_cta_en?: string;
  banner_cta_ar?: string;
  expiry_date?: string;
  sort_order?: number;
}

export interface Coupon {
  code: string;
  type: "percentage" | "fixed" | "free_delivery";
  value: number;
  active: boolean;
  description_en: string;
  description_ar: string;
}

export interface Review {
  id: string;
  name: string;
  rating: number;
  comment: string;
  approved: boolean;
  timestamp: string;
}

export interface OrderItem {
  item_id?: string;
  name_en: string;
  name_ar: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customer_id: string;
  restaurant_id: string;
  restaurant_name: string;
  branch_id: string;
  branch_name: string;
  items: OrderItem[];
  total: number;
  date: string;
  type: "delivery" | "pickup";
  delivery_address?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  location?: string;
  notes?: string;
  total_orders: number;
  last_order_date: string;
}

export interface Banner {
  id: string;
  image?: string;
  image_url?: string;
  video_url?: string;
  title_en: string;
  title_ar: string;
  subtitle_en?: string;
  subtitle_ar?: string;
  button_text_en?: string;
  button_text_ar?: string;
  link?: string;
  active: boolean;
  type: "homepage" | "restaurant" | "offer";
  restaurant_id?: string;
  sort_order: number;
}

export interface HomeSectionConfig {
  id: string;
  sort_order: number;
  hidden?: boolean;
}

export interface NavItemConfig {
  id: string;
  sort_order: number;
  hidden?: boolean;
}

export interface AppSettings {
  slogan_en: string;
  slogan_ar: string;
  homepage_bg_image?: string;
  homepage_bg_type: "color" | "image" | "gradient";
  homepage_overlay_opacity: number;
  homepage_overlay_color: string;
  primary_color?: string;
  show_calories?: boolean;
  bg_color?: string;
  text_color?: string;
  card_color?: string;
  font_family?: string;
  ar_font_family?: string;
  font_size_scale?: number;
  logo_size?: "sm" | "md" | "lg";
  platform_logo_url?: string;
  platform_name_en?: string;
  platform_name_ar?: string;
  card_radius?: "sharp" | "rounded" | "pill";
  layout_density?: "compact" | "normal" | "spacious";
  menu_display_mode?: "grid" | "list" | "compact_grid";
  image_quality?: number;
  border_style?: "none" | "subtle" | "strong";
  active_template?: string;
  // Content control
  home_sections_config?: HomeSectionConfig[];
  nav_items_config?: NavItemConfig[];
  restaurant_order?: string[];
  home_columns?: number;
  bestseller_style?: "scroll" | "grid";
  shadow_level?: "none" | "soft" | "medium" | "strong";
}

// ── Shared metadata for home sections and nav items ──────────────────────────

export const HOME_SECTION_META = [
  { id: "banners",         label_en: "Hero Banner",         label_ar: "البانر الرئيسي",    icon: "🖼️", default_order: 0 },
  { id: "restaurants",     label_en: "Restaurants",         label_ar: "المطاعم",            icon: "🍽️", default_order: 1 },
  { id: "best_sellers",    label_en: "Best Sellers",        label_ar: "الأكثر مبيعاً",      icon: "🔥", default_order: 2 },
  { id: "recommendations", label_en: "Recommendations",    label_ar: "التوصيات الذكية",     icon: "✨", default_order: 3 },
  { id: "categories",      label_en: "Browse by Category", label_ar: "تصفح حسب الفئة",    icon: "🏷️", default_order: 4 },
  { id: "offers_grid",     label_en: "Offers & Discounts", label_ar: "العروض والخصومات",   icon: "🎁", default_order: 5 },
] as const;

export const NAV_ITEM_META = [
  { id: "home",      label_en: "Home",      label_ar: "الرئيسية", href: "/",          essential: true  },
  { id: "cart",      label_en: "Cart",      label_ar: "السلة",    href: "/cart",       essential: true  },
  { id: "offers",    label_en: "Offers",    label_ar: "العروض",   href: "/offers",     essential: false },
  { id: "favorites", label_en: "Favorites", label_ar: "المفضلة", href: "/favorites",  essential: false },
  { id: "profile",   label_en: "Profile",   label_ar: "حسابي",   href: "/profile",    essential: false },
] as const;

export interface BranchItemOverride {
  branch_id: string;
  item_id: string;
  status: "available" | "out_of_stock" | "hidden";
  price_override?: number;
  schedule?: {
    enabled: boolean;
    days: number[];
    time_start: string;
    time_end: string;
  };
}

export interface BranchCategoryOverride {
  branch_id: string;
  category_id: string;
  hidden: boolean;
}

export interface AnalyticsEvent {
  type: "view" | "click" | "add_to_cart" | "order" | "page_visit";
  item_id?: string;
  restaurant_id?: string;
  page?: string;
  timestamp: number;
  hour: number;
}

export interface UserBehavior {
  viewed_items: string[];
  ordered_items: string[];
  cart_items: string[];
  favorite_category?: string;
  last_seen: number;
}

export interface ModifierGroup {
  id: string;
  menu_item_id?: string;
  name_en: string;
  name_ar: string;
  type: "single" | "multi";
  min_selections: number;
  max_selections: number;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface ModifierOption {
  id: string;
  group_id: string;
  name_en: string;
  name_ar: string;
  price_addition: number;
  image?: string;
  is_available: boolean;
  sort_order: number;
}

export interface AddOn {
  id: string;
  menu_item_id: string;
  name_en: string;
  name_ar: string;
  price: number;
  image?: string;
  is_free: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface ItemModifierLink {
  id: string;
  item_id: string;
  group_id: string;
  sort_order: number;
}

// ============================================================
// KEYS
// ============================================================
const KEYS = {
  restaurants: "store_restaurants",
  branches: "store_branches",
  categories: "store_categories",
  menuItems: "store_menu_items",
  offers: "store_offers",
  coupons: "store_coupons",
  reviews: "store_reviews",
  customers: "store_customers",
  orders: "store_orders",
  banners: "store_banners",
  settings: "store_app_settings",
  analytics: "store_analytics_events",
  userBehavior: "store_user_behavior",
  initialized: "store_initialized",
  branchItemOverrides: "store_branch_item_overrides",
  branchCatOverrides: "store_branch_cat_overrides",
  modifierGroups: "store_modifier_groups",
  modifierOptions: "store_modifier_options",
  addOns: "store_add_ons",
  itemModifierLinks: "store_item_modifier_links",
};

// ============================================================
// HELPERS — in-memory store backed by REST API
// ============================================================

/** Mutable in-memory arrays keyed by KEYS values */
const _mem: Record<string, any[]> = {};
/** Mutable in-memory singletons (e.g. settings) */
const _memOne: Record<string, any> = {};

/** Admin JWT — sessionStorage persists across navigations within a tab */
export function getAdminToken(): string | null {
  return sessionStorage.getItem("admin_token");
}
export function setAdminToken(token: string | null): void {
  if (token) sessionStorage.setItem("admin_token", token);
  else sessionStorage.removeItem("admin_token");
}

/** Store keys that are backed by the PostgreSQL REST API */
const API_KEYS = new Set<string>([
  "store_restaurants", "store_branches", "store_categories", "store_menu_items",
  "store_offers", "store_coupons", "store_banners", "store_app_settings",
  "store_branch_item_overrides", "store_branch_cat_overrides",
  "store_modifier_groups", "store_modifier_options", "store_add_ons",
  "store_item_modifier_links",
]);

/** Debounce handle for bulk API sync */
let _syncTimer: ReturnType<typeof setTimeout> | null = null;

function queueSync(): void {
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => void _pushToApi(), 4000);
}

/**
 * Admin-facing publish: push all in-memory catalog to /api/data.
 * Returns { ok, error } so callers can show success/failure UI.
 */
export async function publishCatalog(): Promise<{ ok: boolean; error?: string }> {
  const token = getAdminToken();
  if (!token) return { ok: false, error: "Not logged in as admin" };
  try {
    const snapshot = {
      restaurants:               _mem["store_restaurants"]          ?? [],
      branches:                  _mem["store_branches"]             ?? [],
      categories:                _mem["store_categories"]           ?? [],
      menu_items:                _mem["store_menu_items"]           ?? [],
      offers:                    _mem["store_offers"]               ?? [],
      coupons:                   _mem["store_coupons"]              ?? [],
      banners:                   _mem["store_banners"]              ?? [],
      modifier_groups:           _mem["store_modifier_groups"]      ?? [],
      modifier_options:          _mem["store_modifier_options"]     ?? [],
      add_ons:                   _mem["store_add_ons"]              ?? [],
      item_modifier_links:       _mem["store_item_modifier_links"]  ?? [],
      branch_item_overrides:     _mem["store_branch_item_overrides"]    ?? [],
      branch_category_overrides: _mem["store_branch_cat_overrides"] ?? [],
      settings:                  _memOne["store_app_settings"] ?? undefined,
    };
    const res = await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(snapshot),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({})) as { error?: string };
    return { ok: false, error: body.error ?? `Server error ${res.status}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

export async function _pushToApi(): Promise<void> {
  const token = getAdminToken();
  if (!token) return;
  const snapshot = {
    restaurants:               _mem["store_restaurants"]          ?? [],
    branches:                  _mem["store_branches"]             ?? [],
    categories:                _mem["store_categories"]           ?? [],
    menu_items:                _mem["store_menu_items"]           ?? [],
    offers:                    _mem["store_offers"]               ?? [],
    coupons:                   _mem["store_coupons"]              ?? [],
    banners:                   _mem["store_banners"]              ?? [],
    modifier_groups:           _mem["store_modifier_groups"]      ?? [],
    modifier_options:          _mem["store_modifier_options"]     ?? [],
    add_ons:                   _mem["store_add_ons"]              ?? [],
    item_modifier_links:       _mem["store_item_modifier_links"]  ?? [],
    branch_item_overrides:     _mem["store_branch_item_overrides"]    ?? [],
    branch_category_overrides: _mem["store_branch_cat_overrides"] ?? [],
    settings:                  _memOne["store_app_settings"] ?? undefined,
  };
  try {
    await fetch("/api/data", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(snapshot),
    });
  } catch { /* silent — local state is still intact */ }
}

function read<T>(key: string): T[] {
  if (API_KEYS.has(key)) return (_mem[key] ?? []) as T[];
  try { return JSON.parse(localStorage.getItem(key) ?? "[]") as T[]; } catch { return []; }
}

function readOne<T>(key: string, fallback: T): T {
  if (_memOne[key] !== undefined) return _memOne[key] as T;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {}
  return fallback;
}

function write<T>(key: string, data: T[]): void {
  if (API_KEYS.has(key)) { _mem[key] = data; queueSync(); return; }
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

function writeOne<T>(key: string, data: T): void {
  _memOne[key] = data;
  if (key === "store_app_settings") queueSync();
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

export function dispatch(): void {
  window.dispatchEvent(new Event("store-updated"));
}

/**
 * Hydrates the in-memory store from the API on app startup.
 * Falls back to seeding from initStore.ts if the DB is empty or unreachable.
 */
/** Returns the full in-memory catalog snapshot (used by Admin export / Publish). */
export function getStoreSnapshot(): Record<string, any> {
  return {
    store_restaurants:           _mem["store_restaurants"]          ?? [],
    store_branches:              _mem["store_branches"]             ?? [],
    store_categories:            _mem["store_categories"]           ?? [],
    store_menu_items:            _mem["store_menu_items"]           ?? [],
    store_offers:                _mem["store_offers"]               ?? [],
    store_coupons:               _mem["store_coupons"]              ?? [],
    store_banners:               _mem["store_banners"]              ?? [],
    store_modifier_groups:       _mem["store_modifier_groups"]      ?? [],
    store_modifier_options:      _mem["store_modifier_options"]     ?? [],
    store_add_ons:               _mem["store_add_ons"]              ?? [],
    store_item_modifier_links:   _mem["store_item_modifier_links"]  ?? [],
    store_branch_item_overrides: _mem["store_branch_item_overrides"]    ?? [],
    store_branch_cat_overrides:  _mem["store_branch_cat_overrides"] ?? [],
    store_app_settings:          _memOne["store_app_settings"] ?? null,
  };
}

/**
 * Loads a full catalog snapshot (from JSON import or reset) into in-memory store.
 * Key names match the KEYS constants (store_restaurants, etc.).
 */
export function loadStoreSnapshot(snapshot: Record<string, any>): void {
  const arrayKeys = [
    "store_restaurants", "store_branches", "store_categories", "store_menu_items",
    "store_offers", "store_coupons", "store_banners", "store_modifier_groups",
    "store_modifier_options", "store_add_ons", "store_item_modifier_links",
    "store_branch_item_overrides", "store_branch_cat_overrides",
  ];
  for (const key of arrayKeys) {
    if (Array.isArray(snapshot[key])) _mem[key] = snapshot[key];
  }
  if (snapshot["store_app_settings"] && typeof snapshot["store_app_settings"] === "object") {
    _memOne["store_app_settings"] = snapshot["store_app_settings"];
  }
  dispatch();
}

export async function hydrateStore(): Promise<void> {
  try {
    const res = await fetch("/api/data");
    if (res.ok) {
      const d = (await res.json()) as Record<string, any>;
      const keyMap: Record<string, string> = {
        restaurants:               "store_restaurants",
        branches:                  "store_branches",
        categories:                "store_categories",
        menu_items:                "store_menu_items",
        offers:                    "store_offers",
        coupons:                   "store_coupons",
        banners:                   "store_banners",
        modifier_groups:           "store_modifier_groups",
        modifier_options:          "store_modifier_options",
        add_ons:                   "store_add_ons",
        item_modifier_links:       "store_item_modifier_links",
        branch_item_overrides:     "store_branch_item_overrides",
        branch_category_overrides: "store_branch_cat_overrides",
      };
      let hasData = false;
      for (const [apiKey, storeKey] of Object.entries(keyMap)) {
        if (Array.isArray(d[apiKey])) {
          _mem[storeKey] = d[apiKey];
          if (d[apiKey].length > 0) hasData = true;
        }
      }
      if (d.settings && typeof d.settings === "object") {
        _memOne["store_app_settings"] = d.settings;
        hasData = true;
      }
      if (hasData) { dispatch(); return; }
    }
  } catch { /* fall through to seed */ }

  // DB empty or unreachable — force re-seed into _mem, bypassing the stale
  // localStorage "store_initialized" flag that would skip seeding.
  localStorage.removeItem(KEYS.initialized);
  const { initializeStore } = await import("./initStore");
  initializeStore();
  dispatch(); // ensure components see the seeded data immediately
  // Attempt immediate push in case admin token already exists
  setTimeout(() => void _pushToApi(), 1500);
}

// ============================================================
// RESTAURANTS
// ============================================================
export const restaurantStore = {
  getAll: (): Restaurant[] => read<Restaurant>(KEYS.restaurants),
  getById: (id: string): Restaurant | undefined => read<Restaurant>(KEYS.restaurants).find((r) => r.id === id),
  save: (restaurant: Restaurant): void => {
    const all = read<Restaurant>(KEYS.restaurants);
    const idx = all.findIndex((r) => r.id === restaurant.id);
    if (idx >= 0) all[idx] = restaurant; else all.push(restaurant);
    write(KEYS.restaurants, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.restaurants, read<Restaurant>(KEYS.restaurants).filter((r) => r.id !== id));
    dispatch();
  },
  set: (restaurants: Restaurant[]): void => { write(KEYS.restaurants, restaurants); dispatch(); },
};

// ============================================================
// BRANCHES
// ============================================================
export const branchStore = {
  getAll: (): Branch[] => read<Branch>(KEYS.branches),
  getByRestaurant: (restaurantId: string): Branch[] => read<Branch>(KEYS.branches).filter((b) => b.restaurant_id === restaurantId),
  getById: (id: string): Branch | undefined => read<Branch>(KEYS.branches).find((b) => b.id === id),
  save: (branch: Branch): void => {
    const all = read<Branch>(KEYS.branches);
    const idx = all.findIndex((b) => b.id === branch.id);
    if (idx >= 0) all[idx] = branch; else all.push(branch);
    write(KEYS.branches, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.branches, read<Branch>(KEYS.branches).filter((b) => b.id !== id));
    dispatch();
  },
  set: (branches: Branch[]): void => { write(KEYS.branches, branches); dispatch(); },
};

// ============================================================
// CATEGORIES
// ============================================================
export const categoryStore = {
  getAll: (): Category[] => read<Category>(KEYS.categories).sort((a, b) => a.sort_order - b.sort_order),
  getByRestaurant: (restaurantId: string): Category[] =>
    read<Category>(KEYS.categories).filter((c) => c.restaurant_id === restaurantId).sort((a, b) => a.sort_order - b.sort_order),
  getById: (id: string): Category | undefined => read<Category>(KEYS.categories).find((c) => c.id === id),
  save: (category: Category): void => {
    const all = read<Category>(KEYS.categories);
    const idx = all.findIndex((c) => c.id === category.id);
    if (idx >= 0) all[idx] = category; else all.push(category);
    write(KEYS.categories, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.categories, read<Category>(KEYS.categories).filter((c) => c.id !== id));
    dispatch();
  },
  set: (categories: Category[]): void => { write(KEYS.categories, categories); dispatch(); },
};

// ============================================================
// MENU ITEMS
// ============================================================
function sortItems(items: MenuItem[]): MenuItem[] {
  return [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return (a.sort_order ?? 999) - (b.sort_order ?? 999);
  });
}

export const menuStore = {
  getAll: (): MenuItem[] => read<MenuItem>(KEYS.menuItems),
  getByRestaurant: (restaurantId: string): MenuItem[] => sortItems(read<MenuItem>(KEYS.menuItems).filter((m) => m.restaurant_id === restaurantId)),
  getByCategory: (categoryId: string): MenuItem[] => sortItems(read<MenuItem>(KEYS.menuItems).filter((m) => m.category_id === categoryId)),
  getPopular: (restaurantId: string): MenuItem[] => read<MenuItem>(KEYS.menuItems).filter((m) => m.restaurant_id === restaurantId && m.is_popular),
  getNew: (restaurantId: string): MenuItem[] => read<MenuItem>(KEYS.menuItems).filter((m) => m.restaurant_id === restaurantId && m.is_new),
  getById: (id: string): MenuItem | undefined => read<MenuItem>(KEYS.menuItems).find((m) => m.id === id),
  save: (item: MenuItem): void => {
    const all = read<MenuItem>(KEYS.menuItems);
    const idx = all.findIndex((m) => m.id === item.id);
    if (idx >= 0) all[idx] = item; else all.push(item);
    write(KEYS.menuItems, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.menuItems, read<MenuItem>(KEYS.menuItems).filter((m) => m.id !== id));
    dispatch();
  },
  set: (items: MenuItem[]): void => { write(KEYS.menuItems, items); dispatch(); },
};

// ============================================================
// OFFERS
// ============================================================
export const offerStore = {
  getAll: (): Offer[] => read<Offer>(KEYS.offers),
  getActive: (): Offer[] => {
    const now = Date.now();
    return read<Offer>(KEYS.offers).filter((o) => {
      if (!o.active) return false;
      if (o.expiry_date && new Date(o.expiry_date).getTime() < now) return false;
      return true;
    });
  },
  getByRestaurant: (restaurantId: string): Offer[] =>
    read<Offer>(KEYS.offers).filter((o) => o.active && (o.restaurant_id === restaurantId || o.restaurant_id === "global")),
  save: (offer: Offer): void => {
    const all = read<Offer>(KEYS.offers);
    const idx = all.findIndex((o) => o.id === offer.id);
    if (idx >= 0) all[idx] = offer; else all.push(offer);
    write(KEYS.offers, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.offers, read<Offer>(KEYS.offers).filter((o) => o.id !== id));
    dispatch();
  },
  set: (offers: Offer[]): void => { write(KEYS.offers, offers); dispatch(); },
};

// ============================================================
// COUPONS
// ============================================================
export const couponStore = {
  getAll: (): Coupon[] => read<Coupon>(KEYS.coupons),
  getActive: (): Coupon[] => read<Coupon>(KEYS.coupons).filter((c) => c.active),
  getByCode: (code: string): Coupon | undefined =>
    read<Coupon>(KEYS.coupons).find((c) => c.code.toUpperCase() === code.toUpperCase() && c.active),
  save: (coupon: Coupon): void => {
    const all = read<Coupon>(KEYS.coupons);
    const idx = all.findIndex((c) => c.code === coupon.code);
    if (idx >= 0) all[idx] = coupon; else all.push(coupon);
    write(KEYS.coupons, all);
    dispatch();
  },
  delete: (code: string): void => {
    write(KEYS.coupons, read<Coupon>(KEYS.coupons).filter((c) => c.code !== code));
    dispatch();
  },
  set: (coupons: Coupon[]): void => { write(KEYS.coupons, coupons); dispatch(); },
};

// ============================================================
// REVIEWS
// ============================================================
export const reviewStore = {
  getAll: (): Review[] => read<Review>(KEYS.reviews),
  getPending: (): Review[] => read<Review>(KEYS.reviews).filter((r) => !r.approved),
  getApproved: (): Review[] => read<Review>(KEYS.reviews).filter((r) => r.approved),
  save: (review: Review): void => {
    const all = read<Review>(KEYS.reviews);
    const idx = all.findIndex((r) => r.id === review.id);
    if (idx >= 0) all[idx] = review; else all.push(review);
    write(KEYS.reviews, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.reviews, read<Review>(KEYS.reviews).filter((r) => r.id !== id));
    dispatch();
  },
};

// ============================================================
// CUSTOMERS (CRM)
// ============================================================
export const customerStore = {
  getAll: (): Customer[] => read<Customer>(KEYS.customers),
  getById: (id: string): Customer | undefined => read<Customer>(KEYS.customers).find((c) => c.id === id),
  getByPhone: (phone: string): Customer | undefined =>
    read<Customer>(KEYS.customers).find((c) => c.phone.replace(/\s/g, "") === phone.replace(/\s/g, "")),
  save: (customer: Customer): void => {
    const all = read<Customer>(KEYS.customers);
    const idx = all.findIndex((c) => c.id === customer.id);
    if (idx >= 0) all[idx] = customer; else all.push(customer);
    write(KEYS.customers, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.customers, read<Customer>(KEYS.customers).filter((c) => c.id !== id));
    dispatch();
  },
};

// ============================================================
// ORDERS
// ============================================================
export const orderStore = {
  getAll: (): Order[] => read<Order>(KEYS.orders),
  getByCustomer: (customerId: string): Order[] =>
    read<Order>(KEYS.orders).filter((o) => o.customer_id === customerId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  getByRestaurant: (restaurantId: string): Order[] =>
    read<Order>(KEYS.orders).filter((o) => o.restaurant_id === restaurantId),
  save: (order: Order): void => {
    const all = read<Order>(KEYS.orders);
    const idx = all.findIndex((o) => o.id === order.id);
    if (idx >= 0) all[idx] = order; else all.push(order);
    write(KEYS.orders, all);
    dispatch();
  },
  saveCustomerOrder: (
    name: string,
    phone: string,
    location: string,
    order: Omit<Order, "customer_id">
  ): void => {
    const existing = customerStore.getByPhone(phone);
    const customerId = existing?.id || ("c_" + Math.random().toString(36).substring(2, 10));
    const now = new Date().toISOString();
    const customer: Customer = {
      id: customerId,
      name,
      phone,
      location: location || existing?.location,
      notes: existing?.notes,
      total_orders: (existing?.total_orders || 0) + 1,
      last_order_date: now,
    };
    customerStore.save(customer);
    const fullOrder: Order = { ...order, customer_id: customerId };
    const all = read<Order>(KEYS.orders);
    all.push(fullOrder);
    write(KEYS.orders, all);
    dispatch();
    // Persist to API (public endpoint — no token needed)
    fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...fullOrder, customer_name: name, customer_phone: phone, customer_address: location }),
    }).catch(() => {});
  },
};

// ============================================================
// BANNERS
// ============================================================
export const bannerStore = {
  getAll: (): Banner[] => read<Banner>(KEYS.banners).sort((a, b) => a.sort_order - b.sort_order),
  getActive: (type?: Banner["type"]): Banner[] => {
    const all = read<Banner>(KEYS.banners).filter((b) => b.active).sort((a, b) => a.sort_order - b.sort_order);
    if (type) return all.filter((b) => b.type === type);
    return all;
  },
  save: (banner: Banner): void => {
    const all = read<Banner>(KEYS.banners);
    const idx = all.findIndex((b) => b.id === banner.id);
    if (idx >= 0) all[idx] = banner; else all.push(banner);
    write(KEYS.banners, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.banners, read<Banner>(KEYS.banners).filter((b) => b.id !== id));
    dispatch();
  },
};

// ============================================================
// APP SETTINGS
// ============================================================
const DEFAULT_SETTINGS: AppSettings = {
  slogan_en: "Order food from the best restaurants",
  slogan_ar: "اطلب الطعام من أفضل المطاعم",
  homepage_bg_type: "image",
  homepage_bg_image: "/homepage-bg.jpg",
  homepage_overlay_opacity: 0.65,
  homepage_overlay_color: "#000000",
};

export const settingsStore = {
  get: (): AppSettings => {
    const stored = readOne<AppSettings>(KEYS.settings, DEFAULT_SETTINGS);
    if (stored.homepage_bg_type === "color" && !stored.homepage_bg_image) {
      return { ...stored, homepage_bg_type: "image", homepage_bg_image: "/homepage-bg.jpg", homepage_overlay_opacity: 0.65 };
    }
    return stored;
  },
  save: (settings: AppSettings): void => {
    writeOne(KEYS.settings, settings);
    dispatch();
  },
};

// ============================================================
// ANALYTICS
// ============================================================
export const analyticsStore = {
  track: (event: Omit<AnalyticsEvent, "timestamp" | "hour">): void => {
    try {
      const all = read<AnalyticsEvent>(KEYS.analytics);
      const now = new Date();
      all.push({ ...event, timestamp: now.getTime(), hour: now.getHours() });
      if (all.length > 2000) all.splice(0, all.length - 2000);
      write(KEYS.analytics, all);
    } catch {}
  },
  getAll: (): AnalyticsEvent[] => read<AnalyticsEvent>(KEYS.analytics),
  getSummary: () => {
    const events = read<AnalyticsEvent>(KEYS.analytics);
    const itemViews: Record<string, number> = {};
    const itemOrders: Record<string, number> = {};
    const restaurantViews: Record<string, number> = {};
    const hourCounts: Record<number, number> = {};
    let pageVisits = 0;
    let addToCartCount = 0;
    let orderCount = 0;

    for (const e of events) {
      if (e.type === "page_visit") pageVisits++;
      if (e.type === "view" && e.item_id) itemViews[e.item_id] = (itemViews[e.item_id] || 0) + 1;
      if (e.type === "order" && e.item_id) {
        itemOrders[e.item_id] = (itemOrders[e.item_id] || 0) + 1;
        orderCount++;
      }
      if (e.type === "add_to_cart") addToCartCount++;
      if (e.restaurant_id) restaurantViews[e.restaurant_id] = (restaurantViews[e.restaurant_id] || 0) + 1;
      if (e.type === "page_visit" || e.type === "order") {
        hourCounts[e.hour] = (hourCounts[e.hour] || 0) + 1;
      }
    }

    const conversionRate = pageVisits > 0 ? ((orderCount / pageVisits) * 100).toFixed(1) : "0";
    return { pageVisits, addToCartCount, orderCount, conversionRate, itemViews, itemOrders, restaurantViews, hourCounts };
  },
  clear: (): void => { write(KEYS.analytics, []); dispatch(); },
};

// ============================================================
// USER BEHAVIOR (per-browser, no dispatch needed)
// ============================================================
export const userBehaviorStore = {
  get: (): UserBehavior => readOne<UserBehavior>(KEYS.userBehavior, {
    viewed_items: [],
    ordered_items: [],
    cart_items: [],
    last_seen: Date.now(),
  }),
  trackView: (itemId: string): void => {
    const b = userBehaviorStore.get();
    if (!b.viewed_items.includes(itemId)) {
      b.viewed_items = [itemId, ...b.viewed_items].slice(0, 50);
    }
    b.last_seen = Date.now();
    writeOne(KEYS.userBehavior, b);
  },
  trackOrder: (itemIds: string[]): void => {
    const b = userBehaviorStore.get();
    for (const id of itemIds) {
      if (!b.ordered_items.includes(id)) b.ordered_items.push(id);
    }
    b.ordered_items = b.ordered_items.slice(-30);
    b.last_seen = Date.now();
    writeOne(KEYS.userBehavior, b);
  },
  getRecommendations: (allItems: MenuItem[], excludeIds?: string[], limit = 8): MenuItem[] => {
    const b = userBehaviorStore.get();
    const orderedSet = new Set(b.ordered_items);
    const viewedSet = new Set(b.viewed_items);
    const excludeSet = new Set(excludeIds || []);

    const scored = allItems
      .filter((m) => m.is_available && !excludeSet.has(m.id))
      .map((m) => {
        let score = 0;
        if (orderedSet.has(m.id)) score += 10;
        if (viewedSet.has(m.id)) score += 3;
        if (m.is_popular) score += 5;
        if (m.is_new) score += 2;
        return { m, score };
      })
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((s) => s.m);
  },
};

// ============================================================
// BRANCH ITEM OVERRIDES
// ============================================================
export function checkSchedule(schedule?: BranchItemOverride["schedule"]): boolean {
  if (!schedule?.enabled) return true;
  const now = new Date();
  const day = now.getDay();
  if (schedule.days.length > 0 && !schedule.days.includes(day)) return false;
  const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (schedule.time_start && nowTime < schedule.time_start) return false;
  if (schedule.time_end && nowTime > schedule.time_end) return false;
  return true;
}

export const branchItemOverrideStore = {
  getAll: (): BranchItemOverride[] => read<BranchItemOverride>(KEYS.branchItemOverrides),
  getForBranch: (branchId: string): BranchItemOverride[] =>
    read<BranchItemOverride>(KEYS.branchItemOverrides).filter((o) => o.branch_id === branchId),
  get: (branchId: string, itemId: string): BranchItemOverride | undefined =>
    read<BranchItemOverride>(KEYS.branchItemOverrides).find((o) => o.branch_id === branchId && o.item_id === itemId),
  set: (override: BranchItemOverride): void => {
    const all = read<BranchItemOverride>(KEYS.branchItemOverrides);
    const idx = all.findIndex((o) => o.branch_id === override.branch_id && o.item_id === override.item_id);
    if (idx >= 0) all[idx] = override; else all.push(override);
    write(KEYS.branchItemOverrides, all);
    dispatch();
  },
  delete: (branchId: string, itemId: string): void => {
    write(
      KEYS.branchItemOverrides,
      read<BranchItemOverride>(KEYS.branchItemOverrides).filter(
        (o) => !(o.branch_id === branchId && o.item_id === itemId)
      )
    );
    dispatch();
  },
  copyFromBranch: (sourceBranchId: string, targetBranchId: string): void => {
    const all = read<BranchItemOverride>(KEYS.branchItemOverrides);
    const withoutTarget = all.filter((o) => o.branch_id !== targetBranchId);
    const copies = all
      .filter((o) => o.branch_id === sourceBranchId)
      .map((o) => ({ ...o, branch_id: targetBranchId }));
    write(KEYS.branchItemOverrides, [...withoutTarget, ...copies]);
    dispatch();
  },
};

export const branchCategoryOverrideStore = {
  getAll: (): BranchCategoryOverride[] => read<BranchCategoryOverride>(KEYS.branchCatOverrides),
  getForBranch: (branchId: string): BranchCategoryOverride[] =>
    read<BranchCategoryOverride>(KEYS.branchCatOverrides).filter((o) => o.branch_id === branchId),
  get: (branchId: string, catId: string): BranchCategoryOverride | undefined =>
    read<BranchCategoryOverride>(KEYS.branchCatOverrides).find((o) => o.branch_id === branchId && o.category_id === catId),
  set: (override: BranchCategoryOverride): void => {
    const all = read<BranchCategoryOverride>(KEYS.branchCatOverrides);
    const idx = all.findIndex((o) => o.branch_id === override.branch_id && o.category_id === override.category_id);
    if (idx >= 0) all[idx] = override; else all.push(override);
    write(KEYS.branchCatOverrides, all);
    dispatch();
  },
  delete: (branchId: string, catId: string): void => {
    write(
      KEYS.branchCatOverrides,
      read<BranchCategoryOverride>(KEYS.branchCatOverrides).filter(
        (o) => !(o.branch_id === branchId && o.category_id === catId)
      )
    );
    dispatch();
  },
};

// ============================================================
// MODIFIER GROUPS
// ============================================================
export const modifierGroupStore = {
  getAll: (): ModifierGroup[] => read<ModifierGroup>(KEYS.modifierGroups).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  getByItem: (menuItemId: string): ModifierGroup[] => {
    const allGroups = read<ModifierGroup>(KEYS.modifierGroups);
    const legacyGroups = allGroups.filter((g) => g.menu_item_id === menuItemId);
    const legacyIds = new Set(legacyGroups.map((g) => g.id));
    const links = read<ItemModifierLink>(KEYS.itemModifierLinks)
      .filter((l) => l.item_id === menuItemId)
      .sort((a, b) => a.sort_order - b.sort_order);
    const linkedGroups = links
      .map((l) => allGroups.find((g) => g.id === l.group_id))
      .filter((g): g is ModifierGroup => !!g && !legacyIds.has(g.id));
    return [...linkedGroups, ...legacyGroups];
  },
  getById: (id: string): ModifierGroup | undefined =>
    read<ModifierGroup>(KEYS.modifierGroups).find((g) => g.id === id),
  save: (group: ModifierGroup): void => {
    const all = read<ModifierGroup>(KEYS.modifierGroups);
    const idx = all.findIndex((g) => g.id === group.id);
    if (idx >= 0) all[idx] = group; else all.push(group);
    write(KEYS.modifierGroups, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.modifierGroups, read<ModifierGroup>(KEYS.modifierGroups).filter((g) => g.id !== id));
    write(KEYS.modifierOptions, read<ModifierOption>(KEYS.modifierOptions).filter((o) => o.group_id !== id));
    write(KEYS.itemModifierLinks, read<ItemModifierLink>(KEYS.itemModifierLinks).filter((l) => l.group_id !== id));
    dispatch();
  },
  set: (groups: ModifierGroup[]): void => { write(KEYS.modifierGroups, groups); dispatch(); },
};

// ============================================================
// MODIFIER OPTIONS
// ============================================================
export const modifierOptionStore = {
  getAll: (): ModifierOption[] => read<ModifierOption>(KEYS.modifierOptions),
  getByGroup: (groupId: string): ModifierOption[] =>
    read<ModifierOption>(KEYS.modifierOptions)
      .filter((o) => o.group_id === groupId)
      .sort((a, b) => a.sort_order - b.sort_order),
  getById: (id: string): ModifierOption | undefined =>
    read<ModifierOption>(KEYS.modifierOptions).find((o) => o.id === id),
  save: (option: ModifierOption): void => {
    const all = read<ModifierOption>(KEYS.modifierOptions);
    const idx = all.findIndex((o) => o.id === option.id);
    if (idx >= 0) all[idx] = option; else all.push(option);
    write(KEYS.modifierOptions, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.modifierOptions, read<ModifierOption>(KEYS.modifierOptions).filter((o) => o.id !== id));
    dispatch();
  },
  set: (options: ModifierOption[]): void => { write(KEYS.modifierOptions, options); dispatch(); },
};

// ============================================================
// ADD-ONS
// ============================================================
export const addOnStore = {
  getAll: (): AddOn[] => read<AddOn>(KEYS.addOns),
  getByItem: (menuItemId: string): AddOn[] =>
    read<AddOn>(KEYS.addOns)
      .filter((a) => a.menu_item_id === menuItemId)
      .sort((a, b) => a.sort_order - b.sort_order),
  getById: (id: string): AddOn | undefined =>
    read<AddOn>(KEYS.addOns).find((a) => a.id === id),
  save: (addOn: AddOn): void => {
    const all = read<AddOn>(KEYS.addOns);
    const idx = all.findIndex((a) => a.id === addOn.id);
    if (idx >= 0) all[idx] = addOn; else all.push(addOn);
    write(KEYS.addOns, all);
    dispatch();
  },
  delete: (id: string): void => {
    write(KEYS.addOns, read<AddOn>(KEYS.addOns).filter((a) => a.id !== id));
    dispatch();
  },
  set: (addOns: AddOn[]): void => { write(KEYS.addOns, addOns); dispatch(); },
};

// ============================================================
// ITEM MODIFIER LINKS
// ============================================================
export const itemModifierLinkStore = {
  getAll: (): ItemModifierLink[] => read<ItemModifierLink>(KEYS.itemModifierLinks),
  getByItem: (itemId: string): ItemModifierLink[] =>
    read<ItemModifierLink>(KEYS.itemModifierLinks)
      .filter((l) => l.item_id === itemId)
      .sort((a, b) => a.sort_order - b.sort_order),
  getByGroup: (groupId: string): ItemModifierLink[] =>
    read<ItemModifierLink>(KEYS.itemModifierLinks).filter((l) => l.group_id === groupId),
  link: (itemId: string, groupId: string): void => {
    const all = read<ItemModifierLink>(KEYS.itemModifierLinks);
    if (all.find((l) => l.item_id === itemId && l.group_id === groupId)) return;
    const itemLinks = all.filter((l) => l.item_id === itemId);
    all.push({ id: `iml-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, item_id: itemId, group_id: groupId, sort_order: itemLinks.length });
    write(KEYS.itemModifierLinks, all);
    dispatch();
  },
  unlink: (itemId: string, groupId: string): void => {
    write(KEYS.itemModifierLinks, read<ItemModifierLink>(KEYS.itemModifierLinks).filter((l) => !(l.item_id === itemId && l.group_id === groupId)));
    dispatch();
  },
  reorder: (itemId: string, orderedGroupIds: string[]): void => {
    const all = read<ItemModifierLink>(KEYS.itemModifierLinks);
    orderedGroupIds.forEach((gid, i) => {
      const link = all.find((l) => l.item_id === itemId && l.group_id === gid);
      if (link) link.sort_order = i;
    });
    write(KEYS.itemModifierLinks, all);
    dispatch();
  },
};

// ============================================================
// INITIALIZATION
// ============================================================
export function isInitialized(): boolean {
  return localStorage.getItem(KEYS.initialized) === "true";
}

export function markInitialized(): void {
  localStorage.setItem(KEYS.initialized, "true");
}

export function resetStore(): void {
  // Clear in-memory state
  for (const key of Object.keys(_mem)) delete _mem[key];
  for (const key of Object.keys(_memOne)) delete _memOne[key];
  // Clear localStorage fallbacks (analytics, behavior, etc.)
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  localStorage.removeItem("matami_modifiers_migrated");
  dispatch();
}
