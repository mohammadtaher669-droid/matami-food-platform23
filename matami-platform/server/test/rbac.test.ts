import { describe, expect, it } from "vitest";
import { hasPermission } from "../src/lib/rbac";

describe("hasPermission", () => {
  it("super admin and owner have everything", () => {
    expect(hasPermission("SUPER_ADMIN", [], "staff.manage")).toBe(true);
    expect(hasPermission("RESTAURANT_OWNER", [], "builder.manage")).toBe(true);
  });

  it("branch manager has the fixed operational subset only", () => {
    expect(hasPermission("BRANCH_MANAGER", [], "orders.manage")).toBe(true);
    expect(hasPermission("BRANCH_MANAGER", [], "inventory.manage")).toBe(true);
    expect(hasPermission("BRANCH_MANAGER", [], "staff.manage")).toBe(false);
    expect(hasPermission("BRANCH_MANAGER", [], "builder.manage")).toBe(false);
  });

  it("staff only get explicitly granted permissions", () => {
    expect(hasPermission("STAFF", ["orders.view"], "orders.view")).toBe(true);
    expect(hasPermission("STAFF", ["orders.view"], "orders.manage")).toBe(false);
    expect(hasPermission("STAFF", [], "orders.view")).toBe(false);
  });
});
