/**
 * POST /api/images/upload  — upload a base64 data URL to Cloudinary (admin only)
 * GET  /api/images/config   — returns { enabled: boolean } so the frontend can know if Cloudinary is live
 */
import { Router } from "express";
import crypto from "crypto";
import { requireAdmin } from "../lib/auth";
import { asyncHandler } from "../lib/validate";
import { logger } from "../lib/logger";

const router = Router();

function getCredentials(): { cloudName: string; apiKey: string; apiSecret: string } | null {
  const cloudName  = process.env["CLOUDINARY_CLOUD_NAME"];
  const apiKey     = process.env["CLOUDINARY_API_KEY"];
  const apiSecret  = process.env["CLOUDINARY_API_SECRET"];

  // Also support legacy CLOUDINARY_URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  if (!cloudName || !apiKey || !apiSecret) {
    const url = process.env["CLOUDINARY_URL"];
    if (url) {
      const m = url.match(/cloudinary:\/\/(\d+):([^@]+)@(.+)/);
      if (m) return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
    }
    return null;
  }

  return { cloudName, apiKey, apiSecret };
}

/** GET /api/cloudinary/config — tells the frontend whether Cloudinary upload is available */
router.get("/cloudinary/config", (_req, res) => {
  res.json({ enabled: getCredentials() !== null });
});

/** POST /api/images/upload — upload processed base64 image to Cloudinary */
router.post("/images/upload", requireAdmin, asyncHandler(async (req, res) => {
  const creds = getCredentials();

  if (!creds) {
    res.status(503).json({
      error: "Cloudinary not configured",
      message: "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET to enable cloud image hosting.",
    });
    return;
  }

  const { data, folder = "matami" } = req.body as { data?: string; folder?: string };

  if (!data || !data.startsWith("data:")) {
    res.status(400).json({ error: "data must be a base64 data URL (data:image/...;base64,...)" });
    return;
  }

  const { cloudName, apiKey, apiSecret } = creds;

  // Build signed upload request (signed API upload — no upload preset required)
  const timestamp = Math.floor(Date.now() / 1000);
  // Parameters must be sorted alphabetically for signature
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(`${paramsToSign}${apiSecret}`)
    .digest("hex");

  const form = new URLSearchParams();
  form.append("file",      data);
  form.append("api_key",   apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder",    folder);

  let uploadRes: Response;
  try {
    uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: form }
    );
  } catch (err) {
    logger.error({ err }, "Network error reaching Cloudinary");
    res.status(502).json({ error: "Could not reach Cloudinary — network error" });
    return;
  }

  if (!uploadRes.ok) {
    const body = await uploadRes.text();
    logger.error({ status: uploadRes.status, body }, "Cloudinary upload rejected");
    res.status(500).json({ error: "Cloudinary upload failed", details: body });
    return;
  }

  const json = await uploadRes.json() as Record<string, unknown>;
  logger.info({ public_id: json["public_id"] }, "Cloudinary upload OK");

  res.json({
    url:       json["secure_url"] as string,
    public_id: json["public_id"] as string,
    width:     json["width"]  as number,
    height:    json["height"] as number,
    format:    json["format"] as string,
  });
}));

export default router;
