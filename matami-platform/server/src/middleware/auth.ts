import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ApiError } from "../lib/http";
import { verifyAccessToken, type Claims, type CustomerClaims, type StaffClaims } from "../lib/jwt";
import { hasPermission, type Permission } from "../lib/rbac";
import { prisma } from "../lib/prisma";

declare module "express-serve-static-core" {
  interface Request {
    claims?: StaffClaims;
    customerClaims?: CustomerClaims;
  }
}

function extractClaims(req: Request): Claims | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  return verifyAccessToken(header.slice(7));
}

/** Staff/admin authentication with optional role restriction. */
export function requireStaff(...roles: StaffClaims["role"][]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const claims = extractClaims(req);
    if (!claims || claims.kind !== "staff") return next(new ApiError(401, "Authentication required", "unauthenticated"));
    if (roles.length > 0 && !roles.includes(claims.role)) {
      return next(new ApiError(403, "Insufficient role", "forbidden"));
    }
    req.claims = claims;
    next();
  };
}

/** Restaurant-panel guard: any staff role bound to a tenant. */
export const requireTenantStaff: RequestHandler = (req, _res, next) => {
  const claims = extractClaims(req);
  if (!claims || claims.kind !== "staff") return next(new ApiError(401, "Authentication required", "unauthenticated"));
  if (claims.role === "SUPER_ADMIN") {
    // Super admin may operate on a tenant by providing X-Restaurant-Id.
    const rid = req.headers["x-restaurant-id"];
    if (typeof rid !== "string" || rid.length === 0) {
      return next(new ApiError(400, "X-Restaurant-Id header required for super admin tenant access", "tenant_required"));
    }
    req.claims = { ...claims, restaurantId: rid };
    return next();
  }
  if (!claims.restaurantId) return next(new ApiError(403, "No tenant bound to this account", "forbidden"));
  req.claims = claims;
  next();
};

/** Permission check on top of requireTenantStaff. */
export function requirePermission(perm: Permission): RequestHandler {
  return (req, _res, next) => {
    const c = req.claims;
    if (!c) return next(new ApiError(401, "Authentication required", "unauthenticated"));
    if (!hasPermission(c.role, c.permissions, perm)) {
      return next(new ApiError(403, `Missing permission: ${perm}`, "forbidden"));
    }
    next();
  };
}

/** Tenant id for the current restaurant-panel request. */
export function tenantId(req: Request): string {
  const id = req.claims?.restaurantId;
  if (!id) throw new ApiError(403, "No tenant in scope", "forbidden");
  return id;
}

export const requireCustomer: RequestHandler = (req, _res, next) => {
  const claims = extractClaims(req);
  if (!claims || claims.kind !== "customer") {
    return next(new ApiError(401, "Customer login required", "unauthenticated"));
  }
  req.customerClaims = claims;
  next();
};

/** Like requireCustomer but tolerant — guest checkout stays possible. */
export const optionalCustomer: RequestHandler = (req, _res, next) => {
  try {
    const claims = extractClaims(req);
    if (claims?.kind === "customer") req.customerClaims = claims;
  } catch {
    // invalid/expired token on a public route → treat as guest
  }
  next();
};

/** Storefront ordering is blocked when the tenant has no usable subscription. */
export async function assertActiveSubscription(restaurantId: string): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { restaurantId, status: { in: ["TRIAL", "ACTIVE"] }, periodEnd: { gte: new Date() } },
    orderBy: { periodEnd: "desc" },
  });
  if (!sub) throw new ApiError(402, "Restaurant subscription is not active", "subscription_required");
}
