import { getCurrentSession } from "@/lib/auth/session";
import { hasPermission, type MemberRole } from "@/lib/auth/roles";

export type TenantAccessResult =
  | { ok: true; userId: string; tenantId: string; role: MemberRole }
  | { ok: false; reason: "UNAUTHENTICATED" | "TENANT_FORBIDDEN" | "PERMISSION_DENIED" };

export async function checkTenantAccess(tenantId: string, permission?: string): Promise<TenantAccessResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, reason: "UNAUTHENTICATED" };

  const membership = session.user.memberships.find((item) => item.tenantId === tenantId);
  if (!membership) return { ok: false, reason: "TENANT_FORBIDDEN" };

  const role = membership.role as MemberRole;
  if (permission && !hasPermission(role, permission)) {
    return { ok: false, reason: "PERMISSION_DENIED" };
  }

  return { ok: true, userId: session.user.id, tenantId, role };
}
