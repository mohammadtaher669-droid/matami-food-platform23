import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ── Security headers ──────────────────────────────────────────────────────────
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// ── Request logging ────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── CORS — allow same origin + localhost dev ──────────────────────────────────
const allowedOrigins = [
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin (same-origin, Postman, curl)
      if (!origin) return cb(null, true);
      if (allowedOrigins.some((re) => re.test(origin))) return cb(null, true);
      // In production the SPA is served from same origin — allow all
      if (process.env["NODE_ENV"] === "production") return cb(null, true);
      cb(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);

// 25 MB limit to accommodate base64-encoded images in store snapshots
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// ── REST API ──────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Static frontend (production single-server mode) ───────────────────────────
const _file = fileURLToPath(import.meta.url);
const _dir  = path.dirname(_file);

const frontendDist = path.resolve(_dir, "../../food-ordering/dist/public");

if (existsSync(frontendDist)) {
  app.use(
    express.static(frontendDist, {
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (path.basename(filePath) === "index.html") {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
        }
      },
    }),
  );

  // SPA fallback
  app.use((_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

export default app;
