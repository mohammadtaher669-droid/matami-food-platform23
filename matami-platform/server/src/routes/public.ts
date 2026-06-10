/**
 * Public storefront API: marketplace, restaurant sites, zone resolution,
 * checkout, order tracking, invoices, reviews, favorites, loyalty, referrals.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { num, prisma } from "../lib/prisma";
import { ApiError, asyncHandler, pagination, parse } from "../lib/http";
import { matchZone, isZoneOpen, type ZoneLike } from "../lib/geo";
import { computeTotals, round2, type PricingAddon, type PricingItemInput } from "../lib/pricing";
import { assertActiveSubscription, optionalCustomer, requireCustomer } from "../middleware/auth";
import { invoiceShareLink, renderInvoiceHtml, type InvoiceOrder } from "../lib/invoice";
import { env } from "../env";

const router = Router();

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many orders. Try again later.", code: "rate_limited" },
});

type RestaurantSettings = {
  vatInclusive?: boolean;
  orderingEnabled?: boolean;
  loyalty?: { enabled?: boolean; earnPerCurrency?: number; redeemPerPoint?: number };
};

function settingsOf(r: { settings: unknown }): RestaurantSettings {
  return (r.settings ?? {}) as RestaurantSettings;
}

async function restaurantBySlug(slug: string) {
  const r = await prisma.restaurant.findUnique({ where: { slug } });
  if (!r || !r.isActive) throw new ApiError(404, "Restaurant not found", "not_found");
  return r;
}

// ── Platform marketplace ─────────────────────────────────────────────────────

router.get(
  "/platform",
  asyncHandler(async (_req, res) => {
    const settings = await prisma.platformSetting.findUnique({ where: { id: 1 } });
    res.json({
      settings: settings?.data ?? {},
      googleMapsApiKey: env.googleMapsApiKey,
      cloudinary: env.cloudinary.configured ? { cloudName: env.cloudinary.cloudName } : null,
    });
  }),
);

router.get(
  "/restaurants",
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? "").trim();
    const where: Prisma.RestaurantWhereInput = {
      isActive: true,
      subscriptions: { some: { status: { in: ["TRIAL", "ACTIVE"] }, periodEnd: { gte: new Date() } } },
      ...(q
        ? {
            OR: [
              { name_en: { contains: q, mode: "insensitive" } },
              { name_ar: { contains: q, mode: "insensitive" } },
              { description_en: { contains: q, mode: "insensitive" } },
              { description_ar: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const restaurants = await prisma.restaurant.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { createdAt: "asc" }],
      select: {
        slug: true, name_en: true, name_ar: true, description_en: true, description_ar: true,
        logoUrl: true, coverUrl: true, isFeatured: true, currency: true,
        reviews: { where: { status: "APPROVED" }, select: { rating: true } },
        branches: { where: { isActive: true }, select: { id: true } },
      },
    });
    res.json({
      restaurants: restaurants.map((r) => ({
        slug: r.slug,
        name_en: r.name_en,
        name_ar: r.name_ar,
        description_en: r.description_en,
        description_ar: r.description_ar,
        logoUrl: r.logoUrl,
        coverUrl: r.coverUrl,
        isFeatured: r.isFeatured,
        currency: r.currency,
        branchCount: r.branches.length,
        rating: r.reviews.length
          ? round2(r.reviews.reduce((s, x) => s + x.rating, 0) / r.reviews.length)
          : null,
        ratingCount: r.reviews.length,
      })),
    });
  }),
);

// ── Restaurant site payload ──────────────────────────────────────────────────

router.get(
  "/r/:slug",
  asyncHandler(async (req, res) => {
    const r = await restaurantBySlug(String(req.params.slug));
    let subscriptionActive = true;
    try {
      await assertActiveSubscription(r.id);
    } catch {
      subscriptionActive = false;
    }

    const [branches, categories, products, addonGroups, offers, reviews] = await Promise.all([
      prisma.branch.findMany({
        where: { restaurantId: r.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { zones: { where: { isActive: true } } },
      }),
      prisma.category.findMany({ where: { restaurantId: r.id, isActive: true }, orderBy: { sortOrder: "asc" } }),
      prisma.product.findMany({
        where: { restaurantId: r.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { orderBy: { sortOrder: "asc" } },
          addonGroups: { include: { group: { include: { addons: { where: { isActive: true }, orderBy: { sortOrder: "asc" } } } } } },
          inventory: true,
        },
      }),
      prisma.addonGroup.findMany({ where: { restaurantId: r.id }, include: { addons: { where: { isActive: true } } } }),
      prisma.offer.findMany({
        where: {
          restaurantId: r.id,
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
        },
        orderBy: { sortOrder: "asc" },
      }),
      prisma.review.findMany({
        where: { restaurantId: r.id, status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { customer: { select: { name: true } } },
      }),
    ]);

    res.json({
      restaurant: {
        slug: r.slug, name_en: r.name_en, name_ar: r.name_ar,
        description_en: r.description_en, description_ar: r.description_ar,
        logoUrl: r.logoUrl, coverUrl: r.coverUrl, bannerMobile: r.bannerMobile, bannerDesktop: r.bannerDesktop,
        phone: r.phone, whatsapp: r.whatsapp, website: r.website, currency: r.currency,
        vatRate: num(r.vatRate), theme: r.theme, homepage: r.homepage, socials: r.socials,
        settings: { orderingEnabled: settingsOf(r).orderingEnabled !== false, loyalty: settingsOf(r).loyalty ?? null },
        subscriptionActive,
      },
      branches: branches.map((b) => ({
        id: b.id, name_en: b.name_en, name_ar: b.name_ar, phone: b.phone,
        address_en: b.address_en, address_ar: b.address_ar, lat: b.lat, lng: b.lng,
        openingHours: b.openingHours,
        zones: b.zones.map((zn) => ({
          id: zn.id, name_en: zn.name_en, name_ar: zn.name_ar, type: zn.type,
          polygon: zn.polygon, centerLat: zn.centerLat, centerLng: zn.centerLng, radiusKm: zn.radiusKm,
          fee: num(zn.fee), minOrder: num(zn.minOrder), freeOver: zn.freeOver == null ? null : num(zn.freeOver),
          openNow: isZoneOpen(zn.schedule),
        })),
      })),
      categories,
      products: products.map((p) => ({
        id: p.id, categoryId: p.categoryId, name_en: p.name_en, name_ar: p.name_ar,
        description_en: p.description_en, description_ar: p.description_ar,
        imageUrl: p.imageUrl, price: num(p.price),
        compareAtPrice: p.compareAtPrice == null ? null : num(p.compareAtPrice),
        calories: p.calories, isFeatured: p.isFeatured, tags: p.tags, trackStock: p.trackStock,
        variants: p.variants.map((v) => ({
          id: v.id, name_en: v.name_en, name_ar: v.name_ar, priceDelta: num(v.priceDelta), isDefault: v.isDefault,
        })),
        addonGroups: p.addonGroups.map((link) => ({
          id: link.group.id, name_en: link.group.name_en, name_ar: link.group.name_ar,
          minSelect: link.group.minSelect, maxSelect: link.group.maxSelect,
          addons: link.group.addons.map((a) => ({ id: a.id, name_en: a.name_en, name_ar: a.name_ar, price: num(a.price) })),
        })),
        availability: p.inventory.map((inv) => ({
          branchId: inv.branchId, isAvailable: inv.isAvailable, stockQty: inv.stockQty,
        })),
      })),
      addonGroupCount: addonGroups.length,
      offers: offers.map((o) => ({
        id: o.id, title_en: o.title_en, title_ar: o.title_ar,
        description_en: o.description_en, description_ar: o.description_ar,
        imageUrl: o.imageUrl, type: o.type, value: num(o.value), minOrder: num(o.minOrder),
      })),
      reviews: reviews.map((rv) => ({
        id: rv.id, rating: rv.rating, comment: rv.comment, reply: rv.reply,
        customerName: rv.customer.name, createdAt: rv.createdAt,
      })),
    });
  }),
);

// ── Zone resolution ──────────────────────────────────────────────────────────

router.post(
  "/r/:slug/resolve-zone",
  asyncHandler(async (req, res) => {
    const schema = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
    const point = parse(schema, req.body);
    const r = await restaurantBySlug(String(req.params.slug));
    const branches = await prisma.branch.findMany({
      where: { restaurantId: r.id, isActive: true },
      include: { zones: { where: { isActive: true } } },
    });
    for (const b of branches) {
      const zone = matchZone(b.zones as unknown as (ZoneLike & { fee: unknown; minOrder: unknown; freeOver: unknown; name_en: string; name_ar: string })[], point);
      if (zone) {
        res.json({
          branchId: b.id,
          branchName_en: b.name_en,
          branchName_ar: b.name_ar,
          zone: {
            id: zone.id, name_en: zone.name_en, name_ar: zone.name_ar,
            fee: num(zone.fee), minOrder: num(zone.minOrder),
            freeOver: zone.freeOver == null ? null : num(zone.freeOver),
          },
        });
        return;
      }
    }
    res.json({ branchId: null, zone: null });
  }),
);

// ── Checkout ─────────────────────────────────────────────────────────────────

const orderSchema = z.object({
  branchId: z.string().min(1),
  type: z.enum(["DELIVERY", "PICKUP"]),
  paymentMethod: z.enum(["CASH", "MADA", "STC_PAY", "APPLE_PAY", "GOOGLE_PAY", "VISA", "MASTERCARD"]),
  customerName: z.string().min(2).max(80),
  customerPhone: z.string().min(8).max(20),
  address: z.object({ text: z.string().max(400), lat: z.number(), lng: z.number() }).optional(),
  couponCode: z.string().max(40).optional(),
  scheduledAt: z.string().datetime().optional(),
  notes: z.string().max(500).default(""),
  redeemPoints: z.number().int().min(0).default(0),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        addonIds: z.array(z.string()).default([]),
        qty: z.number().int().min(1).max(50),
        notes: z.string().max(300).default(""),
      }),
    )
    .min(1)
    .max(50),
});

router.post(
  "/r/:slug/orders",
  orderLimiter,
  optionalCustomer,
  asyncHandler(async (req, res) => {
    const input = parse(orderSchema, req.body);
    const r = await restaurantBySlug(String(req.params.slug));
    await assertActiveSubscription(r.id);
    const rs = settingsOf(r);
    if (rs.orderingEnabled === false) throw new ApiError(403, "Ordering is currently disabled", "ordering_disabled");

    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, restaurantId: r.id, isActive: true },
      include: { zones: { where: { isActive: true } } },
    });
    if (!branch) throw new ApiError(400, "Invalid branch", "bad_branch");

    // Zone resolution for delivery orders
    type ZoneRow = (typeof branch.zones)[number];
    let zoneRow: ZoneRow | null = null;
    if (input.type === "DELIVERY") {
      if (!input.address) throw new ApiError(400, "Address is required for delivery", "address_required");
      zoneRow = matchZone(branch.zones as unknown as ZoneLike[], input.address) as ZoneRow | null;
      if (!zoneRow) throw new ApiError(400, "Sorry, this location is outside our delivery zones", "out_of_zone");
    }

    // Load products & validate item composition
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId: r.id, isActive: true },
      include: {
        variants: true,
        addonGroups: { include: { group: { include: { addons: true } } } },
        inventory: { where: { branchId: branch.id } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    const pricedItems: PricingItemInput[] = [];
    const itemRows: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    const stockUpdates: Array<{ productId: string; qty: number }> = [];

    for (const item of input.items) {
      const p = productMap.get(item.productId);
      if (!p) throw new ApiError(400, "A product in your cart is no longer available", "bad_product");

      const inv = p.inventory[0];
      if (inv && !inv.isAvailable) throw new ApiError(400, `${p.name_en} is unavailable at this branch`, "unavailable");
      if (p.trackStock) {
        const stock = inv?.stockQty ?? 0;
        if (stock < item.qty) throw new ApiError(400, `${p.name_en} is out of stock`, "out_of_stock");
        stockUpdates.push({ productId: p.id, qty: item.qty });
      }

      let variantDelta = 0;
      let variant_en = "";
      let variant_ar = "";
      if (item.variantId) {
        const v = p.variants.find((x) => x.id === item.variantId);
        if (!v) throw new ApiError(400, "Invalid variant selection", "bad_variant");
        variantDelta = num(v.priceDelta);
        variant_en = v.name_en;
        variant_ar = v.name_ar;
      } else if (p.variants.length > 0) {
        const def = p.variants.find((v) => v.isDefault) ?? p.variants[0]!;
        variantDelta = num(def.priceDelta);
        variant_en = def.name_en;
        variant_ar = def.name_ar;
      }

      const allowedAddons = new Map(
        p.addonGroups.flatMap((link) => link.group.addons.map((a) => [a.id, { addon: a, group: link.group }] as const)),
      );
      const addons: PricingAddon[] = [];
      const perGroupCount = new Map<string, number>();
      for (const addonId of item.addonIds) {
        const entry = allowedAddons.get(addonId);
        if (!entry) throw new ApiError(400, "Invalid add-on selection", "bad_addon");
        addons.push({ id: entry.addon.id, name_en: entry.addon.name_en, name_ar: entry.addon.name_ar, price: num(entry.addon.price) });
        perGroupCount.set(entry.group.id, (perGroupCount.get(entry.group.id) ?? 0) + 1);
      }
      for (const link of p.addonGroups) {
        const count = perGroupCount.get(link.group.id) ?? 0;
        if (count < link.group.minSelect || count > link.group.maxSelect) {
          throw new ApiError(400, `Selection for "${link.group.name_en}" must be between ${link.group.minSelect} and ${link.group.maxSelect}`, "addon_rules");
        }
      }

      const priced: PricingItemInput = { qty: item.qty, basePrice: num(p.price), variantDelta, addons };
      pricedItems.push(priced);
      itemRows.push({
        product: { connect: { id: p.id } },
        name_en: p.name_en,
        name_ar: p.name_ar,
        variant_en,
        variant_ar,
        qty: item.qty,
        unitPrice: round2(num(p.price) + variantDelta + addons.reduce((s, a) => s + a.price, 0)),
        addons: addons.map((a) => ({ name_en: a.name_en, name_ar: a.name_ar, price: a.price })),
        notes: item.notes,
        lineTotal: 0, // replaced below after computing
      });
    }

    // Coupon
    let coupon = null as Awaited<ReturnType<typeof prisma.coupon.findFirst>> | null;
    if (input.couponCode) {
      coupon = await prisma.coupon.findFirst({
        where: { restaurantId: r.id, code: input.couponCode.toUpperCase(), isActive: true },
      });
      const now = new Date();
      if (
        !coupon ||
        (coupon.startsAt && coupon.startsAt > now) ||
        (coupon.endsAt && coupon.endsAt < now) ||
        (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses)
      ) {
        throw new ApiError(400, "Invalid or expired coupon", "bad_coupon");
      }
      if (coupon.perCustomer != null && req.customerClaims) {
        const used = await prisma.order.count({
          where: { restaurantId: r.id, customerId: req.customerClaims.sub, couponCode: coupon.code, status: { not: "CANCELED" } },
        });
        if (used >= coupon.perCustomer) throw new ApiError(400, "Coupon usage limit reached", "coupon_limit");
      }
    }

    // Active offers
    const offers = await prisma.offer.findMany({
      where: {
        restaurantId: r.id,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }] }],
      },
    });

    // Loyalty redemption (registered customers only)
    const loyaltyCfg = rs.loyalty ?? {};
    const loyaltyEnabled = loyaltyCfg.enabled !== false;
    const redeemPerPoint = loyaltyCfg.redeemPerPoint ?? 0.05;
    const earnPerCurrency = loyaltyCfg.earnPerCurrency ?? 1;
    let loyaltyDiscount = 0;
    let loyaltySpent = 0;
    if (input.redeemPoints > 0) {
      if (!req.customerClaims) throw new ApiError(401, "Log in to redeem loyalty points", "unauthenticated");
      if (!loyaltyEnabled) throw new ApiError(400, "Loyalty is not enabled for this restaurant", "loyalty_disabled");
      const account = await prisma.loyaltyAccount.findUnique({
        where: { customerId_restaurantId: { customerId: req.customerClaims.sub, restaurantId: r.id } },
      });
      if (!account || account.points < input.redeemPoints) {
        throw new ApiError(400, "Not enough loyalty points", "loyalty_insufficient");
      }
      loyaltySpent = input.redeemPoints;
      loyaltyDiscount = round2(input.redeemPoints * redeemPerPoint);
    }

    const totals = computeTotals({
      items: pricedItems,
      zone: zoneRow ? { fee: num(zoneRow.fee), freeOver: zoneRow.freeOver == null ? null : num(zoneRow.freeOver) } : null,
      coupon: coupon
        ? { type: coupon.type, value: num(coupon.value), minOrder: num(coupon.minOrder), maxDiscount: coupon.maxDiscount == null ? null : num(coupon.maxDiscount) }
        : null,
      offers: offers.map((o) => ({ type: o.type, value: num(o.value), minOrder: num(o.minOrder) })),
      orderType: input.type,
      vatRate: num(r.vatRate),
      vatInclusive: rs.vatInclusive !== false,
      loyaltyDiscount,
    });

    if (zoneRow && totals.subtotal < num(zoneRow.minOrder)) {
      throw new ApiError(400, `Minimum order for this zone is ${num(zoneRow.minOrder)} ${r.currency}`, "below_min_order");
    }

    // line totals for item rows
    pricedItems.forEach((pi, i) => {
      itemRows[i]!.lineTotal = round2((pi.basePrice + pi.variantDelta + pi.addons.reduce((s, a) => s + a.price, 0)) * pi.qty);
    });

    const scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : null;
    if (scheduledAt && scheduledAt.getTime() < Date.now() - 60_000) {
      throw new ApiError(400, "Scheduled time must be in the future", "bad_schedule");
    }

    const order = await prisma.$transaction(async (tx) => {
      // Stock decrement with race-safety
      for (const su of stockUpdates) {
        const updated = await tx.branchInventory.updateMany({
          where: { branchId: branch.id, productId: su.productId, stockQty: { gte: su.qty } },
          data: { stockQty: { decrement: su.qty } },
        });
        if (updated.count === 0) throw new ApiError(400, "Item went out of stock", "out_of_stock");
      }
      if (coupon) {
        await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
      }
      if (loyaltySpent > 0 && req.customerClaims) {
        const account = await tx.loyaltyAccount.update({
          where: { customerId_restaurantId: { customerId: req.customerClaims.sub, restaurantId: r.id } },
          data: { points: { decrement: loyaltySpent } },
        });
        await tx.loyaltyTransaction.create({
          data: { accountId: account.id, type: "REDEEM", points: -loyaltySpent, note: "Redeemed at checkout" },
        });
      }
      const created = await tx.order.create({
        data: {
          restaurantId: r.id,
          branchId: branch.id,
          customerId: req.customerClaims?.sub ?? null,
          status: "NEW",
          type: input.type,
          paymentMethod: input.paymentMethod,
          paymentStatus: "PENDING",
          customerName: input.customerName,
          customerPhone: input.customerPhone.replace(/[\s-]/g, ""),
          addressText: input.address?.text ?? "",
          lat: input.address?.lat ?? null,
          lng: input.address?.lng ?? null,
          zoneId: zoneRow?.id ?? null,
          couponCode: coupon?.code ?? null,
          scheduledAt,
          notes: input.notes,
          subtotal: totals.subtotal,
          deliveryFee: totals.deliveryFee,
          discount: totals.discount,
          vatAmount: totals.vatAmount,
          total: totals.total,
          loyaltyEarned: loyaltyEnabled && req.customerClaims ? Math.floor(totals.total * earnPerCurrency) : 0,
          loyaltySpent,
          items: { create: itemRows },
          statusEvents: { create: { status: "NEW", note: scheduledAt ? "Scheduled order" : "" } },
        },
        include: { items: true },
      });
      return created;
    });

    res.status(201).json({
      orderNo: order.orderNo,
      status: order.status,
      total: num(order.total),
      trackUrl: `/r/${r.slug}/track/${order.orderNo}`,
    });
  }),
);

// ── Tracking & invoice ───────────────────────────────────────────────────────

async function findTrackedOrder(slug: string, orderNo: number, phone: string | undefined, customerId?: string) {
  const r = await restaurantBySlug(slug);
  const order = await prisma.order.findFirst({
    where: { restaurantId: r.id, orderNo },
    include: {
      items: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      zone: true,
      branch: true,
      restaurant: true,
    },
  });
  if (!order) throw new ApiError(404, "Order not found", "not_found");
  const phoneOk = phone && order.customerPhone === phone.replace(/[\s-]/g, "");
  const ownerOk = customerId && order.customerId === customerId;
  if (!phoneOk && !ownerOk) throw new ApiError(403, "Phone number does not match this order", "forbidden");
  return order;
}

router.get(
  "/r/:slug/track/:orderNo",
  optionalCustomer,
  asyncHandler(async (req, res) => {
    const order = await findTrackedOrder(
      String(req.params.slug),
      Number(req.params.orderNo),
      typeof req.query.phone === "string" ? req.query.phone : undefined,
      req.customerClaims?.sub,
    );
    const invoiceUrl = `${env.appUrl || `${req.protocol}://${req.get("host")}`}/api/public/r/${order.restaurant.slug}/invoice/${order.orderNo}?phone=${encodeURIComponent(order.customerPhone)}`;
    res.json({
      order: {
        orderNo: order.orderNo,
        status: order.status,
        type: order.type,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customerName: order.customerName,
        addressText: order.addressText,
        scheduledAt: order.scheduledAt,
        driverName: order.driverName,
        driverPhone: order.driverPhone,
        cancelReason: order.cancelReason,
        subtotal: num(order.subtotal),
        deliveryFee: num(order.deliveryFee),
        discount: num(order.discount),
        vatAmount: num(order.vatAmount),
        total: num(order.total),
        loyaltyEarned: order.loyaltyEarned,
        createdAt: order.createdAt,
        items: order.items.map((it) => ({
          name_en: it.name_en, name_ar: it.name_ar, variant_en: it.variant_en, variant_ar: it.variant_ar,
          qty: it.qty, unitPrice: num(it.unitPrice), lineTotal: num(it.lineTotal), addons: it.addons, notes: it.notes,
        })),
        timeline: order.statusEvents.map((e) => ({ status: e.status, note: e.note, at: e.createdAt })),
        branch: { name_en: order.branch.name_en, name_ar: order.branch.name_ar, phone: order.branch.phone },
      },
      invoiceUrl,
      whatsappShare: invoiceShareLink(order as unknown as InvoiceOrder, invoiceUrl),
    });
  }),
);

router.get(
  "/r/:slug/invoice/:orderNo",
  optionalCustomer,
  asyncHandler(async (req, res) => {
    const order = await findTrackedOrder(
      String(req.params.slug),
      Number(req.params.orderNo),
      typeof req.query.phone === "string" ? req.query.phone : undefined,
      req.customerClaims?.sub,
    );
    const invoiceUrl = `${env.appUrl || `${req.protocol}://${req.get("host")}`}${req.originalUrl}`;
    res.type("html").send(renderInvoiceHtml(order as unknown as InvoiceOrder, invoiceUrl));
  }),
);

// ── Reviews ──────────────────────────────────────────────────────────────────

router.post(
  "/r/:slug/reviews",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).default(""),
      productId: z.string().optional(),
      orderNo: z.number().int().optional(),
    });
    const input = parse(schema, req.body);
    const r = await restaurantBySlug(String(req.params.slug));

    let orderId: string | undefined;
    if (input.orderNo != null) {
      const order = await prisma.order.findFirst({
        where: { restaurantId: r.id, orderNo: input.orderNo, customerId: req.customerClaims!.sub },
      });
      if (!order) throw new ApiError(400, "Order not found for this account", "bad_order");
      orderId = order.id;
    }
    const review = await prisma.review.create({
      data: {
        restaurantId: r.id,
        customerId: req.customerClaims!.sub,
        productId: input.productId ?? null,
        orderId: orderId ?? null,
        rating: input.rating,
        comment: input.comment,
      },
    });
    res.status(201).json({ id: review.id, status: review.status });
  }),
);

// ── Customer area: orders, addresses, favorites, loyalty, referrals ──────────

router.get(
  "/me/orders",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const { skip, take } = pagination(req);
    const orders = await prisma.order.findMany({
      where: { customerId: req.customerClaims!.sub },
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { restaurant: { select: { slug: true, name_en: true, name_ar: true, logoUrl: true, currency: true } } },
    });
    res.json({
      orders: orders.map((o) => ({
        orderNo: o.orderNo, status: o.status, total: num(o.total), createdAt: o.createdAt,
        restaurant: o.restaurant, itemCountHint: undefined,
      })),
    });
  }),
);

router.get(
  "/me/addresses",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({
      where: { customerId: req.customerClaims!.sub },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    res.json({ addresses });
  }),
);

router.post(
  "/me/addresses",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      label: z.string().max(60).default(""),
      details: z.string().max(400).default(""),
      lat: z.number(),
      lng: z.number(),
      isDefault: z.boolean().default(false),
    });
    const input = parse(schema, req.body);
    if (input.isDefault) {
      await prisma.address.updateMany({ where: { customerId: req.customerClaims!.sub }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({ data: { ...input, customerId: req.customerClaims!.sub } });
    res.status(201).json({ address });
  }),
);

router.delete(
  "/me/addresses/:id",
  requireCustomer,
  asyncHandler(async (req, res) => {
    await prisma.address.deleteMany({ where: { id: String(req.params.id), customerId: req.customerClaims!.sub } });
    res.json({ success: true });
  }),
);

router.get(
  "/me/favorites",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const favorites = await prisma.favorite.findMany({
      where: { customerId: req.customerClaims!.sub },
      include: {
        restaurant: { select: { slug: true, name_en: true, name_ar: true, logoUrl: true } },
        product: { select: { id: true, name_en: true, name_ar: true, imageUrl: true, price: true } },
      },
    });
    res.json({
      favorites: favorites.map((f) => ({
        restaurant: f.restaurant,
        product: f.product ? { ...f.product, price: num(f.product.price) } : null,
        createdAt: f.createdAt,
      })),
    });
  }),
);

router.put(
  "/me/favorites/:slug",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const r = await restaurantBySlug(String(req.params.slug));
    const productId = typeof req.body?.productId === "string" ? req.body.productId : null;
    const key = { customerId: req.customerClaims!.sub, restaurantId: r.id };
    const existing = await prisma.favorite.findUnique({ where: { customerId_restaurantId: key } });
    if (existing) {
      await prisma.favorite.delete({ where: { customerId_restaurantId: key } });
      res.json({ favorited: false });
      return;
    }
    await prisma.favorite.create({ data: { ...key, productId } });
    res.json({ favorited: true });
  }),
);

router.get(
  "/me/loyalty",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const accounts = await prisma.loyaltyAccount.findMany({
      where: { customerId: req.customerClaims!.sub },
      include: {
        restaurant: { select: { slug: true, name_en: true, name_ar: true, logoUrl: true } },
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    res.json({ accounts });
  }),
);

router.get(
  "/me/referrals",
  requireCustomer,
  asyncHandler(async (req, res) => {
    const customer = await prisma.customer.findUnique({ where: { id: req.customerClaims!.sub } });
    if (!customer) throw new ApiError(404, "Account not found", "not_found");
    const referrals = await prisma.referral.findMany({
      where: { referrerId: customer.id },
      include: { referred: { select: { name: true, createdAt: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({
      referralCode: customer.referralCode,
      referrals: referrals.map((x) => ({
        name: x.referred.name,
        joinedAt: x.referred.createdAt,
        rewardPoints: x.rewardPoints,
        rewardedAt: x.rewardedAt,
      })),
    });
  }),
);

export default router;
