import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Edit2, Check, X, Copy, Search,
  ChevronDown, ChevronUp, Zap, GripVertical, Settings2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { modifierGroupStore, modifierOptionStore, itemModifierLinkStore } from "@/lib/store";
import type { ModifierGroup, ModifierOption } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { useToast } from "@/hooks/use-toast";

type Template = {
  name_en: string; name_ar: string; type: "single" | "multi";
  min_selections: number; max_selections: number; is_required: boolean;
  options: { name_en: string; name_ar: string; price_addition: number }[];
};

const TEMPLATES: Template[] = [
  {
    name_en: "Spice Level", name_ar: "درجة الحرارة",
    type: "single", min_selections: 0, max_selections: 1, is_required: false,
    options: [
      { name_en: "Mild", name_ar: "عادي", price_addition: 0 },
      { name_en: "Medium", name_ar: "وسط", price_addition: 0 },
      { name_en: "Hot", name_ar: "حار", price_addition: 0 },
      { name_en: "Extra Hot", name_ar: "حار جداً", price_addition: 0 },
    ],
  },
  {
    name_en: "Drinks", name_ar: "المشروبات",
    type: "single", min_selections: 1, max_selections: 1, is_required: true,
    options: [
      { name_en: "Pepsi", name_ar: "بيبسي", price_addition: 0 },
      { name_en: "7UP", name_ar: "سفن أب", price_addition: 0 },
      { name_en: "Miranda", name_ar: "ميرندا", price_addition: 0 },
      { name_en: "Water", name_ar: "ماء", price_addition: 0 },
    ],
  },
  {
    name_en: "Size", name_ar: "الحجم",
    type: "single", min_selections: 1, max_selections: 1, is_required: true,
    options: [
      { name_en: "Small", name_ar: "صغير", price_addition: 0 },
      { name_en: "Medium", name_ar: "وسط", price_addition: 0 },
      { name_en: "Large", name_ar: "كبير", price_addition: 0 },
      { name_en: "XL", name_ar: "كبير جداً", price_addition: 0 },
    ],
  },
  {
    name_en: "Bread Type", name_ar: "نوع الخبز",
    type: "single", min_selections: 1, max_selections: 1, is_required: true,
    options: [
      { name_en: "Arabic Bread", name_ar: "خبز عربي", price_addition: 0 },
      { name_en: "French Bread", name_ar: "خبز فرنسي", price_addition: 0 },
      { name_en: "Whole Grain", name_ar: "كامل الحبوب", price_addition: 0 },
    ],
  },
  {
    name_en: "Potato Type", name_ar: "نوع البطاطا",
    type: "single", min_selections: 0, max_selections: 1, is_required: false,
    options: [
      { name_en: "Regular Fries", name_ar: "بطاطا عادية", price_addition: 0 },
      { name_en: "Wedges", name_ar: "ويدجز", price_addition: 2 },
      { name_en: "Curly Fries", name_ar: "بطاطا محلزنة", price_addition: 2 },
      { name_en: "Sweet Potato", name_ar: "بطاطا حلوة", price_addition: 3 },
    ],
  },
  {
    name_en: "Extras", name_ar: "الإضافات",
    type: "multi", min_selections: 0, max_selections: 5, is_required: false,
    options: [
      { name_en: "Extra Cheese", name_ar: "جبنة إضافية", price_addition: 2 },
      { name_en: "Garlic Sauce", name_ar: "صوص ثوم", price_addition: 1 },
      { name_en: "Fries", name_ar: "بطاطا", price_addition: 5 },
      { name_en: "Hot Sauce", name_ar: "صوص حار", price_addition: 1 },
      { name_en: "Grilled Onions", name_ar: "بصل مشوي", price_addition: 1 },
    ],
  },
  {
    name_en: "Sauces", name_ar: "الصوصات",
    type: "multi", min_selections: 0, max_selections: 3, is_required: false,
    options: [
      { name_en: "Garlic", name_ar: "ثوم", price_addition: 0 },
      { name_en: "Ketchup", name_ar: "كاتشب", price_addition: 0 },
      { name_en: "Mayonnaise", name_ar: "مايونيز", price_addition: 0 },
      { name_en: "Hot Sauce", name_ar: "حار", price_addition: 0 },
      { name_en: "BBQ", name_ar: "باربيكيو", price_addition: 0 },
    ],
  },
  {
    name_en: "Cooking", name_ar: "درجة الطهي",
    type: "single", min_selections: 0, max_selections: 1, is_required: false,
    options: [
      { name_en: "Rare", name_ar: "نيئ قليلاً", price_addition: 0 },
      { name_en: "Medium Rare", name_ar: "متوسط النضج", price_addition: 0 },
      { name_en: "Well Done", name_ar: "ناضج", price_addition: 0 },
    ],
  },
];

const defaultGroupForm = (): Partial<ModifierGroup> => ({
  name_en: "", name_ar: "", type: "single",
  min_selections: 0, max_selections: 1, is_required: false, is_active: true,
});

const defaultOptionForm = (): Partial<ModifierOption> => ({
  name_en: "", name_ar: "", price_addition: 0, is_available: true,
});

export default function AdminModifiers() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const groups = useStore(useCallback(() => modifierGroupStore.getAll(), []));
  const allOptions = useStore(useCallback(() => modifierOptionStore.getAll(), []));
  const allLinks = useStore(useCallback(() => itemModifierLinkStore.getAll(), []));

  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<Partial<ModifierGroup>>(defaultGroupForm());

  const [showOptionFormFor, setShowOptionFormFor] = useState<string | null>(null);
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState<Partial<ModifierOption>>(defaultOptionForm());

  const getGroupOpts = (groupId: string) =>
    allOptions.filter((o) => o.group_id === groupId).sort((a, b) => a.sort_order - b.sort_order);

  const getLinkedCount = (groupId: string) =>
    allLinks.filter((l) => l.group_id === groupId).length;

  const filtered = groups.filter(
    (g) => !search || g.name_en.toLowerCase().includes(search.toLowerCase()) || g.name_ar.includes(search)
  );

  const saveGroup = () => {
    if (!groupForm.name_en?.trim() || !groupForm.name_ar?.trim()) {
      toast({ title: t("Name required in EN and AR", "الاسم مطلوب بالعربي والإنجليزي"), variant: "destructive" });
      return;
    }
    const g: ModifierGroup = {
      id: editingGroupId || `mg-${Date.now()}`,
      name_en: groupForm.name_en!,
      name_ar: groupForm.name_ar!,
      type: groupForm.type || "single",
      min_selections: groupForm.min_selections ?? 0,
      max_selections: groupForm.max_selections ?? 1,
      is_required: groupForm.is_required || false,
      is_active: groupForm.is_active ?? true,
      sort_order: editingGroupId
        ? (groups.find((g) => g.id === editingGroupId)?.sort_order || 0)
        : groups.length,
    };
    modifierGroupStore.save(g);
    toast({ title: editingGroupId ? t("Group updated", "تم تحديث المجموعة") : t("Group created", "تم إنشاء المجموعة") });
    setShowNewGroup(false);
    setEditingGroupId(null);
    setGroupForm(defaultGroupForm());
    if (!editingGroupId) setExpandedId(g.id);
  };

  const startEditGroup = (group: ModifierGroup) => {
    setEditingGroupId(group.id);
    setGroupForm({ ...group });
    setShowNewGroup(true);
    setExpandedId(group.id);
  };

  const deleteGroup = (id: string) => {
    if (!confirm(t("Delete this modifier group and all its options?", "حذف هذه المجموعة وجميع خياراتها؟"))) return;
    modifierGroupStore.delete(id);
    toast({ title: t("Deleted", "تم الحذف") });
    if (expandedId === id) setExpandedId(null);
  };

  const duplicateGroup = (group: ModifierGroup) => {
    const newId = `mg-${Date.now()}`;
    modifierGroupStore.save({
      ...group, id: newId,
      name_en: group.name_en + " (Copy)",
      name_ar: group.name_ar + " (نسخة)",
      sort_order: groups.length,
      menu_item_id: undefined,
    });
    const opts = getGroupOpts(group.id);
    opts.forEach((o, i) => modifierOptionStore.save({ ...o, id: `mo-${Date.now()}-${i}`, group_id: newId }));
    toast({ title: t("Duplicated", "تم النسخ") });
    setExpandedId(newId);
  };

  const addFromTemplate = (tmpl: Template) => {
    const gId = `mg-tmpl-${Date.now()}`;
    modifierGroupStore.save({
      id: gId, name_en: tmpl.name_en, name_ar: tmpl.name_ar,
      type: tmpl.type, min_selections: tmpl.min_selections,
      max_selections: tmpl.max_selections, is_required: tmpl.is_required,
      is_active: true, sort_order: groups.length,
    });
    tmpl.options.forEach((o, i) =>
      modifierOptionStore.save({
        id: `mo-tmpl-${Date.now()}-${i}`, group_id: gId,
        name_en: o.name_en, name_ar: o.name_ar,
        price_addition: o.price_addition, is_available: true, sort_order: i,
      })
    );
    toast({ title: t("Template added", "تمت إضافة القالب") });
    setShowTemplates(false);
    setExpandedId(gId);
  };

  const saveOption = (groupId: string) => {
    if (!optionForm.name_en?.trim() || !optionForm.name_ar?.trim()) {
      toast({ title: t("Name required", "الاسم مطلوب"), variant: "destructive" });
      return;
    }
    const groupOpts = getGroupOpts(groupId);
    modifierOptionStore.save({
      id: editingOptionId || `mo-${Date.now()}`,
      group_id: groupId,
      name_en: optionForm.name_en!,
      name_ar: optionForm.name_ar!,
      price_addition: optionForm.price_addition ?? 0,
      is_available: optionForm.is_available ?? true,
      sort_order: editingOptionId
        ? (groupOpts.find((o) => o.id === editingOptionId)?.sort_order || 0)
        : groupOpts.length,
    });
    toast({ title: editingOptionId ? t("Updated", "تم التحديث") : t("Option added", "تمت الإضافة") });
    setShowOptionFormFor(null);
    setEditingOptionId(null);
    setOptionForm(defaultOptionForm());
  };

  const startEditOption = (opt: ModifierOption) => {
    setEditingOptionId(opt.id);
    setOptionForm({ ...opt });
    setShowOptionFormFor(opt.group_id);
  };

  const moveOption = (groupId: string, optId: string, dir: -1 | 1) => {
    const opts = getGroupOpts(groupId);
    const idx = opts.findIndex((o) => o.id === optId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= opts.length) return;
    const updated = [...opts];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((o, i) => modifierOptionStore.save({ ...o, sort_order: i }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t("Options & Add-ons", "الخيارات والإضافات")}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("Create global modifier groups once, then link them to any menu item", "أنشئ مجموعات الخيارات مرة واحدة ثم اربطها بأي صنف في القائمة")}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTemplates((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground hover:text-foreground transition"
          >
            <Zap size={14} /> {t("Templates", "قوالب")}
          </button>
          <button
            onClick={() => { setShowNewGroup(true); setEditingGroupId(null); setGroupForm(defaultGroupForm()); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium"
          >
            <Plus size={14} /> {t("New Group", "مجموعة جديدة")}
          </button>
        </div>
      </div>

      {/* Templates Panel */}
      <AnimatePresence>
        {showTemplates && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden"
          >
            <div className="bg-card border border-primary/20 rounded-2xl p-4">
              <p className="text-sm font-semibold text-foreground mb-1">{t("Ready-made Templates", "قوالب جاهزة")}</p>
              <p className="text-xs text-muted-foreground mb-3">{t("Click a template to instantly add it as a global modifier group", "انقر على قالب لإضافته فوراً كمجموعة خيارات عامة")}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {TEMPLATES.map((tmpl) => {
                  const exists = groups.some((g) => g.name_en.toLowerCase() === tmpl.name_en.toLowerCase());
                  return (
                    <button
                      key={tmpl.name_en}
                      onClick={() => !exists && addFromTemplate(tmpl)}
                      disabled={exists}
                      className={`text-left p-3 rounded-xl border transition ${exists ? "border-white/5 opacity-40 cursor-not-allowed" : "border-white/10 hover:border-primary/40 hover:bg-primary/5 cursor-pointer"}`}
                    >
                      <p className="text-xs font-semibold text-foreground">{tmpl.name_en}</p>
                      <p className="text-xs text-muted-foreground">{tmpl.name_ar}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <span className={`text-[9px] px-1 py-0.5 rounded-full font-medium ${tmpl.type === "single" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                          {tmpl.type === "single" ? t("Single", "واحد") : t("Multi", "متعدد")}
                        </span>
                        {tmpl.is_required && <span className="text-[9px] px-1 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400">{t("Required", "مطلوب")}</span>}
                        <span className="text-[9px] text-muted-foreground">{tmpl.options.length} {t("opts", "خيار")}</span>
                        {exists && <span className="text-[9px] text-green-400">{t("✓ Added", "✓ مضاف")}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New / Edit Group Form */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="mb-5 overflow-hidden"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); saveGroup(); }}
              className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4"
            >
              <h3 className="font-semibold text-foreground">
                {editingGroupId ? t("Edit Modifier Group", "تعديل مجموعة الخيارات") : t("New Modifier Group", "مجموعة خيارات جديدة")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Name (EN)", "الاسم (EN)")}</label>
                  <input
                    value={groupForm.name_en || ""} placeholder="e.g. Spice Level"
                    onChange={(e) => setGroupForm((f) => ({ ...f, name_en: e.target.value }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Name (AR)", "الاسم (AR)")}</label>
                  <input
                    value={groupForm.name_ar || ""} placeholder="مثال: درجة الحرارة" dir="rtl"
                    onChange={(e) => setGroupForm((f) => ({ ...f, name_ar: e.target.value }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Selection Type", "نوع الاختيار")}</label>
                  <select
                    value={groupForm.type || "single"}
                    onChange={(e) => setGroupForm((f) => ({ ...f, type: e.target.value as "single" | "multi" }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                  >
                    <option value="single">{t("Single Choice (Radio)", "اختيار واحد")}</option>
                    <option value="multi">{t("Multiple Choice (Checkbox)", "اختيار متعدد")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Required / Optional", "مطلوب / اختياري")}</label>
                  <select
                    value={groupForm.is_required ? "required" : "optional"}
                    onChange={(e) => setGroupForm((f) => ({ ...f, is_required: e.target.value === "required" }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                  >
                    <option value="optional">{t("Optional", "اختياري")}</option>
                    <option value="required">{t("Required (must select)", "مطلوب (يجب الاختيار)")}</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Min Selections", "الحد الأدنى للاختيار")}</label>
                  <input
                    type="number" min="0" value={groupForm.min_selections ?? 0}
                    onChange={(e) => setGroupForm((f) => ({ ...f, min_selections: Number(e.target.value) }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">{t("Max Selections (0 = unlimited)", "الحد الأقصى (0 = غير محدود)")}</label>
                  <input
                    type="number" min="0" value={groupForm.max_selections ?? 1}
                    onChange={(e) => setGroupForm((f) => ({ ...f, max_selections: Number(e.target.value) }))}
                    className="w-full bg-background border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center gap-1.5">
                  <Check size={13} /> {t("Save Group", "حفظ المجموعة")}
                </button>
                <button type="button"
                  onClick={() => { setShowNewGroup(false); setEditingGroupId(null); setGroupForm(defaultGroupForm()); }}
                  className="px-4 py-2 border border-white/10 rounded-xl text-sm text-muted-foreground flex items-center gap-1.5"
                >
                  <X size={13} /> {t("Cancel", "إلغاء")}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      {groups.length > 0 && (
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search modifier groups...", "ابحث عن المجموعات...")}
            className="w-full bg-card border border-white/10 rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && !showNewGroup && (
        <div className="text-center py-20 text-muted-foreground">
          <Settings2 size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">{t("No modifier groups yet", "لا توجد مجموعات خيارات بعد")}</p>
          <p className="text-xs mt-1 opacity-60 max-w-xs mx-auto">
            {t("Create groups like 'Spice Level', 'Drinks', 'Extras', then link them to menu items in Menu Builder.", "أنشئ مجموعات مثل درجة الحرارة، المشروبات، الإضافات، ثم اربطها بالأصناف من قائمة الطعام.")}
          </p>
          <button
            onClick={() => setShowTemplates(true)}
            className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 border border-primary/30 rounded-xl text-sm text-primary hover:bg-primary/5 transition"
          >
            <Zap size={13} /> {t("Browse Templates", "تصفح القوالب")}
          </button>
        </div>
      )}

      {/* Groups Accordion */}
      <div className="space-y-2">
        {filtered.map((group) => {
          const opts = getGroupOpts(group.id);
          const linkedCount = getLinkedCount(group.id);
          const isExpanded = expandedId === group.id;

          return (
            <div key={group.id} className="bg-card border border-white/8 rounded-2xl overflow-hidden">
              {/* Group Header Row */}
              <div className="flex items-center gap-2 px-4 py-3">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : group.id)}
                  className="flex-1 flex items-center gap-3 text-left min-w-0"
                >
                  {isExpanded
                    ? <ChevronUp size={14} className="text-primary flex-shrink-0" />
                    : <ChevronDown size={14} className="text-muted-foreground flex-shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm">{group.name_en}</span>
                      <span className="text-muted-foreground text-xs">/</span>
                      <span className="text-sm text-muted-foreground">{group.name_ar}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${group.type === "single" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                        {group.type === "single" ? t("Single", "واحد") : t("Multi", "متعدد")}
                      </span>
                      {group.is_required && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-red-500/20 text-red-400">{t("Required", "مطلوب")}</span>
                      )}
                      {group.min_selections > 0 && (
                        <span className="text-[10px] text-muted-foreground">min {group.min_selections}</span>
                      )}
                      {group.max_selections > 0 && (
                        <span className="text-[10px] text-muted-foreground">max {group.max_selections}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{opts.length} {t("options", "خيارات")}</span>
                      {linkedCount > 0 && (
                        <span className="text-[10px] font-medium text-primary">{linkedCount} {t("items", "صنف")}</span>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => modifierGroupStore.save({ ...group, is_active: !group.is_active })}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${group.is_active ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                  >
                    {group.is_active ? t("Active", "نشط") : t("Off", "متوقف")}
                  </button>
                  <button onClick={() => startEditGroup(group)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition" title={t("Edit", "تعديل")}>
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => duplicateGroup(group)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition" title={t("Duplicate", "نسخ")}>
                    <Copy size={13} />
                  </button>
                  <button onClick={() => deleteGroup(group.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition" title={t("Delete", "حذف")}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Expanded Options Section */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                    className="border-t border-white/8 overflow-hidden"
                  >
                    <div className="p-4 space-y-2">
                      {/* Option Rows */}
                      {opts.length === 0 && showOptionFormFor !== group.id && (
                        <p className="text-xs text-muted-foreground/50 text-center py-2">
                          {t("No options yet — add one below", "لا توجد خيارات بعد — أضف خياراً أدناه")}
                        </p>
                      )}

                      {opts.map((opt, idx) => (
                        <div key={opt.id} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl px-3 py-2">
                          <div className="flex flex-col gap-0.5 flex-shrink-0">
                            <button onClick={() => moveOption(group.id, opt.id, -1)} disabled={idx === 0} className="text-muted-foreground/40 hover:text-muted-foreground transition disabled:opacity-20 leading-none">
                              <GripVertical size={10} />
                            </button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-medium text-foreground">{opt.name_en}</span>
                            <span className="text-xs text-muted-foreground mx-1">/</span>
                            <span className="text-xs text-muted-foreground">{opt.name_ar}</span>
                          </div>
                          {opt.price_addition > 0 && (
                            <span className="text-xs text-primary font-semibold flex-shrink-0">+{opt.price_addition} ﷼</span>
                          )}
                          <button
                            onClick={() => modifierOptionStore.save({ ...opt, is_available: !opt.is_available })}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 transition ${opt.is_available ? "bg-green-500/20 text-green-400 hover:bg-green-500/30" : "bg-white/5 text-muted-foreground hover:bg-white/10"}`}
                          >
                            {opt.is_available ? t("On", "متاح") : t("Off", "مخفي")}
                          </button>
                          <button onClick={() => startEditOption(opt)} className="p-1 rounded text-muted-foreground hover:text-foreground transition flex-shrink-0">
                            <Edit2 size={11} />
                          </button>
                          <button onClick={() => modifierOptionStore.delete(opt.id)} className="p-1 rounded text-destructive/50 hover:text-destructive transition flex-shrink-0">
                            <Trash2 size={11} />
                          </button>
                        </div>
                      ))}

                      {/* Option Form */}
                      <AnimatePresence>
                        {showOptionFormFor === group.id && (
                          <motion.form
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            onSubmit={(e) => { e.preventDefault(); saveOption(group.id); }}
                            className="bg-background border border-primary/20 rounded-xl p-3 space-y-2"
                          >
                            <p className="text-xs font-medium text-primary">
                              {editingOptionId ? t("Edit Option", "تعديل الخيار") : t("New Option", "خيار جديد")}
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                value={optionForm.name_en || ""} placeholder={t("Name EN", "الاسم EN")}
                                onChange={(e) => setOptionForm((f) => ({ ...f, name_en: e.target.value }))}
                                className="bg-card border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                              />
                              <input
                                value={optionForm.name_ar || ""} placeholder={t("Name AR", "الاسم AR")} dir="rtl"
                                onChange={(e) => setOptionForm((f) => ({ ...f, name_ar: e.target.value }))}
                                className="bg-card border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                              />
                              <input
                                type="number" step="0.5" min="0"
                                value={optionForm.price_addition ?? 0}
                                placeholder={t("Extra price", "سعر إضافي")}
                                onChange={(e) => setOptionForm((f) => ({ ...f, price_addition: Number(e.target.value) }))}
                                className="bg-card border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                              />
                            </div>
                            <div className="flex gap-2">
                              <button type="submit" className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center gap-1">
                                <Check size={10} /> {t("Save", "حفظ")}
                              </button>
                              <button type="button"
                                onClick={() => { setShowOptionFormFor(null); setEditingOptionId(null); setOptionForm(defaultOptionForm()); }}
                                className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-muted-foreground flex items-center gap-1"
                              >
                                <X size={10} /> {t("Cancel", "إلغاء")}
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </AnimatePresence>

                      {/* Add Option Button */}
                      {showOptionFormFor !== group.id && (
                        <button
                          onClick={() => { setShowOptionFormFor(group.id); setEditingOptionId(null); setOptionForm(defaultOptionForm()); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-white/15 rounded-xl text-xs text-muted-foreground hover:border-primary/40 hover:text-primary transition"
                        >
                          <Plus size={11} /> {t("Add Option", "إضافة خيار")}
                        </button>
                      )}

                      {/* Linked Items Info */}
                      {linkedCount > 0 && (
                        <p className="text-[10px] text-muted-foreground pt-1 border-t border-white/5">
                          {t("Linked to", "مرتبطة بـ")} <span className="text-primary font-semibold">{linkedCount}</span> {t("menu item(s) — manage links in Menu Builder ›", "صنف — إدارة الروابط من قائمة الطعام ›")}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}
