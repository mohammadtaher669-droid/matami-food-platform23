/** Per-branch inventory: availability toggle + stock quantity for tracked items. */
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { DataTable, EmptyState, Input, Select, Spinner, Toggle, useToast } from "@/components/ui";
import { useAdmin } from "./AdminPanel";

interface Branch { id: string; name_en: string; name_ar: string }
interface InvRow { id: string; name_en: string; name_ar: string; imageUrl: string; trackStock: boolean; stockQty: number; isAvailable: boolean }

export default function Inventory() {
  const { t, tr } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [rows, setRows] = useState<InvRow[] | null>(null);

  useEffect(() => {
    api<{ items: Branch[] }>("/api/admin/branches", { headers }).then((d) => {
      setBranches(d.items);
      setBranchId((prev) => prev || d.items[0]?.id || "");
    });
  }, [headers]);

  const load = useCallback(() => {
    if (!branchId) return;
    api<{ items: InvRow[] }>(`/api/admin/inventory/${branchId}`, { headers }).then((d) => setRows(d.items)).catch(() => setRows([]));
  }, [branchId, headers]);

  useEffect(() => void load(), [load]);

  const update = async (productId: string, patch: { stockQty?: number; isAvailable?: boolean }) => {
    try {
      await api(`/api/admin/inventory/${branchId}/${productId}`, { method: "PUT", body: patch, headers });
      setRows((prev) => prev?.map((r) => (r.id === productId ? { ...r, ...patch } : r)) ?? null);
    } catch (e) {
      toast(e instanceof Error ? e.message : t("Failed", "فشل"), "error");
      void load();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Inventory", "المخزون")}</h1>
        <Select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="max-w-56">
          {branches.map((b) => (
            <option key={b.id} value={b.id}>📍 {tr(b as unknown as Record<string, unknown>, "name")}</option>
          ))}
        </Select>
      </div>

      {branches.length === 0 ? (
        <EmptyState title={t("No branches", "لا توجد فروع")} hint={t("Add a branch in Settings first", "أضف فرعاً من الإعدادات أولاً")} />
      ) : rows === null ? (
        <Spinner />
      ) : (
        <DataTable
          rows={rows}
          keyOf={(r) => r.id}
          empty={<EmptyState title={t("No products", "لا توجد منتجات")} />}
          columns={[
            {
              header: "",
              className: "w-12",
              render: (r) => (r.imageUrl ? <img src={r.imageUrl} alt="" className="h-9 w-9 rounded-lg object-cover" /> : <span>🍽</span>),
            },
            { header: t("Product", "المنتج"), render: (r) => <b>{tr(r as unknown as Record<string, unknown>, "name")}</b> },
            {
              header: t("Available", "متاح"),
              className: "w-32",
              render: (r) => <Toggle checked={r.isAvailable} onChange={(v) => void update(r.id, { isAvailable: v })} />,
            },
            {
              header: t("Stock", "الكمية"),
              className: "w-36",
              render: (r) =>
                r.trackStock ? (
                  <Input
                    type="number"
                    dir="ltr"
                    className="w-24"
                    value={r.stockQty}
                    onChange={(e) => {
                      const qty = Math.max(0, Number(e.target.value) || 0);
                      void update(r.id, { stockQty: qty });
                    }}
                  />
                ) : (
                  <span className="text-xs text-[var(--th-muted)]">{t("Not tracked", "غير متتبع")}</span>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
