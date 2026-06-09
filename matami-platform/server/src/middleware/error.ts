import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../lib/http";

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: "Not found", code: "not_found" });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  const log = (req as Request & { log?: { error: (o: unknown, m?: string) => void } }).log;
  log?.error(err, "unhandled error");
  res.status(500).json({ error: "Internal server error", code: "internal" });
}
