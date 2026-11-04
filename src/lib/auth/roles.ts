export const MEMBER_ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF", "VIEWER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

const ROLE_PERMISSIONS: Record<MemberRole, readonly string[]> = {
  OWNER: ["*"],
  ADMIN: ["*"],
  MANAGER: ["orders.read", "orders.write", "products.read", "products.write", "inventory.read", "inventory.write", "customers.read", "reports.read", "team.read"],
  STAFF: ["orders.read", "orders.write", "products.read", "inventory.read", "customers.read"],
  VIEWER: ["orders.read", "products.read", "inventory.read", "customers.read", "reports.read"],
};

export function hasPermission(role: MemberRole, permission: string): boolean {
  const grants = ROLE_PERMISSIONS[role];
  return grants.includes("*") || grants.includes(permission);
}
