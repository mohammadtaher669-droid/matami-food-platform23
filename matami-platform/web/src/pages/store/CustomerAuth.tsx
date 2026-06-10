/** Customer login / register form (used as a modal in checkout & account page). */
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { Button, Field, Input, useToast } from "@/components/ui";

export function CustomerAuthForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const { customerLogin, customerRegister } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await customerLogin(phone, password);
      } else {
        await customerRegister({
          name,
          phone,
          password,
          email: email || undefined,
          referralCode: referral || undefined,
        });
      }
      toast(t("Welcome!", "أهلاً بك!"));
      onDone();
    } catch (err) {
      toast(err instanceof Error ? err.message : t("Failed", "فشل"), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2 rounded-full bg-black/5 p-1">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 text-sm font-bold ${mode === m ? "bg-[var(--th-primary)] text-[var(--th-primary-fg)]" : ""}`}
          >
            {m === "login" ? t("Sign in", "دخول") : t("New account", "حساب جديد")}
          </button>
        ))}
      </div>

      {mode === "register" && (
        <Field label={t("Name", "الاسم")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </Field>
      )}
      <Field label={t("Phone", "الجوال")}>
        <Input dir="ltr" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="05xxxxxxxx" />
      </Field>
      {mode === "register" && (
        <Field label={t("Email (optional)", "البريد (اختياري)")}>
          <Input dir="ltr" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      )}
      <Field label={t("Password", "كلمة المرور")} hint={mode === "register" ? t("8+ characters", "8 أحرف على الأقل") : undefined}>
        <Input dir="ltr" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} />
      </Field>
      {mode === "register" && (
        <Field label={t("Referral code (optional)", "كود الإحالة (اختياري)")}>
          <Input dir="ltr" value={referral} onChange={(e) => setReferral(e.target.value.toUpperCase())} className="uppercase" />
        </Field>
      )}

      <Button type="submit" className="w-full" loading={loading}>
        {mode === "login" ? t("Sign in", "تسجيل الدخول") : t("Create account", "إنشاء الحساب")}
      </Button>
    </form>
  );
}
