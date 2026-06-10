/** Restaurant dashboard: KPI cards, 30-day sales line, top products, live feed. */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { api } from "@/lib/api";
import { formatDate, formatMoney, useI18n } from "@/lib/i18n";
import { Badge, Card, Spinner } from "@/components/ui";
import { BarList, LineChart } from "@/components/Charts";
import { useAdmin } from "./AdminPanel";

interface DashboardData {
  kpis: { revenueToday: number; ordersToday: number; avgOrderValue: number; newOrders: number; customers30d: number };
  salesByDay: Array<{ date: string; revenue: number; orders: number }>;
  topProducts: Array<{ name_en: string; name_ar: string; qty: number; revenue: number }>;
  recentOrders: Array<{ orderNo: number; status: string; total: number; customerName: string; createdAt: string; type: string }>;
}

const STATUS_TONE: Record<string, "info" | "success" | "danger" | "warn" | "default"> = {
  NEW: "warn", ACCEPTED: "info", PREPARING: "info", READY: "info",
  OUT_FOR_DELIVERY: "info", DELIVERED: "success", CANCELED: "danger",
};

export default function Dashboard() {
  const { t, lang } = useI18n();
  const { headers } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = () =>
      api<DashboardData>("/api/admin/dashboard", { headers })
        .then(setData)
        .catch((e) => setError(e instanceof Error ? e.message : "error"));
    void load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [headers]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <Spinner />;

  const k = data.kpis;
  const KPIS = [
    { label: t("Today's revenue", "إيراد اليوم"), value: formatMoney(k.revenueToday, "SAR", lang) },
    { label: t("Today's orders", "طلبات اليوم"), value: k.ordersToday },
    { label: t("Avg order value", "متوسط الطلب"), value: formatMoney(k.avgOrderValue, "SAR", lang) },
    { label: t("New orders", "طلبات جديدة"), value: k.newOrders, highlight: k.newOrders > 0 },
    { label: t("Customers (30d)", "عملاء (30 يوم)"), value: k.customers30d },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-extrabold">{t("Dashboard", "لوحة التحكم")}</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {KPIS.map((kpi, i) => (
          <Card key={i} className={`p-4 ${kpi.highlight ? "ring-2 ring-[var(--th-primary)]" : ""}`}>
            <p className="text-[11px] font-bold text-[var(--th-muted)]">{kpi.label}</p>
            <p className="mt-1 text-lg font-extrabold">{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-extrabold">{t("Sales — last 30 days", "المبيعات — آخر 30 يوم")}</h2>
          <LineChart
            data={data.salesByDay.map((d) => ({ label: d.date.slice(5), value: d.revenue }))}
            valueLabel={(v) => formatMoney(v, "SAR", lang)}
          />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Top products", "الأكثر مبيعاً")}</h2>
          <BarList data={data.topProducts.map((p) => ({ label: lang === "ar" ? p.name_ar : p.name_en, value: p.qty }))} />
        </Card>
      </div>

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-extrabold">{t("Recent orders", "أحدث الطلبات")}</h2>
          <Link href="/admin/orders" className="text-xs font-bold text-[var(--th-primary)]">
            {t("View all →", "عرض الكل ←")}
          </Link>
        </div>
        <div className="divide-y divide-black/5">
          {data.recentOrders.length === 0 && <p className="py-6 text-center text-sm text-[var(--th-muted)]">{t("No orders yet", "لا توجد طلبات بعد")}</p>}
          {data.recentOrders.map((o) => (
            <div key={o.orderNo} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div>
                <p className="font-bold">#{o.orderNo} · {o.customerName}</p>
                <p className="text-[11px] text-[var(--th-muted)]">{formatDate(o.createdAt, lang)} · {o.type === "DELIVERY" ? t("Delivery", "توصيل") : t("Pickup", "استلام")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold">{formatMoney(o.total, "SAR", lang)}</span>
                <Badge tone={STATUS_TONE[o.status] ?? "default"}>{o.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
