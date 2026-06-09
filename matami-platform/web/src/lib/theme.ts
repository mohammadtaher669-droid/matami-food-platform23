/**
 * Theme engine: converts a restaurant theme document (JSON, produced by the
 * theme builder) into CSS variables. One renderer powers the storefront, the
 * builder live preview, and the template gallery.
 */

export interface ThemeDoc {
  colors?: Partial<{
    primary: string;
    primaryFg: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
  }>;
  font?: string;
  radius?: "sm" | "md" | "lg" | "full";
  header?: { style?: string; showSearch?: boolean; sticky?: boolean };
  footer?: { showSocials?: boolean; showContact?: boolean; note_en?: string; note_ar?: string };
  hero?: { style?: string; overlay?: boolean };
  buttons?: { style?: "solid" | "outline" | "pill" };
  backgroundUrl?: string;
  layout?: "grid" | "list";
}

export const FONT_STACKS: Record<string, string> = {
  cairo: "'Cairo', sans-serif",
  tajawal: "'Tajawal', sans-serif",
  almarai: "'Almarai', sans-serif",
  "ibm-plex-arabic": "'IBM Plex Sans Arabic', sans-serif",
};

const RADII = { sm: "6px", md: "10px", lg: "16px", full: "24px" };

export const DEFAULT_THEME: Required<Pick<ThemeDoc, "colors">> & ThemeDoc = {
  colors: {
    primary: "#16a34a",
    primaryFg: "#ffffff",
    bg: "#fafaf9",
    surface: "#ffffff",
    text: "#1c1917",
    muted: "#78716c",
    accent: "#f59e0b",
  },
  font: "cairo",
  radius: "lg",
  header: { style: "classic", showSearch: true, sticky: true },
  footer: { showSocials: true, showContact: true, note_en: "", note_ar: "" },
  hero: { style: "banner", overlay: true },
  buttons: { style: "solid" },
  backgroundUrl: "",
  layout: "grid",
};

export function themeToCssVars(doc: ThemeDoc | null | undefined): Record<string, string> {
  const t = doc ?? {};
  const c = { ...DEFAULT_THEME.colors, ...(t.colors ?? {}) };
  return {
    "--th-primary": c.primary!,
    "--th-primary-fg": c.primaryFg!,
    "--th-bg": c.bg!,
    "--th-surface": c.surface!,
    "--th-text": c.text!,
    "--th-muted": c.muted!,
    "--th-accent": c.accent!,
    "--th-font": FONT_STACKS[t.font ?? "cairo"] ?? FONT_STACKS.cairo!,
    "--th-radius": RADII[t.radius ?? "lg"],
    "--th-btn-radius": (t.buttons?.style ?? "solid") === "pill" ? "999px" : RADII[t.radius ?? "lg"],
  };
}

export interface HomepageSection {
  key: string;
  enabled: boolean;
  [extra: string]: unknown;
}

export const SECTION_LABELS: Record<string, [string, string]> = {
  hero: ["Hero banner", "البانر الرئيسي"],
  categories: ["Featured categories", "التصنيفات"],
  "featured-products": ["Featured products", "الأطباق المميزة"],
  offers: ["Offers", "العروض"],
  "promo-blocks": ["Promo blocks", "بلوكات ترويجية"],
  testimonials: ["Testimonials", "آراء العملاء"],
  socials: ["Social links", "روابط التواصل"],
};

export const DEFAULT_SECTIONS: HomepageSection[] = [
  { key: "hero", enabled: true },
  { key: "categories", enabled: true },
  { key: "featured-products", enabled: true },
  { key: "offers", enabled: true },
  { key: "promo-blocks", enabled: false },
  { key: "testimonials", enabled: true },
  { key: "socials", enabled: true },
];
