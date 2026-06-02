import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, MessageCircle, CheckCircle, XCircle, Phone, Globe, TestTube } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { branchStore, restaurantStore } from "@/lib/store";
import { useStore } from "@/hooks/useStore";
import { getWhatsAppSettings, saveWhatsAppSettings, validateWhatsAppNumber, formatWhatsAppNumber } from "@/lib/whatsappSettings";
import { useToast } from "@/hooks/use-toast";

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          {icon}
        </div>
        <h2 className="font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ChangePasswordSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!current) errs.current = t("Required", "مطلوب");
    if (!next) errs.next = t("Required", "مطلوب");
    else if (next.length < 6) errs.next = t("Must be at least 6 characters", "يجب أن يكون 6 أحرف على الأقل");
    if (!confirm) errs.confirm = t("Required", "مطلوب");
    else if (next !== confirm) errs.confirm = t("Passwords do not match", "كلمتا المرور غير متطابقتين");
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const token = sessionStorage.getItem("admin_token") || "";
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        if (data.error?.toLowerCase().includes("current")) {
          setErrors({ current: t("Current password is incorrect", "كلمة المرور الحالية غير صحيحة") });
        } else {
          toast({ title: data.error || t("Failed to change password", "فشل تغيير كلمة المرور"), variant: "destructive" });
        }
        return;
      }
      setCurrent(""); setNext(""); setConfirm("");
      toast({ title: t("Password changed successfully", "تم تغيير كلمة المرور بنجاح") });
    } catch {
      toast({ title: t("Connection error", "خطأ في الاتصال"), variant: "destructive" });
    }
  };

  const fields = [
    { id: "current", label: t("Current password", "كلمة المرور الحالية"), value: current, onChange: setCurrent, show: showCurrent, toggleShow: () => setShowCurrent(v => !v) },
    { id: "next", label: t("New password", "كلمة المرور الجديدة"), value: next, onChange: setNext, show: showNext, toggleShow: () => setShowNext(v => !v) },
    { id: "confirm", label: t("Confirm new password", "تأكيد كلمة المرور الجديدة"), value: confirm, onChange: setConfirm, show: showConfirm, toggleShow: () => setShowConfirm(v => !v) },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.id}>
          <label className="text-xs text-muted-foreground mb-1.5 block">{f.label}</label>
          <div className="relative">
            <input
              type={f.show ? "text" : "password"}
              value={f.value}
              onChange={(e) => { f.onChange(e.target.value); setErrors(prev => ({ ...prev, [f.id]: "" })); }}
              placeholder={t("Enter your password", "أدخل كلمة المرور")}
              className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
              data-testid={`input-pw-${f.id}`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={f.toggleShow}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
              tabIndex={-1}
            >
              {f.show ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
          {errors[f.id] && <p className="text-xs text-destructive mt-1">{errors[f.id]}</p>}
        </div>
      ))}
      <button
        onClick={handleSave}
        className="w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
        data-testid="btn-save-password"
      >
        {t("Change Password", "تغيير كلمة المرور")}
      </button>
    </div>
  );
}

function GlobalWhatsAppSection() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const settings = getWhatsAppSettings();
  const [number, setNumber] = useState(settings.global || "");
  const [error, setError] = useState("");

  const handleSave = () => {
    const cleaned = formatWhatsAppNumber(number.trim());
    if (cleaned && !validateWhatsAppNumber(cleaned)) {
      setError(t("Invalid number. Include country code (e.g. 966501234567)", "رقم غير صالح. أضف رمز الدولة (مثل 966501234567)"));
      return;
    }
    setError("");
    const updated = { ...getWhatsAppSettings(), global: cleaned };
    saveWhatsAppSettings(updated);
    toast({ title: t("Global WhatsApp saved", "تم حفظ رقم واتساب الدعم") });
  };

  const handleTest = () => {
    const cleaned = formatWhatsAppNumber(number.trim());
    if (!cleaned) return;
    const msg = encodeURIComponent("Test message from system");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {t("This number is used for customer support and the 'Contact Us' button visible on the site.", "يُستخدم هذا الرقم للدعم وزر 'تواصل معنا' المرئي على الموقع.")}
      </p>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">{t("Global WhatsApp Number", "رقم واتساب الدعم")}</label>
        <input
          type="tel"
          value={number}
          onChange={(e) => { setNumber(e.target.value); setError(""); }}
          placeholder="966501234567"
          className="w-full bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
          data-testid="input-global-whatsapp"
        />
        {error && <p className="text-xs text-destructive mt-1">{error}</p>}
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition"
          data-testid="btn-save-global-whatsapp"
        >
          {t("Save", "حفظ")}
        </button>
        {number && (
          <button
            onClick={handleTest}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-green-600/15 text-green-400 border border-green-500/20 rounded-xl text-sm font-medium hover:bg-green-600/20 transition"
            data-testid="btn-test-global-whatsapp"
          >
            <TestTube size={14} />
            {t("Test", "اختبار")}
          </button>
        )}
      </div>
    </div>
  );
}

function BranchWhatsAppRow({ branchId, branchName, defaultNumber }: { branchId: string; branchName: string; defaultNumber: string }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const settings = getWhatsAppSettings();
  const branchSetting = settings.branches[branchId];
  const [number, setNumber] = useState(branchSetting?.number ?? defaultNumber ?? "");
  const [active, setActive] = useState(branchSetting?.active ?? true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const handleSave = () => {
    const cleaned = formatWhatsAppNumber(number.trim());
    if (cleaned && !validateWhatsAppNumber(cleaned)) {
      setError(t("Invalid number. Include country code.", "رقم غير صالح. أضف رمز الدولة."));
      return;
    }
    setError("");
    const updated = getWhatsAppSettings();
    updated.branches[branchId] = { number: cleaned, active };
    saveWhatsAppSettings(updated);
    setEditing(false);
    toast({ title: t("WhatsApp number saved", "تم حفظ رقم واتساب") });
  };

  const handleToggleActive = () => {
    const newActive = !active;
    setActive(newActive);
    const updated = getWhatsAppSettings();
    updated.branches[branchId] = { number: branchSetting?.number ?? defaultNumber ?? "", active: newActive };
    saveWhatsAppSettings(updated);
    toast({ title: newActive ? t("WhatsApp enabled", "واتساب مفعّل") : t("WhatsApp disabled", "واتساب معطّل") });
  };

  const handleTest = () => {
    const cleaned = formatWhatsAppNumber(number.trim());
    if (!cleaned) return;
    const msg = encodeURIComponent("Test message from system");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  return (
    <div className="bg-background rounded-xl border border-white/5 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? "bg-green-400" : "bg-muted-foreground/30"}`} />
          <span className="text-sm font-medium text-foreground truncate">{branchName}</span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleToggleActive}
            className={`text-xs px-2.5 py-1 rounded-lg border transition ${active ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-white/10 text-muted-foreground"}`}
            data-testid={`btn-toggle-branch-wa-${branchId}`}
          >
            {active ? <CheckCircle size={12} className="inline mr-1" /> : <XCircle size={12} className="inline mr-1" />}
            {active ? t("Active", "مفعّل") : t("Inactive", "معطّل")}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="space-y-2">
          <input
            type="tel"
            value={number}
            onChange={(e) => { setNumber(e.target.value); setError(""); }}
            placeholder="966501234567"
            className="w-full bg-card border border-white/10 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
            data-testid={`input-branch-wa-${branchId}`}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold transition hover:bg-primary/90">
              {t("Save", "حفظ")}
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 border border-white/10 rounded-lg text-xs text-muted-foreground hover:text-foreground transition">
              {t("Cancel", "إلغاء")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground font-mono">
            {number || <span className="italic text-xs">{t("No number set", "لم يُضف رقم")}</span>}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground transition"
              data-testid={`btn-edit-branch-wa-${branchId}`}
            >
              {t("Edit", "تعديل")}
            </button>
            {number && (
              <button
                onClick={handleTest}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-600/10 border border-green-500/20 text-green-400 hover:bg-green-600/15 transition flex items-center gap-1"
                data-testid={`btn-test-branch-wa-${branchId}`}
              >
                <TestTube size={11} />
                {t("Test", "اختبار")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BranchWhatsAppSection() {
  const { t } = useLanguage();
  const restaurants = useStore(useCallback(() => restaurantStore.getAll(), []));
  const branches = useStore(useCallback(() => branchStore.getAll(), []));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {t("Manage WhatsApp numbers per branch. Orders go to the branch number if active.", "إدارة أرقام واتساب لكل فرع. تذهب الطلبات لرقم الفرع إذا كان مفعّلاً.")}
      </p>
      {restaurants.map((restaurant) => {
        const restBranches = branches.filter((b) => b.restaurant_id === restaurant.id);
        if (restBranches.length === 0) return null;
        return (
          <div key={restaurant.id}>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              {t(restaurant.name_en, restaurant.name_ar)}
            </p>
            <div className="space-y-2">
              {restBranches.map((branch) => (
                <BranchWhatsAppRow
                  key={branch.id}
                  branchId={branch.id}
                  branchName={t(branch.name_en, branch.name_ar)}
                  defaultNumber={branch.whatsapp || ""}
                />
              ))}
            </div>
          </div>
        );
      })}
      {branches.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t("No branches added yet.", "لم تُضف فروع بعد.")}
        </p>
      )}
    </div>
  );
}

export default function AdminSettings() {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-foreground mb-1">{t("Settings", "الإعدادات")}</h1>
        <p className="text-sm text-muted-foreground">{t("Security and communication settings", "إعدادات الأمان والتواصل")}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <SectionCard title={t("🔐 Change Password", "🔐 تغيير كلمة المرور")} icon={<Lock size={16} />}>
          <ChangePasswordSection />
        </SectionCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionCard title={t("📞 Global Support WhatsApp", "📞 واتساب الدعم العام")} icon={<Globe size={16} />}>
          <GlobalWhatsAppSection />
        </SectionCard>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <SectionCard title={t("📱 Branch WhatsApp Numbers", "📱 أرقام واتساب الفروع")} icon={<Phone size={16} />}>
          <BranchWhatsAppSection />
        </SectionCard>
      </motion.div>
    </div>
  );
}
