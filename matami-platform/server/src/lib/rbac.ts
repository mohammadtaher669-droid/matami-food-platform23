/**
 * Role-based access control.
 *
 * SUPER_ADMIN        — platform scope, implicit all permissions.
 * RESTAURANT_OWNER   — implicit all restaurant-scope permissions for their tenant.
 * BRANCH_MANAGER     — fixed subset, scoped to their branch where applicable.
 * STAFF              — only the permissions stored on the user row.
 */

export const PERMISSIONS = [
  "orders.view",
  "orders.manage",
  "catalog.view",
  "catalog.manage",
  "inventory.manage",
  "marketing.manage", // offers, coupons
  "reviews.manage",
  "customers.view",
  "staff.manage",
  "zones.manage",
  "builder.manage", // theme + website builder
  "reports.view",
  "settings.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const BRANCH_MANAGER_PERMISSIONS: Permission[] = [
  "orders.view",
  "orders.manage",
  "catalog.view",
  "inventory.manage",
  "zones.manage",
  "reports.view",
];

export function hasPermission(
  role: "SUPER_ADMIN" | "RESTAURANT_OWNER" | "BRANCH_MANAGER" | "STAFF",
  userPermissions: string[],
  needed: Permission,
): boolean {
  if (role === "SUPER_ADMIN" || role === "RESTAURANT_OWNER") return true;
  if (role === "BRANCH_MANAGER") return BRANCH_MANAGER_PERMISSIONS.includes(needed);
  return userPermissions.includes(needed);
}
