import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import matAmiLogo from "@assets/لوجو_الموقع_مطعمي_1776635393637.png";

export async function verifyAdminToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/admin/verify", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return false;
    const data = await res.json() as { valid?: boolean };
    return data.valid === true;
  } catch {
    return false;
  }
}

export default function AdminAuth({ onAuth }: { onAuth: (token: string) => void }) {
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { token?: string; error?: string };
      if (!res.ok || !data.token) {
        if (res.status === 429) {
          setError(t("Too many attempts. Try again in 15 minutes.", "محاولات كثيرة جداً. حاول بعد 15 دقيقة."));
        } else {
          setError(t("Incorrect password.", "كلمة المرور غير صحيحة."));
        }
        return;
      }
      sessionStorage.setItem("admin_token", data.token);
      onAuth(data.token);
    } catch {
      setError(t("Connection error. Make sure the server is running.", "خطأ في الاتصال."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <img src={matAmiLogo} alt="Mat'ami" className="h-14 w-14 rounded-2xl object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground">{t("Admin Login", "تسجيل دخول الإدارة")}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t("Enter your password to continue", "أدخل كلمة المرور للمتابعة")}</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card border border-white/5 rounded-2xl p-6 space-y-4">
          <div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder={t("Enter your password", "أدخل كلمة المرور")}
                className="w-full bg-background border border-white/10 rounded-xl px-4 py-3 pr-11 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                data-testid="input-admin-password"
                autoComplete="current-password"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                tabIndex={-1}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                <Lock size={11} /> {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:bg-primary/90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            data-testid="btn-admin-login"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {t("Login", "دخول")}
          </button>
        </form>
      </div>
    </div>
  );
}
