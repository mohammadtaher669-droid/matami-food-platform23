/**
 * No-code Theme Builder + Website Builder.
 * Left: controls (templates, colors, fonts, header/footer, branding uploads,
 * homepage sections with reorder/toggle). Right: live storefront preview
 * rendered from the draft document. One-click publish copies draft → live.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, Palette, Rocket, Type } from "lucide-react";
import { api, ApiRequestError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { FONT_STACKS, SECTION_LABELS, themeToCssVars, DEFAULT_SECTIONS, type HomepageSection, type ThemeDoc } from "@/lib/theme";
import { Badge, Button, Card, Field, Input, Select, Spinner, Toggle, useToast } from "@/components/ui";
import { ImageInput } from "@/components/ImageInput";
import { useAdmin } from "./AdminPanel";

interface BuilderData {
  theme: ThemeDoc;
  themeDraft: ThemeDoc;
  homepage: HomepageSection[];
  socials: Record<string, string>;
  branding: { logoUrl: string; coverUrl: string; bannerMobile: string; bannerDesktop: string };
  templates: Array<{ id: string; key: string; name_en: string; name_ar: string; document: ThemeDoc }>;
}

const COLOR_KEYS: Array<{ key: keyof NonNullable<ThemeDoc["colors"]>; en: string; ar: string }> = [
  { key: "primary", en: "Primary", ar: "اللون الرئيسي" },
  { key: "primaryFg", en: "On primary", ar: "نص فوق الرئيسي" },
  { key: "bg", en: "Background", ar: "الخلفية" },
  { key: "surface", en: "Cards", ar: "البطاقات" },
  { key: "text", en: "Text", ar: "النص" },
  { key: "muted", en: "Muted text", ar: "نص ثانوي" },
  { key: "accent", en: "Accent", ar: "لون مساعد" },
];

const SOCIAL_KEYS = ["instagram", "twitter", "tiktok", "snapchat", "facebook", "whatsapp"];

export default function Builder() {
  const { t, lang } = useI18n();
  const { headers } = useAdmin();
  const toast = useToast();

  const [data, setData] = useState<BuilderData | null>(null);
  const [draft, setDraft] = useState<ThemeDoc>({});
  const [sections, setSections] = useState<HomepageSection[]>(DEFAULT_SECTIONS);
  const [socials, setSocials] = useState<Record<string, string>>({});
  const [branding, setBranding] = useState({ logoUrl: "", coverUrl: "", bannerMobile: "", bannerDesktop: "" });
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    api<BuilderData>("/api/admin/builder", { headers })
      .then((d) => {
        setData(d);
        setDraft(Object.keys(d.themeDraft ?? {}).length ? d.themeDraft : d.theme);
        setSections((d.homepage ?? []).length ? d.homepage : DEFAULT_SECTIONS);
        setSocials(d.socials ?? {});
        setBranding(d.branding);
      })
      .catch((e) => toast(e instanceof Error ? e.message : "error", "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const persistDraft = useCallback(
    (next: { draft?: ThemeDoc; sections?: HomepageSection[]; socials?: Record<string, string>; branding?: typeof branding }) => {
      setDirty(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        setSaving(true);
        try {
          await api("/api/admin/builder/draft", {
            method: "PUT",
            headers,
            body: {
              themeDraft: next.draft ?? draft,
              homepage: next.sections ?? sections,
              socials: next.socials ?? socials,
              branding: next.branding ?? branding,
            },
          });
          setDirty(false);
        } catch (e) {
          toast(e instanceof ApiRequestError ? e.message : t("Autosave failed", "فشل الحفظ التلقائي"), "error");
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft, sections, socials, branding, headers],
  );

  const setTheme = (patch: Partial<ThemeDoc>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    persistDraft({ draft: next });
  };
  const setColors = (key: string, value: string) => {
    setTheme({ colors: { ...(draft.colors ?? {}), [key]: value } });
  };

  const publish = async () => {
    setPublishing(true);
    try {
      // flush latest draft first
      await api("/api/admin/builder/draft", {
        method: "PUT",
        headers,
        body: { themeDraft: draft, homepage: sections, socials, branding },
      });
      await api("/api/admin/builder/publish", { method: "POST", body: {}, headers });
      toast(t("Published! Your site is live 🎉", "تم النشر! موقعك مباشر الآن 🎉"));
      setDirty(false);
    } catch (e) {
      toast(e instanceof ApiRequestError ? e.message : t("Publish failed", "فشل النشر"), "error");
    } finally {
      setPublishing(false);
    }
  };

  if (!data) return <Spinner />;

  const vars = themeToCssVars(draft);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-xl font-extrabold">
          <Palette size={20} className="text-[var(--th-primary)]" /> {t("Theme & Website Builder", "بنّاء الثيم والموقع")}
        </h1>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[var(--th-muted)]">
            {saving ? t("Saving…", "جارٍ الحفظ…") : dirty ? t("Unsaved changes", "تغييرات غير محفوظة") : t("Draft saved", "المسودة محفوظة ✓")}
          </span>
          <Button onClick={() => void publish()} loading={publishing}>
            <Rocket size={15} /> {t("Publish now", "انشر الآن")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* ── Controls ── */}
        <div className="space-y-4">
          {/* Templates */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-extrabold">{t("Templates", "القوالب الجاهزة")}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.templates.map((tpl) => {
                const c = tpl.document.colors ?? {};
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      setDraft(tpl.document);
                      persistDraft({ draft: tpl.document });
                    }}
                    className="rounded-xl border border-black/10 p-2 text-start transition-shadow hover:shadow-md"
                  >
                    <div className="mb-1.5 flex h-10 overflow-hidden rounded-lg">
                      <span className="flex-1" style={{ background: c.primary }} />
                      <span className="flex-1" style={{ background: c.bg }} />
                      <span className="flex-1" style={{ background: c.accent }} />
                    </div>
                    <p className="truncate text-[11px] font-bold">{lang === "ar" ? tpl.name_ar : tpl.name_en}</p>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Colors */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-extrabold">{t("Colors", "الألوان")}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {COLOR_KEYS.map((ck) => (
                <label key={ck.key} className="space-y-1">
                  <span className="block text-[11px] font-bold text-[var(--th-muted)]">{lang === "ar" ? ck.ar : ck.en}</span>
                  <span className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={draft.colors?.[ck.key] ?? "#16a34a"}
                      onChange={(e) => setColors(ck.key, e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded-lg border border-black/10"
                    />
                    <code className="text-[10px] text-[var(--th-muted)]" dir="ltr">{draft.colors?.[ck.key] ?? ""}</code>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          {/* Typography & shape */}
          <Card className="grid gap-3 p-4 sm:grid-cols-3">
            <Field label={<span className="flex items-center gap-1"><Type size={12} /> {t("Font", "الخط")}</span>}>
              <Select value={draft.font ?? "cairo"} onChange={(e) => setTheme({ font: e.target.value })}>
                {Object.keys(FONT_STACKS).map((f) => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </Select>
            </Field>
            <Field label={t("Corner radius", "استدارة الزوايا")}>
              <Select value={draft.radius ?? "lg"} onChange={(e) => setTheme({ radius: e.target.value as ThemeDoc["radius"] })}>
                <option value="sm">{t("Sharp", "حادة")}</option>
                <option value="md">{t("Medium", "متوسطة")}</option>
                <option value="lg">{t("Round", "دائرية")}</option>
                <option value="full">{t("Extra round", "دائرية جداً")}</option>
              </Select>
            </Field>
            <Field label={t("Buttons", "الأزرار")}>
              <Select value={draft.buttons?.style ?? "solid"} onChange={(e) => setTheme({ buttons: { style: e.target.value as "solid" | "outline" | "pill" } })}>
                <option value="solid">{t("Solid", "معبأة")}</option>
                <option value="pill">{t("Pill", "كبسولة")}</option>
                <option value="outline">{t("Outline", "محددة")}</option>
              </Select>
            </Field>
            <Field label={t("Menu layout", "تخطيط المنيو")}>
              <Select value={draft.layout ?? "grid"} onChange={(e) => setTheme({ layout: e.target.value as "grid" | "list" })}>
                <option value="grid">{t("Grid", "شبكة")}</option>
                <option value="list">{t("List", "قائمة")}</option>
              </Select>
            </Field>
            <Field label={t("Header style", "نمط الهيدر")}>
              <Select value={draft.header?.style ?? "classic"} onChange={(e) => setTheme({ header: { ...draft.header, style: e.target.value } })}>
                <option value="classic">{t("Classic", "كلاسيكي")}</option>
                <option value="centered">{t("Centered", "موسّط")}</option>
                <option value="minimal">{t("Minimal", "بسيط")}</option>
              </Select>
            </Field>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <Toggle checked={draft.header?.showSearch !== false} onChange={(v) => setTheme({ header: { ...draft.header, showSearch: v } })} label={t("Search bar", "شريط البحث")} />
              <Toggle checked={draft.header?.sticky !== false} onChange={(v) => setTheme({ header: { ...draft.header, sticky: v } })} label={t("Sticky header", "هيدر ثابت")} />
            </div>
          </Card>

          {/* Branding uploads */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-extrabold">{t("Branding", "الهوية البصرية")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["logoUrl", t("Logo", "الشعار")],
                ["coverUrl", t("Cover image", "صورة الغلاف")],
                ["bannerMobile", t("Mobile banner", "بانر الجوال")],
                ["bannerDesktop", t("Desktop banner", "بانر سطح المكتب")],
              ] as Array<[keyof typeof branding, string]>).map(([k, label]) => (
                <Field key={k} label={label}>
                  <ImageInput
                    value={branding[k]}
                    onChange={(url) => {
                      const next = { ...branding, [k]: url };
                      setBranding(next);
                      persistDraft({ branding: next });
                    }}
                    headers={headers}
                  />
                </Field>
              ))}
            </div>
          </Card>

          {/* Homepage sections (website builder) */}
          <Card className="p-4">
            <h2 className="mb-1 text-sm font-extrabold">{t("Homepage sections", "أقسام الصفحة الرئيسية")}</h2>
            <p className="mb-3 text-[11px] text-[var(--th-muted)]">{t("Reorder and toggle sections of your site", "رتّب وفعّل أقسام موقعك")}</p>
            <div className="space-y-2">
              {sections.map((s, i) => {
                const label = SECTION_LABELS[s.key];
                return (
                  <div key={s.key} className="flex items-center gap-2 rounded-xl border border-black/5 bg-black/[0.02] px-3 py-2">
                    <div className="flex flex-col">
                      <button
                        disabled={i === 0}
                        onClick={() => {
                          const next = [...sections];
                          [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                          setSections(next);
                          persistDraft({ sections: next });
                        }}
                        className="text-[var(--th-muted)] hover:text-[var(--th-primary)] disabled:opacity-20"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        disabled={i === sections.length - 1}
                        onClick={() => {
                          const next = [...sections];
                          [next[i + 1], next[i]] = [next[i]!, next[i + 1]!];
                          setSections(next);
                          persistDraft({ sections: next });
                        }}
                        className="text-[var(--th-muted)] hover:text-[var(--th-primary)] disabled:opacity-20"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                    <span className="flex-1 text-sm font-semibold">{label ? (lang === "ar" ? label[1] : label[0]) : s.key}</span>
                    <Toggle
                      checked={s.enabled}
                      onChange={(v) => {
                        const next = sections.map((x, j) => (j === i ? { ...x, enabled: v } : x));
                        setSections(next);
                        persistDraft({ sections: next });
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Socials + footer */}
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-extrabold">{t("Social links & footer", "روابط التواصل والفوتر")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {SOCIAL_KEYS.map((k) => (
                <Field key={k} label={k}>
                  <Input
                    dir="ltr"
                    value={socials[k] ?? ""}
                    placeholder={`https://${k}.com/…`}
                    onChange={(e) => {
                      const next = { ...socials, [k]: e.target.value };
                      setSocials(next);
                      persistDraft({ socials: next });
                    }}
                  />
                </Field>
              ))}
              <Field label={t("Footer note (AR)", "ملاحظة الفوتر (عربي)")}>
                <Input value={draft.footer?.note_ar ?? ""} onChange={(e) => setTheme({ footer: { ...draft.footer, note_ar: e.target.value } })} />
              </Field>
              <Field label={t("Footer note (EN)", "ملاحظة الفوتر (إنجليزي)")}>
                <Input value={draft.footer?.note_en ?? ""} onChange={(e) => setTheme({ footer: { ...draft.footer, note_en: e.target.value } })} />
              </Field>
            </div>
          </Card>
        </div>

        {/* ── Live preview ── */}
        <div className="xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/5 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--th-muted)]">
                <Eye size={13} /> {t("Live preview", "معاينة حية")}
              </span>
              <Badge tone="info">{t("Draft", "مسودة")}</Badge>
            </div>
            <LivePreview vars={vars} draft={draft} branding={branding} sections={sections} />
          </Card>
          <p className="mt-2 text-center text-[11px] text-[var(--th-muted)]">
            {t("Publishing makes this design live for all customers", "النشر يجعل هذا التصميم مباشراً لجميع العملاء")}
          </p>
        </div>
      </div>
    </div>
  );

  function LivePreview({ vars, draft, branding, sections }: { vars: Record<string, string>; draft: ThemeDoc; branding: { logoUrl: string; coverUrl: string; bannerMobile: string }; sections: HomepageSection[] }) {
    const enabled = useMemo(() => new Set(sections.filter((s) => s.enabled).map((s) => s.key)), [sections]);
    return (
      <div className="max-h-[70vh] overflow-y-auto" style={{ ...(vars as CSSProperties), background: "var(--th-bg)", color: "var(--th-text)", fontFamily: "var(--th-font)" }}>
        {/* hero */}
        <div className="relative h-28 bg-gradient-to-br from-[var(--th-primary)]/40 to-[var(--th-accent)]/40">
          {(branding.bannerMobile || branding.coverUrl) && (
            <img src={branding.bannerMobile || branding.coverUrl} alt="" className="h-full w-full object-cover" />
          )}
          {draft.hero?.overlay !== false && <div className="absolute inset-0 bg-black/20" />}
        </div>
        <div className="px-4 pb-6">
          <div className="-mt-8 flex items-end gap-2">
            <div className="h-16 w-16 overflow-hidden rounded-2xl border-4 border-[var(--th-surface)] bg-[var(--th-surface)] shadow">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt="" className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-black text-[var(--th-primary)]">M</div>
              )}
            </div>
            <div className="pb-1">
              <p className="font-extrabold">{t("Restaurant name", "اسم المطعم")}</p>
              <p className="text-[10px] text-[var(--th-muted)]">{t("Your tagline here", "وصفك المختصر هنا")}</p>
            </div>
          </div>

          {draft.header?.showSearch !== false && (
            <div className="mt-3 rounded-full border border-black/10 bg-[var(--th-surface)] px-4 py-2 text-[11px] text-[var(--th-muted)]">
              🔍 {t("Search dishes…", "ابحث في المنيو…")}
            </div>
          )}

          {enabled.has("categories") && (
            <div className="mt-4 flex gap-2">
              {[t("Grills", "مشاوي"), t("Rice", "أرز"), t("Drinks", "مشروبات")].map((c, i) => (
                <span key={i} className={`rounded-full px-3 py-1 text-[10px] font-bold ${i === 0 ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : "bg-black/5"}`}>{c}</span>
              ))}
            </div>
          )}

          {enabled.has("offers") && (
            <div className="mt-3 rounded-[var(--th-radius)] bg-gradient-to-l from-[var(--th-primary)] to-[var(--th-accent)] p-3 text-white">
              <p className="text-xs font-extrabold">{t("20% off this week 🎉", "خصم 20% هذا الأسبوع 🎉")}</p>
            </div>
          )}

          {enabled.has("featured-products") && (
            <div className="mt-4 space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-[var(--th-radius)] border border-black/5 bg-[var(--th-surface)] p-3">
                  <div>
                    <p className="text-xs font-bold">{t("Signature dish", "الطبق المميز")} {i}</p>
                    <p className="text-[10px] text-[var(--th-muted)]">{t("Delicious description…", "وصف شهي…")}</p>
                    <p className="mt-1 text-xs font-extrabold text-[var(--th-primary)]">35.00 ﷼</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--th-radius)] bg-black/5">🍽</div>
                </div>
              ))}
            </div>
          )}

          {enabled.has("testimonials") && (
            <div className="mt-4 rounded-[var(--th-radius)] border border-black/5 bg-[var(--th-surface)] p-3">
              <p className="text-[10px] font-bold text-amber-500">★★★★★</p>
              <p className="text-[10px] text-[var(--th-muted)]">{t("Amazing food, fast delivery!", "أكل رائع وتوصيل سريع!")}</p>
            </div>
          )}

          <button
            className="mt-4 w-full py-2.5 text-xs font-extrabold"
            style={{
              background: draft.buttons?.style === "outline" ? "transparent" : "var(--th-primary)",
              color: draft.buttons?.style === "outline" ? "var(--th-primary)" : "var(--th-primary-fg)",
              border: draft.buttons?.style === "outline" ? "2px solid var(--th-primary)" : "none",
              borderRadius: "var(--th-btn-radius)",
            }}
          >
            {t("View cart · 3 items", "عرض السلة · 3 أصناف")}
          </button>

          {enabled.has("socials") && (
            <p className="mt-4 text-center text-[10px] font-bold text-[var(--th-primary)]">Instagram · TikTok · WhatsApp</p>
          )}
        </div>
      </div>
    );
  }
}

/** icons referenced for parity */
export const _x = { Check, ExternalLink };
