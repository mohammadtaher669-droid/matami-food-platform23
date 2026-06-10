/**
 * The 8 shipped restaurant theme templates. A theme document drives CSS
 * variables + layout flags in the SPA (see web/src/lib/theme.ts).
 */

export interface ThemeDocument {
  colors: {
    primary: string;
    primaryFg: string;
    bg: string;
    surface: string;
    text: string;
    muted: string;
    accent: string;
  };
  font: "cairo" | "tajawal" | "almarai" | "ibm-plex-arabic";
  radius: "sm" | "md" | "lg" | "full";
  header: { style: "classic" | "centered" | "minimal"; showSearch: boolean; sticky: boolean };
  footer: { showSocials: boolean; showContact: boolean; note_en: string; note_ar: string };
  hero: { style: "banner" | "carousel" | "split"; overlay: boolean };
  buttons: { style: "solid" | "outline" | "pill" };
  backgroundUrl: string;
  layout: "grid" | "list";
}

export const DEFAULT_HOMEPAGE_SECTIONS = [
  { key: "hero", enabled: true },
  { key: "categories", enabled: true },
  { key: "featured-products", enabled: true },
  { key: "offers", enabled: true },
  { key: "promo-blocks", enabled: false, blocks: [] },
  { key: "testimonials", enabled: true },
  { key: "socials", enabled: true },
];

function doc(overrides: Partial<ThemeDocument> & { colors: ThemeDocument["colors"] }): ThemeDocument {
  return {
    font: "cairo",
    radius: "lg",
    header: { style: "classic", showSearch: true, sticky: true },
    footer: { showSocials: true, showContact: true, note_en: "", note_ar: "" },
    hero: { style: "banner", overlay: true },
    buttons: { style: "solid" },
    backgroundUrl: "",
    layout: "grid",
    ...overrides,
  };
}

export const THEME_TEMPLATES: Array<{
  key: string;
  name_en: string;
  name_ar: string;
  document: ThemeDocument;
}> = [
  {
    key: "bukhari",
    name_en: "Bukhari Restaurant",
    name_ar: "مطعم بخاري",
    document: doc({
      colors: { primary: "#8B4513", primaryFg: "#ffffff", bg: "#FBF6EE", surface: "#ffffff", text: "#2D1B0E", muted: "#8a7563", accent: "#C9A227" },
      font: "almarai",
      hero: { style: "split", overlay: false },
    }),
  },
  {
    key: "burger",
    name_en: "Burger Restaurant",
    name_ar: "مطعم برجر",
    document: doc({
      colors: { primary: "#E63946", primaryFg: "#ffffff", bg: "#141414", surface: "#1f1f1f", text: "#f5f5f5", muted: "#9ca3af", accent: "#FFB703" },
      font: "cairo",
      radius: "md",
      buttons: { style: "pill" },
    }),
  },
  {
    key: "pizza",
    name_en: "Pizza Restaurant",
    name_ar: "مطعم بيتزا",
    document: doc({
      colors: { primary: "#C1121F", primaryFg: "#ffffff", bg: "#FFF8F0", surface: "#ffffff", text: "#3a2a1a", muted: "#94806b", accent: "#2A9D8F" },
      font: "tajawal",
      hero: { style: "carousel", overlay: true },
    }),
  },
  {
    key: "cafe",
    name_en: "Cafe",
    name_ar: "كافيه",
    document: doc({
      colors: { primary: "#6F4E37", primaryFg: "#ffffff", bg: "#F7F3EE", surface: "#ffffff", text: "#33271c", muted: "#8d7d6e", accent: "#A47148" },
      font: "ibm-plex-arabic",
      radius: "full",
      header: { style: "centered", showSearch: false, sticky: true },
      layout: "list",
    }),
  },
  {
    key: "cloud-kitchen",
    name_en: "Cloud Kitchen",
    name_ar: "مطبخ سحابي",
    document: doc({
      colors: { primary: "#4F46E5", primaryFg: "#ffffff", bg: "#0f1117", surface: "#181b25", text: "#e8eaf2", muted: "#8b91a7", accent: "#22D3EE" },
      font: "cairo",
      radius: "md",
      header: { style: "minimal", showSearch: true, sticky: true },
    }),
  },
  {
    key: "traditional-arabic",
    name_en: "Traditional Arabic Restaurant",
    name_ar: "مطعم شعبي",
    document: doc({
      colors: { primary: "#1F6E43", primaryFg: "#ffffff", bg: "#FAF7F0", surface: "#ffffff", text: "#23301f", muted: "#7f8a78", accent: "#C9A227" },
      font: "almarai",
      hero: { style: "banner", overlay: true },
    }),
  },
  {
    key: "lebanese",
    name_en: "Lebanese Restaurant",
    name_ar: "مطعم لبناني",
    document: doc({
      colors: { primary: "#0E7C5A", primaryFg: "#ffffff", bg: "#FFFDF7", surface: "#ffffff", text: "#1f2a24", muted: "#7d8a82", accent: "#E0303B" },
      font: "tajawal",
      hero: { style: "split", overlay: false },
      layout: "list",
    }),
  },
  {
    key: "fast-food",
    name_en: "Fast Food Restaurant",
    name_ar: "وجبات سريعة",
    document: doc({
      colors: { primary: "#F59E0B", primaryFg: "#1a1a1a", bg: "#ffffff", surface: "#fafafa", text: "#1c1917", muted: "#78716c", accent: "#DC2626" },
      font: "cairo",
      radius: "sm",
      buttons: { style: "pill" },
      header: { style: "classic", showSearch: true, sticky: true },
    }),
  },
];
