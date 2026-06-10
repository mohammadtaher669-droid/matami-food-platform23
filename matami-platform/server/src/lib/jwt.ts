import crypto from "crypto";
import jwt from "jsonwebtoken";
import { ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL_DAYS, env } from "../env";
import { prisma } from "./prisma";
import { ApiError } from "./http";

export interface StaffClaims {
  kind: "staff";
  sub: string;
  role: "SUPER_ADMIN" | "RESTAURANT_OWNER" | "BRANCH_MANAGER" | "STAFF";
  restaurantId: string | null;
  branchId: string | null;
  permissions: string[];
}

export interface CustomerClaims {
  kind: "customer";
  sub: string;
}

export type Claims = StaffClaims | CustomerClaims;

export function signAccessToken(claims: Claims): string {
  return jwt.sign(claims, env.jwtSecret(), { expiresIn: ACCESS_TOKEN_TTL });
}

export function verifyAccessToken(token: string): Claims {
  try {
    return jwt.verify(token, env.jwtSecret()) as Claims;
  } catch (err) {
    const expired = err instanceof Error && err.name === "TokenExpiredError";
    throw new ApiError(401, expired ? "Session expired" : "Invalid token", expired ? "token_expired" : "token_invalid");
  }
}

// ── Refresh tokens: opaque random values; only SHA-256 hashes stored. ─────────

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function refreshExpiry(): Date {
  return new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function issueRefreshToken(
  owner: { userId?: string; customerId?: string },
  userAgent: string,
  family?: string,
): Promise<string> {
  const raw = crypto.randomBytes(48).toString("base64url");
  await prisma.refreshToken.create({
    data: {
      userId: owner.userId ?? null,
      customerId: owner.customerId ?? null,
      family: family ?? crypto.randomUUID(),
      tokenHash: hashToken(raw),
      expiresAt: refreshExpiry(),
      userAgent: userAgent.slice(0, 250),
    },
  });
  return raw;
}

/**
 * Rotate a refresh token: the presented token is revoked and a new one in the
 * same family is issued. Reuse of an already-revoked token nukes the family
 * (stolen-token defense).
 */
export async function rotateRefreshToken(raw: string, userAgent: string) {
  const row = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!row) throw new ApiError(401, "Invalid refresh token", "refresh_invalid");
  if (row.revokedAt) {
    await prisma.refreshToken.updateMany({
      where: { family: row.family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new ApiError(401, "Refresh token reuse detected", "refresh_reused");
  }
  if (row.expiresAt < new Date()) throw new ApiError(401, "Refresh token expired", "refresh_expired");

  await prisma.refreshToken.update({ where: { id: row.id }, data: { revokedAt: new Date() } });
  const next = await issueRefreshToken(
    { userId: row.userId ?? undefined, customerId: row.customerId ?? undefined },
    userAgent,
    row.family,
  );
  return { next, userId: row.userId, customerId: row.customerId };
}

export async function revokeRefreshToken(raw: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(raw), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export const REFRESH_COOKIE = "matami_refresh";

export const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.isProd,
  path: "/api/auth",
  maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};
