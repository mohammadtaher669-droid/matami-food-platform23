import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Eye, EyeOff, LayoutGrid, List, Rows3, Monitor,
  Navigation, Layout, Store, SlidersHorizontal, Check,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  settingsStore, restaurantStore,
  HOME_SECTION_META, NAV_ITEM_META,
} from "@/lib/store";
import type { HomeSectionConfig, NavItemConfig } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";
import ImageWithFallback from "@/components/ImageWithFallback";

// ── Helper: resolve effective section list ────────────────────────────────────

function resolveHomeSections(config?: HomeSectionConfig[]) {
  return HOME_SECTION_META.map((meta) => {
    const saved = config?.find((c) => c.id === meta.id);
    return {
      id: meta.id,
      label_en: meta.label_en,
      label_ar: meta.label_ar,
      icon: meta.icon,
      sort_order: saved?.sort_order ?? meta.default_order,
      hidden: saved?.hidden ?? false,
    };
  }).sort((a, b) => a.sort_order - b.sort_order);
}

function resolveNavItems(config?: NavItemConfig[]) {
  return [...NAV_ITEM_META].map((meta) => {
    const saved = config?.find((c) => c.id === meta.id);
    return {
      id: meta.id,
      label_en: meta.label_en,
      label_ar: meta.label_ar,
      href: meta.href,
      essential: meta.essential,
      sort_order: saved?.sort_order ?? NAV_ITEM_META.findIndex((m) => m.id === meta.id),
      hidden: meta.essential ? false : (saved?.hidden ?? false),
    };
  }).sort((a, b) => a.sort_order - b.sort_order);
}

// ── Generic draggable row ─────────────────────────────────────────────────────

function SortableRow({
  id, children,
}: { id: string; children: (drag: ReturnType<typeof useSortable>) => React.ReactNode }) {
  const drag = useSortable({ id });
  return (
    <div
      ref={drag.setNodeRef}
      style={{ transform: CSS.Transform.toString(drag.transform), transition: drag.transition, opacity: drag.isDragging ? 0.5 : 1 }}
    >
      {children(drag)}
    </div>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
        active ? "border-primary/40 bg-primary/10 text-primary" : "border-white/8 text-muted-foreground hover:text-foreground hover:bg-white/4"
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ── Section visibility toggle ─────────────────────────────────────────────────

function VisibilityToggle({ hidden, essential, onChange }: { hidden: boolean; essential?: boolean; onChange: (v: boolean) => void }) {
  if (essential) {
    return (
      <span className="text-[10px] text-muted-foreground border border-white/10 px-2 py-0.5 rounded-full">
        Essential
      </span>
    );
  }
  return (
    <button
      onClick={() => onChange(!hidden)}
      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all border ${
        hidden ? "bg-white/5 border-white/10 text-muted-foreground/40 hover:text-muted-foreground" : "bg-green-500/15 border-green-500/30 text-green-400"
      }`}
      title={hidden ? "Show" : "Hide"}
    >
      {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

type ActiveTab = "homepage" | "navigation" | "restaurants" | "display";

export default function AdminContentControl() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const settings    = useStore(useCallback(() => settingsStore.get(), []));
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));

  const [activeTab, setActiveTab] = useState<ActiveTab>("homepage");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Computed state from settings ────────────────────────────────────────────

  const homeSections = resolveHomeSections(settings.home_sections_config);
  const navItems     = resolveNavItems(settings.nav_items_config);

  const restaurantOrder = (settings.restaurant_order && settings.restaurant_order.length > 0)
    ? (() => {
        const map = new Map(restaurants.map((r) => [r.id, r]));
        const ordered = settings.restaurant_order!.map((id) => map.get(id)).filter(Boolean) as typeof restaurants;
        for (const r of restaurants) {
          if (!settings.restaurant_order!.includes(r.id)) ordered.push(r);
        }
        return ordered;
      })()
    : restaurants;

  // ── Save helpers ────────────────────────────────────────────────────────────

  function saveSections(sections: typeof homeSections) {
    settingsStore.save({
      ...settings,
      home_sections_config: sections.map((s, i) => ({ id: s.id, sort_order: i, hidden: s.hidden })),
    });
    toast({ title: t("Homepage sections saved!", "تم حفظ أقسام الصفحة الرئيسية!") });
  }

  function saveNav(items: typeof navItems) {
    settingsStore.save({
      ...settings,
      nav_items_config: items.map((n, i) => ({ id: n.id, sort_order: i, hidden: n.hidden })),
    });
    toast({ title: t("Navigation saved!", "تم حفظ التنقل!") });
  }

  function saveRestaurantOrder(ordered: typeof restaurants) {
    settingsStore.save({ ...settings, restaurant_order: ordered.map((r) => r.id) });
    toast({ title: t("Restaurant order saved!", "تم حفظ ترتيب المطاعم!") });
  }

  // ── Drag end handlers ───────────────────────────────────────────────────────

  function onSectionDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = homeSections.findIndex((s) => s.id === active.id);
    const newIdx = homeSections.findIndex((s) => s.id === over.id);
    saveSections(arrayMove(homeSections, oldIdx, newIdx));
  }

  function onNavDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = navItems.findIndex((n) => n.id === active.id);
    const newIdx = navItems.findIndex((n) => n.id === over.id);
    saveNav(arrayMove(navItems, oldIdx, newIdx));
  }

  function onRestaurantDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = restaurantOrder.findIndex((r) => r.id === active.id);
    const newIdx = restaurantOrder.findIndex((r) => r.id === over.id);
    saveRestaurantOrder(arrayMove(restaurantOrder, oldIdx, newIdx));
  }

  // ── Toggle helpers ──────────────────────────────────────────────────────────

  function toggleSection(id: string, hidden: boolean) {
    const updated = homeSections.map((s) => s.id === id ? { ...s, hidden } : s);
    saveSections(updated);
  }

  function toggleNav(id: string, hidden: boolean) {
    const updated = navItems.map((n) => n.id === id ? { ...n, hidden } : n);
    saveNav(updated);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">{t("🎛️ Content Control", "🎛️ التحكم بالمحتوى")}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("Reorder and show/hide sections, navigation, restaurants, and display settings — all without touching code.",
             "أعد الترتيب وتحكم في الظهور بدون تعديل الكود.")}
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <TabBtn active={activeTab === "homepage"}    onClick={() => setActiveTab("homepage")}    icon={<Layout size={15} />}      label={t("Homepage",    "الصفحة الرئيسية")} />
        <TabBtn active={activeTab === "navigation"}  onClick={() => setActiveTab("navigation")}  icon={<Navigation size={15} />}  label={t("Navigation",  "التنقل")} />
        <TabBtn active={activeTab === "restaurants"} onClick={() => setActiveTab("restaurants")} icon={<Store size={15} />}       label={t("Restaurants", "المطاعم")} />
        <TabBtn active={activeTab === "display"}     onClick={() => setActiveTab("display")}     icon={<Monitor size={15} />}     label={t("Display",     "العرض")} />
      </div>

      {/* ── HOMEPAGE SECTIONS ─────────────────────────────────────────────── */}
      {activeTab === "homepage" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("Drag to reorder. Toggle the eye to show/hide each section on the homepage.",
               "اسحب لإعادة الترتيب. انقر على العين لإظهار/إخفاء كل قسم.")}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onSectionDragEnd}>
            <SortableContext items={homeSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {homeSections.map((section) => (
                  <SortableRow key={section.id} id={section.id}>
                    {(drag) => (
                      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        section.hidden ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-card border-white/10"
                      }`}>
                        <button
                          {...drag.attributes}
                          {...drag.listeners}
                          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition touch-none p-1 -m-1"
                        >
                          <GripVertical size={16} />
                        </button>
                        <span className="text-xl flex-shrink-0 w-7">{section.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{t(section.label_en, section.label_ar)}</p>
                          <p className="text-[11px] text-muted-foreground">{section.id}</p>
                        </div>
                        {section.hidden && (
                          <span className="text-[10px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full">{t("Hidden", "مخفي")}</span>
                        )}
                        <VisibilityToggle
                          hidden={section.hidden}
                          onChange={(v) => toggleSection(section.id, v)}
                        />
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Reset button */}
          <button
            onClick={() => saveSections(resolveHomeSections())}
            className="text-xs text-muted-foreground hover:text-foreground transition border border-white/8 px-3 py-1.5 rounded-lg"
          >
            {t("Reset to default order", "إعادة الترتيب الافتراضي")}
          </button>
        </motion.div>
      )}

      {/* ── NAVIGATION ─────────────────────────────────────────────────────── */}
      {activeTab === "navigation" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("Control what tabs appear in the bottom navigation bar and their order. Essential tabs (Home & Cart) cannot be hidden.",
               "تحكم في التبويبات التي تظهر في شريط التنقل السفلي وترتيبها. التبويبات الأساسية (الرئيسية والسلة) لا يمكن إخفاؤها.")}
          </p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onNavDragEnd}>
            <SortableContext items={navItems.map((n) => n.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {navItems.map((item) => (
                  <SortableRow key={item.id} id={item.id}>
                    {(drag) => (
                      <div className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        item.hidden ? "bg-white/[0.02] border-white/5 opacity-60" : "bg-card border-white/10"
                      }`}>
                        <button
                          {...drag.attributes}
                          {...drag.listeners}
                          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition touch-none p-1 -m-1"
                        >
                          <GripVertical size={16} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{t(item.label_en, item.label_ar)}</p>
                          <p className="text-[11px] text-muted-foreground">{item.href}</p>
                        </div>
                        {item.essential && (
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{t("Essential", "أساسي")}</span>
                        )}
                        {item.hidden && !item.essential && (
                          <span className="text-[10px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full">{t("Hidden", "مخفي")}</span>
                        )}
                        <VisibilityToggle
                          hidden={item.hidden}
                          essential={item.essential}
                          onChange={(v) => toggleNav(item.id, v)}
                        />
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <button
            onClick={() => saveNav(resolveNavItems())}
            className="text-xs text-muted-foreground hover:text-foreground transition border border-white/8 px-3 py-1.5 rounded-lg"
          >
            {t("Reset to default order", "إعادة الترتيب الافتراضي")}
          </button>
        </motion.div>
      )}

      {/* ── RESTAURANTS ────────────────────────────────────────────────────── */}
      {activeTab === "restaurants" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("Drag to change the order restaurants appear in on the homepage.",
               "اسحب لتغيير ترتيب ظهور المطاعم في الصفحة الرئيسية.")}
          </p>
          {restaurantOrder.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">{t("No restaurants yet.", "لا توجد مطاعم بعد.")}</p>
          )}
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onRestaurantDragEnd}>
            <SortableContext items={restaurantOrder.map((r) => r.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {restaurantOrder.map((restaurant) => (
                  <SortableRow key={restaurant.id} id={restaurant.id}>
                    {(drag) => (
                      <div className="flex items-center gap-3 p-3.5 rounded-2xl border bg-card border-white/10">
                        <button
                          {...drag.attributes}
                          {...drag.listeners}
                          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition touch-none p-1 -m-1"
                        >
                          <GripVertical size={16} />
                        </button>
                        <div
                          className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background: `${restaurant.color}20`, border: `1px solid ${restaurant.color}30` }}
                        >
                          {restaurant.logoType === "image" && restaurant.logo ? (
                            <ImageWithFallback src={restaurant.logo} alt="" className="w-full h-full object-cover" preset="thumbnail" />
                          ) : (
                            <span className="text-xl">{restaurant.logo || "🍽️"}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{t(restaurant.name_en, restaurant.name_ar)}</p>
                          <p className="text-[11px]" style={{ color: restaurant.color }}>{restaurant.id}</p>
                        </div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: restaurant.color }} />
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {settings.restaurant_order && settings.restaurant_order.length > 0 && (
            <button
              onClick={() => settingsStore.save({ ...settings, restaurant_order: [] })}
              className="text-xs text-muted-foreground hover:text-foreground transition border border-white/8 px-3 py-1.5 rounded-lg"
            >
              {t("Reset to default order", "إعادة الترتيب الافتراضي")}
            </button>
          )}
        </motion.div>
      )}

      {/* ── DISPLAY SETTINGS ───────────────────────────────────────────────── */}
      {activeTab === "display" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
          {/* Homepage restaurant columns */}
          <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{t("Restaurant Grid Columns", "أعمدة شبكة المطاعم")}</h3>
              <p className="text-xs text-muted-foreground">{t("How many restaurant cards per row on the homepage.", "عدد بطاقات المطاعم في كل صف في الصفحة الرئيسية.")}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[2, 3, 4].map((cols) => (
                <button
                  key={cols}
                  onClick={() => { settingsStore.save({ ...settings, home_columns: cols }); toast({ title: t("Saved!", "تم الحفظ!") }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    (settings.home_columns ?? 2) === cols ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {(settings.home_columns ?? 2) === cols && <Check size={13} />}
                  {cols} {t("columns", "أعمدة")}
                </button>
              ))}
            </div>
          </div>

          {/* Menu display mode */}
          <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{t("Default Menu Display Mode", "نمط عرض المنيو الافتراضي")}</h3>
              <p className="text-xs text-muted-foreground">{t("How product cards appear on branch pages by default.", "كيف تظهر بطاقات المنتجات في صفحات الفروع بشكل افتراضي.")}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "grid",         icon: <LayoutGrid size={15} />, label_en: "Grid",          label_ar: "شبكة" },
                { value: "compact_grid", icon: <Rows3 size={15} />,      label_en: "Compact Grid",  label_ar: "شبكة مضغوطة" },
                { value: "list",         icon: <List size={15} />,       label_en: "List",          label_ar: "قائمة" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { settingsStore.save({ ...settings, menu_display_mode: opt.value as "grid" | "list" | "compact_grid" }); toast({ title: t("Saved!", "تم الحفظ!") }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    (settings.menu_display_mode ?? "grid") === opt.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {(settings.menu_display_mode ?? "grid") === opt.value && <Check size={13} />}
                  {opt.icon}
                  {t(opt.label_en, opt.label_ar)}
                </button>
              ))}
            </div>
          </div>

          {/* Best Sellers style */}
          <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{t("Best Sellers Layout", "تخطيط الأكثر مبيعاً")}</h3>
              <p className="text-xs text-muted-foreground">{t("How the best sellers section displays items on the homepage.", "كيف يعرض قسم الأكثر مبيعاً المنتجات في الصفحة الرئيسية.")}</p>
            </div>
            <div className="flex gap-2">
              {[
                { value: "scroll", icon: <Rows3 size={15} />,      label_en: "Horizontal Scroll", label_ar: "تمرير أفقي" },
                { value: "grid",   icon: <LayoutGrid size={15} />,  label_en: "Grid",              label_ar: "شبكة" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { settingsStore.save({ ...settings, bestseller_style: opt.value as "scroll" | "grid" }); toast({ title: t("Saved!", "تم الحفظ!") }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    (settings.bestseller_style ?? "scroll") === opt.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {(settings.bestseller_style ?? "scroll") === opt.value && <Check size={13} />}
                  {opt.icon}
                  {t(opt.label_en, opt.label_ar)}
                </button>
              ))}
            </div>
          </div>

          {/* Card radius */}
          <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{t("Card Corner Style", "زوايا البطاقات")}</h3>
              <p className="text-xs text-muted-foreground">{t("Applies to all product cards across the app.", "يطبق على جميع بطاقات المنتجات في التطبيق.")}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "sharp",   label_en: "Sharp",   label_ar: "حاد" },
                { value: "rounded", label_en: "Rounded", label_ar: "مستدير" },
                { value: "pill",    label_en: "Pill",    label_ar: "بيضاوي" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { settingsStore.save({ ...settings, card_radius: opt.value as "sharp" | "rounded" | "pill" }); toast({ title: t("Saved!", "تم الحفظ!") }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 border text-sm font-medium transition-all ${
                    opt.value === "sharp" ? "rounded-md" : opt.value === "rounded" ? "rounded-xl" : "rounded-full"
                  } ${
                    (settings.card_radius ?? "rounded") === opt.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {(settings.card_radius ?? "rounded") === opt.value && <Check size={13} />}
                  {t(opt.label_en, opt.label_ar)}
                </button>
              ))}
            </div>
          </div>

          {/* Layout density */}
          <div className="bg-card border border-white/10 rounded-2xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground mb-0.5">{t("Layout Density", "كثافة التخطيط")}</h3>
              <p className="text-xs text-muted-foreground">{t("Controls spacing and padding throughout the app.", "يتحكم في المسافات والهوامش في التطبيق.")}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: "compact",  label_en: "Compact",  label_ar: "مضغوط" },
                { value: "normal",   label_en: "Normal",   label_ar: "عادي" },
                { value: "spacious", label_en: "Spacious", label_ar: "متباعد" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { settingsStore.save({ ...settings, layout_density: opt.value as "compact" | "normal" | "spacious" }); toast({ title: t("Saved!", "تم الحفظ!") }); }}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    (settings.layout_density ?? "normal") === opt.value ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  {(settings.layout_density ?? "normal") === opt.value && <Check size={13} />}
                  {t(opt.label_en, opt.label_ar)}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
