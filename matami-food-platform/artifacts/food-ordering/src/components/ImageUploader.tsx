import { useRef, useState, useEffect } from "react";
import { Upload, Trash2, RefreshCw, ImageOff, Cloud } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { type ImagePreset, IMAGE_PRESETS, PLACEHOLDERS, validateImageFile, processImage } from "@/lib/imageUtils";
import { getAdminToken } from "@/lib/store";

interface Props {
  value?: string;
  onChange: (url: string) => void;
  onDelete?: () => void;
  preset: ImagePreset;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

/** Cached result of /api/images/config so we only fetch once per page load */
let _cloudinaryEnabled: boolean | null = null;
async function isCloudinaryEnabled(): Promise<boolean> {
  if (_cloudinaryEnabled !== null) return _cloudinaryEnabled;
  try {
    const res = await fetch("/api/cloudinary/config", { cache: "no-store" });
    if (!res.ok) { _cloudinaryEnabled = false; return false; }
    const j = await res.json() as { enabled: boolean };
    _cloudinaryEnabled = j.enabled === true;
  } catch {
    _cloudinaryEnabled = false;
  }
  return _cloudinaryEnabled;
}

async function uploadToCloudinary(dataUrl: string, folder: string): Promise<string | null> {
  const token = getAdminToken();
  if (!token) return null;

  try {
    const res = await fetch("/api/images/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ data: dataUrl, folder }),
    });
    if (!res.ok) return null;
    const json = await res.json() as { url?: string };
    return json.url ?? null;
  } catch {
    return null;
  }
}

export default function ImageUploader({
  value,
  onChange,
  onDelete,
  preset,
  label,
  className = "",
  "data-testid": testId,
}: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [imgError, setImgError] = useState(false);
  const [cloudEnabled, setCloudEnabled] = useState<boolean | null>(null);
  const config = IMAGE_PRESETS[preset];

  useEffect(() => {
    isCloudinaryEnabled().then(setCloudEnabled);
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const err = validateImageFile(file);
    if (err) {
      toast({ title: t("Invalid image", "صورة غير صالحة"), description: err, variant: "destructive" });
      return;
    }

    setLoading(true);
    setLoadingText(t("Processing…", "جارٍ المعالجة…"));

    try {
      // Step 1: resize/crop/convert locally
      const dataUrl = await processImage(file, preset);

      // Step 2: upload to Cloudinary via API (if enabled and authenticated)
      const enabled = cloudEnabled ?? await isCloudinaryEnabled();
      const token = getAdminToken();

      if (enabled && token) {
        setLoadingText(t("Uploading to cloud…", "جارٍ الرفع إلى السحابة…"));
        const cloudUrl = await uploadToCloudinary(dataUrl, `matami/${preset}`);

        if (cloudUrl) {
          onChange(cloudUrl);
          setImgError(false);
          toast({
            title: t("Image uploaded", "تم رفع الصورة"),
            description: t("Stored securely on Cloudinary.", "تم التخزين على كلاودينيري."),
          });
          return;
        }

        // Cloudinary returned an error — fall back with a warning
        toast({
          title: t("Cloud upload failed", "فشل رفع السحابة"),
          description: t(
            "Image saved locally as fallback. Re-save to retry cloud upload.",
            "تم حفظ الصورة محليًا احتياطيًا. أعد الحفظ للمحاولة مجددًا."
          ),
          variant: "destructive",
        });
      }

      // Fallback: store as base64 data URL (works but not production-safe for large images)
      onChange(dataUrl);
      setImgError(false);
      if (!enabled) {
        toast({ title: t("Image processed", "تمت معالجة الصورة") });
      }
    } catch {
      toast({
        title: t("Upload failed", "فشل الرفع"),
        description: t("Could not process the image. Please try again.", "تعذّر معالجة الصورة. حاول مرة أخرى."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingText("");
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete();
    setImgError(false);
  };

  const preview = value && !imgError ? value : null;
  const placeholder = PLACEHOLDERS[preset];
  const isCloudUrl = typeof value === "string" && (value.startsWith("https://res.cloudinary.com") || value.startsWith("http://res.cloudinary.com"));

  return (
    <div className={`space-y-2 ${className}`} data-testid={testId}>
      {label && <label className="text-xs text-muted-foreground block">{label}</label>}

      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[10px] text-muted-foreground/70 flex items-center gap-1">
          <ImageOff size={10} />
          {t("Recommended size", "الحجم الموصى به")}:{" "}
          <span className="font-mono text-primary/70">{config.label}</span>
          &nbsp;·&nbsp; JPG / PNG / WebP · {t("max 2 MB", "حد أقصى 2 ميجا")}
        </p>
        {cloudEnabled && (
          <span className="text-[10px] flex items-center gap-0.5 text-emerald-400/80">
            <Cloud size={9} />
            {isCloudUrl ? t("Cloudinary", "كلاودينيري") : t("Cloud ready", "جاهز للسحابة")}
          </span>
        )}
      </div>

      <div
        className="relative group rounded-xl overflow-hidden border border-white/10 bg-background/50"
        style={{ aspectRatio: `${config.width}/${config.height}`, maxHeight: 220 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              >
                <RefreshCw size={22} className="text-primary" />
              </motion.div>
              <span className="text-xs text-muted-foreground">{loadingText}</span>
            </motion.div>
          ) : preview ? (
            <motion.img
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              src={preview}
              alt={t("Image preview", "معاينة الصورة")}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground/40"
            >
              <img src={placeholder} alt="" className="w-1/3 h-1/3 object-contain opacity-60" />
              <span className="text-xs">{t("No image", "لا توجد صورة")}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none" />
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {preview && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-1.5 rounded-lg bg-red-600/90 hover:bg-red-600 text-white transition"
              title={t("Delete image", "حذف الصورة")}
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-medium transition disabled:opacity-50"
            title={preview ? t("Replace image", "استبدال الصورة") : t("Upload image", "رفع صورة")}
          >
            <Upload size={12} />
            {preview ? t("Replace", "استبدال") : t("Upload", "رفع")}
          </button>
        </div>

        {isCloudUrl && (
          <div className="absolute top-2 left-2">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-black/60 text-emerald-400 text-[9px] font-medium">
              <Cloud size={8} /> CDN
            </span>
          </div>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
