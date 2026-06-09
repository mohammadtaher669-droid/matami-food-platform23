# Mat'ami Platform — UI Wireframes (text spec)

Mobile-first; all screens mirror for RTL (Arabic). `▣` = image/banner, `●` = action.

## Customer website

### Home `/`
```
┌──────────────────────────────┐
│ ☰  Mat'ami        AR/EN  🛒  │  header (platform branding)
│ ▣ hero banner + search bar   │  "ابحث عن مطعم أو طبق"
│ [🍔][🍕][☕][🥙] categories   │  horizontal chips
│ ── Featured restaurants ──   │
│ ▣ card  ▣ card  ▣ card       │  logo, name, rating, delivery fee
│ ── Offers ──                 │
│ ▣ promo  ▣ promo             │
└──────────────────────────────┘
```

### Restaurant site `/r/:slug`
```
┌──────────────────────────────┐
│ ▣ cover banner (restaurant)  │  restaurant theme applied from here down
│ ◯ logo  Name  ★4.8 (210)     │
│ ● Branch: [Olaya ▾]  ● Info  │  branch selector w/ open-now badge
│ [search dishes…]             │
│ ‹Category tabs ————————————› │  sticky
│ ┌─ product row ───────────┐  │
│ │ ▣  Name AR/EN   12.50 ﷼ │  │  tap → product modal
│ └─────────────────────────┘  │
│        [View cart · 3 · 56﷼] │  sticky cart bar
└──────────────────────────────┘
```

### Product modal
image, bilingual name/desc, variant radio group, addon groups with min/max,
qty stepper, notes input, `● Add to cart (price)`.

### Checkout `/r/:slug/checkout`
steps: ① Delivery/Pickup toggle ② address (Google map pin → zone chip: fee,
min order, free-over) ③ schedule now/later ④ payment method list ⑤ coupon +
loyalty redeem ⑥ bill summary (subtotal/delivery/discount/VAT/total) → `● Place order`.

### Tracking `/r/:slug/track/:orderNo`
status timeline NEW→…→DELIVERED with timestamps, driver card (name/phone),
`● Share invoice on WhatsApp` `● View invoice`.

### Profile `/account`
orders history, saved addresses, favorites grid, loyalty wallet (points per
restaurant), referral code card with share button, reviews I wrote.

## Invoice (print/PDF/WhatsApp)
```
┌──────────── A5-ish ────────────┐
│ ◯logo   Restaurant AR + EN     │
│ Branch · Order #1024 · date    │
│ customer / phone / address     │
│ zone · type · payment · driver │
│ ┌ items table AR|EN ─────────┐ │
│ │ 2× شاورما / Shawarma  24.00│ │
│ │   + جبنة extra cheese  2.00│ │
│ └────────────────────────────┘ │
│ subtotal / delivery / discount │
│ VAT 15% / **GRAND TOTAL**      │
│ ☎ web · WhatsApp · [QR]        │
│ شكراً لطلبكم — Thank you!      │
└────────────────────────────────┘
```

## Restaurant admin `/admin`
- **Layout**: collapsible sidebar (Dashboard, Orders, Menu, Categories, Variants &
  Add-ons, Inventory, Offers, Coupons, Reviews, Customers, Staff, Delivery zones,
  Website builder, Theme builder, Reports, Settings) + topbar (branch filter, AR/EN,
  publish state, profile).
- **Dashboard**: KPI cards (today sales, orders, AOV, new customers) + sales line +
  top products bar + live "new orders" feed.
- **Orders**: kanban-ish status columns NEW/ACCEPTED/PREPARING/READY/OUT/DONE with
  cards → drawer (items, customer, zone map, invoice, status buttons, driver info,
  cancel w/ reason).
- **Menu/Products**: table + editor drawer (bilingual fields, category, price, images
  via Cloudinary, variants list, addon-group links, per-branch availability/stock).
- **Delivery zones**: Google map; draw polygon / drop radius; side form (name AR/EN,
  fee, min order, free-over, schedule grid, active).
- **Theme builder**: left = controls (template gallery, colors, fonts, header/footer,
  banners upload); right = live storefront iframe preview; `● Publish` copies
  draft→published.
- **Website builder**: vertical list of homepage sections with drag handles,
  on/off switches, per-section settings (e.g. pick featured products) + preview.

## Super admin `/super`
sidebar: Restaurants, Branches, Users, Plans, Subscriptions, Themes, Zones overview,
Analytics, Revenue, Platform settings.
- **Restaurants**: table (logo, name, slug, plan, status, orders 30d) → create wizard
  (basics → owner account → plan/trial) ● impersonate-free: open public site.
- **Plans**: editable cards (price, limits, features).
- **Subscriptions**: table w/ status chips, renew/cancel, revenue summary header.
- **Analytics**: platform GMV, orders, active restaurants charts; revenue report by
  plan and by restaurant (subscription income).
- **Platform settings**: platform name/logo/colors (branding of marketplace + emails),
  default VAT, default currency, ToS links.
