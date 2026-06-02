import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, XCircle, EyeOff, Clock, Copy, ChevronDown, ChevronRight,
  AlertTriangle, DollarSign,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  restaurantStore, branchStore, categoryStore, menuStore,
  branchItemOverrideStore, branchCategoryOverrideStore,
} from "@/lib/store";
import type { BranchItemOverride, MenuItem, Category } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_AR = ["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

// ── Status toggle ─────────────────────────────────────────────────────────────

type ItemStatus = "available" | "out_of_stock" | "hidden";

function StatusToggle({
  status, onChange,
}: { status: ItemStatus; onChange: (s: ItemStatus) => void }) {
  const { t } = useLanguage();
  const opts: { value: ItemStatus; label_en: string; label_ar: string; color: string }[] = [
    { value: "available",    label_en: "Available",     label_ar: "متوفر",        color: "#22c55e" },
    { value: "out_of_stock", label_en: "Out of Stock",  label_ar: "نفد المخزون",  color: "#f59e0b" },
    { value: "hidden",       label_en: "Hidden",        label_ar: "مخفي",         color: "#6b7280" },
  ];
  return (
    <div className="flex rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
      {opts.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold transition-all ${
            status === opt.value ? "text-white" : "text-muted-foreground hover:text-foreground bg-white/3"
          }`}
          style={status === opt.value ? { background: opt.color } : {}}
        >
          {opt.value === "available"    && <CheckCircle2 size={10} />}
          {opt.value === "out_of_stock" && <AlertTriangle size={10} />}
          {opt.value === "hidden"       && <EyeOff size={10} />}
          <span className="hidden sm:inline">{t(opt.label_en, opt.label_ar)}</span>
        </button>
      ))}
    </div>
  );
}

// ── Schedule editor ───────────────────────────────────────────────────────────

function ScheduleEditor({
  schedule, onChange,
}: {
  schedule: BranchItemOverride["schedule"];
  onChange: (s: BranchItemOverride["schedule"]) => void;
}) {
  const { t } = useLanguage();
  const s = schedule ?? { enabled: false, days: [], time_start: "09:00", time_end: "23:00" };

  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-3 space-y-3 mt-2">
      {/* Enable toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <div
          onClick={() => onChange({ ...s, enabled: !s.enabled })}
          className={`w-8 h-4 rounded-full transition-colors relative ${s.enabled ? "bg-primary" : "bg-white/20"}`}
        >
          <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${s.enabled ? "left-4.5" : "left-0.5"}`} style={{ left: s.enabled ? "18px" : "2px" }} />
        </div>
        <span className="text-xs font-medium text-foreground">{t("Schedule availability", "جدولة التوفر")}</span>
      </label>

      {s.enabled && (
        <div className="space-y-2">
          {/* Days */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">{t("Available on days:", "متوفر في أيام:")}</p>
            <div className="flex gap-1 flex-wrap">
              {DAY_LABELS.map((label, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    const days = s.days.includes(idx)
                      ? s.days.filter((d) => d !== idx)
                      : [...s.days, idx];
                    onChange({ ...s, days });
                  }}
                  className={`w-9 h-7 rounded-lg text-[10px] font-bold transition-all border ${
                    s.days.includes(idx)
                      ? "bg-primary text-white border-primary"
                      : "border-white/10 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  {t(label, DAY_LABELS_AR[idx])}
                </button>
              ))}
            </div>
            {s.days.length === 0 && (
              <p className="text-[10px] text-amber-400 mt-1">{t("All days (none selected)", "كل الأيام (لم يُحدد)")}</p>
            )}
          </div>
          {/* Time range */}
          <div className="flex items-center gap-2">
            <Clock size={11} className="text-muted-foreground flex-shrink-0" />
            <input
              type="time"
              value={s.time_start}
              onChange={(e) => onChange({ ...s, time_start: e.target.value })}
              className="bg-background border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50 w-28"
            />
            <span className="text-xs text-muted-foreground">→</span>
            <input
              type="time"
              value={s.time_end}
              onChange={(e) => onChange({ ...s, time_end: e.target.value })}
              className="bg-background border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50 w-28"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Item row ──────────────────────────────────────────────────────────────────

function ItemOverrideRow({
  item, branchId,
}: { item: MenuItem; branchId: string }) {
  const { t } = useLanguage();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const override = useStore(useCallback(
    () => branchItemOverrideStore.get(branchId, item.id),
    [branchId, item.id]
  ));

  const status: ItemStatus = override?.status ?? "available";
  const priceOverride = override?.price_override;
  const schedule = override?.schedule;
  const imgSrc = item.image_url || item.image;

  function setStatus(s: ItemStatus) {
    if (s === "available" && !override?.price_override && !override?.schedule?.enabled) {
      branchItemOverrideStore.delete(branchId, item.id);
    } else {
      branchItemOverrideStore.set({ branch_id: branchId, item_id: item.id, status: s, price_override: override?.price_override, schedule: override?.schedule });
    }
  }

  function setPriceOverride(v: string) {
    const num = parseFloat(v);
    const newPrice = isNaN(num) || num <= 0 ? undefined : num;
    branchItemOverrideStore.set({
      branch_id: branchId, item_id: item.id,
      status: override?.status ?? "available",
      price_override: newPrice,
      schedule: override?.schedule,
    });
  }

  function setSchedule(s: BranchItemOverride["schedule"]) {
    branchItemOverrideStore.set({
      branch_id: branchId, item_id: item.id,
      status: override?.status ?? "available",
      price_override: override?.price_override,
      schedule: s,
    });
  }

  const hasCustomizations = status !== "available" || priceOverride !== undefined || schedule?.enabled;

  return (
    <div className={`rounded-2xl border transition-all ${
      status === "out_of_stock" ? "border-amber-500/20 bg-amber-500/5"
      : status === "hidden" ? "border-white/5 opacity-60"
      : hasCustomizations ? "border-primary/20 bg-primary/3"
      : "border-white/8 bg-card"
    }`}>
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail */}
        <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-white/5">
          {imgSrc
            ? <img src={imgSrc} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            : <div className="w-full h-full flex items-center justify-center text-xl opacity-30">🍽️</div>
          }
        </div>

        {/* Name + prices */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{t(item.name_en, item.name_ar)}</p>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${priceOverride ? "line-through text-muted-foreground/50" : "text-muted-foreground"}`}>
              {item.price} ﷼
            </span>
            {priceOverride && (
              <span className="text-xs font-bold text-primary">{priceOverride} ﷼</span>
            )}
          </div>
        </div>

        {/* Status toggle */}
        <StatusToggle status={status} onChange={setStatus} />

        {/* Schedule toggle button */}
        <button
          onClick={() => setScheduleOpen(!scheduleOpen)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[10px] border transition-all flex-shrink-0 ${
            schedule?.enabled
              ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
              : "border-white/10 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock size={10} />
          {scheduleOpen ? <ChevronDown size={9} /> : <ChevronRight size={9} />}
        </button>
      </div>

      {/* Price override */}
      <div className="px-3 pb-2 flex items-center gap-2">
        <DollarSign size={10} className="text-muted-foreground flex-shrink-0" />
        <span className="text-[10px] text-muted-foreground">{t("Branch price:", "سعر الفرع:")}</span>
        <input
          type="number"
          min="0"
          step="0.5"
          placeholder={String(item.price)}
          value={priceOverride ?? ""}
          onChange={(e) => setPriceOverride(e.target.value)}
          className="w-24 bg-background border border-white/10 rounded-lg px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50"
        />
        {priceOverride && (
          <button
            onClick={() => setPriceOverride("")}
            className="text-[10px] text-muted-foreground hover:text-destructive transition"
          >
            {t("Reset", "إعادة")}
          </button>
        )}
      </div>

      {/* Schedule editor */}
      <AnimatePresence>
        {scheduleOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <ScheduleEditor schedule={schedule} onChange={setSchedule} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Category override toggle ──────────────────────────────────────────────────

function CategoryOverrideRow({
  cat, branchId, items,
}: { cat: Category; branchId: string; items: MenuItem[] }) {
  const { t } = useLanguage();
  const override = useStore(useCallback(
    () => branchCategoryOverrideStore.get(branchId, cat.id),
    [branchId, cat.id]
  ));
  const isHidden = override?.hidden ?? false;
  const oosCount = items.filter((m) => {
    const o = branchItemOverrideStore.get(branchId, m.id);
    return o?.status === "out_of_stock";
  }).length;

  function toggleHidden() {
    if (!isHidden) {
      branchCategoryOverrideStore.set({ branch_id: branchId, category_id: cat.id, hidden: true });
    } else {
      branchCategoryOverrideStore.delete(branchId, cat.id);
    }
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition cursor-pointer ${
      isHidden ? "bg-white/3 opacity-60" : "hover:bg-white/5"
    }`} onClick={toggleHidden}>
      {isHidden ? <EyeOff size={13} className="text-muted-foreground" /> : <CheckCircle2 size={13} className="text-green-500" />}
      <span className="flex-1 text-sm font-medium text-foreground">{t(cat.name_en, cat.name_ar)}</span>
      {oosCount > 0 && (
        <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">
          {oosCount} OOS
        </span>
      )}
      <span className="text-[10px] text-muted-foreground">{items.length}</span>
    </div>
  );
}

// ── Copy from branch dialog ───────────────────────────────────────────────────

function CopyDialog({
  currentBranchId, restaurantId, onClose,
}: { currentBranchId: string; restaurantId: string; onClose: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const branches = useStore(useCallback(() => branchStore.getByRestaurant(restaurantId), [restaurantId]));
  const others = branches.filter((b) => b.id !== currentBranchId);
  const [sourceId, setSourceId] = useState(others[0]?.id || "");

  function handleCopy() {
    if (!sourceId) return;
    branchItemOverrideStore.copyFromBranch(sourceId, currentBranchId);
    toast({ title: t("Menu copied from branch!", "تم نسخ المنيو من الفرع!") });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-white/10 rounded-2xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-foreground mb-3">{t("Copy menu from branch", "نسخ المنيو من فرع")}</h3>
        <p className="text-xs text-muted-foreground mb-4">
          {t("This will overwrite this branch's item overrides with those from the selected branch.", "سيتم استبدال إعدادات هذا الفرع بإعدادات الفرع المحدد.")}
        </p>
        {others.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{t("No other branches available.", "لا توجد فروع أخرى.")}</p>
        ) : (
          <>
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none mb-4"
            >
              {others.map((b) => (
                <option key={b.id} value={b.id}>{t(b.name_en, b.name_ar)}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground transition">
                {t("Cancel", "إلغاء")}
              </button>
              <button
                onClick={handleCopy}
                className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition"
              >
                {t("Copy", "نسخ")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminBranchMenu() {
  const { t } = useLanguage();

  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const allBranches = useStore(useCallback(() => branchStore.getAll(), []));
  const allCategories = useStore(useCallback(() => categoryStore.getAll(), []));
  const allItems = useStore(useCallback(() => menuStore.getAll(), []));

  const [restId, setRestId] = useState(restaurants[0]?.id || "");
  const [branchId, setBranchId] = useState(() => {
    const branches = allBranches.filter((b) => b.restaurant_id === restaurants[0]?.id);
    return branches[0]?.id || "";
  });
  const [selectedCatId, setSelectedCatId] = useState<string>("all");
  const [copyOpen, setCopyOpen] = useState(false);

  const branches = allBranches.filter((b) => b.restaurant_id === restId);
  const categories = allCategories.filter((c) => c.restaurant_id === restId).sort((a, b) => a.sort_order - b.sort_order);

  const currentBranch = allBranches.find((b) => b.id === branchId);

  function handleRestChange(id: string) {
    setRestId(id);
    const br = allBranches.filter((b) => b.restaurant_id === id);
    setBranchId(br[0]?.id || "");
    setSelectedCatId("all");
  }

  function handleBranchChange(id: string) {
    setBranchId(id);
    setSelectedCatId("all");
  }

  const displayedCategories = selectedCatId === "all" ? categories : categories.filter((c) => c.id === selectedCatId);

  // Count total OOS items for current branch
  const allOverrides = useStore(useCallback(() =>
    branchId ? branchItemOverrideStore.getForBranch(branchId) : [],
    [branchId]
  ));
  const oosTotal = allOverrides.filter((o) => o.status === "out_of_stock").length;
  const hiddenTotal = allOverrides.filter((o) => o.status === "hidden").length;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground">{t("🏪 Branch Menu Control", "🏪 التحكم بمنيو الفرع")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Set per-branch availability, prices, and schedules. Changes apply instantly.", "تحكم في التوفر والأسعار والجداول لكل فرع. التغييرات تطبق فوراً.")}
        </p>
      </motion.div>

      {/* Restaurant + Branch selectors */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={restId}
          onChange={(e) => handleRestChange(e.target.value)}
          className="bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none flex-1 min-w-40"
        >
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>{t(r.name_en, r.name_ar)}</option>
          ))}
        </select>
        <select
          value={branchId}
          onChange={(e) => handleBranchChange(e.target.value)}
          className="bg-background border border-white/10 rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none flex-1 min-w-40"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{t(b.name_en, b.name_ar)}</option>
          ))}
        </select>
        <button
          onClick={() => setCopyOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition flex-shrink-0"
        >
          <Copy size={14} />
          {t("Copy from branch", "نسخ من فرع")}
        </button>
      </div>

      {/* Stats bar */}
      {branchId && (oosTotal > 0 || hiddenTotal > 0) && (
        <div className="flex gap-3">
          {oosTotal > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-400">
              <AlertTriangle size={12} />
              <span>{oosTotal} {t("items out of stock", "صنف نفد مخزونه")}</span>
            </div>
          )}
          {hiddenTotal > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-muted-foreground">
              <EyeOff size={12} />
              <span>{hiddenTotal} {t("items hidden", "صنف مخفي")}</span>
            </div>
          )}
        </div>
      )}

      {!branchId && (
        <p className="text-center text-muted-foreground py-10 text-sm">{t("Select a branch to manage its menu.", "اختر فرعاً لإدارة منيوه.")}</p>
      )}

      {branchId && (
        <div className="flex gap-4">
          {/* Category sidebar */}
          <div className="w-44 flex-shrink-0 space-y-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t("Categories", "التصنيفات")}</h3>
            <button
              onClick={() => setSelectedCatId("all")}
              className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition ${
                selectedCatId === "all" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              }`}
            >
              {t("All categories", "كل التصنيفات")}
            </button>
            {categories.map((cat) => {
              const catItems = allItems.filter((m) => m.category_id === cat.id);
              const catOos = allOverrides.filter((o) => catItems.some((m) => m.id === o.item_id) && o.status === "out_of_stock").length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                    selectedCatId === cat.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  }`}
                >
                  <span className="flex-1 truncate">{t(cat.name_en, cat.name_ar)}</span>
                  {catOos > 0 && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1 rounded-full">{catOos}</span>}
                </button>
              );
            })}
            {/* Category visibility toggles */}
            {categories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/8">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{t("Category Visibility", "ظهور التصنيفات")}</h3>
                {categories.map((cat) => {
                  const catItems = allItems.filter((m) => m.category_id === cat.id);
                  return <CategoryOverrideRow key={cat.id} cat={cat} branchId={branchId} items={catItems} />;
                })}
              </div>
            )}
          </div>

          {/* Items list */}
          <div className="flex-1 space-y-2 min-w-0">
            {displayedCategories.map((cat) => {
              const catItems = allItems
                .filter((m) => m.category_id === cat.id)
                .sort((a, b) => {
                  if (a.pinned && !b.pinned) return -1;
                  if (!a.pinned && b.pinned) return 1;
                  return (a.sort_order ?? 999) - (b.sort_order ?? 999);
                });

              if (catItems.length === 0) return null;

              return (
                <div key={cat.id}>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 mt-4 first:mt-0">
                    {t(cat.name_en, cat.name_ar)}
                    <span className="ml-2 normal-case font-normal">{catItems.length} {t("items", "صنف")}</span>
                  </h3>
                  <div className="space-y-2">
                    {catItems.map((item) => (
                      <ItemOverrideRow key={item.id} item={item} branchId={branchId} />
                    ))}
                  </div>
                </div>
              );
            })}
            {displayedCategories.length === 0 && (
              <p className="text-center text-muted-foreground py-10 text-sm">{t("No items found.", "لا توجد أصناف.")}</p>
            )}
          </div>
        </div>
      )}

      {/* Copy dialog */}
      {copyOpen && (
        <CopyDialog currentBranchId={branchId} restaurantId={restId} onClose={() => setCopyOpen(false)} />
      )}
    </div>
  );
}
