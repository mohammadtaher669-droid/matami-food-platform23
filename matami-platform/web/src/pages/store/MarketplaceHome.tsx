/** Platform home: hero + search + featured restaurants listing. */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Search, Star, MapPin, UserRound, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { Badge, Card, EmptyState, Spinner } from "@/components/ui";
import type { MarketRestaurant } from "@/lib/types";

interface PlatformSettings {
  platformName_en?: string;
  platformName_ar?: string;
  logoUrl?: string;
  primaryColor?: string;
  tagline_en?: string;
  tagline_ar?: string;
}

export default function MarketplaceHome() {
  const { t, tr, lang, setLang } = useI18n();
  const { customer } = useAuth();
  const [restaurants, setRestaurants] = useState<MarketRestaurant[] | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    api<{ settings: PlatformSettings }>("/api/public/platform", { scope: null })
      .then((d) => setSettings(d.settings))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      api<{ restaurants: MarketRestaurant[] }>(`/api/public/restaurants?q=${encodeURIComponent(q)}`, { scope: null })
        .then((d) => setRestaurants(d.restaurants))
        .catch(() => setRestaurants([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [q]);

  const platformName = lang === "ar" ? settings.platformName_ar || "مطعمي" : settings.platformName_en || "Mat'ami";
  const featured = useMemo(() => restaurants?.filter((r) => r.isFeatured) ?? [], [restaurants]);
  const rest = useMemo(() => restaurants?.filter((r) => !r.isFeatured) ?? [], [restaurants]);

  return (
    <div className="min-h-screen" style={settings.primaryColor ? ({ "--th-primary": settings.primaryColor } as React.CSSProperties) : undefined}>
      <header className="sticky top-0 z-40 border-b border-black/5 bg-[var(--th-surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="" className="h-9 w-9 rounded-xl object-contain" />
            ) : (
              <img src="/favicon.svg" alt="" className="h-9 w-9" />
            )}
            <span className="text-lg font-extrabold text-[var(--th-primary)]">{platformName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-black/5"
            >
              <Globe size={14} /> {lang === "ar" ? "EN" : "عربي"}
            </button>
            <Link href="/account" className="flex items-center gap-1 rounded-full bg-[var(--th-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--th-primary)]">
              <UserRound size={14} />
              {customer ? customer.name.split(" ")[0] : t("Sign in", "تسجيل الدخول")}
            </Link>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-b from-[var(--th-primary)]/10 to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-10 text-center sm:py-16">
          <h1 className="text-2xl font-extrabold sm:text-4xl">
            {lang === "ar" ? settings.tagline_ar || "اطلب من أفضل المطاعم" : settings.tagline_en || "Order from the best restaurants"}
          </h1>
          <p className="mt-2 text-sm text-[var(--th-muted)] sm:text-base">
            {t("Delivery and pickup from local restaurants you love", "توصيل واستلام من مطاعمك المفضلة")}
          </p>
          <div className="relative mx-auto mt-6 max-w-xl">
            <Search className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--th-muted)]" size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search restaurants or cuisine…", "ابحث عن مطعم أو نوع أكل…")}
              className="w-full rounded-full border border-black/10 bg-[var(--th-surface)] py-3.5 ps-11 pe-4 text-sm shadow-sm outline-none focus:border-[var(--th-primary)] focus:ring-2 focus:ring-[var(--th-primary)]/20"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl space-y-8 px-4 pb-16">
        {restaurants === null ? (
          <Spinner label={t("Loading restaurants…", "جارٍ تحميل المطاعم…")} />
        ) : restaurants.length === 0 ? (
          <EmptyState
            title={t("No restaurants yet", "لا توجد مطاعم بعد")}
            hint={t("Restaurants will appear here once onboarded", "ستظهر المطاعم هنا بعد إضافتها")}
          />
        ) : (
          <>
            {featured.length > 0 && (
              <section>
                <h2 className="mb-3 text-lg font-extrabold">{t("Featured", "مميّز")} ⭐</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {featured.map((r) => (
                    <RestaurantCard key={r.slug} r={r} />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="mb-3 text-lg font-extrabold">{t("All restaurants", "كل المطاعم")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((r) => (
                  <RestaurantCard key={r.slug} r={r} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-xs text-[var(--th-muted)]">
        {platformName} © {new Date().getFullYear()}
      </footer>
    </div>
  );

  function RestaurantCard({ r }: { r: MarketRestaurant }) {
    return (
      <Link href={`/r/${r.slug}`}>
        <Card className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
          <div className="relative h-32 bg-gradient-to-br from-[var(--th-primary)]/20 to-[var(--th-accent)]/20">
            {r.coverUrl && <img src={r.coverUrl} alt="" className="h-full w-full object-cover" />}
            {r.isFeatured && (
              <span className="absolute start-2 top-2">
                <Badge tone="warn">⭐ {t("Featured", "مميز")}</Badge>
              </span>
            )}
          </div>
          <div className="flex items-start gap-3 p-4">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-black/5 bg-[var(--th-surface)] -mt-8 shadow">
              {r.logoUrl ? (
                <img src={r.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--th-primary)]">
                  {tr(r as unknown as Record<string, unknown>, "name").charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-bold group-hover:text-[var(--th-primary)]">{tr(r as unknown as Record<string, unknown>, "name")}</h3>
              <p className="truncate text-xs text-[var(--th-muted)]">{tr(r as unknown as Record<string, unknown>, "description")}</p>
              <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--th-muted)]">
                {r.rating != null && (
                  <span className="flex items-center gap-0.5 font-bold text-amber-500">
                    <Star size={12} fill="currentColor" /> {r.rating} ({r.ratingCount})
                  </span>
                )}
                <span className="flex items-center gap-0.5">
                  <MapPin size={12} /> {r.branchCount} {t("branches", "فروع")}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </Link>
    );
  }
}
