import type { Request } from "express";
import { prisma } from "./prisma";
import { clientIp } from "./http";
import type { StaffClaims } from "./jwt";

/** Append-only audit trail for mutating admin actions. Never throws. */
export async function audit(
  req: Request,
  action: string,
  entity: string,
  entityId = "",
  meta: Record<string, unknown> = {},
): Promise<void> {
  const claims = (req as Request & { claims?: StaffClaims }).claims;
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: claims?.sub ?? null,
        restaurantId: claims?.restaurantId ?? null,
        action,
        entity,
        entityId,
        meta: meta as object,
        ip: clientIp(req),
      },
    });
  } catch {
    // audit failures must never break the request
  }
}
