/** Super admin panel shell: SUPER_ADMIN-only guard, sidebar, routes, global analytics dashboard. */
import { lazy, Suspense, useEffect, useState } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import { BarChart2, CreditCard, Globe, LayoutDashboard, LogOut, Menu as MenuIcon, Palette, ScrollText, Settings, Store, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney, useI18n } from "@/lib/i18n";
import { Card, Spinner } from "@/components/ui";
import { BarList, LineChart } from "@/components/Charts";

const Restaurants = lazy(() => import("./Restaurants"));
const Billing = lazy(() => import("./Billing"));
const UsersPage = lazy(() => import("./UsersPage"));
const Themes = lazy(() => import("./Themes"));
const PlatformSettings = lazy(() => import("./PlatformSettings"));

const NAV = [
  { path: "", icon: LayoutDashboard, en: "Analytics", ar: "التحليلات" },
  { path: "/restaurants", icon: Store, en: "Restaurants", ar: "المطاعم" },
  { path: "/billing", icon: CreditCard, en: "Plans & Billing", ar: "الباقات والفوترة" },
  { path: "/users", icon: Users, en: "Users", ar: "المستخدمون" },
  { path: "/themes", icon: Palette, en: "Themes", ar: "الثيمات" },
  { path: "/settings", icon: Settings, en: "Platform settings", ar: "إعدادات المنصة" },
];

export default function SuperPanel() {
  const { staff, loadingStaff } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loadingStaff && staff && staff.role !== "SUPER_ADMIN") navigate("/admin");
  }, [loadingStaff, staff, navigate]);

  if (loadingStaff) return <Spinner />;
  if (!staff) {
    navigate("/admin");
    return <Spinner />;
  }
  if (staff.role !== "SUPER_ADMIN") return <Spinner />;
  return <Layout />;
}

function Layout() {
  const { t, lang, setLang } = useI18n();
  const { logoutStaff, staff } = useAuth();
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside
        className={`fixed inset-y-0 start-0 z-50 w-64 transform border-e border-black/5 bg-[#101418] text-white transition-transform lg:static lg:translate-x-0 ${
          menuOpen ? "translate-x-0" : "ltr:-translate-x-full rtl:translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 p-4">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="" className="h-8 w-8" />
            <div>
              <span className="block text-sm font-extrabold">Mat'ami</span>
              <span className="block text-[10px] text-white/50">{t("Super Admin", "السوبر أدمن")}</span>
            </div>
          </div>
          <button className="lg:hidden" onClick={() => setMenuOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <nav className="space-y-0.5 p-3">
          {NAV.map((n) => {
            const href = `/super${n.path}`;
            const active = n.path === "" ? location === "/super" : location.startsWith(href);
            return (
              <Link
                key={n.path}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active ? "bg-[var(--th-primary)] text-white" : "text-white/60 hover:bg-white/5"
                }`}
              >
                <n.icon size={16} /> {lang === "ar" ? n.ar : n.en}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 start-0 end-0 space-y-1 border-t border-white/10 p-3">
          <p className="truncate px-3 text-[11px] text-white/40">{staff?.email}</p>
          <button onClick={() => void logoutStaff()} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-red-400 hover:bg-white/5">
            <LogOut size={15} /> {t("Sign out", "تسجيل الخروج")}
          </button>
        </div>
      </aside>
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMenuOpen(false)} />}

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-black/5 bg-[var(--th-surface)]/95 px-4 py-3 backdrop-blur">
          <button className="lg:hidden" onClick={() => setMenuOpen(true)}>
            <MenuIcon size={20} />
          </button>
          <span className="text-sm font-bold text-[var(--th-muted)]">{t("Platform control", "تحكم المنصة")}</span>
          <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="ms-auto flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-black/5">
            <Globe size={14} /> {lang === "ar" ? "EN" : "عربي"}
          </button>
        </header>
        <main className="p-4 lg:p-6">
          <Suspense fallback={<Spinner />}>
            <Switch>
              <Route path="/super" component={GlobalAnalytics} />
              <Route path="/super/restaurants" component={Restaurants} />
              <Route path="/super/billing" component={Billing} />
              <Route path="/super/billing/:tab" component={Billing} />
              <Route path="/super/users" component={UsersPage} />
              <Route path="/super/themes" component={Themes} />
              <Route path="/super/settings" component={PlatformSettings} />
              <Route>
                <GlobalAnalytics />
              </Route>
            </Switch>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

interface Analytics {
  days: number;
  kpis: { gmv: number; orders: number; activeRestaurants: number; totalRestaurants: number; totalCustomers: number; subscriptionRevenue: number };
  gmvByDay: Array<{ date: string; gmv: number; orders: number }>;
  topRestaurants: Array<{ restaurant: { slug: string; name_en: string; name_ar: string } | null; orders: number; gmv: number }>;
  revenueByPlan: Array<{ plan: { name_en: string; name_ar: string } | null; status: string; count: number; revenue: number }>;
}

function GlobalAnalytics() {
  const { t, lang } = useI18n();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    setData(null);
    api<Analytics>(`/api/super/analytics?days=${days}`).then(setData).catch(() => undefined);
  }, [days]);

  if (!data) return <Spinner />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <BarChart2 size={20} className="text-[var(--th-primary)]" /> {t("Global analytics", "تحليلات المنصة")}
        </h1>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${days === d ? "bg-[var(--th-primary)] text-white" : "bg-black/5"}`}>
              {d} {t("days", "يوم")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          { label: "GMV", value: formatMoney(data.kpis.gmv, "SAR", lang) },
          { label: t("Orders", "الطلبات"), value: data.kpis.orders },
          { label: t("Active restaurants", "مطاعم نشطة"), value: data.kpis.activeRestaurants },
          { label: t("Total restaurants", "إجمالي المطاعم"), value: data.kpis.totalRestaurants },
          { label: t("Customers", "العملاء"), value: data.kpis.totalCustomers },
          { label: t("Subscription revenue", "إيراد الاشتراكات"), value: formatMoney(data.kpis.subscriptionRevenue, "SAR", lang) },
        ].map((k, i) => (
          <Card key={i} className="p-4">
            <p className="text-[11px] font-bold text-[var(--th-muted)]">{k.label}</p>
            <p className="mt-1 text-lg font-extrabold">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-extrabold">{t("GMV trend", "اتجاه إجمالي المبيعات")}</h2>
        <LineChart data={data.gmvByDay.map((d) => ({ label: d.date.slice(5), value: d.gmv }))} valueLabel={(v) => formatMoney(v, "SAR", lang)} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Top restaurants by GMV", "أعلى المطاعم مبيعاً")}</h2>
          <BarList
            data={data.topRestaurants.map((r) => ({
              label: r.restaurant ? (lang === "ar" ? r.restaurant.name_ar : r.restaurant.name_en) : "—",
              value: r.gmv,
            }))}
            valueLabel={(v) => formatMoney(v, "SAR", lang)}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Revenue by plan", "الإيراد حسب الباقة")}</h2>
          <div className="space-y-2 text-sm">
            {data.revenueByPlan.map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-black/[0.03] px-3 py-2">
                <span className="font-semibold">
                  {r.plan ? (lang === "ar" ? r.plan.name_ar : r.plan.name_en) : "—"}
                  <span className="ms-2 text-[10px] text-[var(--th-muted)]">{r.status} × {r.count}</span>
                </span>
                <b>{formatMoney(r.revenue, "SAR", lang)}</b>
              </div>
            ))}
            {data.revenueByPlan.length === 0 && <p className="py-4 text-center text-xs text-[var(--th-muted)]">—</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}

export const _icons = { ScrollText };
