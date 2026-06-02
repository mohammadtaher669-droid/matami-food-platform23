import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  GripVertical, ChevronDown, ChevronRight, Eye, EyeOff, Star, Pin, Sparkles,
  ArrowUp, ArrowDown, TrendingUp, Trophy,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { restaurantStore, categoryStore, menuStore, offerStore } from "@/lib/store";
import type { Category, MenuItem, Offer } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";

// ─── Badge toggle button ──────────────────────────────────────────────────────

function BadgeBtn({
  active, onClick, color, icon, label,
}: { active: boolean; onClick: () => void; color: string; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all border ${
        active ? "text-white border-transparent" : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
      }`}
      style={active ? { background: color, borderColor: color } : {}}
    >
      {icon}
    </button>
  );
}

// ─── Sortable category row ────────────────────────────────────────────────────

function SortableCategory({
  cat, catIdx, totalCats, items, expanded, onToggleExpand, onMove, onToggleFlag, restaurantColor,
}: {
  cat: Category;
  catIdx: number;
  totalCats: number;
  items: MenuItem[];
  expanded: boolean;
  onToggleExpand: () => void;
  onMove: (idx: number, dir: -1 | 1) => void;
  onToggleFlag: (cat: Category, flag: "hidden" | "featured") => void;
  restaurantColor: string;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { toast } = useToast();

  function saveItems(updated: MenuItem[]) {
    updated.forEach((m, i) => menuStore.save({ ...m, sort_order: i }));
    toast({ title: t("Item order saved!", "تم حفظ ترتيب الأصناف!") });
  }

  function handleItemDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex(m => m.id === active.id);
    const newIdx = items.findIndex(m => m.id === over.id);
    saveItems(arrayMove(items, oldIdx, newIdx));
  }

  function moveItem(idx: number, dir: -1 | 1) {
    const swap = idx + dir;
    if (swap < 0 || swap >= items.length) return;
    const next = [...items];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveItems(next);
  }

  function toggleItemFlag(item: MenuItem, flag: "hidden" | "featured" | "pinned" | "is_popular" | "is_new" | "is_best_seller") {
    menuStore.save({ ...item, [flag]: !item[flag] });
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className={`rounded-2xl border transition-all ${cat.hidden ? "border-white/5 opacity-60" : "border-white/10"} bg-card`}
    >
      {/* Category header */}
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition touch-none p-1 -m-1"
        >
          <GripVertical size={16} />
        </button>

        {/* Expand / collapse */}
        <button
          onClick={onToggleExpand}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          {expanded
            ? <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />
            : <ChevronRight size={14} className="text-muted-foreground flex-shrink-0" />}
          <span className="font-semibold text-sm text-foreground truncate">{t(cat.name_en, cat.name_ar)}</span>
          <span className="text-[10px] text-muted-foreground flex-shrink-0">({items.length})</span>
          {cat.featured && (
            <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">{t("Featured", "مميز")}</span>
          )}
          {cat.hidden && (
            <span className="text-[9px] bg-white/5 text-muted-foreground px-1.5 py-0.5 rounded-full flex-shrink-0">{t("Hidden", "مخفي")}</span>
          )}
        </button>

        {/* Flags + move buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <BadgeBtn
            active={!!cat.featured} onClick={() => onToggleFlag(cat, "featured")}
            color="#f59e0b" icon={<Star size={9} />} label={t("Featured", "مميز")}
          />
          <BadgeBtn
            active={!!cat.hidden}
            onClick={() => onToggleFlag(cat, "hidden")}
            color="#6b7280"
            icon={cat.hidden ? <EyeOff size={9} /> : <Eye size={9} />}
            label={cat.hidden ? t("Hidden", "مخفي") : t("Visible", "ظاهر")}
          />
          <button
            onClick={() => onMove(catIdx, -1)}
            disabled={catIdx === 0}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 transition"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={() => onMove(catIdx, 1)}
            disabled={catIdx === totalCats - 1}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 transition"
          >
            <ArrowDown size={12} />
          </button>
        </div>
      </div>

      {/* Items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/5 px-3 pb-3 pt-2 space-y-1.5">
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground py-2 text-center">{t("No items in this category", "لا توجد أصناف في هذا التصنيف")}</p>
              )}
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleItemDragEnd}>
                <SortableContext items={items.map(m => m.id)} strategy={verticalListSortingStrategy}>
                  {items.map((item, itemIdx) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      itemIdx={itemIdx}
                      totalItems={items.length}
                      onMove={moveItem}
                      onToggle={toggleItemFlag}
                      restaurantColor={restaurantColor}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Sortable item row ────────────────────────────────────────────────────────

function SortableItem({
  item, itemIdx, totalItems, onMove, onToggle, restaurantColor,
}: {
  item: MenuItem;
  itemIdx: number;
  totalItems: number;
  onMove: (idx: number, dir: -1 | 1) => void;
  onToggle: (item: MenuItem, flag: "hidden" | "featured" | "pinned" | "is_popular" | "is_new" | "is_best_seller") => void;
  restaurantColor: string;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const imgSrc = item.image_url || item.image;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
        item.hidden
          ? "bg-white/2 opacity-50"
          : item.pinned
          ? "bg-purple-500/5 border border-purple-500/20"
          : "bg-background/50 hover:bg-white/5"
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition touch-none p-1 -m-1"
      >
        <GripVertical size={14} />
      </button>

      {/* Thumbnail */}
      <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
        {imgSrc ? (
          <img src={imgSrc} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base opacity-30">🍽️</div>
        )}
      </div>

      {/* Name + price */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{t(item.name_en, item.name_ar)}</p>
        <p className="text-[10px]" style={{ color: restaurantColor }}>{item.price} ﷼</p>
      </div>

      {/* Badge flags */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <BadgeBtn active={!!item.pinned}         onClick={() => onToggle(item, "pinned")}        color="#a855f7" icon={<Pin size={9} />}       label={t("Pin", "تثبيت")} />
        <BadgeBtn active={!!item.featured}       onClick={() => onToggle(item, "featured")}      color="#f59e0b" icon={<Star size={9} />}      label={t("Featured", "مميز")} />
        <BadgeBtn active={!!item.is_best_seller} onClick={() => onToggle(item, "is_best_seller")} color="#ef4444" icon={<Trophy size={9} />}   label={t("Best Seller", "الأفضل")} />
        <BadgeBtn active={!!item.is_popular}     onClick={() => onToggle(item, "is_popular")}    color="#FF7A00" icon={<TrendingUp size={9} />} label={t("Popular", "شائع")} />
        <BadgeBtn active={!!item.is_new}         onClick={() => onToggle(item, "is_new")}        color="#eab308" icon={<Sparkles size={9} />}  label={t("New", "جديد")} />
        <BadgeBtn
          active={!!item.hidden} onClick={() => onToggle(item, "hidden")}
          color="#6b7280" icon={item.hidden ? <EyeOff size={9} /> : <Eye size={9} />}
          label={item.hidden ? t("Hidden", "مخفي") : t("Visible", "ظاهر")}
        />
      </div>

      {/* Move up/down */}
      <div className="flex flex-col gap-0.5 flex-shrink-0">
        <button onClick={() => onMove(itemIdx, -1)} disabled={itemIdx === 0} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 transition">
          <ArrowUp size={10} />
        </button>
        <button onClick={() => onMove(itemIdx, 1)} disabled={itemIdx === totalItems - 1} className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20 transition">
          <ArrowDown size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Sortable offer row ───────────────────────────────────────────────────────

function SortableOffer({
  offer, offerIdx, totalOffers, onMove,
}: {
  offer: Offer;
  offerIdx: number;
  totalOffers: number;
  onMove: (idx: number, dir: -1 | 1) => void;
}) {
  const { t } = useLanguage();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: offer.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className={`flex items-center gap-3 p-3 bg-card border rounded-xl transition-all ${offer.active ? "border-white/10" : "border-white/5 opacity-50"}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition touch-none p-1 -m-1"
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{t(offer.title_en, offer.title_ar)}</p>
        <p className="text-[10px] text-muted-foreground">{offer.type} · {offer.value}{offer.type === "percentage" ? "%" : " SAR"}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {!offer.active && <span className="text-[9px] text-muted-foreground border border-white/10 px-1.5 py-0.5 rounded-full">{t("Inactive", "غير نشط")}</span>}
        <button onClick={() => onMove(offerIdx, -1)} disabled={offerIdx === 0} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20">
          <ArrowUp size={12} />
        </button>
        <button onClick={() => onMove(offerIdx, 1)} disabled={offerIdx === totalOffers - 1} className="w-6 h-6 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-20">
          <ArrowDown size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminMenuSorting() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const allCategories = useStore(useCallback(() => categoryStore.getAll(), []));
  const allItems = useStore(useCallback(() => menuStore.getAll(), []));
  const allOffers = useStore(useCallback(() => offerStore.getAll(), []));

  const [selectedRestId, setSelectedRestId] = useState<string>(() => restaurants[0]?.id || "");
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"menu" | "offers">("menu");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const restaurant = restaurants.find(r => r.id === selectedRestId);
  const restaurantColor = restaurant?.color || "#FF7A00";

  const cats: Category[] = allCategories
    .filter(c => c.restaurant_id === selectedRestId)
    .sort((a, b) => a.sort_order - b.sort_order);

  const offers: Offer[] = [...allOffers].sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999));

  function itemsForCat(catId: string): MenuItem[] {
    return allItems
      .filter(m => m.category_id === catId)
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return (a.sort_order ?? 999) - (b.sort_order ?? 999);
      });
  }

  function saveCats(updated: Category[]) {
    updated.forEach((c, i) => categoryStore.save({ ...c, sort_order: i }));
    toast({ title: t("Category order saved!", "تم حفظ ترتيب التصنيفات!") });
  }

  function handleCatDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = cats.findIndex(c => c.id === active.id);
    const newIdx = cats.findIndex(c => c.id === over.id);
    saveCats(arrayMove(cats, oldIdx, newIdx));
  }

  function moveCat(idx: number, dir: -1 | 1) {
    const swap = idx + dir;
    if (swap < 0 || swap >= cats.length) return;
    const next = [...cats];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveCats(next);
  }

  function toggleCatFlag(cat: Category, flag: "hidden" | "featured") {
    categoryStore.save({ ...cat, [flag]: !cat[flag] });
  }

  function saveOffers(updated: Offer[]) {
    updated.forEach((o, i) => offerStore.save({ ...o, sort_order: i }));
    toast({ title: t("Offer order saved!", "تم حفظ ترتيب العروض!") });
  }

  function handleOfferDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = offers.findIndex(o => o.id === active.id);
    const newIdx = offers.findIndex(o => o.id === over.id);
    saveOffers(arrayMove(offers, oldIdx, newIdx));
  }

  function moveOffer(idx: number, dir: -1 | 1) {
    const swap = idx + dir;
    if (swap < 0 || swap >= offers.length) return;
    const next = [...offers];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    saveOffers(next);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">{t("📋 Menu Sorting Manager", "📋 مدير ترتيب المنيو")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Drag & drop or use arrows to sort. Changes save instantly.", "اسحب وأفلت أو استخدم الأسهم للترتيب. التغييرات تُحفظ فوراً.")}
        </p>
      </motion.div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2">
        {[
          { color: "#a855f7", icon: <Pin size={9} />, label: t("Pinned — always first", "مثبت — يظهر أولاً دائماً") },
          { color: "#f59e0b", icon: <Star size={9} />, label: t("Featured — boosted", "مميز — يظهر مبكراً") },
          { color: "#ef4444", icon: <Trophy size={9} />, label: t("Best Seller badge", "شارة الأكثر مبيعاً") },
          { color: "#FF7A00", icon: <TrendingUp size={9} />, label: t("Popular badge", "شارة شائع") },
          { color: "#eab308", icon: <Sparkles size={9} />, label: t("New badge", "شارة جديد") },
          { color: "#6b7280", icon: <EyeOff size={9} />, label: t("Hidden from customers", "مخفي عن العملاء") },
        ].map(({ color, icon, label }) => (
          <span key={label} className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 text-[10px] text-muted-foreground">
            <span style={{ color }}>{icon}</span> {label}
          </span>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["menu", "offers"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${
              activeTab === tab ? "border-primary/50 bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "menu" ? t("Categories & Items", "التصنيفات والأصناف") : t("Offers Order", "ترتيب العروض")}
          </button>
        ))}
      </div>

      {/* ── MENU TAB ── */}
      {activeTab === "menu" && (
        <div className="space-y-4">
          {/* Restaurant picker */}
          <select
            value={selectedRestId}
            onChange={e => { setSelectedRestId(e.target.value); setExpandedCats(new Set()); }}
            className="w-full bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none"
          >
            {restaurants.map(r => (
              <option key={r.id} value={r.id}>{t(r.name_en, r.name_ar)}</option>
            ))}
          </select>

          {cats.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">{t("No categories for this restaurant.", "لا توجد تصنيفات لهذا المطعم.")}</p>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleCatDragEnd}>
            <SortableContext items={cats.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {cats.map((cat, catIdx) => (
                  <SortableCategory
                    key={cat.id}
                    cat={cat}
                    catIdx={catIdx}
                    totalCats={cats.length}
                    items={itemsForCat(cat.id)}
                    expanded={expandedCats.has(cat.id)}
                    onToggleExpand={() => setExpandedCats(prev => {
                      const next = new Set(prev);
                      next.has(cat.id) ? next.delete(cat.id) : next.add(cat.id);
                      return next;
                    })}
                    onMove={moveCat}
                    onToggleFlag={toggleCatFlag}
                    restaurantColor={restaurantColor}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ── OFFERS TAB ── */}
      {activeTab === "offers" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("Set the display order of offers in carousels and the Offers page.", "حدد ترتيب ظهور العروض في الكاروسيل وصفحة العروض.")}
          </p>

          {offers.length === 0 && (
            <p className="text-center text-muted-foreground py-10 text-sm">{t("No offers yet.", "لا توجد عروض بعد.")}</p>
          )}

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleOfferDragEnd}>
            <SortableContext items={offers.map(o => o.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {offers.map((offer, idx) => (
                  <SortableOffer
                    key={offer.id}
                    offer={offer}
                    offerIdx={idx}
                    totalOffers={offers.length}
                    onMove={moveOffer}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
