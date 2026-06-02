import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import healthRouter from "./health";
import adminAuthRouter from "./adminAuth";
import storeSyncRouter from "./storeSync";
import catalogRouter from "./catalog";
import offersRouter from "./offers";
import contentRouter from "./content";
import crmRouter from "./crm";
import modifiersRouter from "./modifiers";
import bulkRouter from "./bulk";
import imagesRouter from "./images";
import seedRouter from "./seed";

const router: IRouter = Router();

// Core endpoints
router.use(healthRouter);
router.use(adminAuthRouter);
router.use(storeSyncRouter);

// Database-backed REST API
router.use(catalogRouter);
router.use(offersRouter);
router.use(contentRouter);
router.use(crmRouter);
router.use(modifiersRouter);
router.use(bulkRouter);
router.use(imagesRouter);
router.use(seedRouter);

// Global error handler
router.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status: number = err.status ?? err.statusCode ?? 500;
  const message: string = err.message ?? "Internal server error";
  res.status(status).json({ error: message });
});

export default router;
