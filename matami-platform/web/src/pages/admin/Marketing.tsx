/** Marketing: offers, coupons, review moderation. */
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Star } from "lucide-react";
import { api } from "@/lib/api";
import { formatDate, useI18n } from "@/lib/i18n";
import { Badge, Button, Card, EmptyState, Input, Spinner, useToast } from "@/components/ui";
import { ResourceManager, ActiveBadge } from "@/components/ResourceManager";
import { useAdmin } from "./AdminPanel";

type Tab = "offers" | "coupons" | "reviews";

export default function Marketing() {
  const params = useParams<{ tab?: Tab }>();
  const tab: Tab = params.tab === "coupons" || params.tab === "reviews" ? params.tab : "offers";
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {([
          ["offers", t("Offers", "العروض")],
          ["coupons", t("Coupons", "الكوبونات")],
          ["reviews", t("Reviews", "التقييمات")],
        ] as Array<[Tab, string]>).map(([k, label]) => (
          <Link
            key={k}
            href={`/admin/marketing/${k}`}
            className={`rounded-full px-4 py-2 text-xs font-bold ${tab === k ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      {tab === "offers" && <OffersTab />}
      {tab === "coupons" && <CouponsTab />}
      {tab === "reviews" && <ReviewsTab />}
    </div>
  );
}

interface Offer { id: string; title_en: string; title_ar: string; type: string; value: number | string; minOrder: number | string; isActive: boolean }

function OffersTab() {
  const { tr } = useI18n();
  const { headers } = useAdmin();
  return (
    <ResourceManager<Offer>
      titleEn="Offers"
      titleAr="العروض"
      apiPath="/api/admin/offers"
      headers={headers}
      emptyHintEn="Auto-applied promotions shown on your storefront"
      emptyHintAr="عروض تلقائية تظهر في واجهة المتجر"
      fields={[
        { key: "title_ar", label_en: "Title (AR)", label_ar: "العنوان (عربي)", type: "text", required: true, half: true },
        { key: "title_en", label_en: "Title (EN)", label_ar: "العنوان (إنجليزي)", type: "text", required: true, half: true },
        { key: "description_ar", label_en: "Description (AR)", label_ar: "الوصف (عربي)", type: "textarea", half: true },
        { key: "description_en", label_en: "Description (EN)", label_ar: "الوصف (إنجليزي)", type: "textarea", half: true },
        { key: "imageUrl", label_en: "Image", label_ar: "الصورة", type: "image" },
        {
          key: "type", label_en: "Type", label_ar: "النوع", type: "select", required: true, half: true,
          defaultValue: "PERCENT_OFF",
          options: [
            { value: "PERCENT_OFF", label_en: "% off", label_ar: "خصم %" },
            { value: "FIXED_OFF", label_en: "Fixed amount off", label_ar: "خصم مبلغ ثابت" },
            { value: "FREE_DELIVERY", label_en: "Free delivery", label_ar: "توصيل مجاني" },
          ],
        },
        { key: "value", label_en: "Value", label_ar: "القيمة", type: "money", half: true },
        { key: "minOrder", label_en: "Min order", label_ar: "أدنى طلب", type: "money", half: true },
        { key: "sortOrder", label_en: "Sort", label_ar: "الترتيب", type: "number", half: true },
        { key: "startsAt", label_en: "Starts", label_ar: "يبدأ", type: "datetime", half: true },
        { key: "endsAt", label_en: "Ends", label_ar: "ينتهي", type: "datetime", half: true },
        { key: "isActive", label_en: "Active", label_ar: "مفعّل", type: "toggle" },
      ]}
      columns={[
        { header: "Offer / العرض", render: (o) => <b>{tr(o as unknown as Record<string, unknown>, "title")}</b> },
        {
          header: "",
          render: (o) => (
            <Badge tone="info">
              {o.type === "FREE_DELIVERY" ? "🚚" : o.type === "PERCENT_OFF" ? `${o.value}%` : `-${o.value}`}
            </Badge>
          ),
        },
        { header: "", className: "w-28", render: (o) => <ActiveBadge active={o.isActive} /> },
      ]}
    />
  );
}

interface Coupon { id: string; code: string; type: string; value: number | string; minOrder: number | string; usedCount: number; maxUses: number | null; isActive: boolean }

function CouponsTab() {
  const { headers } = useAdmin();
  return (
    <ResourceManager<Coupon>
      titleEn="Coupons"
      titleAr="الكوبونات"
      apiPath="/api/admin/coupons"
      headers={headers}
      emptyHintEn="Discount codes customers enter at checkout"
      emptyHintAr="أكواد خصم يُدخلها العملاء عند الدفع"
      fields={[
        { key: "code", label_en: "Code", label_ar: "الكود", type: "text", required: true, half: true, placeholder: "SAVE10" },
        {
          key: "type", label_en: "Type", label_ar: "النوع", type: "select", required: true, half: true,
          defaultValue: "PERCENT",
          options: [
            { value: "PERCENT", label_en: "Percent %", label_ar: "نسبة %" },
            { value: "FIXED", label_en: "Fixed amount", label_ar: "مبلغ ثابت" },
          ],
        },
        { key: "value", label_en: "Value", label_ar: "القيمة", type: "money", required: true, half: true },
        { key: "minOrder", label_en: "Min order", label_ar: "أدنى طلب", type: "money", half: true },
        { key: "maxDiscount", label_en: "Max discount (optional)", label_ar: "أقصى خصم (اختياري)", type: "money", half: true, defaultValue: null },
        { key: "maxUses", label_en: "Max uses (optional)", label_ar: "أقصى استخدامات (اختياري)", type: "number", half: true, defaultValue: null },
        { key: "perCustomer", label_en: "Per-customer limit (optional)", label_ar: "حد لكل عميل (اختياري)", type: "number", half: true, defaultValue: null },
        { key: "startsAt", label_en: "Starts", label_ar: "يبدأ", type: "datetime", half: true },
        { key: "endsAt", label_en: "Ends", label_ar: "ينتهي", type: "datetime", half: true },
        { key: "isActive", label_en: "Active", label_ar: "مفعّل", type: "toggle" },
      ]}
      columns={[
        { header: "Code / الكود", render: (c) => <b dir="ltr" className="font-mono">{c.code}</b> },
        { header: "", render: (c) => <Badge tone="info">{c.type === "PERCENT" ? `${c.value}%` : `-${c.value}`}</Badge> },
        { header: "Used / مُستخدم", className: "w-28", render: (c) => `${c.usedCount}${c.maxUses ? ` / ${c.maxUses}` : ""}` },
        { header: "", className: "w-28", render: (c) => <ActiveBadge active={c.isActive} /> },
      ]}
    />
  );
}

interface Review {
  id: string; rating: number; comment: string; status: "PENDING" | "APPROVED" | "REJECTED"; reply: string;
  createdAt: string;
  customer: { name: string; phone: string };
  product: { name_en: string; name_ar: string } | null;
}

function ReviewsTab() {
  const { t, tr, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<string>("PENDING");
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    api<{ items: Review[] }>(`/api/admin/reviews${filter ? `?status=${filter}` : ""}`, { headers })
      .then((d) => setReviews(d.items))
      .catch(() => setReviews([]));
  }, [filter, headers]);

  useEffect(() => void load(), [load]);

  const update = async (id: string, patch: { status?: string; reply?: string }) => {
    try {
      await api(`/api/admin/reviews/${id}`, { method: "PUT", body: patch, headers });
      toast(t("Updated", "تم التحديث"));
      void load();
    } catch (e) {
      toast(e instanceof Error ? e.message : t("Failed", "فشل"), "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-extrabold">{t("Reviews", "التقييمات")}</h1>
        <div className="flex gap-2">
          {[
            ["PENDING", t("Pending", "بانتظار")],
            ["APPROVED", t("Approved", "معتمدة")],
            ["REJECTED", t("Rejected", "مرفوضة")],
            ["", t("All", "الكل")],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k ?? "")}
              className={`rounded-full px-3 py-1.5 text-xs font-bold ${filter === k ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {reviews === null ? (
        <Spinner />
      ) : reviews.length === 0 ? (
        <EmptyState title={t("No reviews", "لا توجد تقييمات")} icon={<Star size={32} />} />
      ) : (
        <div className="space-y-3">
          {reviews.map((rv) => (
            <Card key={rv.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <b className="text-sm">{rv.customer.name}</b>
                  <span className="ms-2 text-xs font-bold text-amber-500">{"★".repeat(rv.rating)}{"☆".repeat(5 - rv.rating)}</span>
                  {rv.product && <span className="ms-2 text-xs text-[var(--th-muted)]">({tr(rv.product as unknown as Record<string, unknown>, "name")})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={rv.status === "APPROVED" ? "success" : rv.status === "REJECTED" ? "danger" : "warn"}>{rv.status}</Badge>
                  <span className="text-[11px] text-[var(--th-muted)]">{formatDate(rv.createdAt, lang)}</span>
                </div>
              </div>
              {rv.comment && <p className="mt-2 text-sm text-[var(--th-muted)]">{rv.comment}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {rv.status !== "APPROVED" && (
                  <Button size="sm" onClick={() => void update(rv.id, { status: "APPROVED" })}>✓ {t("Approve", "اعتماد")}</Button>
                )}
                {rv.status !== "REJECTED" && (
                  <Button size="sm" variant="danger" onClick={() => void update(rv.id, { status: "REJECTED" })}>✕ {t("Reject", "رفض")}</Button>
                )}
                <div className="flex min-w-48 flex-1 items-center gap-2">
                  <Input
                    value={replies[rv.id] ?? rv.reply}
                    onChange={(e) => setReplies({ ...replies, [rv.id]: e.target.value })}
                    placeholder={t("Public reply…", "رد علني…")}
                  />
                  <Button size="sm" variant="outline" onClick={() => void update(rv.id, { reply: replies[rv.id] ?? rv.reply })}>
                    {t("Reply", "رد")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
