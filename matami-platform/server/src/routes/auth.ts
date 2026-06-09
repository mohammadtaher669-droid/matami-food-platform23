/**
 * Authentication for staff (super admin / restaurant users) and customers.
 * Access JWT (15 min) in the Authorization header; rotating refresh token in an
 * httpOnly cookie scoped to /api/auth.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { ApiError, asyncHandler, parse } from "../lib/http";
import { hashPassword, verifyPassword } from "../lib/passwords";
import {
  REFRESH_COOKIE,
  issueRefreshToken,
  refreshCookieOptions,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
  type StaffClaims,
} from "../lib/jwt";
import { requireCustomer, requireStaff } from "../middleware/auth";
import { audit } from "../lib/audit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again later.", code: "rate_limited" },
});

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function staffClaims(user: {
  id: string;
  role: StaffClaims["role"];
  restaurantId: string | null;
  branchId: string | null;
  permissions: string[];
}): StaffClaims {
  return {
    kind: "staff",
    sub: user.id,
    role: user.role,
    restaurantId: user.restaurantId,
    branchId: user.branchId,
    permissions: user.permissions,
  };
}

const publicUser = (u: {
  id: string;
  email: string;
  name: string;
  role: string;
  restaurantId: string | null;
  branchId: string | null;
  permissions: string[];
}) => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  restaurantId: u.restaurantId,
  branchId: u.branchId,
  permissions: u.permissions,
});

// ── Staff ─────────────────────────────────────────────────────────────────────

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(credentialsSchema, req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      throw new ApiError(401, "Incorrect email or password", "bad_credentials");
    }
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const access = signAccessToken(staffClaims(user));
    const refresh = await issueRefreshToken({ userId: user.id }, req.headers["user-agent"] ?? "");
    res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions);
    res.json({ accessToken: access, user: publicUser(user) });
  }),
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const raw = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (!raw) throw new ApiError(401, "No refresh token", "refresh_missing");
    const { next, userId, customerId } = await rotateRefreshToken(raw, req.headers["user-agent"] ?? "");
    res.cookie(REFRESH_COOKIE, next, refreshCookieOptions);

    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isActive) throw new ApiError(401, "Account disabled", "account_disabled");
      res.json({ accessToken: signAccessToken(staffClaims(user)), user: publicUser(user) });
      return;
    }
    if (customerId) {
      const customer = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customer || !customer.isActive) throw new ApiError(401, "Account disabled", "account_disabled");
      res.json({
        accessToken: signAccessToken({ kind: "customer", sub: customer.id }),
        customer: { id: customer.id, name: customer.name, phone: customer.phone, email: customer.email, referralCode: customer.referralCode },
      });
      return;
    }
    throw new ApiError(401, "Orphaned refresh token", "refresh_invalid");
  }),
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const raw = (req.cookies as Record<string, string | undefined>)[REFRESH_COOKIE];
    if (raw) await revokeRefreshToken(raw);
    res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: 0 });
    res.json({ success: true });
  }),
);

router.get(
  "/me",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.claims!.sub } });
    if (!user) throw new ApiError(401, "Account not found", "unauthenticated");
    res.json({ user: publicUser(user) });
  }),
);

router.post(
  "/change-password",
  requireStaff(),
  asyncHandler(async (req, res) => {
    const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });
    const { currentPassword, newPassword } = parse(schema, req.body);
    const user = await prisma.user.findUnique({ where: { id: req.claims!.sub } });
    if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
      throw new ApiError(401, "Current password is incorrect", "bad_credentials");
    }
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(newPassword) } });
    await prisma.refreshToken.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit(req, "user.change_password", "User", user.id);
    res.json({ success: true });
  }),
);

// ── Customers ────────────────────────────────────────────────────────────────

const customerPublic = (c: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  referralCode: string;
}) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, referralCode: c.referralCode });

router.post(
  "/customer/register",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(2).max(80),
      phone: z.string().min(8).max(20).regex(/^[+\d][\d\s-]+$/, "Invalid phone"),
      email: z.string().email().optional(),
      password: z.string().min(8),
      referralCode: z.string().optional(),
    });
    const input = parse(schema, req.body);
    const phone = input.phone.replace(/[\s-]/g, "");

    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) throw new ApiError(409, "Phone already registered", "phone_taken");
    if (input.email) {
      const byEmail = await prisma.customer.findUnique({ where: { email: input.email.toLowerCase() } });
      if (byEmail) throw new ApiError(409, "Email already registered", "email_taken");
    }

    let referredById: string | null = null;
    if (input.referralCode) {
      const referrer = await prisma.customer.findUnique({ where: { referralCode: input.referralCode.toUpperCase() } });
      if (referrer) referredById = referrer.id;
    }

    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        phone,
        email: input.email?.toLowerCase() ?? null,
        passwordHash: await hashPassword(input.password),
        referralCode: crypto.randomBytes(4).toString("hex").toUpperCase(),
        referredById,
      },
    });
    if (referredById) {
      await prisma.referral.create({ data: { referrerId: referredById, referredId: customer.id } });
    }

    const access = signAccessToken({ kind: "customer", sub: customer.id });
    const refresh = await issueRefreshToken({ customerId: customer.id }, req.headers["user-agent"] ?? "");
    res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions);
    res.status(201).json({ accessToken: access, customer: customerPublic(customer) });
  }),
);

router.post(
  "/customer/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const schema = z.object({ phone: z.string().min(8), password: z.string().min(1) });
    const input = parse(schema, req.body);
    const phone = input.phone.replace(/[\s-]/g, "");
    const customer = await prisma.customer.findUnique({ where: { phone } });
    if (!customer || !customer.isActive || !(await verifyPassword(input.password, customer.passwordHash))) {
      throw new ApiError(401, "Incorrect phone or password", "bad_credentials");
    }
    const access = signAccessToken({ kind: "customer", sub: customer.id });
    const refresh = await issueRefreshToken({ customerId: customer.id }, req.headers["user-agent"] ?? "");
    res.cookie(REFRESH_COOKIE, refresh, refreshCookieOptions);
    res.json({ accessToken: access, customer: customerPublic(customer) });
  }),
);

router.get(
  "/customer/me",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.customerClaims!.sub } });
    if (!customer) throw new ApiError(401, "Account not found", "unauthenticated");
    res.json({ customer: customerPublic(customer) });
  }),
);

export default router;
