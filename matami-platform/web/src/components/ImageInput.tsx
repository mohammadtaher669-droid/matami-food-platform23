/**
 * Image field: uploads to Cloudinary via signed params when configured,
 * otherwise accepts a direct image URL.
 */
import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, X } from "lucide-react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { Input, useToast } from "./ui";

interface SignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export function ImageInput({ value, onChange, headers }: { value: string; onChange: (url: string) => void; headers?: Record<string, string> }) {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const sign = await api<SignResponse>("/api/admin/uploads/sign", { method: "POST", body: {}, scope: "staff", headers });
      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("folder", sign.folder);
      form.append("signature", sign.signature);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as { secure_url: string };
      onChange(data.secure_url);
      toast(t("Image uploaded", "تم رفع الصورة"));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "failed";
      if (msg.includes("Cloudinary is not configured")) {
        setUrlMode(true);
        toast(t("Cloudinary not configured — paste an image URL instead", "Cloudinary غير مهيأ — الصق رابط صورة بدلاً من ذلك"), "error");
      } else {
        toast(msg, "error");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-black/[0.03]">
          {value ? (
            <>
              <img src={value} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => onChange("")}
                className="absolute end-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
              >
                <X size={11} />
              </button>
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-[var(--th-muted)]">
              <ImagePlus size={20} />
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-full bg-[var(--th-primary)]/10 px-3 py-1.5 text-xs font-bold text-[var(--th-primary)] disabled:opacity-50"
          >
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
            {t("Upload", "رفع صورة")}
          </button>
          <button
            type="button"
            onClick={() => setUrlMode((v) => !v)}
            className="flex items-center gap-1.5 rounded-full bg-black/5 px-3 py-1.5 text-xs font-bold"
          >
            <Link2 size={13} /> URL
          </button>
        </div>
      </div>
      {urlMode && (
        <Input dir="ltr" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://…/image.jpg" />
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
