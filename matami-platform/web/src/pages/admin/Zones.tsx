/** Delivery zones: polygon/radius editor on Google Maps + fees, rules, schedule. */
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatMoney, useI18n } from "@/lib/i18n";
import { Badge, Button, Confirm, EmptyState, Field, Input, Modal, Select, Spinner, Toggle, useToast } from "@/components/ui";
import { ZoneEditor, type ZoneShape } from "@/components/MapPicker";
import { useAdmin } from "./AdminPanel";

interface Branch { id: string; name_en: string; name_ar: string; lat: number | null; lng: number | null }
interface Zone {
  id: string; branchId: string; name_en: string; name_ar: string;
  type: "POLYGON" | "RADIUS"; polygon: Array<[number, number]> | null;
  centerLat: number | null; centerLng: number | null; radiusKm: number | null;
  fee: number; minOrder: number; freeOver: number | null;
  schedule: { days?: number[]; from?: string; to?: string };
  isActive: boolean; sortOrder: number;
  branch: { id: string; name_en: string; name_ar: string };
}

const DAYS: Array<[string, string]> = [
  ["Sun", "أحد"], ["Mon", "إثنين"], ["Tue", "ثلاثاء"], ["Wed", "أربعاء"], ["Thu", "خميس"], ["Fri", "جمعة"], ["Sat", "سبت"],
];

export default function Zones() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();

  const [zones, setZones] = useState<Zone[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editing, setEditing] = useState<Zone | "new" | null>(null);
  const [deleting, setDeleting] = useState<Zone | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    branchId: "", name_en: "", name_ar: "", fee: "5" as string | number,
    minOrder: "0" as string | number, freeOver: "" as string | number,
    isActive: true, days: [] as number[], from: "", to: "",
  };
  const [form, setForm] = useState(emptyForm);
  const [shape, setShape] = useState<ZoneShape>({ type: "RADIUS", polygon: null, centerLat: null, centerLng: null, radiusKm: 3 });

  const load = useCallback(() => {
    Promise.all([
      api<{ items: Zone[] }>("/api/admin/zones", { headers }),
      api<{ items: Branch[] }>("/api/admin/branches", { headers }),
    ])
      .then(([z, b]) => {
        setZones(z.items);
        setBranches(b.items);
      })
      .catch(() => setZones([]));
  }, [headers]);

  useEffect(() => void load(), [load]);

  const open = (z: Zone | "new") => {
    setEditing(z);
    if (z === "new") {
      setForm({ ...emptyForm, branchId: branches[0]?.id ?? "" });
      setShape({ type: "RADIUS", polygon: null, centerLat: null, centerLng: null, radiusKm: 3 });
    } else {
      setForm({
        branchId: z.branchId, name_en: z.name_en, name_ar: z.name_ar,
        fee: z.fee, minOrder: z.minOrder, freeOver: z.freeOver ?? "",
        isActive: z.isActive, days: z.schedule.days ?? [], from: z.schedule.from ?? "", to: z.schedule.to ?? "",
      });
      setShape({ type: z.type, polygon: z.polygon, centerLat: z.centerLat, centerLng: z.centerLng, radiusKm: z.radiusKm });
    }
  };

  const save = async () => {
    if (!form.branchId) {
      toast(t("Add a branch first (Settings)", "أضف فرعاً أولاً (الإعدادات)"), "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        branchId: form.branchId,
        name_en: form.name_en, name_ar: form.name_ar,
        type: shape.type,
        polygon: shape.type === "POLYGON" ? shape.polygon : null,
        centerLat: shape.type === "RADIUS" ? shape.centerLat : null,
        centerLng: shape.type === "RADIUS" ? shape.centerLng : null,
        radiusKm: shape.type === "RADIUS" ? shape.radiusKm : null,
        fee: Number(form.fee) || 0,
        minOrder: Number(form.minOrder) || 0,
        freeOver: form.freeOver === "" ? null : Number(form.freeOver),
        isActive: form.isActive,
        schedule: form.from && form.to ? { days: form.days, from: form.from, to: form.to } : form.days.length ? { days: form.days } : {},
      };
      if (editing === "new") {
        await api("/api/admin/zones", { method: "POST", body: payload, headers });
      } else if (editing) {
        await api(`/api/admin/zones/${editing.id}`, { method: "PUT", body: payload, headers });
      }
      toast(t("Zone saved", "تم حفظ المنطقة"));
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (zones === null) return <Spinner />;

  const branch = branches.find((b) => b.id === form.branchId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Delivery zones", "مناطق التوصيل")}</h1>
        <Button size="sm" onClick={() => open("new")}>
          <Plus size={15} /> {t("Add zone", "إضافة منطقة")}
        </Button>
      </div>

      {zones.length === 0 ? (
        <EmptyState
          title={t("No delivery zones", "لا توجد مناطق توصيل")}
          hint={t("Draw polygon or radius zones so customers can order delivery", "ارسم مناطق (مضلع أو دائرة) ليتمكن العملاء من طلب التوصيل")}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {zones.map((z) => (
            <div key={z.id} className="rounded-[var(--th-radius)] border border-black/5 bg-[var(--th-surface)] p-4">
              <div className="flex items-center justify-between">
                <b>{tr(z as unknown as Record<string, unknown>, "name")}</b>
                <div className="flex gap-1">
                  <button onClick={() => open(z)} className="rounded-full p-1.5 hover:bg-black/5"><Pencil size={14} /></button>
                  <button onClick={() => setDeleting(z)} className="rounded-full p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              </div>
              <p className="text-[11px] text-[var(--th-muted)]">📍 {tr(z.branch as unknown as Record<string, unknown>, "name")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                <Badge tone="info">{z.type === "POLYGON" ? t("Polygon", "مضلع") : `${t("Radius", "دائرة")} ${z.radiusKm} ${t("km", "كم")}`}</Badge>
                <Badge>{t("Fee", "رسوم")}: {formatMoney(z.fee, "SAR", lang)}</Badge>
                {z.minOrder > 0 && <Badge>{t("Min", "أدنى")}: {z.minOrder}</Badge>}
                {z.freeOver != null && <Badge tone="success">{t("Free over", "مجاني فوق")} {z.freeOver}</Badge>}
                <Badge tone={z.isActive ? "success" : "danger"}>{z.isActive ? t("Active", "مفعّلة") : t("Off", "معطّلة")}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("New zone", "منطقة جديدة") : t("Edit zone", "تعديل المنطقة")} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
            <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
            <Field label={t("Branch", "الفرع")}>
              <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{tr(b as unknown as Record<string, unknown>, "name")}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("Zone type", "نوع المنطقة")}>
              <Select
                value={shape.type}
                onChange={(e) => setShape({ type: e.target.value as "POLYGON" | "RADIUS", polygon: null, centerLat: null, centerLng: null, radiusKm: 3 })}
              >
                <option value="RADIUS">{t("Radius (circle)", "دائرة (نصف قطر)")}</option>
                <option value="POLYGON">{t("Polygon (draw)", "مضلع (رسم)")}</option>
              </Select>
            </Field>
          </div>

          <ZoneEditor
            shape={shape}
            onChange={setShape}
            branchPos={branch?.lat != null && branch?.lng != null ? { lat: branch.lat, lng: branch.lng } : null}
          />

          <div className="grid grid-cols-3 gap-3">
            <Field label={t("Delivery fee", "رسوم التوصيل")}><Input type="number" step="0.5" dir="ltr" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></Field>
            <Field label={t("Min order", "أدنى طلب")}><Input type="number" step="1" dir="ltr" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} /></Field>
            <Field label={t("Free over (optional)", "مجاني فوق (اختياري)")}><Input type="number" step="1" dir="ltr" value={form.freeOver} onChange={(e) => setForm({ ...form, freeOver: e.target.value })} /></Field>
          </div>

          {/* Schedule */}
          <div>
            <p className="mb-2 text-xs font-bold text-[var(--th-muted)]">{t("Schedule (empty = always)", "الجدولة (فارغ = دائماً)")}</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map(([en, ar], i) => {
                const on = form.days.includes(i);
                return (
                  <button
                    key={i}
                    onClick={() => setForm({ ...form, days: on ? form.days.filter((d) => d !== i) : [...form.days, i] })}
                    className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${on ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
                  >
                    {lang === "ar" ? ar : en}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Field label={t("From", "من")}><Input type="time" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} dir="ltr" /></Field>
              <Field label={t("To", "إلى")}><Input type="time" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} dir="ltr" /></Field>
            </div>
          </div>

          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label={t("Active", "مفعّلة")} />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={() => void save()} loading={saving}>{t("Save zone", "حفظ المنطقة")}</Button>
          </div>
        </div>
      </Modal>

      <Confirm
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          await api(`/api/admin/zones/${deleting.id}`, { method: "DELETE", headers });
          void load();
        }}
        title={t("Delete zone?", "حذف المنطقة؟")}
        body={t("Customers in this area won't be able to order delivery.", "لن يتمكن العملاء في هذه المنطقة من طلب التوصيل.")}
        confirmLabel={t("Delete", "حذف")}
      />
    </div>
  );
}
