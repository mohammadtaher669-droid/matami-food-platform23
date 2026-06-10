/** Customer profile: orders, addresses, favorites, loyalty wallet, referrals. */
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, Copy, Gift, Heart, LogOut, MapPin, ReceiptText, Star, Trash2, UserRound } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, formatMoney, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, EmptyState, Spinner, useToast } from "@/components/ui";
import { CustomerAuthForm } from "./CustomerAuth";

type Tab = "orders" | "addresses" | "favorites" | "loyalty" | "referrals";

interface MyOrder {
  orderNo: number;
  status: string;
  total: number;
  createdAt: string;
  restaurant: { slug: string; name_en: string; name_ar: string; logoUrl: string; currency: string };
}

export default function Account() {
  const { t, tr, lang } = useI18n();
  const { customer, loadingCustomer, logoutCustomer } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("orders");

  if (loadingCustomer) return <Spinner />;

  if (!customer) {
    return (
      <div className="mx-auto min-h-screen max-w-md px-4 py-10">
        <Link href="/" className="mb-6 flex items-center gap-1 text-xs font-bold text-[var(--th-muted)]">
          <ArrowRight size={14} className="rtl:rotate-0 ltr:rotate-180" /> {t("Home", "الرئيسية")}
        </Link>
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--th-primary)]/10 text-[var(--th-primary)]">
            <UserRound size={28} />
          </span>
          <h1 className="text-xl font-extrabold">{t("Your account", "حسابك")}</h1>
          <p className="text-sm text-[var(--th-muted)]">{t("Track orders, favorites & rewards", "تابع طلباتك ومفضلتك ومكافآتك")}</p>
        </div>
        <Card className="p-5">
          <CustomerAuthForm onDone={() => undefined} />
        </Card>
      </div>
    );
  }

  const TABS: Array<{ key: Tab; icon: typeof ReceiptText; en: string; ar: string }> = [
    { key: "orders", icon: ReceiptText, en: "Orders", ar: "طلباتي" },
    { key: "addresses", icon: MapPin, en: "Addresses", ar: "عناويني" },
    { key: "favorites", icon: Heart, en: "Favorites", ar: "المفضلة" },
    { key: "loyalty", icon: Star, en: "Points", ar: "نقاطي" },
    { key: "referrals", icon: Gift, en: "Referrals", ar: "الإحالات" },
  ];

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-16">
      <header className="flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-1 text-xs font-bold text-[var(--th-muted)]">
          <ArrowRight size={14} className="rtl:rotate-0 ltr:rotate-180" /> {t("Home", "الرئيسية")}
        </Link>
        <button onClick={() => void logoutCustomer()} className="flex items-center gap-1 text-xs font-bold text-red-500">
          <LogOut size={14} /> {t("Sign out", "خروج")}
        </button>
      </header>

      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--th-primary)] text-xl font-black text-white">
          {customer.name.charAt(0)}
        </span>
        <div>
          <h1 className="text-lg font-extrabold">{customer.name}</h1>
          <p className="text-xs text-[var(--th-muted)]" dir="ltr">{customer.phone}</p>
        </div>
      </div>

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((tb) => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${tab === tb.key ? "bg-[var(--th-primary)] text-white" : "bg-black/5"}`}
          >
            <tb.icon size={13} /> {lang === "ar" ? tb.ar : tb.en}
          </button>
        ))}
      </div>

      {tab === "orders" && <OrdersTab />}
      {tab === "addresses" && <AddressesTab />}
      {tab === "favorites" && <FavoritesTab />}
      {tab === "loyalty" && <LoyaltyTab />}
      {tab === "referrals" && <ReferralsTab />}
    </div>
  );

  function OrdersTab() {
    const [orders, setOrders] = useState<MyOrder[] | null>(null);
    useEffect(() => {
      api<{ orders: MyOrder[] }>("/api/public/me/orders").then((d) => setOrders(d.orders)).catch(() => setOrders([]));
    }, []);
    if (!orders) return <Spinner />;
    if (orders.length === 0) return <EmptyState title={t("No orders yet", "لا توجد طلبات بعد")} />;
    return (
      <div className="space-y-3">
        {orders.map((o) => (
          <Link key={o.orderNo} href={`/r/${o.restaurant.slug}/track/${o.orderNo}`}>
            <Card className="flex cursor-pointer items-center gap-3 p-4 hover:shadow-md">
              <div className="h-11 w-11 overflow-hidden rounded-xl bg-black/5">
                {o.restaurant.logoUrl && <img src={o.restaurant.logoUrl} alt="" className="h-full w-full object-contain" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{tr(o.restaurant as unknown as Record<string, unknown>, "name")}</p>
                <p className="text-[11px] text-[var(--th-muted)]">#{o.orderNo} · {formatDate(o.createdAt, lang)}</p>
              </div>
              <div className="text-end">
                <p className="text-sm font-extrabold">{formatMoney(o.total, o.restaurant.currency, lang)}</p>
                <Badge tone={o.status === "DELIVERED" ? "success" : o.status === "CANCELED" ? "danger" : "info"}>{o.status}</Badge>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  function AddressesTab() {
    const [addresses, setAddresses] = useState<Array<{ id: string; label: string; details: string; isDefault: boolean }> | null>(null);
    const load = () => api<{ addresses: typeof addresses }>("/api/public/me/addresses").then((d) => setAddresses(d.addresses ?? [])).catch(() => setAddresses([]));
    useEffect(() => {
      void load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    if (!addresses) return <Spinner />;
    if (addresses.length === 0) {
      return <EmptyState title={t("No saved addresses", "لا توجد عناوين محفوظة")} hint={t("Addresses are saved during checkout", "تُحفظ العناوين أثناء إتمام الطلب")} />;
    }
    return (
      <div className="space-y-3">
        {addresses.map((a) => (
          <Card key={a.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-bold">{a.label || t("Address", "عنوان")} {a.isDefault && <Badge tone="success">{t("Default", "افتراضي")}</Badge>}</p>
              <p className="text-xs text-[var(--th-muted)]">{a.details}</p>
            </div>
            <button
              onClick={async () => {
                await api(`/api/public/me/addresses/${a.id}`, { method: "DELETE" });
                void load();
              }}
              className="rounded-full p-2 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          </Card>
        ))}
      </div>
    );
  }

  function FavoritesTab() {
    const [favs, setFavs] = useState<Array<{ restaurant: { slug: string; name_en: string; name_ar: string; logoUrl: string } }> | null>(null);
    useEffect(() => {
      api<{ favorites: typeof favs }>("/api/public/me/favorites").then((d) => setFavs(d.favorites ?? [])).catch(() => setFavs([]));
    }, []);
    if (!favs) return <Spinner />;
    if (favs.length === 0) return <EmptyState title={t("No favorites yet", "لا توجد مفضلة بعد")} icon={<Heart size={32} />} />;
    return (
      <div className="grid grid-cols-2 gap-3">
        {favs.map((f, i) => (
          <Link key={i} href={`/r/${f.restaurant.slug}`}>
            <Card className="cursor-pointer p-4 text-center hover:shadow-md">
              <div className="mx-auto mb-2 h-14 w-14 overflow-hidden rounded-2xl bg-black/5">
                {f.restaurant.logoUrl && <img src={f.restaurant.logoUrl} alt="" className="h-full w-full object-contain" />}
              </div>
              <p className="truncate text-sm font-bold">{tr(f.restaurant as unknown as Record<string, unknown>, "name")}</p>
            </Card>
          </Link>
        ))}
      </div>
    );
  }

  function LoyaltyTab() {
    const [accounts, setAccounts] = useState<Array<{
      id: string;
      points: number;
      restaurant: { slug: string; name_en: string; name_ar: string; logoUrl: string };
      transactions: Array<{ id: string; type: string; points: number; note: string; createdAt: string }>;
    }> | null>(null);
    useEffect(() => {
      api<{ accounts: typeof accounts }>("/api/public/me/loyalty").then((d) => setAccounts(d.accounts ?? [])).catch(() => setAccounts([]));
    }, []);
    if (!accounts) return <Spinner />;
    if (accounts.length === 0) return <EmptyState title={t("No points yet", "لا توجد نقاط بعد")} hint={t("Earn points with every delivered order", "اكسب نقاطاً مع كل طلب مكتمل")} icon={<Star size={32} />} />;
    return (
      <div className="space-y-4">
        {accounts.map((a) => (
          <Card key={a.id} className="p-4">
            <div className="flex items-center justify-between">
              <Link href={`/r/${a.restaurant.slug}`} className="flex items-center gap-2">
                <div className="h-10 w-10 overflow-hidden rounded-xl bg-black/5">
                  {a.restaurant.logoUrl && <img src={a.restaurant.logoUrl} alt="" className="h-full w-full object-contain" />}
                </div>
                <span className="text-sm font-bold">{tr(a.restaurant as unknown as Record<string, unknown>, "name")}</span>
              </Link>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-extrabold text-amber-700">⭐ {a.points}</span>
            </div>
            {a.transactions.length > 0 && (
              <div className="mt-3 space-y-1 border-t border-black/5 pt-2 text-xs text-[var(--th-muted)]">
                {a.transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex justify-between">
                    <span>{tx.note || tx.type}</span>
                    <b className={tx.points > 0 ? "text-emerald-600" : "text-red-500"}>{tx.points > 0 ? "+" : ""}{tx.points}</b>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  function ReferralsTab() {
    const [data, setData] = useState<{ referralCode: string; referrals: Array<{ name: string; joinedAt: string; rewardPoints: number; rewardedAt: string | null }> } | null>(null);
    useEffect(() => {
      api<typeof data>("/api/public/me/referrals").then((d) => setData(d)).catch(() => undefined);
    }, []);
    if (!data) return <Spinner />;
    return (
      <div className="space-y-4">
        <Card className="p-5 text-center">
          <p className="text-sm text-[var(--th-muted)]">{t("Share your code — you both get rewarded", "شارك كودك واكسبا المكافآت معاً")}</p>
          <p className="mt-2 text-2xl font-black tracking-widest text-[var(--th-primary)]" dir="ltr">{data.referralCode}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              void navigator.clipboard.writeText(data.referralCode);
              toast(t("Copied!", "تم النسخ!"));
            }}
          >
            <Copy size={14} /> {t("Copy code", "نسخ الكود")}
          </Button>
        </Card>
        {data.referrals.length > 0 && (
          <Card className="divide-y divide-black/5 p-4">
            {data.referrals.map((rf, i) => (
              <div key={i} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p className="font-bold">{rf.name}</p>
                  <p className="text-[11px] text-[var(--th-muted)]">{formatDate(rf.joinedAt, lang)}</p>
                </div>
                {rf.rewardedAt ? <Badge tone="success">+{rf.rewardPoints} {t("pts", "نقطة")}</Badge> : <Badge>{t("Pending first order", "بانتظار أول طلب")}</Badge>}
              </div>
            ))}
          </Card>
        )}
      </div>
    );
  }
}
