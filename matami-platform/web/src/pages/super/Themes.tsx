/** Theme template gallery management (the 8 shipped presets + edits). */
import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Badge, Button, Card, Field, Input, Modal, Spinner, Toggle, useToast } from "@/components/ui";
import type { ThemeDoc } from "@/lib/theme";

interface Template {
  id: string; key: string; name_en: string; name_ar: string; previewUrl: string;
  document: ThemeDoc; isActive: boolean; sortOrder: number;
}

export default function Themes() {
  const { t, tr, lang } = useI18n();
  const toast = useToast();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [form, setForm] = useState({ name_en: "", name_ar: "", isActive: true, json: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ items: Template[] }>("/api/super/themes").then((d) => setTemplates(d.items)).catch(() => setTemplates([]));
  }, []);
  useEffect(() => void load(), [load]);

  const save = async () => {
    if (!editing) return;
    let document: unknown;
    try {
      document = JSON.parse(form.json);
    } catch {
      toast(t("Invalid JSON document", "مستند JSON غير صالح"), "error");
      return;
    }
    setSaving(true);
    try {
      await api(`/api/super/themes/${editing.id}`, {
        method: "PUT",
        body: { name_en: form.name_en, name_ar: form.name_ar, isActive: form.isActive, document },
      });
      toast(t("Template saved", "تم حفظ القالب"));
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (templates === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-extrabold">{t("Theme templates", "قوالب الثيمات")}</h1>
      <p className="text-xs text-[var(--th-muted)]">
        {t("These presets appear in every restaurant's theme builder.", "تظهر هذه القوالب في بنّاء الثيم لكل المطاعم.")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((tpl) => {
          const c = tpl.document.colors ?? {};
          return (
            <Card key={tpl.id} className={`overflow-hidden ${!tpl.isActive ? "opacity-50" : ""}`}>
              <div className="flex h-16">
                <span className="flex-1" style={{ background: c.primary }} />
                <span className="flex-1" style={{ background: c.bg }} />
                <span className="flex-1" style={{ background: c.surface }} />
                <span className="flex-1" style={{ background: c.accent }} />
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between">
                  <b className="text-sm">{tr(tpl as unknown as Record<string, unknown>, "name")}</b>
                  <Badge>{tpl.key}</Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-[var(--th-muted)]">{tpl.document.font} · {tpl.document.radius}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => {
                    setEditing(tpl);
                    setForm({ name_en: tpl.name_en, name_ar: tpl.name_ar, isActive: tpl.isActive, json: JSON.stringify(tpl.document, null, 2) });
                  }}
                >
                  {t("Edit", "تعديل")}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={t("Edit template", "تعديل القالب")} wide>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Name (AR)", "الاسم (عربي)")}><Input value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} /></Field>
            <Field label={t("Name (EN)", "الاسم (إنجليزي)")}><Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} /></Field>
          </div>
          <Field label={t("Theme document (JSON)", "مستند الثيم (JSON)")}>
            <textarea
              dir="ltr"
              value={form.json}
              onChange={(e) => setForm({ ...form, json: e.target.value })}
              className="min-h-[280px] w-full rounded-[var(--th-radius)] border border-black/10 p-3 font-mono text-xs"
            />
          </Field>
          <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label={t("Visible to restaurants", "مرئي للمطاعم")} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={() => void save()} loading={saving}>{t("Save", "حفظ")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
