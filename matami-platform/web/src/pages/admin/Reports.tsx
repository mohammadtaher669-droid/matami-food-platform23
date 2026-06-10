/** Reports & analytics: sales, branches, products, zones, coupons, payment mix. */
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatMoney, useI18n } from "@/lib/i18n";
import { Card, Spinner } from "@/components/ui";
import { BarList, LineChart } from "@/components/Charts";
import { useAdmin } from "./AdminPanel";

interface Reports {
  days: number;
  totals: { revenue: number; orders: number; customers: number; returningCustomers: number; deliveryShare: number };
  salesByDay: Array<{ date: string; revenue: number; orders: number }>;
  branchPerformance: Array<{ branch: { name_en: string; name_ar: string }; orders: number; revenue: number }>;
  productPerformance: Array<{ name_en: string; name_ar: string; qty: number; revenue: number }>;
  zonePerformance: Array<{ zone: { name_en: string; name_ar: string }; orders: number; revenue: number; deliveryFees: number }>;
  couponPerformance: Array<{ code: string | null; orders: number; discountGiven: number; revenue: number }>;
  paymentMix: Array<{ method: string; orders: number; revenue: number }>;
}

export default function ReportsPage() {
  const { t, lang } = useI18n();
  const { headers } = useAdmin();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Reports | null>(null);

  useEffect(() => {
    setData(null);
    api<Reports>(`/api/admin/reports?days=${days}`, { headers }).then(setData).catch(() => undefined);
  }, [days, headers]);

  if (!data) return <Spinner />;

  const name = (o: { name_en: string; name_ar: string }) => (lang === "ar" ? o.name_ar : o.name_en);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Reports & Analytics", "التقارير والتحليلات")}</h1>
        <div className="flex gap-2">
          {[7, 30, 90, 365].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${days === d ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
            >
              {d} {t("days", "يوم")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {[
          { label: t("Revenue", "الإيراد"), value: formatMoney(data.totals.revenue, "SAR", lang) },
          { label: t("Orders", "الطلبات"), value: data.totals.orders },
          { label: t("Customers", "العملاء"), value: data.totals.customers },
          { label: t("Returning", "عملاء عائدون"), value: data.totals.returningCustomers },
          { label: t("Delivery share", "نسبة التوصيل"), value: `${data.totals.deliveryShare}%` },
        ].map((k, i) => (
          <Card key={i} className="p-4">
            <p className="text-[11px] font-bold text-[var(--th-muted)]">{k.label}</p>
            <p className="mt-1 text-lg font-extrabold">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-extrabold">{t("Sales trend", "اتجاه المبيعات")}</h2>
        <LineChart data={data.salesByDay.map((d) => ({ label: d.date.slice(5), value: d.revenue }))} valueLabel={(v) => formatMoney(v, "SAR", lang)} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Branch performance", "أداء الفروع")}</h2>
          <BarList data={data.branchPerformance.map((b) => ({ label: `${name(b.branch)} (${b.orders})`, value: b.revenue }))} valueLabel={(v) => formatMoney(v, "SAR", lang)} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Product performance", "أداء المنتجات")}</h2>
          <BarList data={data.productPerformance.slice(0, 10).map((p) => ({ label: `${name(p)} ×${p.qty}`, value: p.revenue }))} valueLabel={(v) => formatMoney(v, "SAR", lang)} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Delivery zones", "مناطق التوصيل")}</h2>
          <BarList data={data.zonePerformance.map((z) => ({ label: `${name(z.zone)} (${z.orders})`, value: z.revenue }))} valueLabel={(v) => formatMoney(v, "SAR", lang)} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-extrabold">{t("Payment methods", "طرق الدفع")}</h2>
          <BarList data={data.paymentMix.map((p) => ({ label: `${p.method} (${p.orders})`, value: p.revenue }))} valueLabel={(v) => formatMoney(v, "SAR", lang)} />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-extrabold">{t("Coupon performance", "أداء الكوبونات")}</h2>
        {data.couponPerformance.length === 0 ? (
          <p className="py-4 text-center text-xs text-[var(--th-muted)]">{t("No coupon usage in this period", "لا يوجد استخدام للكوبونات في هذه الفترة")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start text-xs text-[var(--th-muted)]">
                  <th className="py-2 text-start">{t("Code", "الكود")}</th>
                  <th className="text-start">{t("Orders", "الطلبات")}</th>
                  <th className="text-start">{t("Discount given", "الخصم الممنوح")}</th>
                  <th className="text-start">{t("Revenue", "الإيراد")}</th>
                </tr>
              </thead>
              <tbody>
                {data.couponPerformance.map((c, i) => (
                  <tr key={i} className="border-t border-black/5">
                    <td className="py-2 font-mono font-bold" dir="ltr">{c.code}</td>
                    <td>{c.orders}</td>
                    <td className="text-red-500">-{formatMoney(c.discountGiven, "SAR", lang)}</td>
                    <td className="font-bold">{formatMoney(c.revenue, "SAR", lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
