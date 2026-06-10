# Mat'ami Platform v2

Enterprise-grade multi-tenant SaaS restaurant ordering & delivery platform.
Every restaurant gets its own branded ordering site, menu, branches, delivery
zones and admin panel — the platform owner sells subscriptions on top.

**Stack**: React + TypeScript + Vite + Tailwind + PWA · Node.js + Express + TypeScript ·
PostgreSQL + Prisma · JWT + refresh tokens + RBAC · Cloudinary · Google Maps · AR/EN (RTL).

📚 Docs: [PRD](docs/PRD.md) · [Database & ERD](docs/DATABASE.md) ·
[Architecture](docs/ARCHITECTURE.md) · [Wireframes](docs/WIREFRAMES.md)

## Apps in one deployment

| Area | Path | Who |
|---|---|---|
| Marketplace + restaurant sites | `/`, `/r/:slug` | Customers |
| Customer account | `/account` | Customers |
| Restaurant admin panel | `/admin` | Owners / managers / staff |
| Super admin panel | `/super` | Platform owner |
| JSON API | `/api/*` | — |

## Local development

```bash
npm install
cp .env.example server/.env        # fill DATABASE_URL etc.
npm run db:push                    # create tables
npm run dev                        # server :3000 + web :5173 (proxied)
```

First boot creates the super admin from `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD`,
the 8 theme templates, and 3 starter plans. Sign in at `/admin` → you'll be routed
to `/super`, onboard a restaurant from **Restaurants → Onboard restaurant**.

## Environment variables

| Var | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ (prod) | ≥32 chars, signs access tokens |
| `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` | ✅ (prod) | bootstrap platform owner account |
| `CLOUDINARY_CLOUD_NAME` / `API_KEY` / `API_SECRET` | optional | image uploads (URL input works without) |
| `GOOGLE_MAPS_API_KEY` | optional | map pickers & zone drawing (manual coords fallback) |
| `APP_URL` | optional | public URL used in invoice links |

## Railway deployment

1. New service from this repo, **root directory = `matami-platform`**.
2. Add a PostgreSQL database; set `DATABASE_URL = ${{Postgres.DATABASE_URL}}`.
3. Set `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD` (+ optional vars).
4. Deploy — build runs `prisma generate` + web + server builds; `db:push` runs as
   pre-deploy; Express serves the SPA and `/api` with `/api/healthz` healthcheck.

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | API (tsx watch) + Vite dev server |
| `npm run build` | prisma generate → vite build → tsc build |
| `npm run typecheck` | strict TS, both workspaces |
| `npm test` | vitest unit tests (pricing, geo zones, RBAC) |
| `npm run db:push` | prisma db push |
| `npm start` | run built server (serves SPA + API) |
