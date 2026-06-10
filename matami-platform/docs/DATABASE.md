# Mat'ami Platform — Database Design

PostgreSQL via Prisma ORM. All money values are stored as `Decimal(10,2)`; all
user-facing text is bilingual (`*_en` / `*_ar`). Every tenant-owned row carries
`restaurantId` — the API layer always filters by it (tenant isolation).

## ERD

```mermaid
erDiagram
    Plan ||--o{ Subscription : "subscribed via"
    Restaurant ||--o{ Subscription : has
    Restaurant ||--o{ Branch : has
    Restaurant ||--o{ User : staff
    Restaurant ||--o{ Category : has
    Restaurant ||--o{ Product : has
    Restaurant ||--o{ AddonGroup : has
    Restaurant ||--o{ Coupon : has
    Restaurant ||--o{ Offer : has
    Restaurant ||--o{ Order : receives
    Restaurant ||--o{ Review : receives
    Restaurant ||--o{ LoyaltyAccount : "loyalty per customer"
    Restaurant ||--o{ AuditLog : logs

    Branch ||--o{ DeliveryZone : covers
    Branch ||--o{ BranchInventory : stocks
    Branch ||--o{ Order : fulfils

    Category ||--o{ Product : contains
    Product ||--o{ ProductVariant : variants
    Product ||--o{ ProductAddonGroup : "addon links"
    AddonGroup ||--o{ Addon : options
    AddonGroup ||--o{ ProductAddonGroup : "addon links"
    Product ||--o{ BranchInventory : "per-branch stock"
    Product ||--o{ Favorite : favorited

    Customer ||--o{ Order : places
    Customer ||--o{ Address : saves
    Customer ||--o{ Review : writes
    Customer ||--o{ Favorite : has
    Customer ||--o{ LoyaltyAccount : earns
    Customer ||--o{ Referral : refers

    Order ||--o{ OrderItem : contains
    Order ||--o{ OrderStatusEvent : history
    DeliveryZone ||--o{ Order : "resolved zone"
    Coupon ||--o{ Order : "applied to"

    User ||--o{ RefreshToken : sessions
    User ||--o{ AuditLog : acts
    LoyaltyAccount ||--o{ LoyaltyTransaction : ledger
    ThemeTemplate ||--o{ Restaurant : "applied preset"
```

## Model groups

| Group | Models | Notes |
|---|---|---|
| Tenancy | `Restaurant`, `Branch` | `Restaurant.theme/themeDraft/homepage/settings/socials` are JSON documents powering the no-code builders |
| Access | `User`, `RefreshToken` | `User.role` ∈ SUPER_ADMIN / RESTAURANT_OWNER / BRANCH_MANAGER / STAFF; `User.permissions[]` refines STAFF |
| Billing | `Plan`, `Subscription` | limits + feature flags as JSON on plan |
| Catalog | `Category`, `Product`, `ProductVariant`, `AddonGroup`, `Addon`, `ProductAddonGroup`, `BranchInventory` | |
| Customers | `Customer`, `Address`, `Favorite`, `LoyaltyAccount`, `LoyaltyTransaction`, `Referral` | customers are platform-global; loyalty is per restaurant |
| Ordering | `Order`, `OrderItem`, `OrderStatusEvent` | item rows snapshot names/prices at purchase time |
| Marketing | `Coupon`, `Offer`, `Review` | review moderation via `status` |
| Delivery | `DeliveryZone` | `POLYGON` (GeoJSON-like ring) or `RADIUS` (center+km); fee, minOrder, freeOver, weekly schedule JSON |
| Theming | `ThemeTemplate` | global presets managed by super admin |
| Platform | `PlatformSetting`, `AuditLog` | singleton JSON settings; append-only audit trail |

## Key invariants

1. **Tenant isolation** — every query in the admin API derives `restaurantId` from the
   JWT, never from the request body.
2. **Price integrity** — `Order.subtotal/deliveryFee/discount/vatAmount/total` are
   computed server-side from DB prices at order time; order items snapshot
   bilingual names and unit prices.
3. **Refresh-token rotation** — `RefreshToken` rows store SHA-256 hashes only;
   reuse of a rotated token revokes the whole session family.
4. **Soft availability** — products/categories/branches/zones use `isActive` flags;
   nothing is hard-deleted by storefront actions.
5. **Audit** — mutating admin endpoints append `AuditLog(actor, action, entity, meta, ip)`.
