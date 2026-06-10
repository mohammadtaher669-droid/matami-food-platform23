/**
 * Restaurant storefront: themed via the restaurant's published theme document;
 * homepage sections are rendered in the order configured by the website builder.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ArrowRight, Heart, Info, MapPin, Minus, Phone, Plus, Search, ShoppingBag, Star, Globe } from "lucide-react";
import { api } from "@/lib/api";
import { formatMoney, useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { useCart, lineUnitPrice } from "@/lib/cart";
import { themeToCssVars, DEFAULT_SECTIONS, type HomepageSection } from "@/lib/theme";
import { Badge, Button, Card, EmptyState, Modal, Spinner, useToast } from "@/components/ui";
import type { StorePayload, StoreProduct } from "@/lib/types";

export default function RestaurantSite() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";
  const { t, tr, lang, setLang } = useI18n();
  const { customer } = useAuth();
  const cart = useCart();
  const toast = useToast();
  const [, navigate] = useLocation();

  const [data, setData] = useState<StorePayload | null>(null);
  const [error, setError] = useState("");
  const [branchId, setBranchId] = useState<string>("");
  const [activeCat, setActiveCat] = useState<string>("");
  const [q, setQ] = useState("");
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const [favorited, setFavorited] = useState(false);
  const catBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setData(null);
    api<StorePayload>(`/api/public/r/${slug}`, { scope: null })
      .then((d) => {
        setData(d);
        setBranchId(d.branches[0]?.id ?? "");
        setActiveCat(d.categories[0]?.id ?? "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "error"));
  }, [slug]);

  const sections = useMemo<HomepageSection[]>(() => {
    const fromBuilder = (data?.restaurant.homepage ?? []) as HomepageSection[];
    return fromBuilder.length ? fromBuilder : DEFAULT_SECTIONS;
  }, [data]);

  const vars = useMemo(() => themeToCssVars(data?.restaurant.theme), [data]);

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.products.filter((p) => {
      const availability = p.availability.find((a) => a.branchId === branchId);
      if (availability && !availability.isAvailable) return false;
      if (p.trackStock && availability && availability.stockQty <= 0) return false;
      if (!needle) return true;
      return [p.name_en, p.name_ar, p.description_en, p.description_ar].some((s) => s.toLowerCase().includes(needle));
    });
  }, [data, q, branchId]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <EmptyState title={t("Restaurant not found", "المطعم غير موجود")} hint={error} />
        <Link href="/" className="text-sm font-bold text-[var(--th-primary)]">
          {t("Back to home", "العودة للرئيسية")}
        </Link>
      </div>
    );
  }
  if (!data) return <Spinner label={t("Loading menu…", "جارٍ تحميل المنيو…")} />;

  const r = data.restaurant;
  const branch = data.branches.find((b) => b.id === branchId);
  const orderingOpen = r.subscriptionActive && r.settings.orderingEnabled;
  const theme = r.theme ?? {};

  const toggleFavorite = async () => {
    if (!customer) {
      toast(t("Sign in to save favorites", "سجّل الدخول لحفظ المفضلة"), "error");
      return;
    }
    const d = await api<{ favorited: boolean }>(`/api/public/me/favorites/${slug}`, { method: "PUT", body: {} });
    setFavorited(d.favorited);
  };

  return (
    <div className="min-h-screen pb-24" style={{ ...(vars as CSSProperties), background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "var(--th-font)" }}>
      {/* Header */}
      <header className={`z-40 border-b border-black/5 bg-[var(--th-surface)]/95 backdrop-blur ${theme.header?.sticky !== false ? "sticky top-0" : ""}`}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-2 px-4 py-2.5">
          <Link href="/" className="flex items-center gap-1 text-xs font-bold text-[var(--th-muted)] hover:text-[var(--th-primary)]">
            <ArrowRight size={14} className="rtl:rotate-0 ltr:rotate-180" /> {t("All restaurants", "كل المطاعم")}
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-full px-2.5 py-1 text-xs font-bold hover:bg-black/5">
              <Globe size={13} className="inline" /> {lang === "ar" ? "EN" : "عربي"}
            </button>
            <button onClick={toggleFavorite} className="rounded-full p-2 hover:bg-black/5" aria-label="favorite">
              <Heart size={16} className={favorited ? "fill-red-500 text-red-500" : ""} />
            </button>
          </div>
        </div>
      </header>

      {/* Cover + identity */}
      <div className="relative h-40 bg-gradient-to-br from-[var(--th-primary)]/30 to-[var(--th-accent)]/30 sm:h-56">
        {(r.bannerDesktop || r.coverUrl) && (
          <img src={r.bannerDesktop || r.coverUrl} alt="" className="hidden h-full w-full object-cover sm:block" />
        )}
        {(r.bannerMobile || r.coverUrl) && (
          <img src={r.bannerMobile || r.coverUrl} alt="" className="h-full w-full object-cover sm:hidden" />
        )}
        {theme.hero?.overlay !== false && <div className="absolute inset-0 bg-black/20" />}
      </div>

      <div className="mx-auto max-w-4xl px-4">
        <div className="-mt-10 flex items-end gap-3">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-4 border-[var(--th-surface)] bg-[var(--th-surface)] shadow-md">
            {r.logoUrl ? (
              <img src={r.logoUrl} alt="" className="h-full w-full object-contain" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-[var(--th-primary)]">
                {tr(r as unknown as Record<string, unknown>, "name").charAt(0)}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-xl font-extrabold">{tr(r as unknown as Record<string, unknown>, "name")}</h1>
            <p className="truncate text-xs text-[var(--th-muted)]">{tr(r as unknown as Record<string, unknown>, "description")}</p>
          </div>
        </div>

        {/* Branch selector + status */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {data.branches.length > 0 && (
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="rounded-full border border-black/10 bg-[var(--th-surface)] px-3 py-1.5 text-xs font-bold"
            >
              {data.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  📍 {tr(b as unknown as Record<string, unknown>, "name")}
                </option>
              ))}
            </select>
          )}
          {branch?.phone && (
            <a href={`tel:${branch.phone}`} className="flex items-center gap-1 rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold">
              <Phone size={12} /> {t("Call", "اتصال")}
            </a>
          )}
          {!orderingOpen && <Badge tone="danger">{t("Ordering temporarily unavailable", "الطلب متوقف مؤقتاً")}</Badge>}
        </div>

        {/* Search */}
        {theme.header?.showSearch !== false && (
          <div className="relative mt-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--th-muted)]" size={16} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("Search dishes…", "ابحث في المنيو…")}
              className="w-full rounded-full border border-black/10 bg-[var(--th-surface)] py-2.5 ps-10 pe-4 text-sm outline-none focus:border-[var(--th-primary)]"
            />
          </div>
        )}

        {/* Builder-driven sections */}
        {q.trim() === "" &&
          sections
            .filter((s) => s.enabled)
            .map((s) => <Section key={s.key} section={s} />)}

        {/* Menu (always rendered: category tabs + products) */}
        <div ref={catBarRef} className="no-scrollbar sticky top-12 z-30 -mx-4 mt-6 flex gap-2 overflow-x-auto bg-[var(--th-bg)]/95 px-4 py-2 backdrop-blur">
          {data.categories.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                setActiveCat(c.id);
                document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${
                activeCat === c.id ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5 text-[var(--th-text)]"
              }`}
            >
              {tr(c as unknown as Record<string, unknown>, "name")}
            </button>
          ))}
        </div>

        {data.categories.map((c) => {
          const items = filteredProducts.filter((p) => p.categoryId === c.id);
          if (items.length === 0) return null;
          return (
            <section key={c.id} id={`cat-${c.id}`} className="mt-6 scroll-mt-28">
              <h2 className="mb-3 text-lg font-extrabold">{tr(c as unknown as Record<string, unknown>, "name")}</h2>
              <div className={(theme.layout ?? "grid") === "grid" ? "grid gap-3 sm:grid-cols-2" : "space-y-3"}>
                {items.map((p) => (
                  <ProductRow key={p.id} p={p} />
                ))}
              </div>
            </section>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="mt-8">
            <EmptyState title={t("No dishes found", "لا توجد أطباق")} hint={q ? t("Try a different search", "جرّب بحثاً آخر") : undefined} />
          </div>
        )}

        {/* Reviews */}
        {data.reviews.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-extrabold">{t("Reviews", "التقييمات")}</h2>
            <div className="space-y-3">
              {data.reviews.slice(0, 6).map((rv) => (
                <Card key={rv.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{rv.customerName}</span>
                    <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                      <Star size={12} fill="currentColor" /> {rv.rating}
                    </span>
                  </div>
                  {rv.comment && <p className="mt-1 text-sm text-[var(--th-muted)]">{rv.comment}</p>}
                  {rv.reply && (
                    <p className="mt-2 rounded-xl bg-black/[0.03] p-2 text-xs text-[var(--th-muted)]">
                      <b>{tr(r as unknown as Record<string, unknown>, "name")}:</b> {rv.reply}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 border-t border-black/5 py-6 text-center text-xs text-[var(--th-muted)]">
          {theme.footer?.showContact !== false && (
            <p>
              {r.phone && <span dir="ltr">☎ {r.phone}</span>} {r.website && <span> · {r.website}</span>}
            </p>
          )}
          {theme.footer?.showSocials !== false && (
            <p className="mt-1 space-x-3 rtl:space-x-reverse">
              {Object.entries(r.socials ?? {}).map(([k, v]) =>
                v ? (
                  <a key={k} href={String(v)} target="_blank" rel="noreferrer" className="font-bold text-[var(--th-primary)]">
                    {k}
                  </a>
                ) : null,
              )}
            </p>
          )}
          <p className="mt-1">{lang === "ar" ? theme.footer?.note_ar : theme.footer?.note_en}</p>
        </footer>
      </div>

      {/* Sticky cart bar */}
      {cart.count > 0 && cart.slug === slug && (
        <button
          onClick={() => navigate(`/r/${slug}/checkout`)}
          className="fixed bottom-4 left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between rounded-full bg-[var(--th-primary)] px-5 py-3.5 font-bold text-[var(--th-primary-fg)] shadow-xl"
        >
          <span className="flex items-center gap-2">
            <ShoppingBag size={18} />
            {t("View cart", "عرض السلة")} · {cart.count}
          </span>
          <span>{formatMoney(cart.subtotal, r.currency, lang)}</span>
        </button>
      )}

      {/* Product modal */}
      {product && <ProductModal p={product} onClose={() => setProduct(null)} />}
    </div>
  );

  // ── inner components ───────────────────────────────────────────────────────

  function Section({ section }: { section: HomepageSection }) {
    if (!data) return null;
    switch (section.key) {
      case "offers":
        if (data.offers.length === 0) return null;
        return (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4">
            {data.offers.map((o) => (
              <div key={o.id} className="w-64 shrink-0 overflow-hidden rounded-[var(--th-radius)] bg-gradient-to-l from-[var(--th-primary)] to-[var(--th-accent)] p-4 text-white">
                <p className="text-sm font-extrabold">{tr(o as unknown as Record<string, unknown>, "title")}</p>
                <p className="mt-0.5 text-xs opacity-90">{tr(o as unknown as Record<string, unknown>, "description")}</p>
              </div>
            ))}
          </div>
        );
      case "featured-products": {
        const feats = data.products.filter((p) => p.isFeatured).slice(0, 8);
        if (feats.length === 0) return null;
        return (
          <div className="mt-5">
            <h2 className="mb-2 text-lg font-extrabold">⭐ {t("Featured", "الأطباق المميزة")}</h2>
            <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4">
              {feats.map((p) => (
                <button key={p.id} onClick={() => setProduct(p)} className="w-36 shrink-0 text-start">
                  <div className="h-28 overflow-hidden rounded-[var(--th-radius)] bg-black/5">
                    {p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <p className="mt-1 truncate text-xs font-bold">{tr(p as unknown as Record<string, unknown>, "name")}</p>
                  <p className="text-xs font-extrabold text-[var(--th-primary)]">{formatMoney(p.price, r.currency, lang)}</p>
                </button>
              ))}
            </div>
          </div>
        );
      }
      case "categories": {
        const feats = data.categories.filter((c) => c.isFeatured);
        const cats = feats.length ? feats : data.categories.slice(0, 6);
        if (cats.length === 0) return null;
        return (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4">
            {cats.map((c) => (
              <button
                key={c.id}
                onClick={() => document.getElementById(`cat-${c.id}`)?.scrollIntoView({ behavior: "smooth" })}
                className="flex w-20 shrink-0 flex-col items-center gap-1.5"
              >
                <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[var(--th-primary)]/10 text-xl">
                  {c.imageUrl ? <img src={c.imageUrl} alt="" className="h-full w-full object-cover" /> : "🍽"}
                </span>
                <span className="line-clamp-1 text-[11px] font-bold">{tr(c as unknown as Record<string, unknown>, "name")}</span>
              </button>
            ))}
          </div>
        );
      }
      case "testimonials": {
        const top = data.reviews.filter((rv) => rv.rating >= 4).slice(0, 4);
        if (top.length === 0) return null;
        return (
          <div className="no-scrollbar -mx-4 mt-5 flex gap-3 overflow-x-auto px-4">
            {top.map((rv) => (
              <Card key={rv.id} className="w-60 shrink-0 p-4">
                <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500">
                  {"★".repeat(rv.rating)}
                </span>
                <p className="mt-1 line-clamp-3 text-xs text-[var(--th-muted)]">{rv.comment}</p>
                <p className="mt-2 text-[11px] font-bold">{rv.customerName}</p>
              </Card>
            ))}
          </div>
        );
      }
      case "promo-blocks": {
        const blocks = (section.blocks as Array<{ title_en?: string; title_ar?: string; text_en?: string; text_ar?: string; imageUrl?: string }> | undefined) ?? [];
        if (blocks.length === 0) return null;
        return (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {blocks.map((b, i) => (
              <Card key={i} className="overflow-hidden">
                {b.imageUrl && <img src={b.imageUrl} alt="" className="h-28 w-full object-cover" />}
                <div className="p-4">
                  <p className="font-bold">{lang === "ar" ? b.title_ar : b.title_en}</p>
                  <p className="text-xs text-[var(--th-muted)]">{lang === "ar" ? b.text_ar : b.text_en}</p>
                </div>
              </Card>
            ))}
          </div>
        );
      }
      default:
        return null;
    }
  }

  function ProductRow({ p }: { p: StoreProduct }) {
    return (
      <button
        onClick={() => setProduct(p)}
        className="flex w-full items-center gap-3 rounded-[var(--th-radius)] border border-black/5 bg-[var(--th-surface)] p-3 text-start transition-shadow hover:shadow-md"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{tr(p as unknown as Record<string, unknown>, "name")}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-[var(--th-muted)]">{tr(p as unknown as Record<string, unknown>, "description")}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-sm font-extrabold text-[var(--th-primary)]">{formatMoney(p.price, r.currency, lang)}</span>
            {p.compareAtPrice != null && p.compareAtPrice > p.price && (
              <span className="text-xs text-[var(--th-muted)] line-through">{formatMoney(p.compareAtPrice, r.currency, lang)}</span>
            )}
            {p.calories != null && <span className="text-[10px] text-[var(--th-muted)]">{p.calories} {t("cal", "سعرة")}</span>}
          </div>
        </div>
        {p.imageUrl ? (
          <img src={p.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-[var(--th-radius)] object-cover" />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[var(--th-radius)] bg-black/5 text-2xl">🍽</div>
        )}
      </button>
    );
  }

  function ProductModal({ p, onClose }: { p: StoreProduct; onClose: () => void }) {
    const [variantId, setVariantId] = useState<string>(p.variants.find((v) => v.isDefault)?.id ?? p.variants[0]?.id ?? "");
    const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
    const [qty, setQty] = useState(1);
    const [notes, setNotes] = useState("");

    const variant = p.variants.find((v) => v.id === variantId);
    const addonObjs = p.addonGroups.flatMap((g) => g.addons).filter((a) => selectedAddons.has(a.id));
    const unit = p.price + (variant?.priceDelta ?? 0) + addonObjs.reduce((s, a) => s + a.price, 0);

    const groupViolation = p.addonGroups.find((g) => {
      const count = g.addons.filter((a) => selectedAddons.has(a.id)).length;
      return count < g.minSelect || count > g.maxSelect;
    });

    const add = () => {
      if (!orderingOpen) {
        toast(t("Ordering is currently unavailable", "الطلب متوقف حالياً"), "error");
        return;
      }
      if (groupViolation) {
        toast(
          t(
            `Select between ${groupViolation.minSelect} and ${groupViolation.maxSelect} from "${groupViolation.name_en}"`,
            `اختر من ${groupViolation.minSelect} إلى ${groupViolation.maxSelect} من "${groupViolation.name_ar}"`,
          ),
          "error",
        );
        return;
      }
      cart.addLine(slug, {
        productId: p.id,
        name_en: p.name_en,
        name_ar: p.name_ar,
        imageUrl: p.imageUrl,
        basePrice: p.price,
        variantId: variant?.id,
        variantName_en: variant?.name_en,
        variantName_ar: variant?.name_ar,
        variantDelta: variant?.priceDelta ?? 0,
        addons: addonObjs.map((a) => ({ id: a.id, name_en: a.name_en, name_ar: a.name_ar, price: a.price })),
        qty,
        notes,
      });
      toast(t("Added to cart", "أُضيف للسلة"));
      onClose();
    };

    return (
      <Modal open onClose={onClose} title={tr(p as unknown as Record<string, unknown>, "name")}>
        <div className="space-y-4">
          {p.imageUrl && <img src={p.imageUrl} alt="" className="h-44 w-full rounded-[var(--th-radius)] object-cover" />}
          <p className="text-sm text-[var(--th-muted)]">{tr(p as unknown as Record<string, unknown>, "description")}</p>

          {p.variants.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold text-[var(--th-muted)]">{t("Choose size / option", "اختر الحجم / النوع")}</p>
              <div className="space-y-1.5">
                {p.variants.map((v) => (
                  <label key={v.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-black/10 px-3 py-2.5 text-sm has-[:checked]:border-[var(--th-primary)] has-[:checked]:bg-[var(--th-primary)]/5">
                    <span className="flex items-center gap-2">
                      <input type="radio" name="variant" checked={variantId === v.id} onChange={() => setVariantId(v.id)} className="accent-[var(--th-primary)]" />
                      {tr(v as unknown as Record<string, unknown>, "name")}
                    </span>
                    {v.priceDelta !== 0 && <span className="text-xs font-bold">{v.priceDelta > 0 ? "+" : ""}{formatMoney(v.priceDelta, r.currency, lang)}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {p.addonGroups.map((g) => (
            <div key={g.id}>
              <p className="mb-2 flex items-center gap-2 text-xs font-bold text-[var(--th-muted)]">
                {tr(g as unknown as Record<string, unknown>, "name")}
                <Badge>{g.minSelect === 0 ? t("Optional", "اختياري") : t("Required", "مطلوب")} · {t("max", "بحد أقصى")} {g.maxSelect}</Badge>
              </p>
              <div className="space-y-1.5">
                {g.addons.map((a) => {
                  const checked = selectedAddons.has(a.id);
                  return (
                    <label key={a.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-black/10 px-3 py-2.5 text-sm has-[:checked]:border-[var(--th-primary)] has-[:checked]:bg-[var(--th-primary)]/5">
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedAddons((prev) => {
                              const next = new Set(prev);
                              if (checked) next.delete(a.id);
                              else next.add(a.id);
                              return next;
                            });
                          }}
                          className="accent-[var(--th-primary)]"
                        />
                        {tr(a as unknown as Record<string, unknown>, "name")}
                      </span>
                      {a.price > 0 && <span className="text-xs font-bold">+{formatMoney(a.price, r.currency, lang)}</span>}
                    </label>
                  );
                })}
              </div>
            </div>
          ))}

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("Notes (e.g. no onions)…", "ملاحظات (مثلاً: بدون بصل)…")}
            className="min-h-[60px] w-full rounded-[var(--th-radius)] border border-black/10 p-3 text-sm outline-none focus:border-[var(--th-primary)]"
          />

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 rounded-full border border-black/10 px-2 py-1">
              <button onClick={() => setQty((n) => Math.max(1, n - 1))} className="rounded-full p-1.5 hover:bg-black/5"><Minus size={14} /></button>
              <span className="w-6 text-center text-sm font-extrabold">{qty}</span>
              <button onClick={() => setQty((n) => n + 1)} className="rounded-full p-1.5 hover:bg-black/5"><Plus size={14} /></button>
            </div>
            <Button onClick={add} className="flex-1">
              {t("Add to cart", "أضف للسلة")} · {formatMoney(unit * qty, r.currency, lang)}
            </Button>
          </div>
        </div>
      </Modal>
    );
  }
}
