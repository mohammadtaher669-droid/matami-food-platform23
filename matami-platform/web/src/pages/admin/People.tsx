/** Staff management (roles + granular permissions) and customers overview. */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Plus, ShieldCheck } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, formatMoney, useI18n } from "@/lib/i18n";
import { Badge, Button, DataTable, EmptyState, Field, Input, Modal, Select, Spinner, Toggle, useToast } from "@/components/ui";
import { useAdmin } from "./AdminPanel";

type Tab = "staff" | "customers";

const PERM_LABELS: Record<string, [string, string]> = {
  "orders.view": ["View orders", "عرض الطلبات"],
  "orders.manage": ["Manage orders", "إدارة الطلبات"],
  "catalog.view": ["View catalog", "عرض المنيو"],
  "catalog.manage": ["Manage catalog", "إدارة المنيو"],
  "inventory.manage": ["Manage inventory", "إدارة المخزون"],
  "marketing.manage": ["Offers & coupons", "العروض والكوبونات"],
  "reviews.manage": ["Moderate reviews", "إدارة التقييمات"],
  "customers.view": ["View customers", "عرض العملاء"],
  "staff.manage": ["Manage staff", "إدارة الموظفين"],
  "zones.manage": ["Delivery zones", "مناطق التوصيل"],
  "builder.manage": ["Theme & website", "الثيم والموقع"],
  "reports.view": ["View reports", "عرض التقارير"],
  "settings.manage": ["Settings", "الإعدادات"],
};

export default function People() {
  const params = useParams<{ tab?: Tab }>();
  const tab: Tab = params.tab === "customers" ? "customers" : "staff";
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          ["staff", t("Staff", "الموظفون")],
          ["customers", t("Customers", "العملاء")],
        ] as Array<[Tab, string]>).map(([k, label]) => (
          <Link key={k} href={`/admin/people/${k}`} className={`rounded-full px-4 py-2 text-xs font-bold ${tab === k ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}>
            {label}
          </Link>
        ))}
      </div>
      {tab === "staff" ? <StaffTab /> : <CustomersTab />}
    </div>
  );
}

interface StaffUser {
  id: string; email: string; name: string; role: string; branchId: string | null;
  permissions: string[]; isActive: boolean; lastLoginAt: string | null; createdAt: string;
}
interface Branch { id: string; name_en: string; name_ar: string }

function StaffTab() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();
  const [users, setUsers] = useState<StaffUser[] | null>(null);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [editing, setEditing] = useState<StaffUser | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    email: "", name: "", password: "", role: "STAFF" as "BRANCH_MANAGER" | "STAFF",
    branchId: "", permissions: new Set<string>(), isActive: true,
  });

  const load = useCallback(() => {
    Promise.all([
      api<{ items: StaffUser[]; permissions: string[] }>("/api/admin/staff", { headers }),
      api<{ items: Branch[] }>("/api/admin/branches", { headers }),
    ])
      .then(([s, b]) => {
        setUsers(s.items);
        setAllPerms(s.permissions);
        setBranches(b.items);
      })
      .catch(() => setUsers([]));
  }, [headers]);

  useEffect(() => void load(), [load]);

  const open = (u: StaffUser | "new") => {
    setEditing(u);
    if (u === "new") {
      setForm({ email: "", name: "", password: "", role: "STAFF", branchId: "", permissions: new Set(), isActive: true });
    } else {
      setForm({
        email: u.email, name: u.name, password: "",
        role: u.role === "BRANCH_MANAGER" ? "BRANCH_MANAGER" : "STAFF",
        branchId: u.branchId ?? "", permissions: new Set(u.permissions), isActive: u.isActive,
      });
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing === "new") {
        await api("/api/admin/staff", {
          method: "POST",
          headers,
          body: {
            email: form.email, name: form.name, password: form.password, role: form.role,
            branchId: form.branchId || null, permissions: [...form.permissions],
          },
        });
      } else if (editing) {
        await api(`/api/admin/staff/${editing.id}`, {
          method: "PUT",
          headers,
          body: {
            name: form.name,
            role: editing.role === "RESTAURANT_OWNER" ? undefined : form.role,
            branchId: form.branchId || null,
            permissions: [...form.permissions],
            isActive: form.isActive,
            password: form.password || undefined,
          },
        });
      }
      toast(t("Saved", "تم الحفظ"));
      setEditing(null);
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    } finally {
      setSaving(false);
    }
  };

  if (users === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold">{t("Staff", "الموظفون")}</h1>
        <Button size="sm" onClick={() => open("new")}>
          <Plus size={15} /> {t("Add member", "إضافة موظف")}
        </Button>
      </div>

      <DataTable
        rows={users}
        keyOf={(u) => u.id}
        empty={<EmptyState title={t("No staff", "لا يوجد موظفون")} />}
        columns={[
          {
            header: t("Member", "العضو"),
            render: (u) => (
              <div>
                <b>{u.name}</b>
                <p className="text-[11px] text-[var(--th-muted)]" dir="ltr">{u.email}</p>
              </div>
            ),
          },
          {
            header: t("Role", "الدور"),
            render: (u) => (
              <Badge tone={u.role === "RESTAURANT_OWNER" ? "warn" : "info"}>
                {u.role === "RESTAURANT_OWNER" ? t("Owner", "المالك") : u.role === "BRANCH_MANAGER" ? t("Branch manager", "مدير فرع") : t("Staff", "موظف")}
              </Badge>
            ),
          },
          {
            header: t("Last login", "آخر دخول"),
            render: (u) => <span className="text-xs text-[var(--th-muted)]">{u.lastLoginAt ? formatDate(u.lastLoginAt, lang) : "—"}</span>,
          },
          {
            header: "",
            className: "w-28",
            render: (u) => (
              <div className="flex items-center justify-end gap-2">
                <Badge tone={u.isActive ? "success" : "danger"}>{u.isActive ? "✓" : "✕"}</Badge>
                <Button size="sm" variant="ghost" onClick={() => open(u)}>{t("Edit", "تعديل")}</Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? t("New member", "موظف جديد") : t("Edit member", "تعديل موظف")} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("Name", "الاسم")}><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label={t("Email", "البريد")}>
              <Input dir="ltr" type="email" value={form.email} disabled={editing !== "new"} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={editing === "new" ? t("Password", "كلمة المرور") : t("New password (optional)", "كلمة مرور جديدة (اختياري)")}>
              <Input dir="ltr" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            {editing === "new" || (editing && editing.role !== "RESTAURANT_OWNER") ? (
              <Field label={t("Role", "الدور")}>
                <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "BRANCH_MANAGER" | "STAFF" })}>
                  <option value="STAFF">{t("Staff (custom permissions)", "موظف (صلاحيات مخصصة)")}</option>
                  <option value="BRANCH_MANAGER">{t("Branch manager", "مدير فرع")}</option>
                </Select>
              </Field>
            ) : null}
            <Field label={t("Branch (optional)", "الفرع (اختياري)")}>
              <Select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}>
                <option value="">{t("All branches", "كل الفروع")}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{tr(b as unknown as Record<string, unknown>, "name")}</option>
                ))}
              </Select>
            </Field>
          </div>

          {form.role === "STAFF" && (
            <div>
              <p className="mb-2 flex items-center gap-1 text-xs font-bold text-[var(--th-muted)]">
                <ShieldCheck size={13} /> {t("Permissions", "الصلاحيات")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {allPerms.map((p) => {
                  const on = form.permissions.has(p);
                  const label = PERM_LABELS[p];
                  return (
                    <button
                      key={p}
                      onClick={() => {
                        const next = new Set(form.permissions);
                        if (on) next.delete(p);
                        else next.add(p);
                        setForm({ ...form, permissions: next });
                      }}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${on ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
                    >
                      {label ? (lang === "ar" ? label[1] : label[0]) : p}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {editing !== "new" && editing?.role !== "RESTAURANT_OWNER" && (
            <Toggle checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} label={t("Account active", "الحساب مفعّل")} />
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setEditing(null)}>{t("Cancel", "إلغاء")}</Button>
            <Button onClick={() => void save()} loading={saving}>{t("Save", "حفظ")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface CustomerRow { phone: string; name: string; orders: number; totalSpent: number; lastOrderAt: string | null }

function CustomersTab() {
  const { t, lang } = useI18n();
  const { headers } = useAdmin();
  const [rows, setRows] = useState<CustomerRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ items: CustomerRow[] }>("/api/admin/customers", { headers }).then((d) => setRows(d.items)).catch(() => setRows([]));
  }, [headers]);

  if (rows === null) return <Spinner />;
  const filtered = rows.filter((r) => !q.trim() || r.name.includes(q) || r.phone.includes(q));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Customers", "العملاء")}</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search…", "بحث…")} className="max-w-56" />
      </div>
      <DataTable
        rows={filtered}
        keyOf={(r) => r.phone}
        empty={<EmptyState title={t("No customers yet", "لا يوجد عملاء بعد")} />}
        columns={[
          {
            header: t("Customer", "العميل"),
            render: (r) => (
              <div>
                <b>{r.name}</b>
                <p className="text-[11px] text-[var(--th-muted)]" dir="ltr">{r.phone}</p>
              </div>
            ),
          },
          { header: t("Orders", "الطلبات"), className: "w-24", render: (r) => r.orders },
          { header: t("Total spent", "إجمالي الإنفاق"), className: "w-32", render: (r) => <b>{formatMoney(r.totalSpent, "SAR", lang)}</b> },
          {
            header: t("Last order", "آخر طلب"),
            render: (r) => <span className="text-xs text-[var(--th-muted)]">{r.lastOrderAt ? formatDate(r.lastOrderAt, lang) : "—"}</span>,
          },
        ]}
      />
    </div>
  );
}
