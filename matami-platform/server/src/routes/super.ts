/**
 * Super admin API — platform scope: restaurants, plans, subscriptions, users,
 * theme templates, platform settings, global analytics, revenue, audit logs.
 */
import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { num, prisma } from "../lib/prisma";
import { ApiError, asyncHandler, pagination, parse } from "../lib/http";
import { requireStaff } from "../middleware/auth";
import { hashPassword } from "../lib/passwords";
import { audit } from "../lib/audit";
import { DEFAULT_HOMEPAGE_SECTIONS, THEME_TEMPLATES } from "../lib/themeTemplates";

const router = Router();
router.use(requireStaff("SUPER_ADMIN"));

const bilingual = { name_en: z.string().min(1).max(120), name_ar: z.string().min(1).max(120) };

// ── Restaurants ──────────────────────────────────────────────────────────────

router.get(
  "/restaurants",
  asyncHandler(async (req, res) => {
    const { skip, take, page } = pagination(req, 50);
    const q = String(req.query.q ?? "").trim();
    const where: Prisma.RestaurantWhereInput = q
      ? { OR: [{ name_en: { contains: q, mode: "insensitive" } }, { name_ar: { contains: q } }, { slug: { contains: q } }] }
      : {};
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [restaurants, total] = await Promise.all([
      prisma.restaurant.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          subscriptions: { orderBy: { periodEnd: "desc" }, take: 1, include: { plan: true } },
          branches: { select: { id: true } },
          _count: { select: { orders: { where: { createdAt: { gte: d30 } } }, products: true, users: true } },
        },
      }),
      prisma.restaurant.count({ where }),
    ]);
    res.json({
      page,
      total,
      items: restaurants.map((r) => ({
        id: r.id, slug: r.slug, name_en: r.name_en, name_ar: r.name_ar, logoUrl: r.logoUrl,
        isActive: r.isActive, isFeatured: r.isFeatured, createdAt: r.createdAt,
        branchCount: r.branches.length, orders30d: r._count.orders, products: r._count.products, users: r._count.users,
        subscription: r.subscriptions[0]
          ? { status: r.subscriptions[0].status, periodEnd: r.subscriptions[0].periodEnd, plan_en: r.subscriptions[0].plan.name_en, plan_ar: r.subscriptions[0].plan.name_ar }
          : null,
      })),
    });
  }),
);

const createRestaurantSchema = z.object({
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "lowercase letters, digits and dashes only"),
  ...bilingual,
  description_en: z.string().max(1000).default(""),
  description_ar: z.string().max(1000).default(""),
  phone: z.string().max(20).default(""),
  whatsapp: z.string().max(20).default(""),
  currency: z.string().length(3).default("SAR"),
  vatRate: z.number().min(0).max(100).default(15),
  templateKey: z.string().default("traditional-arabic"),
  owner: z.object({ email: z.string().email(), name: z.string().min(2).max(80), password: z.string().min(8) }),
  planId: z.string().min(1),
  firstBranch: z.object({ ...bilingual, lat: z.number().nullable().optional(), lng: z.number().nullable().optional() }).optional(),
});

router.post(
  "/restaurants",
  asyncHandler(async (req, res) => {
    const input = parse(createRestaurantSchema, req.body);
    const [slugTaken, emailTaken, plan, template] = await Promise.all([
      prisma.restaurant.findUnique({ where: { slug: input.slug } }),
      prisma.user.findUnique({ where: { email: input.owner.email.toLowerCase() } }),
      prisma.plan.findUnique({ where: { id: input.planId } }),
      prisma.themeTemplate.findUnique({ where: { key: input.templateKey } }),
    ]);
    if (slugTaken) throw new ApiError(409, "Slug already in use", "slug_taken");
    if (emailTaken) throw new ApiError(409, "Owner email already in use", "email_taken");
    if (!plan) throw new ApiError(400, "Unknown plan", "bad_plan");

    const themeDoc = (template?.document ?? THEME_TEMPLATES[0]!.document) as object;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);

    const restaurant = await prisma.$transaction(async (tx) => {
      const r = await tx.restaurant.create({
        data: {
          slug: input.slug,
          name_en: input.name_en,
          name_ar: input.name_ar,
          description_en: input.description_en,
          description_ar: input.description_ar,
          phone: input.phone,
          whatsapp: input.whatsapp,
          currency: input.currency,
          vatRate: input.vatRate,
          theme: themeDoc,
          themeDraft: themeDoc,
          homepage: DEFAULT_HOMEPAGE_SECTIONS as unknown as object,
        },
      });
      await tx.user.create({
        data: {
          email: input.owner.email.toLowerCase(),
          name: input.owner.name,
          passwordHash: await hashPassword(input.owner.password),
          role: "RESTAURANT_OWNER",
          restaurantId: r.id,
        },
      });
      await tx.subscription.create({
        data: {
          restaurantId: r.id,
          planId: plan.id,
          status: "TRIAL",
          periodStart: now,
          periodEnd: trialEnd,
          trialEndsAt: trialEnd,
        },
      });
      if (input.firstBranch) {
        await tx.branch.create({ data: { ...input.firstBranch, restaurantId: r.id } });
      }
      return r;
    });

    await audit(req, "Restaurant.create", "Restaurant", restaurant.id, { slug: restaurant.slug });
    res.status(201).json({ item: { id: restaurant.id, slug: restaurant.slug } });
  }),
);

router.put(
  "/restaurants/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name_en: z.string().min(1).max(120).optional(),
      name_ar: z.string().min(1).max(120).optional(),
      isActive: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      vatRate: z.number().min(0).max(100).optional(),
      currency: z.string().length(3).optional(),
    });
    const input = parse(schema, req.body);
    const r = await prisma.restaurant.findUnique({ where: { id: String(req.params.id) } });
    if (!r) throw new ApiError(404, "Restaurant not found", "not_found");
    await prisma.restaurant.update({ where: { id: r.id }, data: input });
    await audit(req, "Restaurant.update", "Restaurant", r.id, input as Record<string, unknown>);
    res.json({ success: true });
  }),
);

router.get(
  "/restaurants/:id/branches",
  asyncHandler(async (req, res) => {
    const branches = await prisma.branch.findMany({
      where: { restaurantId: String(req.params.id) },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { zones: true, orders: true } } },
    });
    res.json({ items: branches });
  }),
);

// ── Plans ────────────────────────────────────────────────────────────────────

const planSchema = z.object({
  ...bilingual,
  price: z.number().min(0),
  interval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  trialDays: z.number().int().min(0).default(14),
  maxBranches: z.number().int().min(1).default(1),
  maxProducts: z.number().int().min(1).default(100),
  maxStaff: z.number().int().min(1).default(5),
  features: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

router.get(
  "/plans",
  asyncHandler(async (_req, res) => {
    const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { subscriptions: true } } } });
    res.json({ items: plans.map((p) => ({ ...p, price: num(p.price) })) });
  }),
);

router.post(
  "/plans",
  asyncHandler(async (req, res) => {
    const input = parse(planSchema, req.body);
    const plan = await prisma.plan.create({ data: { ...input, features: input.features as object } });
    await audit(req, "Plan.create", "Plan", plan.id);
    res.status(201).json({ item: { ...plan, price: num(plan.price) } });
  }),
);

router.put(
  "/plans/:id",
  asyncHandler(async (req, res) => {
    const input = parse(planSchema.partial(), req.body);
    const plan = await prisma.plan.update({
      where: { id: String(req.params.id) },
      data: { ...input, features: input.features as object | undefined },
    });
    await audit(req, "Plan.update", "Plan", plan.id);
    res.json({ item: { ...plan, price: num(plan.price) } });
  }),
);

// ── Subscriptions ────────────────────────────────────────────────────────────

router.get(
  "/subscriptions",
  asyncHandler(async (req, res) => {
    const { skip, take, page } = pagination(req, 50);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const where: Prisma.SubscriptionWhereInput = status ? { status: status as Prisma.EnumSubscriptionStatusFilter["equals"] } : {};
    const [subs, total, revenue] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: "desc" },
        include: { plan: true, restaurant: { select: { slug: true, name_en: true, name_ar: true, logoUrl: true } } },
      }),
      prisma.subscription.count({ where }),
      prisma.subscription.aggregate({ _sum: { pricePaid: true } }),
    ]);
    res.json({
      page,
      total,
      totalRevenue: num(revenue._sum.pricePaid),
      items: subs.map((s) => ({
        id: s.id, status: s.status, periodStart: s.periodStart, periodEnd: s.periodEnd,
        trialEndsAt: s.trialEndsAt, pricePaid: num(s.pricePaid), notes: s.notes,
        plan: { id: s.plan.id, name_en: s.plan.name_en, name_ar: s.plan.name_ar, price: num(s.plan.price), interval: s.plan.interval },
        restaurant: s.restaurant,
      })),
    });
  }),
);

router.post(
  "/subscriptions/:id/renew",
  asyncHandler(async (req, res) => {
    const schema = z.object({ months: z.number().int().min(1).max(24).default(1), pricePaid: z.number().min(0), notes: z.string().max(300).default("") });
    const input = parse(schema, req.body);
    const sub = await prisma.subscription.findUnique({ where: { id: String(req.params.id) } });
    if (!sub) throw new ApiError(404, "Subscription not found", "not_found");
    const base = sub.periodEnd > new Date() ? sub.periodEnd : new Date();
    const periodEnd = new Date(base);
    periodEnd.setMonth(periodEnd.getMonth() + input.months);
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "ACTIVE",
        periodEnd,
        pricePaid: { increment: input.pricePaid },
        notes: input.notes || sub.notes,
        canceledAt: null,
      },
    });
    await audit(req, "Subscription.renew", "Subscription", sub.id, { months: input.months, pricePaid: input.pricePaid });
    res.json({ item: { id: updated.id, status: updated.status, periodEnd: updated.periodEnd } });
  }),
);

router.post(
  "/subscriptions/:id/cancel",
  asyncHandler(async (req, res) => {
    const sub = await prisma.subscription.findUnique({ where: { id: String(req.params.id) } });
    if (!sub) throw new ApiError(404, "Subscription not found", "not_found");
    await prisma.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED", canceledAt: new Date() } });
    await audit(req, "Subscription.cancel", "Subscription", sub.id);
    res.json({ success: true });
  }),
);

// ── Users (platform-wide) ────────────────────────────────────────────────────

router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { skip, take, page } = pagination(req, 50);
    const q = String(req.query.q ?? "").trim();
    const where: Prisma.UserWhereInput = q
      ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] }
      : {};
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        select: {
          id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true,
          restaurant: { select: { slug: true, name_en: true, name_ar: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ page, total, items: users });
  }),
);

router.put(
  "/users/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({ isActive: z.boolean().optional(), password: z.string().min(8).optional(), name: z.string().min(2).optional() });
    const input = parse(schema, req.body);
    const target = await prisma.user.findUnique({ where: { id: String(req.params.id) } });
    if (!target) throw new ApiError(404, "User not found", "not_found");
    if (target.role === "SUPER_ADMIN" && input.isActive === false) {
      const otherActive = await prisma.user.count({ where: { role: "SUPER_ADMIN", isActive: true, id: { not: target.id } } });
      if (otherActive === 0) throw new ApiError(400, "Cannot deactivate the last super admin", "last_super_admin");
    }
    const data: Record<string, unknown> = { isActive: input.isActive, name: input.name };
    if (input.password) data.passwordHash = await hashPassword(input.password);
    await prisma.user.update({ where: { id: target.id }, data });
    await audit(req, "User.update", "User", target.id);
    res.json({ success: true });
  }),
);

// ── Theme templates ──────────────────────────────────────────────────────────

router.get(
  "/themes",
  asyncHandler(async (_req, res) => {
    const templates = await prisma.themeTemplate.findMany({ orderBy: { sortOrder: "asc" } });
    res.json({ items: templates });
  }),
);

router.put(
  "/themes/:id",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name_en: z.string().min(1).optional(),
      name_ar: z.string().min(1).optional(),
      previewUrl: z.string().max(500).optional(),
      document: z.record(z.unknown()).optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    });
    const input = parse(schema, req.body);
    const t = await prisma.themeTemplate.update({
      where: { id: String(req.params.id) },
      data: { ...input, document: input.document as object | undefined },
    });
    await audit(req, "ThemeTemplate.update", "ThemeTemplate", t.id);
    res.json({ item: t });
  }),
);

// ── Platform settings ────────────────────────────────────────────────────────

router.get(
  "/settings",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.platformSetting.findUnique({ where: { id: 1 } });
    res.json({ data: settings?.data ?? {} });
  }),
);

router.put(
  "/settings",
  asyncHandler(async (req, res) => {
    const data = parse(z.record(z.unknown()), req.body);
    await prisma.platformSetting.upsert({
      where: { id: 1 },
      create: { id: 1, data: data as object },
      update: { data: data as object },
    });
    await audit(req, "PlatformSetting.update", "PlatformSetting", "1");
    res.json({ success: true });
  }),
);

// ── Global analytics & revenue ───────────────────────────────────────────────

router.get(
  "/analytics",
  asyncHandler(async (req, res) => {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [orders, activeRestaurants, totalRestaurants, totalCustomers, subRevenue, byRestaurant, subsByPlan] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: since }, status: { not: "CANCELED" } },
        select: { createdAt: true, total: true, restaurantId: true },
      }),
      prisma.restaurant.count({
        where: { isActive: true, subscriptions: { some: { status: { in: ["TRIAL", "ACTIVE"] }, periodEnd: { gte: new Date() } } } },
      }),
      prisma.restaurant.count(),
      prisma.customer.count(),
      prisma.subscription.aggregate({ _sum: { pricePaid: true } }),
      prisma.order.groupBy({
        by: ["restaurantId"],
        where: { createdAt: { gte: since }, status: { not: "CANCELED" } },
        _count: true,
        _sum: { total: true },
        orderBy: { _sum: { total: "desc" } },
        take: 15,
      }),
      prisma.subscription.groupBy({ by: ["planId", "status"], _count: true, _sum: { pricePaid: true } }),
    ]);

    const byDay = new Map<string, { gmv: number; orders: number }>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { gmv: 0, orders: 0 };
      cur.gmv += num(o.total);
      cur.orders += 1;
      byDay.set(key, cur);
    }

    const restaurantNames = await prisma.restaurant.findMany({
      where: { id: { in: byRestaurant.map((b) => b.restaurantId) } },
      select: { id: true, slug: true, name_en: true, name_ar: true },
    });
    const nameMap = new Map(restaurantNames.map((r) => [r.id, r]));
    const plans = await prisma.plan.findMany({ select: { id: true, name_en: true, name_ar: true } });
    const planMap = new Map(plans.map((p) => [p.id, p]));

    res.json({
      days,
      kpis: {
        gmv: Math.round(orders.reduce((s, o) => s + num(o.total), 0) * 100) / 100,
        orders: orders.length,
        activeRestaurants,
        totalRestaurants,
        totalCustomers,
        subscriptionRevenue: num(subRevenue._sum.pricePaid),
      },
      gmvByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      topRestaurants: byRestaurant.map((b) => ({
        restaurant: nameMap.get(b.restaurantId) ?? null,
        orders: b._count,
        gmv: num(b._sum.total),
      })),
      revenueByPlan: subsByPlan.map((s) => ({
        plan: planMap.get(s.planId) ?? null,
        status: s.status,
        count: s._count,
        revenue: num(s._sum.pricePaid),
      })),
    });
  }),
);

// ── Audit logs ───────────────────────────────────────────────────────────────

router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { skip, take, page } = pagination(req, 50);
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { email: true, name: true, role: true } },
          restaurant: { select: { slug: true, name_en: true } },
        },
      }),
      prisma.auditLog.count(),
    ]);
    res.json({ page, total, items: logs });
  }),
);

export default router;
