/** Platform-wide user management. */
import { useCallback, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import { Badge, Button, DataTable, EmptyState, Field, Input, Modal, Spinner, Toggle, useToast } from "@/components/ui";

interface UserRow {
  id: string; email: string; name: string; role: string; isActive: boolean;
  lastLoginAt: string | null; createdAt: string;
  restaurant: { slug: string; name_en: string; name_ar: string } | null;
}

const ROLE_LABEL: Record<string, [string, string, "warn" | "info" | "success" | "default"]> = {
  SUPER_ADMIN: ["Super admin", "سوبر أدمن", "warn"],
  RESTAURANT_OWNER: ["Owner", "مالك", "success"],
  BRANCH_MANAGER: ["Branch manager", "مدير فرع", "info"],
  STAFF: ["Staff", "موظف", "default"],
};

export default function UsersPage() {
  const { t, tr, lang } = useI18n();
  const toast = useToast();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [q, setQ] = useState("");
  const [resetting, setResetting] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api<{ items: UserRow[] }>(`/api/super/users?q=${encodeURIComponent(q)}`).then((d) => setUsers(d.items)).catch(() => setUsers([]));
  }, [q]);

  useEffect(() => {
    const h = setTimeout(load, 250);
    return () => clearTimeout(h);
  }, [load]);

  const update = async (u: UserRow, patch: { isActive?: boolean; password?: string }) => {
    try {
      await api(`/api/super/users/${u.id}`, { method: "PUT", body: patch });
      toast(t("Updated", "تم التحديث"));
      void load();
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Failed", "فشل"), "error");
    }
  };

  if (users === null) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Users", "المستخدمون")}</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("Search email / name…", "بحث بالبريد / الاسم…")} className="max-w-64" />
      </div>

      <DataTable
        rows={users}
        keyOf={(u) => u.id}
        empty={<EmptyState title={t("No users", "لا يوجد مستخدمون")} />}
        columns={[
          {
            header: t("User", "المستخدم"),
            render: (u) => (
              <div>
                <b>{u.name}</b>
                <p className="text-[11px] text-[var(--th-muted)]" dir="ltr">{u.email}</p>
              </div>
            ),
          },
          {
            header: t("Role", "الدور"),
            render: (u) => {
              const r = ROLE_LABEL[u.role] ?? [u.role, u.role, "default" as const];
              return <Badge tone={r[2]}>{lang === "ar" ? r[1] : r[0]}</Badge>;
            },
          },
          {
            header: t("Restaurant", "المطعم"),
            render: (u) => (u.restaurant ? <span className="text-xs">{tr(u.restaurant as unknown as Record<string, unknown>, "name")}</span> : <span className="text-xs text-[var(--th-muted)]">—</span>),
          },
          {
            header: t("Last login", "آخر دخول"),
            render: (u) => <span className="text-xs text-[var(--th-muted)]">{u.lastLoginAt ? formatDate(u.lastLoginAt, lang) : "—"}</span>,
          },
          {
            header: "",
            className: "w-44",
            render: (u) => (
              <div className="flex items-center justify-end gap-2">
                <Toggle checked={u.isActive} onChange={(v) => void update(u, { isActive: v })} />
                <Button size="sm" variant="outline" onClick={() => { setResetting(u); setNewPassword(""); }}>
                  {t("Reset pass", "إعادة كلمة المرور")}
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={resetting !== null} onClose={() => setResetting(null)} title={t("Reset password", "إعادة تعيين كلمة المرور")}>
        <div className="space-y-3">
          <p className="text-sm text-[var(--th-muted)]" dir="ltr">{resetting?.email}</p>
          <Field label={t("New password (8+ chars)", "كلمة مرور جديدة (8+ أحرف)")}>
            <Input dir="ltr" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
          <Button
            className="w-full"
            loading={saving}
            disabled={newPassword.length < 8}
            onClick={async () => {
              if (!resetting) return;
              setSaving(true);
              await update(resetting, { password: newPassword });
              setSaving(false);
              setResetting(null);
            }}
          >
            {t("Set password", "تعيين")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
