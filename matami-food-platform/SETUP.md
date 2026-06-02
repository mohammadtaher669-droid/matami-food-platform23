# 🚀 Mat'ami — Setup & Deployment Guide

## Option A: Railway (Recommended — 5 minutes)

### Prerequisites
- GitHub account
- Railway account (free tier works)

### Steps

**1. Push to GitHub**
```bash
cd matami-food-platform
git init
git add .
git commit -m "Initial commit: Mat'ami food platform"
git remote add origin https://github.com/YOUR_USERNAME/matami-food-platform.git
git push -u origin main
```

**2. Deploy on Railway**
1. Go to [railway.app](https://railway.app) → New Project
2. **Deploy from GitHub repo** → select your repo
3. Railway detects `nixpacks.toml` and builds automatically

**3. Add PostgreSQL**
1. In your Railway project → **+ New** → **Database** → **PostgreSQL**
2. Railway automatically sets `DATABASE_URL` in your app's environment

**4. Set environment variables**
In Railway → your service → **Variables** tab, add:
```
JWT_SECRET=<output of: openssl rand -hex 32>
ADMIN_PASSWORD=<your-secure-password>
NODE_ENV=production
```

**5. Wait for build (~3 min)**
Railway runs: `npm install → db:push → build:railway`

**6. Access your site**
- Public URL shown in Railway → your service → **Settings**
- Admin panel: `https://your-url/admin`

---

## Option B: Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ OR Docker

### With Docker (easiest)
```bash
docker compose up -d postgres     # Start Postgres only
cp .env.example .env              # Configure env
npm install                        # Install deps
npm run db:push                    # Create tables
# Terminal 1:
npm run dev -w artifacts/api-server
# Terminal 2:
npm run dev -w artifacts/food-ordering
```

### Without Docker
```bash
# Start your local Postgres, then:
cp .env.example .env
# Set DATABASE_URL=postgresql://user:pass@localhost:5432/matami
createdb matami  # or use your DB tool
npm install
npm run db:push
# Terminal 1:
npm run dev -w artifacts/api-server
# Terminal 2:
npm run dev -w artifacts/food-ordering
```

Visit: http://localhost:5173  
Admin: http://localhost:5173/admin

---

## Option C: Any VPS (nginx + PM2)

```bash
# On your server:
git clone <your-repo>
cd matami-food-platform
cp .env.example .env && nano .env   # set all vars
npm install
npm run db:push
npm run build:railway

# PM2 process manager
npm install -g pm2
pm2 start "node artifacts/api-server/dist/index.mjs" --name matami
pm2 save && pm2 startup
```

**nginx config** (`/etc/nginx/sites-available/matami`):
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 25M;
    }
}
```
Then: `certbot --nginx -d yourdomain.com` for HTTPS.

---

## Default Credentials

| Setting | Default | Where to Change |
|---------|---------|-----------------|
| Admin Password | `admin123` | `ADMIN_PASSWORD` env var |
| Admin URL | `/admin` | hardcoded |
| API Port | `3001` | `PORT` env var |

⚠️ **Always change `ADMIN_PASSWORD` and `JWT_SECRET` before going live!**

---

## Updating

```bash
git pull origin main
npm install
npm run db:push   # only if schema changed
npm run build:railway
pm2 restart matami  # or redeploy on Railway
```
