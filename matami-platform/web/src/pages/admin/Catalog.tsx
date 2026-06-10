/**
 * Catalog management: categories, products (with variants, add-on links,
 * featured/stock flags), and add-on groups with their options.
 */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatMoney, useI18n } from "@/lib/i18n";
import { Badge, Button, Confirm, DataTable, EmptyState, Field, Input, Modal, Select, Spinner, Textarea, Toggle, useToast } from "@/components/ui";
import { ResourceManager, ActiveBadge } from "@/components/ResourceManager";
import { ImageInput } from "@/components/ImageInput";
import { useAdmin } from "./AdminPanel";

type Tab = "products" | "categories" | "addons";

interface Category { id: string; name_en: string; name_ar: string; imageUrl: string; isActive: boolean; isFeatured: boolean; sortOrder: number }
interface Variant { id?: string; name_en: string; name_ar: string; priceDelta: number; isDefault: boolean; sortOrder: number }
interface AddonRow { id?: string; name_en: string; name_ar: string; price: number; isActive: boolean; sortOrder: number }
interface AddonGroup { id: string; name_en: string; name_ar: string; minSelect: number; maxSelect: number; sortOrder: number; addons: AddonRow[] }
interface Product {
  id: string; categoryId: string; name_en: string; name_ar: string;
  description_en: string; description_ar: string; imageUrl: string;
  price: number | string; compareAtPrice: number | string | null; calories: number | null;
  isActive: boolean; isFeatured: boolean; trackStock: boolean; sortOrder: number; tags: string[];
  variants: Variant[]; addonGroups: Array<{ groupId: string }>;
  category?: { name_en: string; name_ar: string };
}

export default function Catalog() {
  const params = useParams<{ tab?: Tab }>();
  const tab: Tab = params.tab === "categories" || params.tab === "addons" ? params.tab : "products";
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          ["products", t("Products", "المنتجات")],
          ["categories", t("Categories", "التصنيفات")],
          ["addons", t("Add-ons", "الإضافات")],
        ] as Array<[Tab, string]>).map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/catalog/${k}`}
            className={`rounded-full px-4 py-2 text-xs font-bold ${tab === k ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {tab === "products" && <ProductsTab />}
      {tab === "categories" && <CategoriesTab />}
      {tab === "addons" && <AddonsTab />}
    </div>
  );
}

function CategoriesTab() {
  const { tr } = useI18n();
  const { headers } = useAdmin();
  return (
    <ResourceManager<Category>
      titleEn="Categories"
      titleAr="التصنيفات"
      apiPath="/api/admin/categories"
      headers={headers}
      emptyHintEn="Create categories to organize your menu"
      emptyHintAr="أنشئ تصنيفات لتنظيم المنيو"
      fields={[
        { key: "name_ar", label_en: "Name (AR)", label_ar: "الاسم (عربي)", type: "text", required: true, half: true },
        { key: "name_en", label_en: "Name (EN)", label_ar: "الاسم (إنجليزي)", type: "text", required: true, half: true },
        { key: "imageUrl", label_en: "Image", label_ar: "الصورة", type: "image" },
        { key: "sortOrder", label_en: "Sort order", label_ar: "الترتيب", type: "number", half: true },
        { key: "isFeatured", label_en: "Featured on homepage", label_ar: "يظهر في الرئيسية", type: "toggle", half: true },
        { key: "isActive", label_en: "Active", label_ar: "مفعّل", type: "toggle" },
      ]}
      columns={[
        {
          header: "",
          className: "w-12",
          render: (c) => (c.imageUrl ? <img src={c.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span className="text-lg">🍽</span>),
        },
        { header: "Name / الاسم", render: (c) => <b>{tr(c as unknown as Record<string, unknown>, "name")}</b> },
        { header: "#", className: "w-14", render: (c) => c.sortOrder },
        { header: "", className: "w-28", render: (c) => <ActiveBadge active={c.isActive} /> },
      ]}
    />
  );
}

function AddonsTab() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();
  const [groups, setGroups] = useState<AddonGroup[] | null>(null);
  const [editing, setEditing] = useState<AddonGroup | "new" | null>(null);
  const [deleting, setDeleting] = useState<AddonGroup | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ar: "", minSelect: 0, maxSelect: 1, sortOrder: 0 });
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ items: AddonGroup[] }>("/api/admin/addon-groups", { headers }).then((d) => setGroups(d.items)).catch(() => setGroups([]));
  }, [headers]);

  useEffect(() => void load(), [load]);

  const open = (g: AddonGroup | "new") => {
    setEditing(g);
    if (g === "new") {
      setForm({ name_en: "", name_ar: "", minSelect: 0, maxSelect: 1, sortOrder: 0 });
      setAddons([]);
    } else {
      setForm({ name_en: g.name_en, name_ar: g.name_ar, minSelect: g.minSelect, maxSelect: g.maxSelect, sortOrder: g.sortOrder });
      setAddons(g.addons.map((a) => ({ ...a, price: Number(a.price) })));
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      let groupId: string;
      if (editing === "new") {
        const d = await api<{ item: { id: string } }>("/api/admin/addon-groups", { method: "POST", body: form, headers });
        groupId = d.item.id;
      } else {
        groupId = editing!.id;
        await api(`/api/admin/addon-groups/${groupId}`, { method: "PUT", body: form, headers });
      }
      await api(`/api/admin/addon-groups/${groupId}/addons`, {
        method: "PUT",
        headers,
        body: addons.map((a, i) => ({ name_en: a.name_en, name_ar: a.name_ar, price: Number(a.price) || 0, isActive: a.isActive, sortOrder: i })),
      });
      toast(t("Saved", "تم الحفظ"));
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (groups === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Add-on groups", "مجموعات الإضافات")}</h1>
        <Button size="sm" onClick={() => open("new")}>
          <Plus size={15} /> {t("Add group", "إضافة مجموعة")}
        </Button>
      </div>

      {groups.length === 0 ? (
        <EmptyState title={t("No add-on groups", "لا توجد مجموعات إضافات")} hint={t("e.g. “Extras” with cheese, sauce…", "مثل «إضافات» تحتوي جبنة، صوص…")} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map((g) => (
            <div key={g.id} className="rounded-[var(--th-radius)] border border-black/5 bg-[var(--th-surface)] p-4">
              <div className="flex items-center justify-between">
                <b>{tr(g as unknown as Record<string, unknown>, "name")}</b>
                <div className="flex gap-1">
                  <button onClick={() => open(g)} className="rounded-full p-1.5 hover:bg-black/5"><Pencil size={14} /></button>
                  <button onClick={() => setDeleting(g)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-[11px] text-[var(--th-muted)]">
                {t("Select", "الاختيار")}: {g.minSelect}–{g.maxSelect}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {g.addons.map((a, i) => (
                  <Badge key={i}>{lang === "ar" ? a.name_ar : a.name_en} {Number(a.price) > 0 && `+${a.price}`}</Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("New group", "مجموعة جديدة") : t("Edit group", "تعديل المجموعة")} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
            <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
            <Field label={t("Min select", "أدنى اختيار")}><Input type="number" value={form.minSelect} onChange={(e) => setForm({ ...form, minSelect: Number(e.target.value) })} /></Field>
            <Field label={t("Max select", "أقصى اختيار")}><Input type="number" value={form.maxSelect} onChange={(e) => setForm({ ...form, maxSelect: Number(e.target.value) })} /></Field>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--th-muted)]">{t("Options", "الخيارات")}</p>
              <Button size="sm" variant="outline" onClick={() => setAddons([...addons, { name_en: "", name_ar: "", price: 0, isActive: true, sortOrder: addons.length }])}>
                <Plus size={13} /> {t("Option", "خيار")}
              </Button>
            </div>
            <div className="space-y-2">
              {addons.map((a, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder={t("AR", "عربي")} value={a.name_ar} onChange={(e) => setAddons(addons.map((x, j) => (j === i ? { ...x, name_ar: e.target.value } : x)))} />
                  <Input placeholder="EN" value={a.name_en} onChange={(e) => setAddons(addons.map((x, j) => (j === i ? { ...x, name_en: e.target.value } : x)))} />
                  <Input type="number" step="0.5" className="w-24" dir="ltr" value={a.price} onChange={(e) => setAddons(addons.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))} />
                  <button onClick={() => setAddons(addons.filter((_, j) => j !== i))} className="shrink-0 rounded-full p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={() => void save()} loading={saving}>{t("Save", "حفظ")}</Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/api/admin/addon-groups/${deleting.id}`, { method: "DELETE", headers });
          void load();
        }}
        title={t("Delete group?", "حذف المجموعة؟")}
        body={t("Products linked to it will lose these options.", "ستفقد المنتجات المرتبطة هذه الخيارات.")}
        confirmLabel={t("Delete", "حذف")}
      />
    </div>
  );
}

function ProductsTab() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();

  const [products, setProducts] = useState<Product[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [groups, setGroups] = useState<AddonGroup[]>([]);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    categoryId: "", name_en: "", name_ar: "", description_en: "", description_ar: "",
    imageUrl: "", price: "" as string | number, compareAtPrice: "" as string | number,
    calories: "" as string | number, isActive: true, isFeatured: false, trackStock: false,
    sortOrder: 0, tags: "" as string,
  };
  const [form, setForm] = useState(emptyForm);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [linkedGroups, setLinkedGroups] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    Promise.all([
      api<{ items: Product[] }>("/api/admin/products", { headers }),
      api<{ items: Category[] }>("/api/admin/categories", { headers }),
      api<{ items: AddonGroup[] }>("/api/admin/addon-groups", { headers }),
    ])
      .then(([p, c, g]) => {
        setProducts(p.items);
        setCategories(c.items);
        setGroups(g.items);
      })
      .catch(() => setProducts([]));
  }, [headers]);

  useEffect(() => void load(), [load]);

  const open = (p: Product | "new") => {
    setEditing(p);
    if (p === "new") {
      setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
      setVariants([]);
      setLinkedGroups(new Set());
    } else {
      setForm({
        categoryId: p.categoryId, name_en: p.name_en, name_ar: p.name_ar,
        description_en: p.description_en, description_ar: p.description_ar,
        imageUrl: p.imageUrl, price: Number(p.price), compareAtPrice: p.compareAtPrice == null ? "" : Number(p.compareAtPrice),
        calories: p.calories ?? "", isActive: p.isActive, isFeatured: p.isFeatured,
        trackStock: p.trackStock, sortOrder: p.sortOrder, tags: p.tags.join(", "),
      });
      setVariants(p.variants.map((v) => ({ ...v, priceDelta: Number(v.priceDelta) })));
      setLinkedGroups(new Set(p.addonGroups.map((x) => x.groupId)));
    }
  };

  const save = async () => {
    if (!form.categoryId) {
      toast(t("Create a category first", "أنشئ تصنيفاً أولاً"), "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        name_en: form.name_en, name_ar: form.name_ar,
        description_en: form.description_en, description_ar: form.description_ar,
        imageUrl: form.imageUrl,
        price: Number(form.price) || 0,
        compareAtPrice: form.compareAtPrice === "" ? null : Number(form.compareAtPrice),
        calories: form.calories === "" ? null : Number(form.calories),
        isActive: form.isActive, isFeatured: form.isFeatured, trackStock: form.trackStock,
        sortOrder: Number(form.sortOrder) || 0,
        tags: form.tags.split(",").map((s) => s.trim()).filter(Boolean),
      };
      let productId: string;
      if (editing === "new") {
        const d = await api<{ item: { id: string } }>("/api/admin/products", { method: "POST", body: payload, headers });
        productId = d.item.id;
      } else {
        productId = editing!.id;
        await api(`/api/admin/products/${productId}`, { method: "PUT", body: payload, headers });
      }
      await api(`/api/admin/products/${productId}/variants`, {
        method: "PUT",
        headers,
        body: variants.map((v, i) => ({ name_en: v.name_en, name_ar: v.name_ar, priceDelta: Number(v.priceDelta) || 0, isDefault: v.isDefault, sortOrder: i })),
      });
      await api(`/api/admin/products/${productId}/addon-groups`, { method: "PUT", headers, body: [...linkedGroups] });
      toast(t("Product saved", "تم حفظ المنتج"));
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (products === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Products", "المنتجات")}</h1>
        <Button size="sm" onClick={() => open("new")}>
          <Plus size={15} /> {t("Add product", "إضافة منتج")}
        </Button>
      </div>

      <DataTable
        rows={products}
        keyOf={(p) => p.id}
        empty={<EmptyState title={t("No products yet", "لا توجد منتجات بعد")} hint={t("Add your first dish", "أضف أول طبق")} />}
        columns={[
          {
            header: "",
            className: "w-12",
            render: (p) => (p.imageUrl ? <img src={p.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="text-xl">🍽</span>),
          },
          {
            header: t("Product", "المنتج"),
            render: (p) => (
              <div>
                <b>{tr(p as unknown as Record<string, unknown>, "name")}</b>
                <p className="text-[11px] text-[var(--th-muted)]">{p.category ? tr(p.category as unknown as Record<string, unknown>, "name") : ""}</p>
              </div>
            ),
          },
          { header: t("Price", "السعر"), className: "w-28", render: (p) => <b>{formatMoney(Number(p.price), "SAR", lang)}</b> },
          {
            header: "",
            className: "w-40",
            render: (p) => (
              <div className="flex flex-wrap gap-1">
                {p.isFeatured && <Badge tone="warn">⭐</Badge>}
                {p.trackStock && <Badge tone="info">📦</Badge>}
                {p.variants.length > 0 && <Badge>{p.variants.length} {t("sizes", "أحجام")}</Badge>}
                <ActiveBadge active={p.isActive} />
              </div>
            ),
          },
          {
            header: "",
            className: "w-24",
            render: (p) => (
              <div className="flex justify-end gap-1">
                <button onClick={() => open(p)} className="rounded-full p-1.5 hover:bg-black/5"><Pencil size={14} /></button>
                <button onClick={() => setDeleting(p)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("New product", "منتج جديد") : t("Edit product", "تعديل المنتج")} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
            <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
            <Field label={t("Description (AR)", "الوصف (عربي)")}><Textarea value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} /></Field>
            <Field label={t("Description (EN)", "الوصف (إنجليزي)")}><Textarea value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} /></Field>
            <Field label={t("Category", "التصنيف")}>
              <Select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{tr(c as unknown as Record<string, unknown>, "name")}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("Image", "الصورة")}><ImageInput value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} headers={headers} /></Field>
            <Field label={t("Price", "السعر")}><Input type="number" step="0.5" dir="ltr" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></Field>
            <Field label={t("Compare-at price (optional)", "سعر قبل الخصم (اختياري)")}><Input type="number" step="0.5" dir="ltr" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} /></Field>
            <Field label={t("Calories (optional)", "السعرات (اختياري)")}><Input type="number" dir="ltr" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} /></Field>
            <Field label={t("Tags (comma separated)", "وسوم (مفصولة بفاصلة)")}><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder={t("spicy, new", "حار, جديد")} /></Field>
          </div>

          <div className="flex flex-wrap gap-4">
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label={t("Active", "مفعّل")} />
            <Toggle checked={form.isFeatured} onChange={(v) => setForm({ ...form, isFeatured: v })} label={t("Featured", "مميز")} />
            <Toggle checked={form.trackStock} onChange={(v) => setForm({ ...form, trackStock: v })} label={t("Track stock", "تتبع المخزون")} />
          </div>

          {/* Variants */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-[var(--th-muted)]">{t("Variants (sizes/options)", "الأحجام / الأنواع")}</p>
              <Button size="sm" variant="outline" onClick={() => setVariants([...variants, { name_en: "", name_ar: "", priceDelta: 0, isDefault: variants.length === 0, sortOrder: variants.length }])}>
                <Plus size={13} /> {t("Variant", "حجم")}
              </Button>
            </div>
            <div className="space-y-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input placeholder={t("AR", "عربي")} value={v.name_ar} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, name_ar: e.target.value } : x)))} />
                  <Input placeholder="EN" value={v.name_en} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, name_en: e.target.value } : x)))} />
                  <Input type="number" step="0.5" className="w-24" dir="ltr" title="+/-" value={v.priceDelta} onChange={(e) => setVariants(variants.map((x, j) => (j === i ? { ...x, priceDelta: Number(e.target.value) } : x)))} />
                  <label className="flex shrink-0 items-center gap-1 text-[11px]">
                    <input type="radio" name="defaultVariant" checked={v.isDefault} onChange={() => setVariants(variants.map((x, j) => ({ ...x, isDefault: j === i })))} />
                    {t("Default", "افتراضي")}
                  </label>
                  <button onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="shrink-0 rounded-full p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>

          {/* Addon group links */}
          {groups.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-[var(--th-muted)]">{t("Add-on groups", "مجموعات الإضافات")}</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => {
                  const on = linkedGroups.has(g.id);
                  return (
                    <button
                      key={g.id}
                      onClick={() => {
                        const next = new Set(linkedGroups);
                        if (on) next.delete(g.id);
                        else next.add(g.id);
                        setLinkedGroups(next);
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${on ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
                    >
                      {tr(g as unknown as Record<string, unknown>, "name")}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={() => void save()} loading={saving}>{t("Save product", "حفظ المنتج")}</Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/api/admin/products/${deleting.id}`, { method: "DELETE", headers });
          toast(t("Deleted", "تم الحذف"));
          void load();
        }}
        title={t("Delete product?", "حذف المنتج؟")}
        body={t("Past orders keep their snapshot of this product.", "الطلبات السابقة تحتفظ بنسختها من المنتج.")}
        confirmLabel={t("Delete", "حذف")}
      />
    </div>
  );
}
