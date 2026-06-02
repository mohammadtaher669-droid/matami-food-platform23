import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Palette, Type, LayoutGrid, Smartphone, Tablet, Monitor,
  RotateCcw, Check, ChevronRight, Layers, Sparkles,
  Square, Circle, Maximize2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { settingsStore } from "@/lib/store";
import type { AppSettings } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";
import { FONT_OPTIONS, AR_FONT_OPTIONS, applyTheme } from "@/lib/themeUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Device = "phone" | "tablet" | "desktop";
type Tab = "templates" | "colors" | "typography" | "layout" | "effects";

interface Draft {
  primary: string;
  bg: string;
  text: string;
  card: string;
  fontFamily: string;
  arFont: string;
  fontScale: number;
  cardRadius: AppSettings["card_radius"];
  density: AppSettings["layout_density"];
  displayMode: AppSettings["menu_display_mode"];
  borderStyle: AppSettings["border_style"];
  shadowLevel: AppSettings["shadow_level"];
  logoSize: AppSettings["logo_size"];
  platformNameEn: string;
  activeTemplate: string;
}

// ─── Templates ────────────────────────────────────────────────────────────────

const TEMPLATES: Array<{
  id: string; label_en: string; label_ar: string; emoji: string;
  primary: string; bg: string; text: string; card: string;
  font: string; arFont: string;
  radius: AppSettings["card_radius"]; density: AppSettings["layout_density"];
  border: AppSettings["border_style"]; shadow: AppSettings["shadow_level"];
}> = [
  {
    id: "modern", label_en: "Modern", label_ar: "عصري", emoji: "⚡",
    primary: "#0EA5E9", bg: "#0A0F1A", text: "#F0F9FF", card: "#111827",
    font: "Inter", arFont: "Cairo",
    radius: "rounded", density: "normal", border: "subtle", shadow: "medium",
  },
  {
    id: "luxury", label_en: "Luxury", label_ar: "فاخر", emoji: "✨",
    primary: "#D4AF37", bg: "#0A0A0A", text: "#F0E6C8", card: "#111111",
    font: "Raleway", arFont: "Tajawal",
    radius: "sharp", density: "compact", border: "subtle", shadow: "strong",
  },
  {
    id: "fastfood", label_en: "Fast Food", label_ar: "وجبات سريعة", emoji: "🍔",
    primary: "#FF3B30", bg: "#1A0800", text: "#FFF5F0", card: "#2A0F05",
    font: "Poppins", arFont: "Tajawal",
    radius: "pill", density: "normal", border: "none", shadow: "medium",
  },
  {
    id: "arabic", label_en: "Arabic Trad.", label_ar: "تراثي عربي", emoji: "🌙",
    primary: "#C9972B", bg: "#14100A", text: "#F5EDD5", card: "#1E1810",
    font: "Urbanist", arFont: "Almarai",
    radius: "rounded", density: "spacious", border: "subtle", shadow: "soft",
  },
  {
    id: "dark", label_en: "Dark Mode", label_ar: "الوضع الداكن", emoji: "🖤",
    primary: "#7C3AED", bg: "#000000", text: "#FFFFFF", card: "#0D0D0D",
    font: "Sora", arFont: "Cairo",
    radius: "rounded", density: "normal", border: "subtle", shadow: "strong",
  },
  {
    id: "minimal", label_en: "Minimal", label_ar: "بسيط", emoji: "◻️",
    primary: "#111111", bg: "#FAFAFA", text: "#111111", card: "#FFFFFF",
    font: "DM Sans", arFont: "Readex Pro",
    radius: "sharp", density: "spacious", border: "strong", shadow: "none",
  },
  {
    id: "matami", label_en: "Mat'ami", label_ar: "مطعمي", emoji: "🔥",
    primary: "#FF7A00", bg: "#0F0F0F", text: "#FAFAFA", card: "#1C1C1C",
    font: "Plus Jakarta Sans", arFont: "Cairo",
    radius: "rounded", density: "normal", border: "subtle", shadow: "soft",
  },
  {
    id: "ocean", label_en: "Ocean", label_ar: "محيطي", emoji: "🌊",
    primary: "#06B6D4", bg: "#0C1929", text: "#E0F7FA", card: "#122135",
    font: "Nunito", arFont: "IBM Plex Arabic",
    radius: "rounded", density: "normal", border: "subtle", shadow: "medium",
  },
];

// ─── Color presets ─────────────────────────────────────────────────────────────

const P_PRIMARY = ["#FF7A00","#FF3B30","#0EA5E9","#7C3AED","#10B981","#F59E0B","#EC4899","#D4AF37","#06B6D4","#EF4444","#8B5CF6","#14B8A6"];
const P_BG      = ["#0F0F0F","#000000","#0A0A0A","#0C1929","#0A0F1A","#14100A","#1A0800","#FAFAFA","#F5F5F5","#FFFFFF","#F8F4EE","#0D1117"];
const P_TEXT    = ["#FAFAFA","#FFFFFF","#F0F9FF","#F0E6C8","#F5EDD5","#FFF5F0","#E0F7FA","#111111","#1A1A1A","#0A0A0A"];
const P_CARD    = ["#1C1C1C","#111111","#0D0D0D","#111827","#122135","#1E1810","#2A0F05","#FFFFFF","#F0F0F0","#F8F8F8"];

// ─── Draft → AppSettings ───────────────────────────────────────────────────────

function draftToSettings(d: Draft, base: AppSettings): AppSettings {
  return {
    ...base,
    primary_color: d.primary,
    bg_color: d.bg,
    text_color: d.text,
    card_color: d.card,
    font_family: d.fontFamily,
    ar_font_family: d.arFont,
    font_size_scale: d.fontScale,
    card_radius: d.cardRadius,
    layout_density: d.density,
    menu_display_mode: d.displayMode,
    border_style: d.borderStyle,
    shadow_level: d.shadowLevel,
    logo_size: d.logoSize,
    platform_name_en: d.platformNameEn || undefined,
    active_template: d.activeTemplate,
  };
}

// ─── Phone preview ─────────────────────────────────────────────────────────────

function PhonePreview({ d, device }: { d: Draft; device: Device }) {
  const br = { sharp: "4px", rounded: "12px", pill: "20px" }[d.cardRadius ?? "rounded"];
  const font = `'${d.fontFamily}', sans-serif`;
  const scale = d.fontScale ?? 1;
  const name = d.platformNameEn || "Mat'ami";

  const styles = {
    wrap: { background: d.bg, fontFamily: font, color: d.text, fontSize: `${Math.round(scale * 12.5)}px`, position: "relative" as const, minHeight: "540px", overflow: "hidden" },
    topbar: { padding: "10px 16px", background: `${d.card}f5`, backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${d.text}10` },
    hero: { padding: "14px 16px", background: `linear-gradient(150deg, ${d.primary}22 0%, ${d.bg} 65%)` },
    searchBox: { background: d.card, borderRadius: br, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, border: `1px solid ${d.text}10`, marginTop: 10 },
    section: { padding: "0 16px 10px" },
    sectionTitle: { fontSize: `${scale * 13}px`, fontWeight: 700, color: d.text, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" as const },
    card: { background: d.card, borderRadius: br, padding: "11px", marginBottom: 8, border: `1px solid ${d.text}08`, display: "flex", gap: 10, alignItems: "center" as const },
    cardImg: { width: 44, height: 44, borderRadius: br, background: `${d.primary}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 },
    badge: { background: d.primary, color: "#fff", borderRadius: br, padding: "4px 10px", fontSize: 11, fontWeight: 700, flexShrink: 0 },
    gridCard: { background: d.card, borderRadius: br, overflow: "hidden", border: `1px solid ${d.text}08` },
    gridImg: { height: 64, background: `${d.primary}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 },
    gridBody: { padding: "8px 10px" },
    bottomNav: { position: "absolute" as const, bottom: 0, left: 0, right: 0, background: d.card, borderTop: `1px solid ${d.text}12`, display: "flex", justifyContent: "space-around", padding: "8px 0 12px" },
    navItem: (active: boolean) => ({ display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2, position: "relative" as const, color: active ? d.primary : `${d.text}55` }),
    floatingCart: { position: "absolute" as const, bottom: 62, right: 14, background: d.primary, color: "#fff", borderRadius: "999px", padding: "8px 14px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, boxShadow: "0 4px 16px rgba(0,0,0,0.4)" },
  };

  return (
    <div style={styles.wrap}>
      {/* Top bar */}
      <div style={styles.topbar}>
        <span style={{ fontWeight: 800, color: d.primary, fontSize: `${scale * 15}px` }}>{name}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: `${d.text}60` }}>🌐</span>
          <div style={{ background: `${d.primary}20`, color: d.primary, borderRadius: "999px", padding: "3px 9px", fontSize: 11, fontWeight: 600 }}>🔥 Offers</div>
        </div>
      </div>

      {/* Hero */}
      <div style={styles.hero}>
        <p style={{ fontSize: `${scale * 11}px`, color: d.primary, fontWeight: 600, marginBottom: 3 }}>👋 Good evening!</p>
        <p style={{ fontSize: `${scale * 15}px`, fontWeight: 800, color: d.text, lineHeight: 1.3, marginBottom: 10 }}>What are you craving today?</p>
        <div style={styles.searchBox}>
          <span style={{ color: `${d.text}35`, fontSize: 13 }}>🔍</span>
          <span style={{ color: `${d.text}40`, fontSize: 12 }}>Search restaurants, food...</span>
        </div>
      </div>

      {/* Restaurants */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🍽️ Restaurants</span>
          <span style={{ fontSize: 10, color: d.primary, fontWeight: 600 }}>See all →</span>
        </div>
        {[
          { emoji: "🌙", name: "Sabah Al Lail", tag: "Breakfast · BBQ", rating: "4.8", time: "30 min", fee: "15" },
          { emoji: "🍗", name: "Chickens Bar", tag: "Shawarma · Broasted", rating: "4.6", time: "20 min", fee: "8" },
        ].map((r, i) => (
          <div key={i} style={styles.card}>
            <div style={styles.cardImg}>{r.emoji}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: `${scale * 13}px`, color: d.text, marginBottom: 2 }}>{r.name}</p>
              <p style={{ fontSize: 10, color: `${d.text}60`, marginBottom: 4 }}>{r.tag}</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                {[`⭐ ${r.rating}`, `⏱ ${r.time}`, `🚚 ${r.fee}﷼`].map((s, j) => (
                  <span key={j} style={{ fontSize: 10, color: `${d.text}65` }}>{s}</span>
                ))}
              </div>
            </div>
            <div style={styles.badge}>Order</div>
          </div>
        ))}
      </div>

      {/* Best sellers grid */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          <span>🔥 Best Sellers</span>
          <span style={{ fontSize: 10, color: d.primary, fontWeight: 600 }}>See all →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[{ emoji: "🌯", name: "Chicken Shawarma", price: "25" }, { emoji: "🍛", name: "Bukhari Rice", price: "42" }].map((item, i) => (
            <div key={i} style={styles.gridCard}>
              <div style={styles.gridImg}>{item.emoji}</div>
              <div style={styles.gridBody}>
                <p style={{ fontSize: 11, fontWeight: 600, color: d.text, marginBottom: 4 }}>{item.name}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: d.primary }}>{item.price} ﷼</span>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: d.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>+</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating cart */}
      <div style={styles.floatingCart}>
        🛒 <span>2 items</span> <span style={{ opacity: 0.7 }}>·</span> <span>60 ﷼</span>
      </div>

      {/* Bottom nav */}
      <div style={styles.bottomNav}>
        {(["🏠 Home", "🛒 Cart", "🎁 Offers", "👤 Profile"] as const).map((item, i) => {
          const [icon, label] = item.split(" ");
          return (
            <div key={i} style={styles.navItem(i === 0)}>
              {i === 1 && <div style={{ position: "absolute", top: -6, right: -6, background: d.primary, color: "#fff", borderRadius: "999px", width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700 }}>2</div>}
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 9, fontWeight: i === 0 ? 700 : 400 }}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Device frame ──────────────────────────────────────────────────────────────

function DeviceFrame({ device, children }: { device: Device; children: React.ReactNode }) {
  if (device === "phone") {
    return (
      <div className="relative mx-auto" style={{ width: 300 }}>
        <div className="rounded-[36px] border-[8px] border-foreground/20 overflow-hidden shadow-2xl bg-black" style={{ width: 300 }}>
          <div className="h-6 bg-black flex items-center justify-center">
            <div className="w-16 h-1.5 bg-white/15 rounded-full" />
          </div>
          <div style={{ width: "100%", overflowY: "auto", maxHeight: 540 }}>{children}</div>
          <div className="h-4 bg-black flex items-center justify-center">
            <div className="w-10 h-1 bg-white/15 rounded-full" />
          </div>
        </div>
      </div>
    );
  }
  if (device === "tablet") {
    return (
      <div className="relative mx-auto" style={{ width: "100%", maxWidth: 420 }}>
        <div className="rounded-2xl border-4 border-foreground/20 overflow-hidden shadow-xl">
          <div style={{ overflowY: "auto", maxHeight: 560 }}>{children}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-foreground/10 overflow-hidden shadow-lg" style={{ overflowY: "auto", maxHeight: 520 }}>
      {children}
    </div>
  );
}

// ─── Color picker row ─────────────────────────────────────────────────────────

function ColorRow({ label, value, presets, onChange }: { label: string; value: string; presets: string[]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <input type="text" value={value}
            onChange={(e) => { if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) onChange(e.target.value); }}
            className="w-24 bg-background border border-white/10 rounded-lg px-2 py-1 text-xs font-mono text-foreground focus:outline-none focus:border-primary/40"
          />
          <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-white/10 cursor-pointer flex-shrink-0">
            <input type="color" value={value.length === 7 ? value : "#FF7A00"} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            <div className="w-full h-full" style={{ background: value }} />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => onChange(p)}
            className="w-6 h-6 rounded-md border-2 transition-all hover:scale-110 flex-shrink-0"
            style={{ background: p, borderColor: value.toLowerCase() === p.toLowerCase() ? "hsl(var(--primary))" : "transparent" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

const DEFAULT: Draft = {
  primary: "#FF7A00", bg: "#0F0F0F", text: "#FAFAFA", card: "#1C1C1C",
  fontFamily: "Plus Jakarta Sans", arFont: "Cairo", fontScale: 1,
  cardRadius: "rounded", density: "normal", displayMode: "grid",
  borderStyle: "subtle", shadowLevel: "soft", logoSize: "md",
  platformNameEn: "", activeTemplate: "matami",
};

const TABS: { id: Tab; label_en: string; label_ar: string; icon: React.ReactNode }[] = [
  { id: "templates",  label_en: "Templates",  label_ar: "قوالب",    icon: <Sparkles size={14} /> },
  { id: "colors",     label_en: "Colors",     label_ar: "الألوان",  icon: <Palette size={14} /> },
  { id: "typography", label_en: "Typography", label_ar: "الخطوط",  icon: <Type size={14} /> },
  { id: "layout",     label_en: "Layout",     label_ar: "التخطيط", icon: <LayoutGrid size={14} /> },
  { id: "effects",    label_en: "Effects",    label_ar: "تأثيرات",  icon: <Layers size={14} /> },
];

const DEVICES: { id: Device; icon: React.ReactNode; label: string }[] = [
  { id: "phone",   icon: <Smartphone size={14} />, label: "Phone" },
  { id: "tablet",  icon: <Tablet size={14} />,     label: "Tablet" },
  { id: "desktop", icon: <Monitor size={14} />,    label: "Desktop" },
];

export default function AdminAppearance() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const saved = useStore(useCallback(() => settingsStore.get(), []));

  const [draft, setDraft] = useState<Draft>(() => ({
    primary:        saved.primary_color  ?? DEFAULT.primary,
    bg:             saved.bg_color       ?? DEFAULT.bg,
    text:           saved.text_color     ?? DEFAULT.text,
    card:           saved.card_color     ?? DEFAULT.card,
    fontFamily:     saved.font_family    ?? DEFAULT.fontFamily,
    arFont:         saved.ar_font_family ?? DEFAULT.arFont,
    fontScale:      saved.font_size_scale ?? DEFAULT.fontScale,
    cardRadius:     saved.card_radius    ?? DEFAULT.cardRadius,
    density:        saved.layout_density ?? DEFAULT.density,
    displayMode:    saved.menu_display_mode ?? DEFAULT.displayMode,
    borderStyle:    saved.border_style   ?? DEFAULT.borderStyle,
    shadowLevel:    saved.shadow_level   ?? DEFAULT.shadowLevel,
    logoSize:       saved.logo_size      ?? DEFAULT.logoSize,
    platformNameEn: saved.platform_name_en ?? DEFAULT.platformNameEn,
    activeTemplate: saved.active_template  ?? DEFAULT.activeTemplate,
  }));

  const [tab, setTab] = useState<Tab>("templates");
  const [device, setDevice] = useState<Device>("phone");
  const [saved2, setSaved2] = useState(false);

  const update = (patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      const settings = draftToSettings(next, saved);
      applyTheme(settings);
      settingsStore.save(settings);
      setSaved2(true);
      setTimeout(() => setSaved2(false), 1400);
      return next;
    });
  };

  const applyTemplate = (tmpl: (typeof TEMPLATES)[number]) => {
    const patch: Partial<Draft> = {
      primary: tmpl.primary, bg: tmpl.bg, text: tmpl.text, card: tmpl.card,
      fontFamily: tmpl.font, arFont: tmpl.arFont,
      cardRadius: tmpl.radius, density: tmpl.density,
      borderStyle: tmpl.border, shadowLevel: tmpl.shadow,
      activeTemplate: tmpl.id,
    };
    update(patch);
  };

  const resetAll = () => {
    setDraft(DEFAULT);
    const settings = draftToSettings(DEFAULT, saved);
    applyTheme(settings);
    settingsStore.save(settings);
    toast({ title: t("Reset to defaults", "تمت إعادة الضبط") });
  };

  return (
    <div className="pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t("Design Studio", "استوديو التصميم")}</h1>
          <p className="text-sm text-muted-foreground">{t("Every change saves instantly — preview updates in real-time.", "كل تغيير يُحفظ فوراً — المعاينة تتحدث في الوقت الفعلي.")}</p>
        </div>
        <div className="flex items-center gap-2">
          {saved2 && (
            <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <Check size={12} /> {t("Saved", "تم الحفظ")}
            </motion.span>
          )}
          <button type="button" onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border border-white/10 text-muted-foreground hover:text-foreground transition">
            <RotateCcw size={12} /> {t("Reset", "إعادة ضبط")}
          </button>
        </div>
      </motion.div>

      {/* Split panel */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">

        {/* ── Left: controls ───────────────────────────────────────── */}
        <div className="space-y-4 min-w-0">

          {/* Tab strip */}
          <div className="flex gap-1 p-1 bg-card border border-white/5 rounded-2xl overflow-x-auto no-scrollbar">
            {TABS.map((tb) => (
              <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition flex-1 justify-center ${tab === tb.id ? "bg-primary text-white shadow" : "text-muted-foreground hover:text-foreground"}`}>
                {tb.icon} {t(tb.label_en, tb.label_ar)}
              </button>
            ))}
          </div>

          {/* ── Tab: Templates ── */}
          {tab === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Panel title={t("🎨 Theme Templates", "🎨 قوالب الثيم")}>
                <p className="text-xs text-muted-foreground -mt-2">{t("One click applies colors, fonts, radius, and spacing together.", "نقرة واحدة تطبّق الألوان والخطوط والتباعد معاً.")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TEMPLATES.map((tmpl) => (
                    <button key={tmpl.id} type="button" onClick={() => applyTemplate(tmpl)}
                      className={`relative flex flex-col items-start p-3 rounded-xl border transition-all text-left overflow-hidden group ${draft.activeTemplate === tmpl.id ? "border-primary ring-1 ring-primary/40" : "border-white/10 hover:border-white/25"}`}
                      style={{ background: tmpl.bg }}>
                      <div className="flex items-center gap-1.5 mb-2 w-full">
                        <span className="text-lg leading-none">{tmpl.emoji}</span>
                        <div className="flex gap-1 ml-auto">
                          <div className="w-3 h-3 rounded-full" style={{ background: tmpl.primary }} />
                          <div className="w-3 h-3 rounded-full" style={{ background: tmpl.card }} />
                        </div>
                      </div>
                      <span className="text-[11px] font-bold leading-tight" style={{ color: tmpl.text }}>{t(tmpl.label_en, tmpl.label_ar)}</span>
                      {draft.activeTemplate === tmpl.id && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check size={10} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </Panel>
            </motion.div>
          )}

          {/* ── Tab: Colors ── */}
          {tab === "colors" && (
            <motion.div key="colors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Panel title={t("🎨 Brand & Accent", "🎨 العلامة التجارية")}>
                <ColorRow label={t("Primary / Accent color", "اللون الرئيسي")} value={draft.primary} presets={P_PRIMARY} onChange={(v) => update({ primary: v, activeTemplate: "" })} />
              </Panel>
              <Panel title={t("🖼️ Background & Surface", "🖼️ الخلفية والسطح")}>
                <ColorRow label={t("Background", "الخلفية")} value={draft.bg} presets={P_BG} onChange={(v) => update({ bg: v, activeTemplate: "" })} />
                <div className="border-t border-white/5" />
                <ColorRow label={t("Card / Surface", "البطاقات")} value={draft.card} presets={P_CARD} onChange={(v) => update({ card: v, activeTemplate: "" })} />
              </Panel>
              <Panel title={t("✏️ Text", "✏️ النص")}>
                <ColorRow label={t("Text color", "لون النص")} value={draft.text} presets={P_TEXT} onChange={(v) => update({ text: v, activeTemplate: "" })} />
              </Panel>
            </motion.div>
          )}

          {/* ── Tab: Typography ── */}
          {tab === "typography" && (
            <motion.div key="typography" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Panel title={t("🔤 English Font", "🔤 الخط الإنجليزي")}>
                <div className="grid grid-cols-1 gap-1.5">
                  {FONT_OPTIONS.map((f) => (
                    <button key={f.value} type="button"
                      onClick={() => update({ fontFamily: f.value })}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition ${draft.fontFamily === f.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"}`}>
                      <span style={{ fontFamily: `'${f.value}', sans-serif` }}>{f.label}</span>
                      <span className="text-xs opacity-50" style={{ fontFamily: `'${f.value}', sans-serif` }}>Aa Bb 123</span>
                      {draft.fontFamily === f.value && <Check size={12} className="text-primary ml-2 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title={t("🔤 Arabic Font", "🔤 الخط العربي")}>
                <div className="grid grid-cols-1 gap-1.5">
                  {AR_FONT_OPTIONS.map((f) => (
                    <button key={f.value} type="button"
                      onClick={() => update({ arFont: f.value })}
                      className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm transition ${draft.arFont === f.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"}`}>
                      <span style={{ fontFamily: `'${f.value}', sans-serif` }}>{f.label}</span>
                      <span className="text-xs opacity-50" dir="rtl" style={{ fontFamily: `'${f.value}', sans-serif` }}>أب ت ١٢٣</span>
                      {draft.arFont === f.value && <Check size={12} className="text-primary ml-2 flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title={t("📏 Font Size", "📏 حجم الخط")}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">{t("Scale", "الحجم")}</span>
                  <span className="text-xs font-mono text-primary">{Math.round(draft.fontScale * 100)}%</span>
                </div>
                <input type="range" min={80} max={130} step={5} value={Math.round(draft.fontScale * 100)}
                  onChange={(e) => update({ fontScale: parseInt(e.target.value) / 100 })}
                  className="w-full accent-primary" />
                <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                  <span>80% {t("Small", "صغير")}</span>
                  <span>100% {t("Default", "افتراضي")}</span>
                  <span>130% {t("Large", "كبير")}</span>
                </div>
              </Panel>
            </motion.div>
          )}

          {/* ── Tab: Layout ── */}
          {tab === "layout" && (
            <motion.div key="layout" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Panel title={t("🃏 Corner Radius", "🃏 انحناء الزوايا")}>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "sharp",   icon: <Square size={18} />,   label_en: "Sharp",   label_ar: "حاد" },
                    { v: "rounded", icon: <Circle size={18} />,   label_en: "Rounded", label_ar: "مدور" },
                    { v: "pill",    icon: <Maximize2 size={18} />, label_en: "Pill",    label_ar: "بيضاوي" },
                  ] as const).map((r) => (
                    <button key={r.v} type="button" onClick={() => update({ cardRadius: r.v })}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${draft.cardRadius === r.v ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      {r.icon}
                      <span className="text-xs font-medium">{t(r.label_en, r.label_ar)}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title={t("📐 Spacing Density", "📐 كثافة التباعد")}>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "compact",  label_en: "Compact",  label_ar: "مضغوط", desc: "—" },
                    { v: "normal",   label_en: "Normal",   label_ar: "عادي",   desc: "—" },
                    { v: "spacious", label_en: "Spacious", label_ar: "مريح",  desc: "—" },
                  ] as const).map((d) => (
                    <button key={d.v} type="button" onClick={() => update({ density: d.v })}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border transition text-center ${draft.density === d.v ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      <div className="flex flex-col gap-0.5 w-8">
                        {[1, 2, 3].map((_, i) => (
                          <div key={i} className="h-1 rounded-full bg-current opacity-50"
                            style={{ margin: d.v === "compact" ? "0.5px 0" : d.v === "spacious" ? "2.5px 0" : "1.5px 0" }} />
                        ))}
                      </div>
                      <span className="text-xs font-medium">{t(d.label_en, d.label_ar)}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title={t("🔲 Border Style", "🔲 نمط الحدود")}>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "none",   label_en: "None",   label_ar: "بدون" },
                    { v: "subtle", label_en: "Subtle", label_ar: "خفيف" },
                    { v: "strong", label_en: "Strong", label_ar: "واضح" },
                  ] as const).map((b) => {
                    const borders = { none: "0px solid", subtle: "1px solid rgba(255,255,255,0.07)", strong: "1px solid rgba(255,255,255,0.2)" };
                    return (
                      <button key={b.v} type="button" onClick={() => update({ borderStyle: b.v })}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${draft.borderStyle === b.v ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                        <div className="w-8 h-5 rounded bg-card/50" style={{ border: borders[b.v] }} />
                        <span className="text-xs font-medium">{t(b.label_en, b.label_ar)}</span>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel title={t("🖼️ Menu Display Mode", "🖼️ وضع عرض المنيو")}>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: "grid",         label_en: "Grid",         label_ar: "شبكة" },
                    { v: "list",         label_en: "List",         label_ar: "قائمة" },
                    { v: "compact_grid", label_en: "Compact",      label_ar: "مضغوط" },
                  ] as const).map((m) => (
                    <button key={m.v} type="button" onClick={() => update({ displayMode: m.v })}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition ${draft.displayMode === m.v ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      <span className="text-base">{m.v === "grid" ? "⊞" : m.v === "list" ? "≡" : "⊟"}</span>
                      {t(m.label_en, m.label_ar)}
                    </button>
                  ))}
                </div>
              </Panel>
            </motion.div>
          )}

          {/* ── Tab: Effects ── */}
          {tab === "effects" && (
            <motion.div key="effects" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <Panel title={t("🌑 Shadow Depth", "🌑 عمق الظل")}>
                <p className="text-xs text-muted-foreground -mt-2">{t("Controls depth of card shadows across the app.", "يتحكم في عمق ظلال البطاقات في التطبيق.")}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { v: "none",   label_en: "Flat",    label_ar: "بدون",    cls: "shadow-none" },
                    { v: "soft",   label_en: "Soft",    label_ar: "ناعم",    cls: "shadow-sm" },
                    { v: "medium", label_en: "Medium",  label_ar: "متوسط",   cls: "shadow-md" },
                    { v: "strong", label_en: "Deep",    label_ar: "عميق",    cls: "shadow-lg" },
                  ] as const).map((s) => (
                    <button key={s.v} type="button" onClick={() => update({ shadowLevel: s.v })}
                      className={`flex flex-col items-center gap-2 py-4 rounded-xl border transition ${draft.shadowLevel === s.v ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:border-white/20"}`}>
                      <div className={`w-10 h-8 bg-card/60 rounded-lg ${s.cls}`} />
                      <span className="text-xs font-medium">{t(s.label_en, s.label_ar)}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel title={t("🎭 Animation & Hover Transitions", "🎭 الحركة والتأثيرات")}>
                <div className="text-xs text-muted-foreground space-y-2">
                  <div className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-xl border border-white/5">
                    <span>{t("Hover lift on cards", "رفع البطاقات عند التحويم")}</span>
                    <span className="text-emerald-400 font-medium">✓ {t("Always on", "دائماً")}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-xl border border-white/5">
                    <span>{t("Smooth page transitions", "انتقالات صفحة سلسة")}</span>
                    <span className="text-emerald-400 font-medium">✓ {t("Always on", "دائماً")}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-xl border border-white/5">
                    <span>{t("Loading skeletons", "هياكل التحميل")}</span>
                    <span className="text-emerald-400 font-medium">✓ {t("Always on", "دائماً")}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-xl border border-white/5">
                    <span>{t("Floating cart animation", "حركة السلة العائمة")}</span>
                    <span className="text-emerald-400 font-medium">✓ {t("Always on", "دائماً")}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 px-3 bg-white/3 rounded-xl border border-white/5">
                    <span>{t("WhatsApp button pulse", "نبض زر واتساب")}</span>
                    <span className="text-emerald-400 font-medium">✓ {t("Always on", "دائماً")}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  {t("All motion effects are powered by Framer Motion and are always active.", "جميع تأثيرات الحركة مدعومة بـ Framer Motion وهي دائماً نشطة.")}
                </p>
              </Panel>

              <Panel title={t("🔗 Section Order", "🔗 ترتيب الأقسام")}>
                <p className="text-xs text-muted-foreground">
                  {t("Control which homepage sections appear and in what order.", "تحكم في الأقسام التي تظهر في الصفحة الرئيسية وترتيبها.")}
                </p>
                <a href="/admin/content"
                  className="flex items-center gap-2 px-4 py-2.5 mt-1 rounded-xl border border-primary/30 bg-primary/8 text-primary text-sm font-medium hover:bg-primary/15 transition">
                  <Layers size={14} />
                  {t("Open Content Control →", "افتح التحكم بالمحتوى ←")}
                  <ChevronRight size={14} className="ml-auto" />
                </a>
              </Panel>
            </motion.div>
          )}
        </div>

        {/* ── Right: preview ────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-6 space-y-3 self-start">
          {/* Device switcher */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("Live Preview", "معاينة مباشرة")}</span>
            <div className="flex gap-1 p-0.5 bg-card border border-white/5 rounded-xl">
              {DEVICES.map((dv) => (
                <button key={dv.id} type="button" onClick={() => setDevice(dv.id)}
                  title={dv.label}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition ${device === dv.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
                  {dv.icon}
                  <span className="hidden sm:inline">{dv.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Frame + preview */}
          <motion.div
            key={device}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <DeviceFrame device={device}>
              <PhonePreview d={draft} device={device} />
            </DeviceFrame>
          </motion.div>

          {/* Color quick-glance */}
          <div className="flex items-center gap-2 px-3 py-2 bg-card border border-white/5 rounded-xl">
            {[draft.primary, draft.bg, draft.text, draft.card].map((c, i) => (
              <div key={i} className="w-6 h-6 rounded-lg border border-white/10 flex-shrink-0" style={{ background: c }} title={c} />
            ))}
            <span className="text-xs text-muted-foreground ml-1 truncate">
              {draft.activeTemplate ? TEMPLATES.find((t) => t.id === draft.activeTemplate)?.label_en ?? "Custom" : "Custom"}
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto font-mono opacity-60">{t("Active theme", "الثيم النشط")}</span>
          </div>
        </div>

      </div>
    </div>
  );
}
