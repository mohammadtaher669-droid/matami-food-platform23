/**
 * Centralized, validated environment access. No secrets are hardcoded anywhere:
 * production refuses to boot without the critical variables.
 */

const isProd = process.env.NODE_ENV === "production";

function required(name: string, devFallback?: string): string {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (!isProd && devFallback !== undefined) {
    console.warn(`[env] ${name} not set — using insecure dev fallback. NEVER use in production.`);
    return devFallback;
  }
  throw new Error(`[FATAL] Environment variable ${name} is required.`);
}

export const env = {
  isProd,
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: () => required("DATABASE_URL"),
  jwtSecret: () => {
    const s = required("JWT_SECRET", "matami-dev-jwt-secret-only-for-local-use-32+");
    if (isProd && s.length < 32) throw new Error("[FATAL] JWT_SECRET must be at least 32 characters.");
    return s;
  },
  superAdminEmail: () => required("SUPER_ADMIN_EMAIL", "admin@matami.local"),
  superAdminPassword: () => {
    const p = required("SUPER_ADMIN_PASSWORD", "local-dev-password");
    if (isProd && p.length < 8) throw new Error("[FATAL] SUPER_ADMIN_PASSWORD must be at least 8 characters.");
    return p;
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
    get configured() {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
  appUrl: process.env.APP_URL ?? "",
};

export const ACCESS_TOKEN_TTL = "15m";
export const REFRESH_TOKEN_TTL_DAYS = 30;
