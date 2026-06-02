# Mat'ami API Server

Express 5 + Drizzle ORM REST API for the Mat'ami food ordering platform.

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/admin/login` | — | Returns JWT `{ token }` |
| GET | `/api/admin/verify` | Bearer | Verify session token |
| GET | `/api/healthz` | — | Health check |
| GET | `/api/data` | — | Full catalog snapshot (used by frontend hydration) |
| POST | `/api/data` | Bearer | Bulk-upsert all catalog entities from a JSON snapshot |
| GET | `/api/restaurants` | — | List restaurants |
| POST | `/api/restaurants` | Bearer | Create / upsert restaurant |
| PUT | `/api/restaurants/:id` | Bearer | Update restaurant |
| DELETE | `/api/restaurants/:id` | Bearer | Delete restaurant |
| GET | `/api/branches` | — | List branches |
| POST | `/api/branches` | Bearer | Create / upsert branch |
| PUT | `/api/branches/:id` | Bearer | Update branch |
| DELETE | `/api/branches/:id` | Bearer | Delete branch |
| GET | `/api/categories` | — | List categories |
| POST | `/api/categories` | Bearer | Create / upsert category |
| PUT | `/api/categories/:id` | Bearer | Update category |
| DELETE | `/api/categories/:id` | Bearer | Delete category |
| GET | `/api/menu-items` | — | List menu items |
| POST | `/api/menu-items` | Bearer | Create / upsert item |
| PUT | `/api/menu-items/:id` | Bearer | Update item |
| DELETE | `/api/menu-items/:id` | Bearer | Delete item |
| GET | `/api/offers` | — | List offers |
| POST | `/api/offers` | Bearer | Create offer |
| PUT | `/api/offers/:id` | Bearer | Update offer |
| DELETE | `/api/offers/:id` | Bearer | Delete offer |
| GET | `/api/coupons` | — | List coupons |
| POST | `/api/coupons` | Bearer | Create coupon |
| POST | `/api/coupons/validate` | — | Validate coupon code |
| PUT | `/api/coupons/:id` | Bearer | Update coupon |
| DELETE | `/api/coupons/:id` | Bearer | Delete coupon |
| GET | `/api/banners` | — | List banners |
| POST | `/api/banners` | Bearer | Create banner |
| PUT | `/api/banners/:id` | Bearer | Update banner |
| DELETE | `/api/banners/:id` | Bearer | Delete banner |
| GET | `/api/settings` | — | Get app settings |
| PATCH | `/api/settings` | Bearer | Update app settings |
| GET | `/api/orders` | Bearer | List orders |
| POST | `/api/orders` | — | Submit new order |
| GET | `/api/customers` | Bearer | List customers |
| POST | `/api/images/upload` | Bearer | Upload image to Cloudinary |
| GET | `/api/cloudinary/config` | — | Check if Cloudinary is configured |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string. SSL is auto-enabled for non-localhost hosts (Railway, Neon, Supabase, etc.) |
| `PORT` | ✅ | Server port. Injected automatically by Railway. |
| `JWT_SECRET` | ✅ | Secret for signing admin JWTs. Use `openssl rand -hex 32`. Falls back to an insecure hardcoded string in development — **always set this in production**. |
| `ADMIN_PASSWORD` | ✅ | Password for the `/admin` panel. |
| `CLOUDINARY_CLOUD_NAME` | ☐ | Cloudinary cloud name. |
| `CLOUDINARY_API_KEY` | ☐ | Cloudinary API key. |
| `CLOUDINARY_API_SECRET` | ☐ | Cloudinary API secret. |
| `CLOUDINARY_URL` | ☐ | Alternative single-string Cloudinary config: `cloudinary://KEY:SECRET@CLOUD`. |

## Local Development

```bash
# From the monorepo root
pnpm --filter @workspace/api-server run dev
```

The server builds with esbuild (`build.mjs`) and starts on `$PORT` (default 8080 in Replit workflows).

## Production (Railway)

Railway build command (see `railway.json`):

```
npm install && npm run db:push && npm run build:railway
```

1. `db:push` — runs `drizzle-kit push` to sync the Drizzle schema to the Railway PostgreSQL plugin
2. `build:railway` — compiles both the frontend and the API server
3. Start command: `node artifacts/api-server/dist/index.mjs`

On first boot, `autoSeedIfEmpty()` runs and populates the database with the three default restaurants, six branches, 100+ menu items, offers, and coupons.

## SSL

The database client (`lib/db/src/index.ts`) auto-enables `ssl: { rejectUnauthorized: false }` for any `DATABASE_URL` that is not localhost / 127.0.0.1 / Docker Compose internal network. This covers Railway's public proxy (`crossover.proxy.rlwy.net`) and all other managed Postgres hosts. Railway's **internal** URL (`postgres.railway.internal`) is excluded — it runs on a private network with no SSL requirement.
