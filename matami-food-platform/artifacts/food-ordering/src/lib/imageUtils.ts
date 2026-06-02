export type ImagePreset = "hero_banner" | "category_icon" | "product" | "restaurant_cover" | "thumbnail" | "offer";

export interface ImagePresetConfig {
  width: number;
  height: number;
  label: string;
}

function getImageQuality(): number {
  try {
    const raw = localStorage.getItem("app:settings");
    if (!raw) return 0.80;
    const s = JSON.parse(raw) as { image_quality?: number };
    if (typeof s.image_quality === "number" && s.image_quality >= 60 && s.image_quality <= 100) {
      return s.image_quality / 100;
    }
  } catch { /* ignore */ }
  return 0.80;
}

export const IMAGE_PRESETS: Record<ImagePreset, ImagePresetConfig> = {
  hero_banner:       { width: 900,  height: 300,  label: "900 × 300 px"  },
  category_icon:     { width: 200,  height: 200,  label: "200 × 200 px"  },
  product:           { width: 400,  height: 400,  label: "400 × 400 px"  },
  restaurant_cover:  { width: 900,  height: 450,  label: "900 × 450 px"  },
  thumbnail:         { width: 150,  height: 150,  label: "150 × 150 px"  },
  offer:             { width: 400,  height: 400,  label: "400 × 400 px"  },
};

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG, or WebP images are allowed.";
  if (file.size > MAX_BYTES) return `Image is too large. Maximum size is 2 MB (this file is ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  return null;
}

function canEncodeWebP(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1; canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export async function processImage(file: File, preset: ImagePreset): Promise<string> {
  const { width: targetW, height: targetH } = IMAGE_PRESETS[preset];
  const webpSupported = canEncodeWebP();

  const objectUrl = URL.createObjectURL(file);

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const img = new window.Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;
        const srcRatio = srcW / srcH;
        const tgtRatio = targetW / targetH;

        let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH;
        if (srcRatio > tgtRatio) {
          cropW = Math.round(srcH * tgtRatio);
          cropX = Math.round((srcW - cropW) / 2);
        } else {
          cropH = Math.round(srcW / tgtRatio);
          cropY = Math.round((srcH - cropH) / 2);
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

        const quality = getImageQuality();
        if (webpSupported) {
          const webpUrl = canvas.toDataURL("image/webp", quality);
          if (webpUrl.startsWith("data:image/webp")) {
            resolve(webpUrl);
            return;
          }
        }

        const jpegUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(jpegUrl);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Failed to load image."));
      };

      img.src = objectUrl;
    });

    return dataUrl;
  } catch {
    URL.revokeObjectURL(objectUrl);
    return readFileAsDataUrl(file);
  }
}

export function makePlaceholderSvg(w: number, h: number, icon = "🍽️"): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="${w}" height="${h}" fill="#1a1a2e"/>
    <text x="50%" y="50%" font-size="${Math.min(w, h) * 0.35}" text-anchor="middle" dominant-baseline="middle">${icon}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const PLACEHOLDERS: Record<ImagePreset, string> = {
  hero_banner:      makePlaceholderSvg(900, 300, "🎉"),
  category_icon:    makePlaceholderSvg(200, 200, "🍴"),
  product:          makePlaceholderSvg(400, 400, "🍽️"),
  restaurant_cover: makePlaceholderSvg(900, 450, "🏪"),
  thumbnail:        makePlaceholderSvg(150, 150, "🍽️"),
  offer:            makePlaceholderSvg(400, 400, "🎁"),
};
