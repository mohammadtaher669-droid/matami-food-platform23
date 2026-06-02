# 🍽️ Mat'ami — Multi-Restaurant Food Ordering Platform

A production-ready, bilingual (Arabic/English) food ordering platform with a full admin dashboard. Built with React, TypeScript, Express, PostgreSQL, and Drizzle ORM.

## ✨ Features

### Customer Experience
- 🌐 **Bilingual** — Full Arabic (RTL) and English support with instant switching
- 📱 **Mobile-first** — Responsive design optimized for all devices
- 🛒 **Smart cart** — Cross-restaurant protection with confirmation dialog
- 🎟️ **Coupons & offers** — Apply discount codes at checkout
- ❤️ **Favorites** — Save items for quick reordering
- 👤 **Customer profiles** — Order history and saved addresses
- ⭐ **Reviews & ratings** — Rate restaurants and dishes
- 📍 **Delivery zones** — Radius and polygon-based delivery area checks
- 🗺️ **Branch maps** — Interactive Leaflet maps for branch locations
- 🍔 **Modifiers** — Full modifier/add-on system (size, extras, etc.)
- 📦 **Order tracking** — Order status flow from pending to delivered

### Admin Dashboard (`/admin`)
- 🏪 **Restaurants** — Full CRUD with logo, colors, cover images
- 🏢 **Branches** — Per-branch hours, delivery zones, WhatsApp
- 📋 **Menu management** — Categories, items, images, modifiers, add-ons
- 🎯 **Offers & coupons** — Time-limited discounts, promo codes
- 🖼️ **Banners & sliders** — Homepage hero images
- 🎨 **Appearance** — Colors, fonts, layout, card styles (live preview)
- 👥 **Customers (CRM)** — Customer list, order history, spend analytics
- 📊 **Analytics** — Page views, conversion rates, popular items, peak hours
- 🔀 **Menu sorting** — Drag-and-drop category and item ordering
- 📥 **Menu import** — Bulk import via Excel/JSON
- 🌍 **Content control** — Homepage section ordering, nav customization

## 🗂️ Project Structure

```
matami-food-platform/
├── artifacts/
│   ├── api-server/          # Express + Node.js backend
│   │   ├── src/
│   │   │   ├── app.ts       # Express app with CORS, security headers
│   │   │   ├── index.ts     # Server entry point
│   │   │   ├── routes/      # All API route handlers
│   │   │   └── lib/         # Auth, logging, validation, seeding
│   │   ├── build.mjs        # esbuild bundler config
│   │   └── package.json
│   └── food-ordering/       # React frontend (Vite + Tailwind v4)
│       ├── src/
│       │   ├── App.tsx      # Router and providers
│       │   ├── components/  # Shared UI components
│       │   ├── contexts/    # Cart and Language contexts
│       │   ├── hooks/       # useStore, use-mobile, use-toast
│       │   ├── lib/         # Store, themeUtils, adminAuth, sync
│       │   └── pages/       # Customer pages + admin/* pages
│       ├── public/          # Static assets
│       └── vite.config.ts
├── lib/
│   ├── db/                  # Drizzle ORM schema + migrations
│   │   ├── src/schema/      # All table definitions
│   │   └── drizzle/         # Migration SQL files
│   └── api-zod/             # Shared Zod schemas (health check, etc.)
├── .env.example             # Environment variables template
├── package.json             # Workspace root
├── railway.json             # Railway deployment config
├── nixpacks.toml            # Nixpacks build config
└── README.md
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (local or cloud)

### 1. Clone and install
```bash
git clone <your-repo-url>
cd matami-food-platform
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, ADMIN_PASSWORD
```

### 3. Push database schema
```bash
npm run db:push
```

### 4. Start development servers
```bash
# In two terminals:
npm run dev -w artifacts/api-server   # Backend on :3001
npm run dev -w artifacts/food-ordering # Frontend on :5173 (proxied to :3001)
```

Visit: http://localhost:5173  
Admin: http://localhost:5173/admin  
Password: whatever you set in `ADMIN_PASSWORD` (default: `admin123` in dev)

## 🚢 Deploy to Railway

1. Fork/push this repo to GitHub
2. Create a new Railway project → Deploy from GitHub repo
3. Add a **PostgreSQL** plugin in Railway
4. Set environment variables in Railway → Variables:
   - `JWT_SECRET` — `openssl rand -hex 32`
   - `ADMIN_PASSWORD` — your secure password
   - `NODE_ENV=production`
   - `DATABASE_URL` is auto-injected by the PostgreSQL plugin
5. Railway will run `npm install && npm run db:push && npm run build:railway` automatically

## 🔐 Security Notes

- **JWT_SECRET** must be at least 32 random characters in production
- **ADMIN_PASSWORD** should be changed before going live
- The admin panel uses timing-safe password comparison and IP-based rate limiting (5 attempts / 15 min)
- All admin API routes require a valid JWT bearer token
- CORS is locked to same-origin in production

## 📊 Database Schema

| Table | Purpose |
|-------|---------|
| `restaurants` | Restaurant brands |
| `branches` | Physical locations with delivery zones |
| `categories` | Menu categories per restaurant |
| `menu_items` | Individual dishes with images, prices, flags |
| `modifier_groups` | Customization groups (e.g. "Size", "Extras") |
| `modifier_options` | Individual modifier choices with price additions |
| `add_ons` | Standalone add-ons per item |
| `item_modifier_links` | Many-to-many: items ↔ modifier groups |
| `branch_item_overrides` | Per-branch item availability/price overrides |
| `branch_category_overrides` | Per-branch category visibility |
| `offers` | Promotional offers and banners |
| `coupons` | Discount codes |
| `banners` | Homepage hero slider images |
| `orders` | Customer orders |
| `customers` | Customer CRM data |
| `app_settings` | Platform-wide appearance & content settings |

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS v4 |
| UI Components | shadcn/ui (Radix UI), Framer Motion, Lucide |
| State | Zustand-like custom store + TanStack Query |
| Routing | Wouter (tiny React router) |
| Backend | Express 5, Node.js 20, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | JWT (jsonwebtoken) |
| Maps | Leaflet + react-leaflet |
| Build | esbuild (server), Vite (client) |
| Deploy | Railway (Nixpacks) |

## 📝 License

MIT — free to use, modify, and deploy.
