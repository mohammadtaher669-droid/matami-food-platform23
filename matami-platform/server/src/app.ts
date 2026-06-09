import path from "path";
import { existsSync } from "fs";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import pino from "pino";
import authRouter from "./routes/auth";
import publicRouter from "./routes/public";
import adminRouter from "./routes/admin";
import superRouter from "./routes/super";
import { errorHandler, notFound } from "./middleware/error";
import { env } from "./env";

export const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

export function createApp(): Express {
  const app = express();
  app.set("trust proxy", 1);

  // Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=()");
    next();
  });

  app.use(
    pinoHttp({
      logger,
      serializers: {
        req(req) {
          return { method: req.method, url: req.url?.split("?")[0] };
        },
        res(res) {
          return { statusCode: res.statusCode };
        },
      },
    }),
  );

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true); // same-origin / curl
        if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return cb(null, true);
        if (env.isProd) return cb(null, true); // SPA served from same origin in prod
        cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(cookieParser());

  // Global API rate limit (login/order endpoints add stricter local limits)
  app.use(
    "/api",
    rateLimit({ windowMs: 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }),
  );

  app.get("/api/healthz", (_req, res) => {
    res.json({ ok: true, ts: Date.now() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/public", publicRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/super", superRouter);
  app.use("/api", notFound);

  // Static SPA (production single-server mode)
  const webDist = path.resolve(__dirname, "../../web/dist");
  if (existsSync(webDist)) {
    app.use(
      express.static(webDist, {
        maxAge: "1y",
        setHeaders(res, filePath) {
          if (path.basename(filePath) === "index.html" || path.basename(filePath) === "sw.js" || path.basename(filePath) === "manifest.webmanifest") {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          }
        },
      }),
    );
    app.use((_req: Request, res: Response) => {
      res.sendFile(path.join(webDist, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
