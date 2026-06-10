# Mat'ami Platform — Product Requirements Document

## 1. Vision

Mat'ami is a multi-tenant SaaS restaurant ordering and delivery platform (inspired by
HungerStation, Jahez, Talabat, Deliveroo, Uber Eats). The platform owner sells
subscriptions to restaurants; every restaurant gets its own branded ordering website,
menu, branches, delivery zones and admin panel — all under one deployment.

## 2. Actors & Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Super Admin** | Platform | Manage restaurants, branches, users, plans, subscriptions, themes, global analytics, platform settings & branding, revenue reports |
| **Restaurant Owner** | One restaurant | Full restaurant admin: menu, orders, staff, zones, theme/website builder, reports |
| **Branch Manager** | One branch | Orders, inventory and zone management for their branch |
| **Staff** | One restaurant/branch | Permission-scoped subset (e.g. orders only) |
| **Customer** | Platform | Browse, order, track, review, earn loyalty points, refer friends |

## 3. Functional Requirements

### 3.1 Multi-tenancy
- Unlimited restaurants and branches; every restaurant addressed by slug (`/r/:slug`).
- Tenant isolation enforced server-side: every admin query is scoped by the
  authenticated user's `restaurantId`; cross-tenant access is impossible by construction.
- Independent settings, branding, theme, homepage layout per restaurant.

### 3.2 Subscriptions & Billing
- Plans (name, monthly/yearly price, limits: branches, products, staff; feature flags).
- Subscription lifecycle: `TRIAL → ACTIVE → PAST_DUE → CANCELED/EXPIRED`.
- Storefront of a restaurant with a non-active subscription is automatically suspended.
- Revenue reports for the platform owner.

### 3.3 Catalog
- Categories → Products → Variants (size/option with price delta) + Add-on groups
  (min/max select) → Add-ons (priced extras). Bilingual names/descriptions everywhere.
- Per-branch inventory (track stock, out-of-stock auto-hide), per-branch availability.

### 3.4 Ordering
- Cart → checkout (delivery/pickup, address with map pin, zone resolution, coupon,
  loyalty redemption, scheduled orders) → order lifecycle:
  `NEW → ACCEPTED → PREPARING → READY → OUT_FOR_DELIVERY → DELIVERED` (+ `CANCELED`, scheduled flag).
- Server is the single source of truth for pricing: subtotal, per-zone delivery fee,
  coupon/offer discount, VAT, grand total are always recomputed server-side.
- Status history is recorded for tracking; customers track orders live by order number.

### 3.5 Delivery zones
- Polygon zones (Google Maps drawing) and radius zones per branch.
- Per-zone fee, minimum order, free-delivery threshold, schedule (days/hours).
- Checkout resolves the customer pin → branch + zone (point-in-polygon / haversine).

### 3.6 Theme & Website builder (no-code)
- Theme: colors, fonts, backgrounds, banners, header/footer config, layout presets.
- 8 ready templates: Bukhari, Burger, Pizza, Cafe, Cloud Kitchen, Traditional Arabic,
  Lebanese, Fast Food.
- Homepage builder: reorderable, toggleable sections (hero, featured products,
  featured categories, promo blocks, testimonials, socials footer).
- Live preview + one-click publish (draft vs published theme documents).

### 3.7 Communication & Invoice
- Bilingual (AR/EN) order invoice: restaurant logo/name, branch, order number,
  date/time, customer info, zone, order type, payment method, driver info, items table
  (AR|EN name, qty, unit, total, add-ons, notes), summary (subtotal, delivery, discount,
  VAT, grand total), footer (contacts, website, WhatsApp, QR code, bilingual thank-you).
- Shareable via WhatsApp (wa.me deep link with text invoice + hosted HTML invoice URL),
  printable and PDF-export ready (print stylesheet).
- Notification architecture: pluggable channels (WhatsApp / SMS / Email / Push) with
  per-restaurant configuration; WhatsApp deep-links work with zero external accounts.

### 3.8 Analytics
- Sales/revenue over time, branch performance, product performance, customer analytics,
  delivery (zone) analytics, coupon analytics — per restaurant and global (super admin).

### 3.9 Payments
- `PaymentMethod` enum already covers Mada, STC Pay, Apple Pay, Google Pay, Visa,
  Mastercard, Cash on Delivery. Cash works out of the box; card/wallet methods are
  architected behind a `PaymentProvider` interface so gateways can be added without
  schema changes.

## 4. Non-functional Requirements

- **Security**: JWT access (15 min) + rotating refresh tokens (httpOnly cookie), bcrypt,
  RBAC permission matrix, audit logs, rate limiting, no hardcoded credentials (super
  admin bootstrapped from env vars).
- **i18n**: Arabic (RTL) + English (LTR) across storefront and both admin panels.
- **Mobile-first**: responsive layouts, PWA (installable, offline shell).
- **Hosting**: single Railway service — Express serves API + built SPA; Postgres add-on;
  Cloudinary for media; Google Maps for zones/addresses.

## 5. Out of scope (this release)

- Live payment-gateway charging (architecture ready, no live gateway keys).
- Driver mobile app (driver info is recorded on orders manually).
- Native push (web push hooks in place behind notification abstraction).
