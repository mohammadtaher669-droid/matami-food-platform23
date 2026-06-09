/**
 * Restaurant admin panel API. Every route is tenant-scoped: restaurantId comes
 * from the JWT (or X-Restaurant-Id for super admins) — never from the body.
 */
import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { v2 as cloudinary } from "cloudinary";
import { num, prisma } from "../lib/prisma";
import { ApiError, asyncHandler, pagination, parse } from "../lib/http";
import { requirePermission, requireTenantStaff, tenantId } from "../middleware/auth";
import { audit } from "../lib/audit";
import { PERMISSIONS } from "../lib/rbac";
import { hashPassword } from "../lib/passwords";
import { env } from "../env";

const router = Router();
router.use(requireTenantStaff);

const ORDER_STATUSES = ["NEW", "ACCEPTED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"] as const;
const VALID_TRANSITIONS: Record<string, string[]> = {
  NEW: ["ACCEPTED", "CANCELED"],
  ACCEPTED: ["PREPARING", "CANCELED"],
  PREPARING: ["READY", "CANCELED"],
  READY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "CANCELED"],
  DELIVERED: [],
  CANCELED: [],
};

// ── Dashboard ────────────────────────────────────────────────────────────────

router.get(
  "/dashboard",
  requirePermission("reports.view"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [todayAgg, todayOrders, newOrders, sales30, topProducts, recentOrders, customerCount] = await Promise.all([
      prisma.order.aggregate({
        where: { restaurantId: rid, createdAt: { gte: startOfDay }, status: { not: "CANCELED" } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.order.count({ where: { restaurantId: rid, createdAt: { gte: startOfDay } } }),
      prisma.order.count({ where: { restaurantId: rid, status: "NEW" } }),
      prisma.order.findMany({
        where: { restaurantId: rid, createdAt: { gte: d30 }, status: { not: "CANCELED" } },
        select: { createdAt: true, total: true },
      }),
      prisma.orderItem.groupBy({
        by: ["name_en", "name_ar"],
        where: { order: { restaurantId: rid, createdAt: { gte: d30 }, status: { not: "CANCELED" } } },
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { qty: "desc" } },
        take: 8,
      }),
      prisma.order.findMany({
        where: { restaurantId: rid },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { orderNo: true, status: true, total: true, customerName: true, createdAt: true, type: true },
      }),
      prisma.order.groupBy({ by: ["customerPhone"], where: { restaurantId: rid, createdAt: { gte: d30 } } }).then((g) => g.length),
    ]);

    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const o of sales30) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += num(o.total);
      cur.orders += 1;
      byDay.set(key, cur);
    }

    const revenueToday = num(todayAgg._sum.total);
    res.json({
      kpis: {
        revenueToday,
        ordersToday: todayOrders,
        avgOrderValue: todayAgg._count ? Math.round((revenueToday / todayAgg._count) * 100) / 100 : 0,
        newOrders,
        customers30d: customerCount,
      },
      salesByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      topProducts: topProducts.map((p) => ({
        name_en: p.name_en, name_ar: p.name_ar, qty: p._sum.qty ?? 0, revenue: num(p._sum.lineTotal),
      })),
      recentOrders: recentOrders.map((o) => ({ ...o, total: num(o.total) })),
    });
  }),
);

// ── Orders ───────────────────────────────────────────────────────────────────

router.get(
  "/orders",
  requirePermission("orders.view"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const { skip, take, page } = pagination(req, 50);
    const status = typeof req.query.status === "string" && (ORDER_STATUSES as readonly string[]).includes(req.query.status)
      ? (req.query.status as (typeof ORDER_STATUSES)[number])
      : undefined;
    const branchId = typeof req.query.branchId === "string" ? req.query.branchId : undefined;
    const scheduled = req.query.scheduled === "true";
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const where: Prisma.OrderWhereInput = {
      restaurantId: rid,
      ...(status ? { status } : {}),
      ...(branchId ? { branchId } : {}),
      ...(req.claims!.role === "BRANCH_MANAGER" && req.claims!.branchId ? { branchId: req.claims!.branchId } : {}),
      ...(scheduled ? { scheduledAt: { not: null }, status: "NEW" } : {}),
      ...(q
        ? {
            OR: [
              { customerName: { contains: q, mode: "insensitive" } },
              { customerPhone: { contains: q } },
              ...(Number.isInteger(Number(q)) ? [{ orderNo: Number(q) }] : []),
            ],
          }
        : {}),
    };

    const [orders, total, counts] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: { items: true, branch: { select: { name_en: true, name_ar: true } }, zone: { select: { name_en: true, name_ar: true } } },
      }),
      prisma.order.count({ where }),
      prisma.order.groupBy({ by: ["status"], where: { restaurantId: rid }, _count: true }),
    ]);

    res.json({
      page,
      total,
      statusCounts: Object.fromEntries(counts.map((c) => [c.status, c._count])),
      orders: orders.map((o) => ({
        id: o.id, orderNo: o.orderNo, status: o.status, type: o.type,
        paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus,
        customerName: o.customerName, customerPhone: o.customerPhone,
        addressText: o.addressText, lat: o.lat, lng: o.lng, notes: o.notes,
        driverName: o.driverName, driverPhone: o.driverPhone, cancelReason: o.cancelReason,
        scheduledAt: o.scheduledAt, createdAt: o.createdAt,
        subtotal: num(o.subtotal), deliveryFee: num(o.deliveryFee), discount: num(o.discount),
        vatAmount: num(o.vatAmount), total: num(o.total), couponCode: o.couponCode,
        branch: o.branch, zone: o.zone,
        items: o.items.map((it) => ({
          name_en: it.name_en, name_ar: it.name_ar, variant_en: it.variant_en, variant_ar: it.variant_ar,
          qty: it.qty, unitPrice: num(it.unitPrice), lineTotal: num(it.lineTotal), addons: it.addons, notes: it.notes,
        })),
      })),
    });
  }),
);

router.post(
  "/orders/:id/status",
  requirePermission("orders.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const schema = z.object({
      status: z.enum(ORDER_STATUSES),
      note: z.string().max(300).default(""),
      driverName: z.string().max(80).optional(),
      driverPhone: z.string().max(20).optional(),
      cancelReason: z.string().max(300).optional(),
      paymentStatus: z.enum(["PENDING", "PAID", "FAILED", "REFUNDED"]).optional(),
    });
    const input = parse(schema, req.body);
    const order = await prisma.order.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!order) throw new ApiError(404, "Order not found", "not_found");
    if (!VALID_TRANSITIONS[order.status]?.includes(input.status)) {
      throw new ApiError(400, `Cannot move order from ${order.status} to ${input.status}`, "bad_transition");
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: input.status,
          driverName: input.driverName ?? order.driverName,
          driverPhone: input.driverPhone ?? order.driverPhone,
          cancelReason: input.status === "CANCELED" ? (input.cancelReason ?? "") : order.cancelReason,
          paymentStatus:
            input.paymentStatus ??
            (input.status === "DELIVERED" && order.paymentMethod === "CASH" ? "PAID" : order.paymentStatus),
        },
      });
      await tx.orderStatusEvent.create({ data: { orderId: order.id, status: input.status, note: input.note } });

      // Loyalty earn + referral reward on first delivered order
      if (input.status === "DELIVERED" && order.customerId && order.loyaltyEarned > 0) {
        const account = await tx.loyaltyAccount.upsert({
          where: { customerId_restaurantId: { customerId: order.customerId, restaurantId: rid } },
          create: { customerId: order.customerId, restaurantId: rid, points: order.loyaltyEarned },
          update: { points: { increment: order.loyaltyEarned } },
        });
        await tx.loyaltyTransaction.create({
          data: { accountId: account.id, type: "EARN", points: order.loyaltyEarned, orderId: order.id, note: `Order #${order.orderNo}` },
        });
      }
      if (input.status === "DELIVERED" && order.customerId) {
        const referral = await tx.referral.findUnique({ where: { referredId: order.customerId } });
        if (referral && !referral.rewardedAt) {
          const platform = await tx.platformSetting.findUnique({ where: { id: 1 } });
          const reward = Number((platform?.data as { referralRewardPoints?: number } | null)?.referralRewardPoints ?? 50);
          const account = await tx.loyaltyAccount.upsert({
            where: { customerId_restaurantId: { customerId: referral.referrerId, restaurantId: rid } },
            create: { customerId: referral.referrerId, restaurantId: rid, points: reward },
            update: { points: { increment: reward } },
          });
          await tx.loyaltyTransaction.create({
            data: { accountId: account.id, type: "REFERRAL_BONUS", points: reward, note: "Referral first order" },
          });
          await tx.referral.update({ where: { id: referral.id }, data: { rewardPoints: reward, rewardedAt: new Date() } });
        }
      }
      // Restock canceled tracked items
      if (input.status === "CANCELED") {
        const items = await tx.orderItem.findMany({ where: { orderId: order.id, productId: { not: null } } });
        for (const it of items) {
          const product = await tx.product.findUnique({ where: { id: it.productId! } });
          if (product?.trackStock) {
            await tx.branchInventory.updateMany({
              where: { branchId: order.branchId, productId: it.productId! },
              data: { stockQty: { increment: it.qty } },
            });
          }
        }
      }
    });

    await audit(req, "order.status", "Order", order.id, { from: order.status, to: input.status });
    res.json({ success: true });
  }),
);

// ── Generic tenant CRUD factory ──────────────────────────────────────────────

type Delegate = {
  findMany: (args: object) => Promise<unknown[]>;
  findFirst: (args: object) => Promise<unknown>;
  create: (args: { data: object }) => Promise<{ id: string }>;
  update: (args: { where: { id: string }; data: object }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
  count: (args: object) => Promise<number>;
};

interface CrudOptions<S extends z.ZodTypeAny> {
  path: string;
  entity: string;
  permission: (typeof PERMISSIONS)[number];
  delegate: Delegate;
  schema: S;
  /** Build the tenant filter — defaults to { restaurantId } */
  scope?: (rid: string) => object;
  /** Decorate create data — e.g. attach restaurantId */
  onCreate?: (data: z.infer<S>, rid: string) => object;
  include?: object;
  orderBy?: object | object[];
  /** Max rows allowed by the tenant's plan */
  planLimit?: (rid: string) => Promise<{ max: number; label: string } | null>;
}

function crud<S extends z.ZodTypeAny>(opts: CrudOptions<S>) {
  const scope = opts.scope ?? ((rid: string) => ({ restaurantId: rid }));
  const onCreate = opts.onCreate ?? ((data: z.infer<S>, rid: string) => ({ ...data, restaurantId: rid }));

  router.get(
    `/${opts.path}`,
    requirePermission(opts.permission),
    asyncHandler(async (req, res) => {
      const rid = tenantId(req);
      const rows = await opts.delegate.findMany({
        where: scope(rid),
        ...(opts.include ? { include: opts.include } : {}),
        ...(opts.orderBy ? { orderBy: opts.orderBy } : {}),
      });
      res.json({ items: rows });
    }),
  );

  router.post(
    `/${opts.path}`,
    requirePermission(opts.permission),
    asyncHandler(async (req, res) => {
      const rid = tenantId(req);
      if (opts.planLimit) {
        const limit = await opts.planLimit(rid);
        if (limit) {
          const count = await opts.delegate.count({ where: scope(rid) });
          if (count >= limit.max) {
            throw new ApiError(403, `Your plan allows up to ${limit.max} ${limit.label}. Upgrade to add more.`, "plan_limit");
          }
        }
      }
      const data = parse(opts.schema, req.body);
      const row = await opts.delegate.create({ data: onCreate(data, rid) });
      await audit(req, `${opts.entity}.create`, opts.entity, row.id);
      res.status(201).json({ item: row });
    }),
  );

  router.put(
    `/${opts.path}/:id`,
    requirePermission(opts.permission),
    asyncHandler(async (req, res) => {
      const rid = tenantId(req);
      const existing = await opts.delegate.findFirst({ where: { id: String(req.params.id), ...scope(rid) } });
      if (!existing) throw new ApiError(404, `${opts.entity} not found`, "not_found");
      const data = parse((opts.schema as unknown as z.AnyZodObject).partial(), req.body);
      const row = await opts.delegate.update({ where: { id: String(req.params.id) }, data });
      await audit(req, `${opts.entity}.update`, opts.entity, String(req.params.id));
      res.json({ item: row });
    }),
  );

  router.delete(
    `/${opts.path}/:id`,
    requirePermission(opts.permission),
    asyncHandler(async (req, res) => {
      const rid = tenantId(req);
      const existing = await opts.delegate.findFirst({ where: { id: String(req.params.id), ...scope(rid) } });
      if (!existing) throw new ApiError(404, `${opts.entity} not found`, "not_found");
      await opts.delegate.delete({ where: { id: String(req.params.id) } });
      await audit(req, `${opts.entity}.delete`, opts.entity, String(req.params.id));
      res.json({ success: true });
    }),
  );
}

async function planOf(rid: string) {
  const sub = await prisma.subscription.findFirst({
    where: { restaurantId: rid, status: { in: ["TRIAL", "ACTIVE"] }, periodEnd: { gte: new Date() } },
    orderBy: { periodEnd: "desc" },
    include: { plan: true },
  });
  return sub?.plan ?? null;
}

const bilingual = { name_en: z.string().min(1).max(120), name_ar: z.string().min(1).max(120) };

// Branches
crud({
  path: "branches",
  entity: "Branch",
  permission: "settings.manage",
  delegate: prisma.branch as unknown as Delegate,
  orderBy: { sortOrder: "asc" },
  schema: z.object({
    ...bilingual,
    phone: z.string().max(20).default(""),
    address_en: z.string().max(300).default(""),
    address_ar: z.string().max(300).default(""),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    isActive: z.boolean().default(true),
    openingHours: z.record(z.unknown()).default({}),
    sortOrder: z.number().int().default(0),
  }),
  planLimit: async (rid) => {
    const plan = await planOf(rid);
    return plan ? { max: plan.maxBranches, label: "branches" } : null;
  },
});

// Categories
crud({
  path: "categories",
  entity: "Category",
  permission: "catalog.manage",
  delegate: prisma.category as unknown as Delegate,
  orderBy: { sortOrder: "asc" },
  schema: z.object({
    ...bilingual,
    imageUrl: z.string().max(500).default(""),
    isActive: z.boolean().default(true),
    isFeatured: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  }),
});

// Products
const productSchema = z.object({
  categoryId: z.string().min(1),
  ...bilingual,
  description_en: z.string().max(2000).default(""),
  description_ar: z.string().max(2000).default(""),
  imageUrl: z.string().max(500).default(""),
  price: z.number().min(0),
  compareAtPrice: z.number().min(0).nullable().optional(),
  calories: z.number().int().min(0).nullable().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  trackStock: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  tags: z.array(z.string().max(40)).default([]),
});

crud({
  path: "products",
  entity: "Product",
  permission: "catalog.manage",
  delegate: prisma.product as unknown as Delegate,
  orderBy: { sortOrder: "asc" },
  include: {
    variants: { orderBy: { sortOrder: "asc" } },
    addonGroups: { select: { groupId: true } },
    inventory: true,
    category: { select: { name_en: true, name_ar: true } },
  },
  schema: productSchema,
});

// Variants (nested under product, scoped via product.restaurantId)
router.put(
  "/products/:id/variants",
  requirePermission("catalog.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const product = await prisma.product.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!product) throw new ApiError(404, "Product not found", "not_found");
    const schema = z.array(
      z.object({
        ...bilingual,
        priceDelta: z.number().default(0),
        isDefault: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
      }),
    );
    const variants = parse(schema, req.body);
    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId: product.id } }),
      ...(variants.length
        ? [prisma.productVariant.createMany({ data: variants.map((v) => ({ ...v, productId: product.id })) })]
        : []),
    ]);
    await audit(req, "Product.variants", "Product", product.id, { count: variants.length });
    res.json({ success: true });
  }),
);

// Product ↔ addon-group links
router.put(
  "/products/:id/addon-groups",
  requirePermission("catalog.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const product = await prisma.product.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!product) throw new ApiError(404, "Product not found", "not_found");
    const groupIds = parse(z.array(z.string()), req.body);
    const owned = await prisma.addonGroup.count({ where: { id: { in: groupIds }, restaurantId: rid } });
    if (owned !== groupIds.length) throw new ApiError(400, "Unknown add-on group", "bad_group");
    await prisma.$transaction([
      prisma.productAddonGroup.deleteMany({ where: { productId: product.id } }),
      ...(groupIds.length
        ? [prisma.productAddonGroup.createMany({ data: groupIds.map((groupId) => ({ productId: product.id, groupId })) })]
        : []),
    ]);
    res.json({ success: true });
  }),
);

// Addon groups + addons
crud({
  path: "addon-groups",
  entity: "AddonGroup",
  permission: "catalog.manage",
  delegate: prisma.addonGroup as unknown as Delegate,
  orderBy: { sortOrder: "asc" },
  include: { addons: { orderBy: { sortOrder: "asc" } } },
  schema: z.object({
    ...bilingual,
    minSelect: z.number().int().min(0).default(0),
    maxSelect: z.number().int().min(1).default(1),
    sortOrder: z.number().int().default(0),
  }),
});

router.put(
  "/addon-groups/:id/addons",
  requirePermission("catalog.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const group = await prisma.addonGroup.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!group) throw new ApiError(404, "Add-on group not found", "not_found");
    const schema = z.array(
      z.object({
        ...bilingual,
        price: z.number().min(0).default(0),
        isActive: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      }),
    );
    const addons = parse(schema, req.body);
    await prisma.$transaction([
      prisma.addon.deleteMany({ where: { groupId: group.id } }),
      ...(addons.length ? [prisma.addon.createMany({ data: addons.map((a) => ({ ...a, groupId: group.id })) })] : []),
    ]);
    res.json({ success: true });
  }),
);

// Inventory (per branch)
router.get(
  "/inventory/:branchId",
  requirePermission("inventory.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const branch = await prisma.branch.findFirst({ where: { id: String(req.params.branchId), restaurantId: rid } });
    if (!branch) throw new ApiError(404, "Branch not found", "not_found");
    const [products, inventory] = await Promise.all([
      prisma.product.findMany({
        where: { restaurantId: rid },
        select: { id: true, name_en: true, name_ar: true, trackStock: true, imageUrl: true },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.branchInventory.findMany({ where: { branchId: branch.id } }),
    ]);
    const invMap = new Map(inventory.map((i) => [i.productId, i]));
    res.json({
      items: products.map((p) => ({
        ...p,
        stockQty: invMap.get(p.id)?.stockQty ?? 0,
        isAvailable: invMap.get(p.id)?.isAvailable ?? true,
      })),
    });
  }),
);

router.put(
  "/inventory/:branchId/:productId",
  requirePermission("inventory.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const schema = z.object({ stockQty: z.number().int().min(0).optional(), isAvailable: z.boolean().optional() });
    const input = parse(schema, req.body);
    const [branch, product] = await Promise.all([
      prisma.branch.findFirst({ where: { id: String(req.params.branchId), restaurantId: rid } }),
      prisma.product.findFirst({ where: { id: String(req.params.productId), restaurantId: rid } }),
    ]);
    if (!branch || !product) throw new ApiError(404, "Not found", "not_found");
    const row = await prisma.branchInventory.upsert({
      where: { branchId_productId: { branchId: branch.id, productId: product.id } },
      create: { branchId: branch.id, productId: product.id, stockQty: input.stockQty ?? 0, isAvailable: input.isAvailable ?? true },
      update: input,
    });
    res.json({ item: row });
  }),
);

// Delivery zones (scoped through branch ownership)
const zoneSchema = z.object({
  branchId: z.string().min(1),
  ...bilingual,
  type: z.enum(["POLYGON", "RADIUS"]),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3).nullable().optional(),
  centerLat: z.number().nullable().optional(),
  centerLng: z.number().nullable().optional(),
  radiusKm: z.number().min(0.1).max(100).nullable().optional(),
  fee: z.number().min(0).default(0),
  minOrder: z.number().min(0).default(0),
  freeOver: z.number().min(0).nullable().optional(),
  schedule: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

router.get(
  "/zones",
  requirePermission("zones.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const zones = await prisma.deliveryZone.findMany({
      where: { branch: { restaurantId: rid } },
      orderBy: { sortOrder: "asc" },
      include: { branch: { select: { id: true, name_en: true, name_ar: true } } },
    });
    res.json({ items: zones.map((zn) => ({ ...zn, fee: num(zn.fee), minOrder: num(zn.minOrder), freeOver: zn.freeOver == null ? null : num(zn.freeOver) })) });
  }),
);

router.post(
  "/zones",
  requirePermission("zones.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const input = parse(zoneSchema, req.body);
    const branch = await prisma.branch.findFirst({ where: { id: input.branchId, restaurantId: rid } });
    if (!branch) throw new ApiError(400, "Invalid branch", "bad_branch");
    if (input.type === "POLYGON" && !input.polygon) throw new ApiError(400, "Polygon points required", "validation");
    if (input.type === "RADIUS" && (input.centerLat == null || input.centerLng == null || input.radiusKm == null)) {
      throw new ApiError(400, "Center and radius required", "validation");
    }
    const zone = await prisma.deliveryZone.create({ data: { ...input, polygon: input.polygon ?? Prisma.JsonNull, schedule: input.schedule as object } });
    await audit(req, "DeliveryZone.create", "DeliveryZone", zone.id);
    res.status(201).json({ item: zone });
  }),
);

router.put(
  "/zones/:id",
  requirePermission("zones.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const existing = await prisma.deliveryZone.findFirst({
      where: { id: String(req.params.id), branch: { restaurantId: rid } },
    });
    if (!existing) throw new ApiError(404, "Zone not found", "not_found");
    const input = parse(zoneSchema.partial(), req.body);
    if (input.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: input.branchId, restaurantId: rid } });
      if (!branch) throw new ApiError(400, "Invalid branch", "bad_branch");
    }
    const zone = await prisma.deliveryZone.update({
      where: { id: existing.id },
      data: { ...input, polygon: input.polygon === null ? Prisma.JsonNull : input.polygon, schedule: input.schedule as object | undefined },
    });
    await audit(req, "DeliveryZone.update", "DeliveryZone", zone.id);
    res.json({ item: zone });
  }),
);

router.delete(
  "/zones/:id",
  requirePermission("zones.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const existing = await prisma.deliveryZone.findFirst({
      where: { id: String(req.params.id), branch: { restaurantId: rid } },
    });
    if (!existing) throw new ApiError(404, "Zone not found", "not_found");
    await prisma.deliveryZone.delete({ where: { id: existing.id } });
    await audit(req, "DeliveryZone.delete", "DeliveryZone", existing.id);
    res.json({ success: true });
  }),
);

// Offers & coupons
crud({
  path: "offers",
  entity: "Offer",
  permission: "marketing.manage",
  delegate: prisma.offer as unknown as Delegate,
  orderBy: { sortOrder: "asc" },
  schema: z.object({
    title_en: z.string().min(1).max(160),
    title_ar: z.string().min(1).max(160),
    description_en: z.string().max(500).default(""),
    description_ar: z.string().max(500).default(""),
    imageUrl: z.string().max(500).default(""),
    type: z.enum(["PERCENT_OFF", "FIXED_OFF", "FREE_DELIVERY"]),
    value: z.number().min(0).default(0),
    minOrder: z.number().min(0).default(0),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  }),
});

crud({
  path: "coupons",
  entity: "Coupon",
  permission: "marketing.manage",
  delegate: prisma.coupon as unknown as Delegate,
  orderBy: { createdAt: "desc" },
  schema: z.object({
    code: z.string().min(2).max(40).transform((s) => s.toUpperCase()),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.number().min(0),
    minOrder: z.number().min(0).default(0),
    maxDiscount: z.number().min(0).nullable().optional(),
    maxUses: z.number().int().min(1).nullable().optional(),
    perCustomer: z.number().int().min(1).nullable().optional(),
    startsAt: z.string().datetime().nullable().optional(),
    endsAt: z.string().datetime().nullable().optional(),
    isActive: z.boolean().default(true),
  }),
});

// Reviews moderation
router.get(
  "/reviews",
  requirePermission("reviews.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const reviews = await prisma.review.findMany({
      where: { restaurantId: rid, ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" } : {}) },
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { name: true, phone: true } }, product: { select: { name_en: true, name_ar: true } } },
    });
    res.json({ items: reviews });
  }),
);

router.put(
  "/reviews/:id",
  requirePermission("reviews.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const schema = z.object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(), reply: z.string().max(1000).optional() });
    const input = parse(schema, req.body);
    const existing = await prisma.review.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!existing) throw new ApiError(404, "Review not found", "not_found");
    const review = await prisma.review.update({ where: { id: existing.id }, data: input });
    res.json({ item: review });
  }),
);

// Customers (derived from orders + registered accounts)
router.get(
  "/customers",
  requirePermission("customers.view"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const grouped = await prisma.order.groupBy({
      by: ["customerPhone", "customerName"],
      where: { restaurantId: rid, status: { not: "CANCELED" } },
      _count: true,
      _sum: { total: true },
      _max: { createdAt: true },
      orderBy: { _sum: { total: "desc" } },
      take: 500,
    });
    res.json({
      items: grouped.map((g) => ({
        phone: g.customerPhone,
        name: g.customerName,
        orders: g._count,
        totalSpent: num(g._sum.total),
        lastOrderAt: g._max.createdAt,
      })),
    });
  }),
);

// Staff management
router.get(
  "/staff",
  requirePermission("staff.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const users = await prisma.user.findMany({
      where: { restaurantId: rid },
      select: { id: true, email: true, name: true, role: true, branchId: true, permissions: true, isActive: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ items: users, permissions: PERMISSIONS });
  }),
);

router.post(
  "/staff",
  requirePermission("staff.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2).max(80),
      password: z.string().min(8),
      role: z.enum(["BRANCH_MANAGER", "STAFF"]),
      branchId: z.string().nullable().optional(),
      permissions: z.array(z.enum(PERMISSIONS)).default([]),
    });
    const input = parse(schema, req.body);
    const plan = await planOf(rid);
    if (plan) {
      const count = await prisma.user.count({ where: { restaurantId: rid } });
      if (count >= plan.maxStaff) throw new ApiError(403, `Your plan allows up to ${plan.maxStaff} staff accounts.`, "plan_limit");
    }
    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) throw new ApiError(409, "Email already in use", "email_taken");
    if (input.branchId) {
      const branch = await prisma.branch.findFirst({ where: { id: input.branchId, restaurantId: rid } });
      if (!branch) throw new ApiError(400, "Invalid branch", "bad_branch");
    }
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        name: input.name,
        passwordHash: await hashPassword(input.password),
        role: input.role,
        restaurantId: rid,
        branchId: input.branchId ?? null,
        permissions: input.permissions,
      },
    });
    await audit(req, "User.create", "User", user.id, { role: input.role });
    res.status(201).json({ item: { id: user.id, email: user.email, name: user.name, role: user.role } });
  }),
);

router.put(
  "/staff/:id",
  requirePermission("staff.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const target = await prisma.user.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!target) throw new ApiError(404, "User not found", "not_found");
    if (target.role === "RESTAURANT_OWNER" && req.claims!.role !== "RESTAURANT_OWNER" && req.claims!.role !== "SUPER_ADMIN") {
      throw new ApiError(403, "Cannot modify the owner account", "forbidden");
    }
    const schema = z.object({
      name: z.string().min(2).max(80).optional(),
      role: z.enum(["BRANCH_MANAGER", "STAFF"]).optional(),
      branchId: z.string().nullable().optional(),
      permissions: z.array(z.enum(PERMISSIONS)).optional(),
      isActive: z.boolean().optional(),
      password: z.string().min(8).optional(),
    });
    const input = parse(schema, req.body);
    const data: Prisma.UserUpdateInput = {
      name: input.name,
      branchId: input.branchId,
      permissions: input.permissions,
      isActive: input.isActive,
    } as Prisma.UserUpdateInput;
    if (input.role && target.role !== "RESTAURANT_OWNER") (data as { role?: string }).role = input.role;
    if (input.password) (data as { passwordHash?: string }).passwordHash = await hashPassword(input.password);
    const user = await prisma.user.update({ where: { id: target.id }, data });
    await audit(req, "User.update", "User", user.id);
    res.json({ item: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive } });
  }),
);

router.delete(
  "/staff/:id",
  requirePermission("staff.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const target = await prisma.user.findFirst({ where: { id: String(req.params.id), restaurantId: rid } });
    if (!target) throw new ApiError(404, "User not found", "not_found");
    if (target.role === "RESTAURANT_OWNER") throw new ApiError(403, "Cannot delete the owner account", "forbidden");
    await prisma.user.delete({ where: { id: target.id } });
    await audit(req, "User.delete", "User", target.id);
    res.json({ success: true });
  }),
);

// ── Theme & website builder ──────────────────────────────────────────────────

router.get(
  "/builder",
  requirePermission("builder.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const [r, templates] = await Promise.all([
      prisma.restaurant.findUnique({ where: { id: rid } }),
      prisma.themeTemplate.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    ]);
    if (!r) throw new ApiError(404, "Restaurant not found", "not_found");
    res.json({
      theme: r.theme,
      themeDraft: r.themeDraft,
      homepage: r.homepage,
      socials: r.socials,
      branding: {
        logoUrl: r.logoUrl, coverUrl: r.coverUrl, bannerMobile: r.bannerMobile, bannerDesktop: r.bannerDesktop,
      },
      templates: templates.map((t) => ({ id: t.id, key: t.key, name_en: t.name_en, name_ar: t.name_ar, previewUrl: t.previewUrl, document: t.document })),
    });
  }),
);

router.put(
  "/builder/draft",
  requirePermission("builder.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const schema = z.object({
      themeDraft: z.record(z.unknown()).optional(),
      homepage: z.array(z.record(z.unknown())).optional(),
      socials: z.record(z.unknown()).optional(),
      branding: z
        .object({
          logoUrl: z.string().max(500).optional(),
          coverUrl: z.string().max(500).optional(),
          bannerMobile: z.string().max(500).optional(),
          bannerDesktop: z.string().max(500).optional(),
        })
        .optional(),
    });
    const input = parse(schema, req.body);
    await prisma.restaurant.update({
      where: { id: rid },
      data: {
        ...(input.themeDraft ? { themeDraft: input.themeDraft as object } : {}),
        ...(input.homepage ? { homepage: input.homepage as object } : {}),
        ...(input.socials ? { socials: input.socials as object } : {}),
        ...(input.branding ?? {}),
      },
    });
    await audit(req, "Builder.draft", "Restaurant", rid);
    res.json({ success: true });
  }),
);

router.post(
  "/builder/publish",
  requirePermission("builder.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const r = await prisma.restaurant.findUnique({ where: { id: rid } });
    if (!r) throw new ApiError(404, "Restaurant not found", "not_found");
    await prisma.restaurant.update({ where: { id: rid }, data: { theme: r.themeDraft as object } });
    await audit(req, "Builder.publish", "Restaurant", rid);
    res.json({ success: true });
  }),
);

// ── Settings ─────────────────────────────────────────────────────────────────

router.get(
  "/settings",
  requirePermission("settings.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const r = await prisma.restaurant.findUnique({ where: { id: rid } });
    if (!r) throw new ApiError(404, "Restaurant not found", "not_found");
    const sub = await prisma.subscription.findFirst({
      where: { restaurantId: rid },
      orderBy: { periodEnd: "desc" },
      include: { plan: true },
    });
    res.json({
      restaurant: {
        slug: r.slug, name_en: r.name_en, name_ar: r.name_ar,
        description_en: r.description_en, description_ar: r.description_ar,
        phone: r.phone, whatsapp: r.whatsapp, email: r.email, website: r.website,
        vatNumber: r.vatNumber, vatRate: num(r.vatRate), currency: r.currency,
        settings: r.settings,
      },
      subscription: sub
        ? { status: sub.status, periodEnd: sub.periodEnd, plan: { name_en: sub.plan.name_en, name_ar: sub.plan.name_ar, maxBranches: sub.plan.maxBranches, maxProducts: sub.plan.maxProducts, maxStaff: sub.plan.maxStaff } }
        : null,
    });
  }),
);

router.put(
  "/settings",
  requirePermission("settings.manage"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const schema = z.object({
      name_en: z.string().min(1).max(120).optional(),
      name_ar: z.string().min(1).max(120).optional(),
      description_en: z.string().max(1000).optional(),
      description_ar: z.string().max(1000).optional(),
      phone: z.string().max(20).optional(),
      whatsapp: z.string().max(20).optional(),
      email: z.string().email().or(z.literal("")).optional(),
      website: z.string().max(200).optional(),
      vatNumber: z.string().max(30).optional(),
      vatRate: z.number().min(0).max(100).optional(),
      settings: z.record(z.unknown()).optional(),
    });
    const input = parse(schema, req.body);
    await prisma.restaurant.update({
      where: { id: rid },
      data: { ...input, settings: input.settings as object | undefined },
    });
    await audit(req, "Restaurant.settings", "Restaurant", rid);
    res.json({ success: true });
  }),
);

// ── Reports & analytics ──────────────────────────────────────────────────────

router.get(
  "/reports",
  requirePermission("reports.view"),
  asyncHandler(async (req, res) => {
    const rid = tenantId(req);
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const baseWhere = { restaurantId: rid, createdAt: { gte: since }, status: { not: "CANCELED" as const } };

    const [orders, byBranch, byProduct, byZone, byCoupon, byPayment] = await Promise.all([
      prisma.order.findMany({ where: baseWhere, select: { createdAt: true, total: true, customerPhone: true, type: true } }),
      prisma.order.groupBy({ by: ["branchId"], where: baseWhere, _count: true, _sum: { total: true } }),
      prisma.orderItem.groupBy({
        by: ["name_en", "name_ar"],
        where: { order: baseWhere },
        _sum: { qty: true, lineTotal: true },
        orderBy: { _sum: { lineTotal: "desc" } },
        take: 20,
      }),
      prisma.order.groupBy({ by: ["zoneId"], where: { ...baseWhere, zoneId: { not: null } }, _count: true, _sum: { total: true, deliveryFee: true } }),
      prisma.order.groupBy({ by: ["couponCode"], where: { ...baseWhere, couponCode: { not: null } }, _count: true, _sum: { discount: true, total: true } }),
      prisma.order.groupBy({ by: ["paymentMethod"], where: baseWhere, _count: true, _sum: { total: true } }),
    ]);

    const branches = await prisma.branch.findMany({ where: { restaurantId: rid }, select: { id: true, name_en: true, name_ar: true } });
    const zones = await prisma.deliveryZone.findMany({ where: { branch: { restaurantId: rid } }, select: { id: true, name_en: true, name_ar: true } });
    const branchName = new Map(branches.map((b) => [b.id, b]));
    const zoneName = new Map(zones.map((zn) => [zn.id, zn]));

    const byDay = new Map<string, { revenue: number; orders: number }>();
    const phones = new Map<string, number>();
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      const cur = byDay.get(key) ?? { revenue: 0, orders: 0 };
      cur.revenue += num(o.total);
      cur.orders += 1;
      byDay.set(key, cur);
      phones.set(o.customerPhone, (phones.get(o.customerPhone) ?? 0) + 1);
    }
    const returning = [...phones.values()].filter((c) => c > 1).length;

    res.json({
      days,
      totals: {
        revenue: Math.round(orders.reduce((s, o) => s + num(o.total), 0) * 100) / 100,
        orders: orders.length,
        customers: phones.size,
        returningCustomers: returning,
        deliveryShare: orders.length ? Math.round((orders.filter((o) => o.type === "DELIVERY").length / orders.length) * 100) : 0,
      },
      salesByDay: [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v })),
      branchPerformance: byBranch.map((b) => ({
        branch: branchName.get(b.branchId) ?? { name_en: "—", name_ar: "—" },
        orders: b._count,
        revenue: num(b._sum.total),
      })),
      productPerformance: byProduct.map((p) => ({ name_en: p.name_en, name_ar: p.name_ar, qty: p._sum.qty ?? 0, revenue: num(p._sum.lineTotal) })),
      zonePerformance: byZone.map((zn) => ({
        zone: (zn.zoneId && zoneName.get(zn.zoneId)) || { name_en: "—", name_ar: "—" },
        orders: zn._count,
        revenue: num(zn._sum.total),
        deliveryFees: num(zn._sum.deliveryFee),
      })),
      couponPerformance: byCoupon.map((c) => ({ code: c.couponCode, orders: c._count, discountGiven: num(c._sum.discount), revenue: num(c._sum.total) })),
      paymentMix: byPayment.map((p) => ({ method: p.paymentMethod, orders: p._count, revenue: num(p._sum.total) })),
    });
  }),
);

// ── Uploads (Cloudinary signed params) ───────────────────────────────────────

router.post(
  "/uploads/sign",
  asyncHandler(async (req, res) => {
    if (!env.cloudinary.configured) {
      throw new ApiError(501, "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET.", "uploads_unconfigured");
    }
    const rid = tenantId(req);
    cloudinary.config({
      cloud_name: env.cloudinary.cloudName,
      api_key: env.cloudinary.apiKey,
      api_secret: env.cloudinary.apiSecret,
    });
    const timestamp = Math.round(Date.now() / 1000);
    const folder = `matami/${rid}`;
    const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, env.cloudinary.apiSecret);
    res.json({ cloudName: env.cloudinary.cloudName, apiKey: env.cloudinary.apiKey, timestamp, folder, signature });
  }),
);

export default router;
