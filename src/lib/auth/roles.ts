export const MEMBER_ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

const ROLE_PERMISSIONS: Record<MemberRole, readonly string[]> = {
  OWNER: ["*"],
  ADMIN: ["*"],
  MANAGER: ["orders.read", "orders.write", "products.read", "products.write", "inventory.read", "inventory.write", "customers.read", "customers.write", "courier.read", "courier.write", "reports.read", "team.read", "pages.read", "pages.write", "store.read", "store.write"],
  STAFF: ["orders.read", "orders.write", "products.read", "inventory.read", "customers.read", "courier.read", "courier.write", "pages.read", "store.read"],
  VIEWER: ["orders.read", "products.read", "inventory.read", "customers.read", "courier.read", "reports.read"],
};

export function hasPermission(role: MemberRole, permission: string): boolean {
  const grants = ROLE_PERMISSIONS[role];
  return grants.includes("*") || grants.includes(permission);
}
