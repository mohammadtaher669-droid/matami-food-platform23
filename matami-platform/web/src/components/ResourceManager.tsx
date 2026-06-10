/**
 * Generic admin CRUD screen: list table + create/edit drawer, driven by a
 * field config. Powers branches, categories, offers, coupons, addon groups…
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Badge, Button, Confirm, DataTable, EmptyState, Field, Input, Modal, Select, Spinner, Textarea, Toggle, useToast, type Column } from "./ui";
import { ImageInput } from "./ImageInput";

export type FieldType = "text" | "textarea" | "number" | "money" | "toggle" | "select" | "image" | "datetime" | "color";

export interface FieldDef {
  key: string;
  label_en: string;
  label_ar: string;
  type: FieldType;
  required?: boolean;
  options?: Array<{ value: string; label_en: string; label_ar: string }>;
  placeholder?: string;
  half?: boolean;
  defaultValue?: unknown;
  transformOut?: (v: unknown) => unknown;
}

export interface ResourceConfig<T extends { id: string }> {
  titleEn: string;
  titleAr: string;
  apiPath: string; // e.g. "/api/admin/categories"
  fields: FieldDef[];
  columns: Column<T>[];
  headers?: Record<string, string>;
  canCreate?: boolean;
  canDelete?: boolean;
  emptyHintEn?: string;
  emptyHintAr?: string;
  /** map a row into the form values for editing */
  toForm?: (row: T) => Record<string, unknown>;
}

export function ResourceManager<T extends { id: string }>(cfg: ResourceConfig<T>) {
  const { t, lang } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState<T[] | null>(null);
  const [editing, setEditing] = useState<T | "new" | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ items: T[] }>(cfg.apiPath, { headers: cfg.headers })
      .then((d) => setRows(d.items))
      .catch((e) => {
        setRows([]);
        toast(e instanceof Error ? e.message : "error", "error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.apiPath]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (row: T | "new") => {
    setEditing(row);
    if (row === "new") {
      const defaults: Record<string, unknown> = {};
      for (const f of cfg.fields) {
        defaults[f.key] = f.defaultValue ?? (f.type === "toggle" ? true : f.type === "number" || f.type === "money" ? 0 : "");
      }
      setForm(defaults);
    } else {
      setForm(cfg.toForm ? cfg.toForm(row) : { ...(row as unknown as Record<string, unknown>) });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const f of cfg.fields) {
        let v = form[f.key];
        if (f.type === "number" || f.type === "money") v = v === "" || v === null ? (f.required ? 0 : null) : Number(v);
        if (f.type === "datetime") v = v ? new Date(String(v)).toISOString() : null;
        if (f.transformOut) v = f.transformOut(v);
        payload[f.key] = v;
      }
      if (editing === "new") {
        await api(`${cfg.apiPath}`, { method: "POST", body: payload, headers: cfg.headers });
        toast(t("Created", "تمت الإضافة"));
      } else if (editing) {
        await api(`${cfg.apiPath}/${editing.id}`, { method: "PUT", body: payload, headers: cfg.headers });
        toast(t("Saved", "تم الحفظ"));
      }
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed to save", "فشل الحفظ"), "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: T) => {
    try {
      await api(`${cfg.apiPath}/${row.id}`, { method: "DELETE", headers: cfg.headers });
      toast(t("Deleted", "تم الحذف"));
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed to delete", "فشل الحذف"), "error");
    }
  };

  const columns = useMemo<Column<T>[]>(() => {
    const base = [...cfg.columns];
    base.push({
      header: "",
      className: "w-24",
      render: (row) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => openEdit(row)} className="rounded-full p-1.5 text-[var(--th-muted)] hover:bg-black/5 hover:text-[var(--th-primary)]">
            <Pencil size={14} />
          </button>
          {cfg.canDelete !== false && (
            <button onClick={() => setDeleting(row)} className="rounded-full p-1.5 text-[var(--th-muted)] hover:bg-red-50 hover:text-red-600">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ),
    });
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.columns]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{lang === "ar" ? cfg.titleAr : cfg.titleEn}</h1>
        {cfg.canCreate !== false && (
          <Button size="sm" onClick={() => openEdit("new")}>
            <Plus size={15} /> {t("Add", "إضافة")}
          </Button>
        )}
      </div>

      {rows === null ? (
        <Spinner />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          keyOf={(r) => r.id}
          empty={<EmptyState title={t("Nothing here yet", "لا يوجد شيء بعد")} hint={lang === "ar" ? cfg.emptyHintAr : cfg.emptyHintEn} />}
        />
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("Add", "إضافة") : t("Edit", "تعديل")} wide>
        <div className="grid gap-4 sm:grid-cols-2">
          {cfg.fields.map((f) => (
            <div key={f.key} className={f.half ? "" : "sm:col-span-2"}>
              <FieldInput f={f} value={form[f.key]} onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))} headers={cfg.headers} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setEditing(null)}>
            {t("Cancel", "إلغاء")}
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            {t("Save", "حفظ")}
          </Button>
        </div>
      </Modal>

      <Confirm
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && void remove(deleting)}
        title={t("Delete?", "حذف؟")}
        body={t("This action cannot be undone.", "لا يمكن التراجع عن هذا الإجراء.")}
        confirmLabel={t("Delete", "حذف")}
      />
    </div>
  );
}

export function FieldInput({ f, value, onChange, headers }: { f: FieldDef; value: unknown; onChange: (v: unknown) => void; headers?: Record<string, string> }) {
  const { t, lang } = useI18n();
  const label = lang === "ar" ? f.label_ar : f.label_en;

  switch (f.type) {
    case "toggle":
      return (
        <div className="flex items-center justify-between rounded-xl border border-black/5 px-3 py-2.5">
          <span className="text-sm font-semibold">{label}</span>
          <Toggle checked={Boolean(value)} onChange={onChange} />
        </div>
      );
    case "textarea":
      return (
        <Field label={label}>
          <Textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} />
        </Field>
      );
    case "select":
      return (
        <Field label={label}>
          <Select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
            {!f.required && <option value="">—</option>}
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {lang === "ar" ? o.label_ar : o.label_en}
              </option>
            ))}
          </Select>
        </Field>
      );
    case "image":
      return (
        <Field label={label}>
          <ImageInput value={String(value ?? "")} onChange={onChange} headers={headers} />
        </Field>
      );
    case "number":
    case "money":
      return (
        <Field label={label}>
          <Input type="number" step={f.type === "money" ? "0.01" : "1"} value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} dir="ltr" />
        </Field>
      );
    case "datetime":
      return (
        <Field label={label} hint={t("Leave empty for none", "اتركه فارغاً للتجاهل")}>
          <Input type="datetime-local" value={value ? String(value).slice(0, 16) : ""} onChange={(e) => onChange(e.target.value)} dir="ltr" />
        </Field>
      );
    case "color":
      return (
        <Field label={label}>
          <div className="flex items-center gap-2">
            <input type="color" value={String(value || "#16a34a")} onChange={(e) => onChange(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border border-black/10" />
            <Input dir="ltr" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder="#16a34a" />
          </div>
        </Field>
      );
    default:
      return (
        <Field label={label}>
          <Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} placeholder={f.placeholder} required={f.required} />
        </Field>
      );
  }
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();
  return <Badge tone={active ? "success" : "danger"}>{active ? t("Active", "مفعّل") : t("Disabled", "معطّل")}</Badge>;
}
