/**
 * Restaurant admin panel shell: auth guard, sidebar layout, section routing.
 * Super admins can operate on any tenant via the X-Restaurant-Id header
 * (selected from the super panel → "Manage" action).
 */
import { createContext, lazy, Suspense, useContext, useMemo, useState, type ReactNode } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  BarChart2, BookOpen, Globe, LayoutDashboard, LogOut, MapPin, Megaphone, Menu as MenuIcon,
  Package, Palette, ReceiptText, Settings, Star, Users, UtensilsCrossed, X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button, Field, Input, Spinner, useToast } from "@/components/ui";

const Dashboard = lazy(() => import("./Dashboard"));
const Orders = lazy(() => import("./Orders"));
const Catalog = lazy(() => import("./Catalog"));
const Inventory = lazy(() => import("./Inventory"));
const Zones = lazy(() => import("./Zones"));
const Marketing = lazy(() => import("./Marketing"));
const People = lazy(() => import("./People"));
const Builder = lazy(() => import("./Builder"));
const Reports = lazy(() => import("./Reports"));
const AdminSettings = lazy(() => import("./AdminSettings"));

interface AdminCtx {
  /** extra headers for tenant scoping (super admin operating a tenant) */
  headers: Record<string, string>;
}

const AdminContext = createContext<AdminCtx>({ headers: {} });
export const useAdmin = () => useContext(AdminContext);

const NAV = [
  { path: "", icon: LayoutDashboard, en: "Dashboard", ar: "لوحة التحكم", perm: "reports.view" },
  { path: "/orders", icon: ReceiptText, en: "Orders", ar: "الطلبات", perm: "orders.view" },
  { path: "/catalog", icon: BookOpen, en: "Menu & Products", ar: "المنيو والمنتجات", perm: "catalog.manage" },
  { path: "/inventory", icon: Package, en: "Inventory", ar: "المخزون", perm: "inventory.manage" },
  { path: "/zones", icon: MapPin, en: "Delivery zones", ar: "مناطق التوصيل", perm: "zones.manage" },
  { path: "/marketing", icon: Megaphone, en: "Offers & Coupons", ar: "العروض والكوبونات", perm: "marketing.manage" },
  { path: "/people", icon: Users, en: "Staff & Customers", ar: "الموظفون والعملاء", perm: "customers.view" },
  { path: "/builder", icon: Palette, en: "Theme & Website", ar: "الثيم والموقع", perm: "builder.manage" },
  { path: "/reports", icon: BarChart2, en: "Reports", ar: "التقارير", perm: "reports.view" },
  { path: "/settings", icon: Settings, en: "Settings", ar: "الإعدادات", perm: "settings.manage" },
];

export default function AdminPanel() {
  const { staff, loadingStaff } = useAuth();

  if (loadingStaff) return <Spinner />;
  if (!staff) return <AdminLogin />;
  if (staff.role === "SUPER_ADMIN" && !sessionStorage.getItem("matami_admin_rid")) {
    return <PickTenantNotice />;
  }
  return <AdminLayout />;
}

function AdminLogin() {
  const { t } = useI18n();
  const { staffLogin } = useAuth();
  const toast = useToast();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await staffLogin(email, password);
      if (user.role === "SUPER_ADMIN") navigate("/super");
    } catch (err) {
      toast(err instanceof Error ? err.message : t("Login failed", "فشل تسجيل الدخول"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <div className="text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-3 h-14 w-14" />
          <h1 className="text-xl font-extrabold">{t("Restaurant Admin", "إدارة المطعم")}</h1>
          <p className="text-sm text-[var(--th-muted)]">{t("Sign in to your dashboard", "سجّل الدخول للوحة التحكم")}</p>
        </div>
        <Field label={t("Email", "البريد الإلكتروني")}>
          <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </Field>
        <Field label={t("Password", "كلمة المرور")}>
          <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <Button type="submit" className="w-full" loading={loading}>
          {t("Sign in", "تسجيل الدخول")}
        </Button>
      </form>
    </div>
  );
}

function PickTenantNotice() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-bold">{t("Super admin: pick a restaurant to manage", "سوبر أدمن: اختر مطعماً لإدارته")}</p>
      <Link href="/super/restaurants" className="text-sm font-bold text-[var(--th-primary)]">
        {t("Open restaurants list →", "افتح قائمة المطاعم ←")}
      </Link>
    </div>
  );
}

function AdminLayout() {
  const { t, lang, setLang } = useI18n();
  const { staff, logoutStaff, hasPermission } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const headers = useMemo<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    if (staff?.role === "SUPER_ADMIN") {
      const rid = sessionStorage.getItem("matami_admin_rid");
      if (rid) out["X-Restaurant-Id"] = rid;
    }
    return out;
  }, [staff]);

  const nav = NAV.filter((n) => hasPermission(n.perm));

  return (
    <AdminContext.Provider value={{ headers }}>
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 start-0 z-50 w-64 transform border-e border-black/5 bg-[var(--th-surface)] transition-transform lg:static lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-black/5 p-4">
            <div className="flex items-center gap-2">
              <img src="/favicon.svg" alt="" className="h-8 w-8" />
              <span className="font-extrabold text-[var(--th-primary)]">{t("Admin", "الإدارة")}</span>
            </div>
            <button className="lg:hidden" onClick={() => setMenuOpen(false)}>
              <X size={18} />
            </button>
          </div>
          <nav className="space-y-0.5 p-3">
            {nav.map((n) => {
              const href = `/admin${n.path}`;
              const active = n.path === "" ? location === "/admin" : location.startsWith(href);
              return (
                <Link
                  key={n.path}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "text-[var(--th-muted)] hover:bg-black/5"
                  }`}
                >
                  <n.icon size={16} /> {lang === "ar" ? n.ar : n.en}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 start-0 end-0 space-y-1 border-t border-black/5 p-3">
            <p className="truncate px-3 text-[11px] text-[var(--th-muted)]">{staff?.email}</p>
            <button onClick={() => void logoutStaff()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-50">
              <LogOut size={15} /> {t("Sign out", "تسجيل الخروج")}
            </button>
          </div>
        </aside>
        {menuOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

        {/* Main */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-[var(--th-surface)]/95 px-4 py-3 backdrop-blur">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)}>
              <MenuIcon size={20} />
            </button>
            <span className="text-sm font-bold text-[var(--th-muted)]">{t("Restaurant dashboard", "لوحة إدارة المطعم")}</span>
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="ms-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-black/5"
            >
              <Globe size={14} /> {lang === "ar" ? "EN" : "عربي"}
            </button>
          </header>
          <main className="p-4 lg:p-6">
            <Suspense fallback={<Spinner />}>
              <Switch>
                <Route path="/admin" component={Dashboard} />
                <Route path="/admin/orders" component={Orders} />
                <Route path="/admin/catalog" component={Catalog} />
                <Route path="/admin/catalog/:tab" component={Catalog} />
                <Route path="/admin/inventory" component={Inventory} />
                <Route path="/admin/zones" component={Zones} />
                <Route path="/admin/marketing" component={Marketing} />
                <Route path="/admin/marketing/:tab" component={Marketing} />
                <Route path="/admin/people" component={People} />
                <Route path="/admin/people/:tab" component={People} />
                <Route path="/admin/builder" component={Builder} />
                <Route path="/admin/reports" component={Reports} />
                <Route path="/admin/settings" component={AdminSettings} />
                <Route>
                  <Dashboard />
                </Route>
              </Switch>
            </Suspense>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}

/** Icon kept for nav parity with the wireframe spec. */
export const _icons = { UtensilsCrossed, Star };
