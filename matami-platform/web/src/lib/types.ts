/** API payload types shared across the storefront pages. */
import type { ThemeDoc, HomepageSection } from "./theme";

export interface MarketRestaurant {
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  logoUrl: string;
  coverUrl: string;
  isFeatured: boolean;
  currency: string;
  branchCount: number;
  rating: number | null;
  ratingCount: number;
}

export interface StoreZone {
  id: string;
  name_en: string;
  name_ar: string;
  type: "POLYGON" | "RADIUS";
  polygon: Array<[number, number]> | null;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
  fee: number;
  minOrder: number;
  freeOver: number | null;
  openNow: boolean;
}

export interface StoreBranch {
  id: string;
  name_en: string;
  name_ar: string;
  phone: string;
  address_en: string;
  address_ar: string;
  lat: number | null;
  lng: number | null;
  openingHours: Record<string, unknown>;
  zones: StoreZone[];
}

export interface StoreVariant {
  id: string;
  name_en: string;
  name_ar: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface StoreAddonGroup {
  id: string;
  name_en: string;
  name_ar: string;
  minSelect: number;
  maxSelect: number;
  addons: Array<{ id: string; name_en: string; name_ar: string; price: number }>;
}

export interface StoreProduct {
  id: string;
  categoryId: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  imageUrl: string;
  price: number;
  compareAtPrice: number | null;
  calories: number | null;
  isFeatured: boolean;
  tags: string[];
  trackStock: boolean;
  variants: StoreVariant[];
  addonGroups: StoreAddonGroup[];
  availability: Array<{ branchId: string; isAvailable: boolean; stockQty: number }>;
}

export interface StoreCategory {
  id: string;
  name_en: string;
  name_ar: string;
  imageUrl: string;
  isFeatured: boolean;
}

export interface StoreOffer {
  id: string;
  title_en: string;
  title_ar: string;
  description_en: string;
  description_ar: string;
  imageUrl: string;
  type: "PERCENT_OFF" | "FIXED_OFF" | "FREE_DELIVERY";
  value: number;
  minOrder: number;
}

export interface StoreReview {
  id: string;
  rating: number;
  comment: string;
  reply: string;
  customerName: string;
  createdAt: string;
}

export interface StorePayload {
  restaurant: {
    slug: string;
    name_en: string;
    name_ar: string;
    description_en: string;
    description_ar: string;
    logoUrl: string;
    coverUrl: string;
    bannerMobile: string;
    bannerDesktop: string;
    phone: string;
    whatsapp: string;
    website: string;
    currency: string;
    vatRate: number;
    theme: ThemeDoc;
    homepage: HomepageSection[];
    socials: Record<string, string>;
    settings: { orderingEnabled: boolean; loyalty: { enabled?: boolean; earnPerCurrency?: number; redeemPerPoint?: number } | null };
    subscriptionActive: boolean;
  };
  branches: StoreBranch[];
  categories: StoreCategory[];
  products: StoreProduct[];
  offers: StoreOffer[];
  reviews: StoreReview[];
}

export interface TrackedOrder {
  orderNo: number;
  status: string;
  type: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  addressText: string;
  scheduledAt: string | null;
  driverName: string;
  driverPhone: string;
  cancelReason: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  vatAmount: number;
  total: number;
  loyaltyEarned: number;
  createdAt: string;
  items: Array<{
    name_en: string; name_ar: string; variant_en: string; variant_ar: string;
    qty: number; unitPrice: number; lineTotal: number;
    addons: Array<{ name_en: string; name_ar: string; price: number }>; notes: string;
  }>;
  timeline: Array<{ status: string; note: string; at: string }>;
  branch: { name_en: string; name_ar: string; phone: string };
}
