import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny, type output } from "zod";

/** Operational error with an HTTP status; the error middleware serializes it. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export function parse<S extends ZodTypeAny>(schema: S, data: unknown): output<S> {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const first = err.errors[0];
      throw new ApiError(400, first ? `${first.path.join(".")}: ${first.message}` : "Invalid input", "validation");
    }
    throw err;
  }
}

export function pagination(req: Request, defaultSize = 20, maxSize = 100) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(maxSize, Math.max(1, Number(req.query.pageSize) || defaultSize));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function clientIp(req: Request): string {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0]!.trim();
  return req.socket.remoteAddress ?? "unknown";
}
