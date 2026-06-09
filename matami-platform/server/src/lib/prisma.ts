import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

/** Prisma Decimal → number for JSON responses and math. */
export function num(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}
