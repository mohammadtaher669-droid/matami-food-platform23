import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Copy, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { modifierGroupStore, modifierOptionStore, addOnStore, menuStore } from "@/lib/store";
import type { ModifierGroup, ModifierOption, AddOn, MenuItem } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import ImageUploader from "@/components/ImageUploader";
import { useToast } from "@/hooks/use-toast";

function Field({ label, value, onChange, ...p }: { label: string; value: string | number; onChange: (v: string) => void; [k: string]: any }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full bg-background border border-white/10 rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary/50" {...p} />
    </div>
  );
}

interface Props {
  menuItem: MenuItem;
  restaurantId: string;
  color: string;
}

export default function ModifierGroupsPanel({ menuItem, restaurantId, color }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(() => {
    const gs = modifierGroupStore.getByItem(menuItem.id);
    const aos = addOnStore.getByItem(menuItem.id);
    return gs.length > 0 || aos.length > 0;
  });

  const groups = useStore(useCallback(() => modifierGroupStore.getByItem(menuItem.id), [menuItem.id]));
  const allOptions = useStore(useCallback(() => modifierOptionStore.getAll(), []));
  const addOns = useStore(useCallback(() => addOnStore.getByItem(menuItem.id), [menuItem.id]));
  const allItems = useStore(useCallback(() => menuStore.getByRestaurant(restaurantId), [restaurantId]));

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupForm, setGroupForm] = useState<Partial<ModifierGroup>>({
    name_en: "", name_ar: "", type: "single", min_selections: 0, max_selections: 1, is_required: false, is_active: true,
  });

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [showOptionForm, setShowOptionForm] = useState<string | null>(null);
  const [optionForm, setOptionForm] = useState<Partial<ModifierOption>>({ name_en: "", name_ar: "", price_addition: 0, is_available: true });
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);

  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null);
  const [addOnForm, setAddOnForm] = useState<Partial<AddOn>>({ name_en: "", name_ar: "", price: 0, is_free: false, is_available: true });

  const [copyFromItemId, setCopyFromItemId] = useState("");

  const saveGroup = () => {
    if (!groupForm.name_en?.trim() || !groupForm.name_ar?.trim()) {
      toast({ title: t("Name required in EN and AR", "الاسم مطلوب بالعربي والإنجليزي"), variant: "destructive" });
      return;
    }
    const existing = editingGroupId ? modifierGroupStore.getById(editingGroupId) : undefined;
    const group: ModifierGroup = {
      id: editingGroupId || `mg-${Date.now()}`,
      menu_item_id: menuItem.id,
      name_en: groupForm.name_en!,
      name_ar: groupForm.name_ar!,
      type: groupForm.type || "single",
      min_selections: groupForm.min_selections ?? 0,
      max_selections: groupForm.max_selections ?? 1,
      is_required: groupForm.is_required ?? false,
      sort_order: existing?.sort_order ?? groups.length,
      is_active: groupForm.is_active ?? true,
    };
    modifierGroupStore.save(group);
    toast({ title: editingGroupId ? t("Group updated", "تم تحديث المجموعة") : t("Group added", "تمت إضافة المجموعة") });
    setShowGroupForm(false);
    setEditingGroupId(null);
    setGroupForm({ name_en: "", name_ar: "", type: "single", min_selections: 0, max_selections: 1, is_required: false, is_active: true });
  };

  const deleteGroup = (id: string) => {
    if (!confirm(t("Delete this modifier group and all its options?", "حذف هذه المجموعة وجميع خياراتها؟"))) return;
    modifierGroupStore.delete(id);
  };

  const saveOption = (groupId: string) => {
    if (!optionForm.name_en?.trim() || !optionForm.name_ar?.trim()) {
      toast({ title: t("Name required", "الاسم مطلوب"), variant: "destructive" });
      return;
    }
    const existingOptions = modifierOptionStore.getByGroup(groupId);
    const option: ModifierOption = {
      id: editingOptionId || `mo-${Date.now()}`,
      group_id: groupId,
      name_en: optionForm.name_en!,
      name_ar: optionForm.name_ar!,
      price_addition: optionForm.price_addition ?? 0,
      image: optionForm.image,
      is_available: optionForm.is_available ?? true,
      sort_order: editingOptionId
        ? (existingOptions.find((o) => o.id === editingOptionId)?.sort_order ?? 99)
        : existingOptions.length,
    };
    modifierOptionStore.save(option);
    toast({ title: t("Option saved", "تم حفظ الخيار") });
    setShowOptionForm(null);
    setEditingOptionId(null);
    setOptionForm({ name_en: "", name_ar: "", price_addition: 0, is_available: true });
  };

  const saveAddOn = () => {
    if (!addOnForm.name_en?.trim() || !addOnForm.name_ar?.trim()) {
      toast({ title: t("Name required", "الاسم مطلوب"), variant: "destructive" });
      return;
    }
    const addon: AddOn = {
      id: editingAddOnId || `ao-${Date.now()}`,
      menu_item_id: menuItem.id,
      name_en: addOnForm.name_en!,
      name_ar: addOnForm.name_ar!,
      price: addOnForm.price ?? 0,
      image: addOnForm.image,
      is_free: addOnForm.is_free ?? false,
      is_available: addOnForm.is_available ?? true,
      sort_order: editingAddOnId
        ? (addOns.find((a) => a.id === editingAddOnId)?.sort_order ?? 99)
        : addOns.length,
    };
    addOnStore.save(addon);
    toast({ title: t("Add-on saved", "تم حفظ الإضافة") });
    setShowAddOnForm(false);
    setEditingAddOnId(null);
    setAddOnForm({ name_en: "", name_ar: "", price: 0, is_free: false, is_available: true });
  };

  const copyModifiers = () => {
    if (!copyFromItemId) return;
    const srcGroups = modifierGroupStore.getByItem(copyFromItemId);
    const srcAllOptions = modifierOptionStore.getAll();
    for (const sg of srcGroups) {
      const newGroupId = `mg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      modifierGroupStore.save({ ...sg, id: newGroupId, menu_item_id: menuItem.id });
      const opts = srcAllOptions.filter((o) => o.group_id === sg.id);
      for (const opt of opts) {
        modifierOptionStore.save({ ...opt, id: `mo-${Date.now()}-${Math.random().toString(36).slice(2)}`, group_id: newGroupId });
      }
    }
    toast({ title: t("Modifier groups copied!", "تم نسخ مجموعات الخيارات!") });
    setCopyFromItemId("");
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const moveOption = (groupId: string, optionId: string, dir: -1 | 1) => {
    const opts = modifierOptionStore.getByGroup(groupId);
    const idx = opts.findIndex((o) => o.id === optionId);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= opts.length) return;
    const updated = [...opts];
    [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
    updated.forEach((o, i) => modifierOptionStore.save({ ...o, sort_order: i }));
  };

  const totalCount = groups.length + addOns.length;

  return (
    <div className={`mt-2 border-t transition-colors ${totalCount > 0 ? "border-primary/20 bg-primary/5 rounded-b-xl" : "border-white/5"}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between px-3 py-2.5 text-xs transition ${totalCount > 0 ? "text-primary font-medium hover:text-primary/80" : "text-muted-foreground hover:text-foreground"}`}
      >
        <span className="flex items-center gap-1.5">
          <span>{t("Options & Add-ons", "الخيارات والإضافات")}</span>
          {totalCount > 0 ? (
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{totalCount}</span>
          ) : (
            <span className="text-muted-foreground/50 text-[10px]">{t("none", "لا يوجد")}</span>
          )}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-4 space-y-4">
              {/* Modifier Groups */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Modifier Groups", "مجموعات الخيارات")}</span>
                  <button
                    onClick={() => { setShowGroupForm(true); setEditingGroupId(null); setGroupForm({ name_en: "", name_ar: "", type: "single", min_selections: 0, max_selections: 1, is_required: false, is_active: true }); }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition"
                  >
                    <Plus size={11} /> {t("Add Group", "إضافة مجموعة")}
                  </button>
                </div>

                {/* Group Form */}
                <AnimatePresence>
                  {showGroupForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="bg-white/3 border border-white/8 rounded-xl p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={t("Name EN", "الاسم EN")} value={groupForm.name_en || ""} onChange={(v) => setGroupForm({ ...groupForm, name_en: v })} />
                        <Field label={t("Name AR", "الاسم AR")} value={groupForm.name_ar || ""} onChange={(v) => setGroupForm({ ...groupForm, name_ar: v })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">{t("Type", "النوع")}</label>
                          <select value={groupForm.type} onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value as "single" | "multi" })}
                            className="w-full bg-background border border-white/10 rounded-lg px-2 py-1.5 text-sm text-foreground focus:outline-none">
                            <option value="single">{t("Single Choice", "اختيار واحد")}</option>
                            <option value="multi">{t("Multi Choice", "اختيار متعدد")}</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-2 pt-1">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={groupForm.is_required || false} onChange={(e) => setGroupForm({ ...groupForm, is_required: e.target.checked })} className="accent-primary" />
                            {t("Required", "مطلوب")}
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={groupForm.is_active ?? true} onChange={(e) => setGroupForm({ ...groupForm, is_active: e.target.checked })} className="accent-primary" />
                            {t("Active", "نشط")}
                          </label>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={t("Min Selections", "الحد الأدنى")} value={groupForm.min_selections ?? 0} onChange={(v) => setGroupForm({ ...groupForm, min_selections: Number(v) })} type="number" min="0" />
                        <Field label={t("Max Selections", "الحد الأقصى")} value={groupForm.max_selections ?? 1} onChange={(v) => setGroupForm({ ...groupForm, max_selections: Number(v) })} type="number" min="0" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveGroup} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center gap-1">
                          <Check size={11} /> {t("Save", "حفظ")}
                        </button>
                        <button onClick={() => { setShowGroupForm(false); setEditingGroupId(null); }} className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-muted-foreground flex items-center gap-1">
                          <X size={11} /> {t("Cancel", "إلغاء")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Group List */}
                <div className="space-y-2">
                  {groups.length === 0 && !showGroupForm && (
                    <p className="text-xs text-muted-foreground/60 text-center py-2">{t("No modifier groups yet", "لا توجد مجموعات خيارات بعد")}</p>
                  )}
                  {groups.map((group) => {
                    const groupOptions = allOptions.filter((o) => o.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order);
                    const isExpanded = expandedGroups.has(group.id);
                    return (
                      <div key={group.id} className="bg-white/3 border border-white/8 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2">
                          <button onClick={() => toggleGroup(group.id)} className="flex-1 flex items-center gap-2 text-left">
                            <div className="flex-1">
                              <span className="text-xs font-medium text-foreground">{t(group.name_en, group.name_ar)}</span>
                              <div className="flex gap-1 mt-0.5">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${group.type === "single" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"}`}>
                                  {group.type === "single" ? t("Single", "واحد") : t("Multi", "متعدد")}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${group.is_required ? "bg-red-500/20 text-red-400" : "bg-white/10 text-muted-foreground"}`}>
                                  {group.is_required ? t("Required", "مطلوب") : t("Optional", "اختياري")}
                                </span>
                                {!group.is_active && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">{t("Inactive", "غير نشط")}</span>
                                )}
                                <span className="text-[10px] text-muted-foreground/60">{groupOptions.length} {t("options", "خيارات")}</span>
                              </div>
                            </div>
                            {isExpanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                          </button>
                          <button onClick={() => {
                            setEditingGroupId(group.id);
                            setGroupForm({ ...group });
                            setShowGroupForm(true);
                          }} className="p-1 text-muted-foreground hover:text-foreground transition">
                            <GripVertical size={12} />
                          </button>
                          <button onClick={() => deleteGroup(group.id)} className="p-1 text-destructive/60 hover:text-destructive transition">
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                              <div className="px-3 pb-3 space-y-1.5 border-t border-white/5 pt-2">
                                {groupOptions.map((opt, idx) => (
                                  <div key={opt.id} className="flex items-center gap-2 bg-white/3 rounded-lg px-2.5 py-1.5">
                                    <div className="flex gap-0.5">
                                      <button onClick={() => moveOption(group.id, opt.id, -1)} disabled={idx === 0} className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 text-[10px] px-0.5">↑</button>
                                      <button onClick={() => moveOption(group.id, opt.id, 1)} disabled={idx === groupOptions.length - 1} className="text-muted-foreground/40 hover:text-muted-foreground disabled:opacity-20 text-[10px] px-0.5">↓</button>
                                    </div>
                                    <span className="flex-1 text-xs text-foreground">{t(opt.name_en, opt.name_ar)}</span>
                                    {opt.price_addition > 0 && (
                                      <span className="text-[10px] text-primary font-medium">+{opt.price_addition} ﷼</span>
                                    )}
                                    <button onClick={() => { setEditingOptionId(opt.id); setOptionForm({ ...opt }); setShowOptionForm(group.id); }}
                                      className="text-muted-foreground hover:text-foreground transition text-[10px]">{t("Edit", "تعديل")}</button>
                                    <button onClick={() => modifierOptionStore.delete(opt.id)} className="text-destructive/60 hover:text-destructive transition">
                                      <Trash2 size={10} />
                                    </button>
                                    <button onClick={() => modifierOptionStore.save({ ...opt, is_available: !opt.is_available })}
                                      className={`text-[10px] ${opt.is_available ? "text-green-400" : "text-muted-foreground"}`}>
                                      {opt.is_available ? "●" : "○"}
                                    </button>
                                  </div>
                                ))}

                                {/* Option Form */}
                                {showOptionForm === group.id && (
                                  <div className="bg-white/4 rounded-lg p-2.5 space-y-2 mt-1">
                                    <div className="grid grid-cols-2 gap-2">
                                      <Field label="Name EN" value={optionForm.name_en || ""} onChange={(v) => setOptionForm({ ...optionForm, name_en: v })} />
                                      <Field label="Name AR" value={optionForm.name_ar || ""} onChange={(v) => setOptionForm({ ...optionForm, name_ar: v })} />
                                    </div>
                                    <Field label={t("Price Addition (SAR)", "إضافة سعر (ريال)")} value={optionForm.price_addition ?? 0} onChange={(v) => setOptionForm({ ...optionForm, price_addition: Number(v) })} type="number" step="0.5" min="0" />
                                    <div className="flex gap-2">
                                      <button onClick={() => saveOption(group.id)} className="px-2.5 py-1 bg-primary text-primary-foreground rounded-lg text-xs flex items-center gap-1">
                                        <Check size={10} /> {t("Save", "حفظ")}
                                      </button>
                                      <button onClick={() => { setShowOptionForm(null); setEditingOptionId(null); setOptionForm({ name_en: "", name_ar: "", price_addition: 0, is_available: true }); }}
                                        className="px-2.5 py-1 border border-white/10 rounded-lg text-xs text-muted-foreground flex items-center gap-1">
                                        <X size={10} /> {t("Cancel", "إلغاء")}
                                      </button>
                                    </div>
                                  </div>
                                )}

                                <button
                                  onClick={() => { setShowOptionForm(group.id); setEditingOptionId(null); setOptionForm({ name_en: "", name_ar: "", price_addition: 0, is_available: true }); }}
                                  className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition mt-1"
                                >
                                  <Plus size={10} /> {t("Add Option", "إضافة خيار")}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add-ons Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("Add-ons", "الإضافات")}</span>
                  <button
                    onClick={() => { setShowAddOnForm(true); setEditingAddOnId(null); setAddOnForm({ name_en: "", name_ar: "", price: 0, is_free: false, is_available: true }); }}
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition"
                  >
                    <Plus size={11} /> {t("Add Add-on", "إضافة")}
                  </button>
                </div>

                <AnimatePresence>
                  {showAddOnForm && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="bg-white/3 border border-white/8 rounded-xl p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Field label="Name EN" value={addOnForm.name_en || ""} onChange={(v) => setAddOnForm({ ...addOnForm, name_en: v })} />
                        <Field label="Name AR" value={addOnForm.name_ar || ""} onChange={(v) => setAddOnForm({ ...addOnForm, name_ar: v })} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Field label={t("Price (SAR)", "السعر (ريال)")} value={addOnForm.price ?? 0} onChange={(v) => setAddOnForm({ ...addOnForm, price: Number(v) })} type="number" step="0.5" min="0" />
                        <div className="flex flex-col gap-2 pt-1">
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={addOnForm.is_free || false} onChange={(e) => setAddOnForm({ ...addOnForm, is_free: e.target.checked })} className="accent-primary" />
                            {t("Free", "مجاني")}
                          </label>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={addOnForm.is_available ?? true} onChange={(e) => setAddOnForm({ ...addOnForm, is_available: e.target.checked })} className="accent-primary" />
                            {t("Available", "متاح")}
                          </label>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">{t("Image (optional)", "صورة (اختياري)")}</label>
                        <ImageUploader preset="thumbnail" value={addOnForm.image} onChange={(url) => setAddOnForm({ ...addOnForm, image: url })} onDelete={() => setAddOnForm({ ...addOnForm, image: undefined })} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveAddOn} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium flex items-center gap-1">
                          <Check size={11} /> {t("Save", "حفظ")}
                        </button>
                        <button onClick={() => { setShowAddOnForm(false); setEditingAddOnId(null); }} className="px-3 py-1.5 border border-white/10 rounded-lg text-xs text-muted-foreground flex items-center gap-1">
                          <X size={11} /> {t("Cancel", "إلغاء")}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  {addOns.length === 0 && !showAddOnForm && (
                    <p className="text-xs text-muted-foreground/60 text-center py-2">{t("No add-ons yet", "لا توجد إضافات بعد")}</p>
                  )}
                  {addOns.map((addon) => (
                    <div key={addon.id} className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-lg px-2.5 py-1.5">
                      {addon.image && <img src={addon.image} alt="" className="w-7 h-7 rounded-lg object-cover flex-shrink-0" />}
                      <span className="flex-1 text-xs text-foreground">{t(addon.name_en, addon.name_ar)}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {addon.is_free ? t("Free", "مجاني") : `${addon.price} ﷼`}
                      </span>
                      <button onClick={() => { setEditingAddOnId(addon.id); setAddOnForm({ ...addon }); setShowAddOnForm(true); }}
                        className="text-[11px] text-muted-foreground hover:text-foreground">{t("Edit", "تعديل")}</button>
                      <button onClick={() => addOnStore.delete(addon.id)} className="text-destructive/60 hover:text-destructive transition"><Trash2 size={11} /></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Copy from another item */}
              <div className="border-t border-white/5 pt-3">
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Copy size={11} /> {t("Copy modifier groups from another item:", "نسخ مجموعات الخيارات من صنف آخر:")}
                </p>
                <div className="flex gap-2">
                  <select
                    value={copyFromItemId}
                    onChange={(e) => setCopyFromItemId(e.target.value)}
                    className="flex-1 bg-background border border-white/10 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none"
                  >
                    <option value="">{t("Select item...", "اختر صنف...")}</option>
                    {allItems.filter((m) => m.id !== menuItem.id).map((m) => (
                      <option key={m.id} value={m.id}>{t(m.name_en, m.name_ar)}</option>
                    ))}
                  </select>
                  <button
                    onClick={copyModifiers}
                    disabled={!copyFromItemId}
                    className="px-3 py-1.5 bg-primary/20 border border-primary/30 text-primary rounded-lg text-xs disabled:opacity-40 hover:bg-primary/30 transition flex items-center gap-1"
                  >
                    <Copy size={11} /> {t("Copy", "نسخ")}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
