import type { ModifierGroup, ModifierOption, AddOn } from "@/lib/store";

export const seedModifierGroups: ModifierGroup[] = [
  {
    id: "mg-sal-bbq1-spice",
    menu_item_id: "sal-bbq-4",
    name_en: "Spice Level",
    name_ar: "مستوى الحرارة",
    type: "single",
    min_selections: 1,
    max_selections: 1,
    is_required: true,
    sort_order: 0,
    is_active: true,
  },
  {
    id: "mg-sal-bbq1-sides",
    menu_item_id: "sal-bbq-4",
    name_en: "Side Dish",
    name_ar: "الطبق الجانبي",
    type: "single",
    min_selections: 0,
    max_selections: 1,
    is_required: false,
    sort_order: 1,
    is_active: true,
  },
  {
    id: "mg-cb-sha2-size",
    menu_item_id: "cb-sha-2",
    name_en: "Size",
    name_ar: "الحجم",
    type: "single",
    min_selections: 1,
    max_selections: 1,
    is_required: true,
    sort_order: 0,
    is_active: true,
  },
  {
    id: "mg-cb-sha2-sauce",
    menu_item_id: "cb-sha-2",
    name_en: "Sauce",
    name_ar: "الصوص",
    type: "multi",
    min_selections: 0,
    max_selections: 3,
    is_required: false,
    sort_order: 1,
    is_active: true,
  },
  {
    id: "mg-cb-br1-style",
    menu_item_id: "cb-br-1",
    name_en: "Cooking Style",
    name_ar: "طريقة التحضير",
    type: "single",
    min_selections: 1,
    max_selections: 1,
    is_required: true,
    sort_order: 0,
    is_active: true,
  },
];

export const seedModifierOptions: ModifierOption[] = [
  { id: "mo-spice-mild", group_id: "mg-sal-bbq1-spice", name_en: "Mild", name_ar: "خفيف", price_addition: 0, is_available: true, sort_order: 0 },
  { id: "mo-spice-med", group_id: "mg-sal-bbq1-spice", name_en: "Medium", name_ar: "متوسط", price_addition: 0, is_available: true, sort_order: 1 },
  { id: "mo-spice-hot", group_id: "mg-sal-bbq1-spice", name_en: "Hot 🌶️", name_ar: "حار 🌶️", price_addition: 0, is_available: true, sort_order: 2 },
  { id: "mo-spice-xhot", group_id: "mg-sal-bbq1-spice", name_en: "Extra Hot 🔥", name_ar: "حار جداً 🔥", price_addition: 0, is_available: true, sort_order: 3 },

  { id: "mo-side-fries", group_id: "mg-sal-bbq1-sides", name_en: "Golden Fries", name_ar: "بطاطا مقلية", price_addition: 7, is_available: true, sort_order: 0 },
  { id: "mo-side-wedge", group_id: "mg-sal-bbq1-sides", name_en: "Potato Wedges", name_ar: "بطاطا ودج", price_addition: 10, is_available: true, sort_order: 1 },
  { id: "mo-side-salad", group_id: "mg-sal-bbq1-sides", name_en: "Fattoush Salad", name_ar: "سلطة فتوش", price_addition: 10, is_available: true, sort_order: 2 },

  { id: "mo-sha-sm", group_id: "mg-cb-sha2-size", name_en: "Regular", name_ar: "عادي", price_addition: 0, is_available: true, sort_order: 0 },
  { id: "mo-sha-lg", group_id: "mg-cb-sha2-size", name_en: "Large (Sarok)", name_ar: "كبير (ساروخ)", price_addition: 3, is_available: true, sort_order: 1 },

  { id: "mo-sauce-garlic", group_id: "mg-cb-sha2-sauce", name_en: "Garlic Sauce", name_ar: "صوص ثوم", price_addition: 0, is_available: true, sort_order: 0 },
  { id: "mo-sauce-tahini", group_id: "mg-cb-sha2-sauce", name_en: "Tahini", name_ar: "طحينة", price_addition: 0, is_available: true, sort_order: 1 },
  { id: "mo-sauce-spicy", group_id: "mg-cb-sha2-sauce", name_en: "Spicy Sauce", name_ar: "صوص حار", price_addition: 0, is_available: true, sort_order: 2 },
  { id: "mo-sauce-ranch", group_id: "mg-cb-sha2-sauce", name_en: "Ranch", name_ar: "رانش", price_addition: 0, is_available: true, sort_order: 3 },

  { id: "mo-br-reg", group_id: "mg-cb-br1-style", name_en: "Regular", name_ar: "عادي", price_addition: 0, is_available: true, sort_order: 0 },
  { id: "mo-br-spicy", group_id: "mg-cb-br1-style", name_en: "Spicy 🌶️", name_ar: "حراق 🌶️", price_addition: 0, is_available: true, sort_order: 1 },
];

export const seedAddOns: AddOn[] = [
  { id: "ao-sal-extra-sauce", menu_item_id: "sal-bbq-4", name_en: "Extra Garlic Sauce", name_ar: "صوص ثوم إضافي", price: 2, is_free: false, is_available: true, sort_order: 0 },
  { id: "ao-sal-extra-bread", menu_item_id: "sal-bbq-4", name_en: "Bread Basket", name_ar: "سلة خبز", price: 3, is_free: false, is_available: true, sort_order: 1 },

  { id: "ao-cb-extra-cheese", menu_item_id: "cb-sha-2", name_en: "Extra Cheese", name_ar: "جبن إضافي", price: 3, is_free: false, is_available: true, sort_order: 0 },
  { id: "ao-cb-extra-veg", menu_item_id: "cb-sha-2", name_en: "Extra Vegetables", name_ar: "خضار إضافية", price: 0, is_free: true, is_available: true, sort_order: 1 },
  { id: "ao-cb-pickles", menu_item_id: "cb-sha-2", name_en: "Pickles", name_ar: "مخلل", price: 0, is_free: true, is_available: true, sort_order: 2 },

  { id: "ao-br-coleslaw", menu_item_id: "cb-br-1", name_en: "Coleslaw", name_ar: "كول سلو", price: 4, is_free: false, is_available: true, sort_order: 0 },
  { id: "ao-br-dip", menu_item_id: "cb-br-1", name_en: "Dipping Sauce", name_ar: "صوص تغميس", price: 2, is_free: false, is_available: true, sort_order: 1 },
];
