import type { Request, Response, NextFunction } from "express";

type ZodLike = {
  safeParse(data: unknown): { success: true; data: any } | { success: false; error: any };
};

/**
 * Returns Express middleware that validates req.body against a Zod schema.
 */
export function validateBody(schema: ZodLike) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues: Array<{ field: string; message: string }> = (result.error?.issues ?? []).map(
        (issue: { path?: (string | number)[]; message?: string }) => ({
          field: (issue.path ?? []).join("."),
          message: issue.message ?? "Invalid",
        })
      );
      res.status(400).json({ error: "Validation failed", details: issues });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Wraps an async route handler so uncaught errors become 500 responses.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
