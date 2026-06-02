import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const DEV_SECRET = "matami-insecure-dev-secret-change-in-production-32chars";

export function getJwtSecret(): string {
  const secret = process.env["JWT_SECRET"];
  if (!secret || secret.length < 32) {
    if (process.env["NODE_ENV"] === "production") {
      throw new Error(
        "[FATAL] JWT_SECRET must be set in production and be at least 32 characters. " +
        "Generate with: openssl rand -hex 32"
      );
    }
    console.warn("[auth] JWT_SECRET not set or too short — using insecure dev default. NEVER use in production.");
    return DEV_SECRET;
  }
  return secret;
}

export interface AdminTokenPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Express middleware that requires a valid admin JWT.
 * On success, attaches decoded payload to req.adminToken.
 * On failure, returns 401 JSON.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers["authorization"];
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid Authorization header" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as AdminTokenPayload;
    if (payload.role !== "admin") {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    (req as any).adminToken = payload;
    next();
  } catch (err: any) {
    const expired = err?.name === "TokenExpiredError";
    res.status(401).json({
      error: expired ? "Session expired. Please log in again." : "Invalid or malformed token.",
    });
  }
}
