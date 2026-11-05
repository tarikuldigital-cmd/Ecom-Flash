import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";
const schema = z.object({ tenantId: z.string().min(1), role: z.enum(["ADMIN", "MANAGER", "STAFF", "VIEWER"]).optional(), status: z.enum(["ACTIVE", "SUSPENDED"]).optional() }).strict().refine(v => Boolean(v.role || v.status));

async function manager(tenantId: string) {
  const access = await checkTenantAccess(tenantId, "team.write");
  if (!access.ok) return { response: NextResponse.json({ error: "Only workspace owners and admins can manage members." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 }) };
  return { access };
}

export async function PATCH(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid role or member status." }, { status: 400 });
  const data = parsed.data;
  const result = await manager(data.tenantId);
  if (!result.access) return result.response;
  const access = result.access;
  if (data.role === "ADMIN" && access.role !== "OWNER") return NextResponse.json({ error: "Only the workspace owner can assign the admin role." }, { status: 403 });
  try {
    const member = await prisma.membership.findFirst({ where: { id: membershipId, tenantId: data.tenantId }, include: { user: { select: { id: true, email: true } } } });
    if (!member) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    if (member.role === "OWNER") return NextResponse.json({ error: "The workspace owner role cannot be changed here." }, { status: 409 });
    if (member.userId === access.userId) return NextResponse.json({ error: "You cannot change your own role or status." }, { status: 409 });
    if (access.role === "ADMIN" && member.role === "ADMIN") return NextResponse.json({ error: "Admins cannot manage another admin." }, { status: 403 });
    const updated = await prisma.membership.update({ where: { id: membershipId }, data: { ...(data.role ? { role: data.role } : {}), ...(data.status ? { status: data.status } : {}) }, include: { user: { select: { id: true, name: true, email: true } } } });
    await prisma.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "team.member_updated", entityType: "Membership", entityId: membershipId, metadata: { previousRole: member.role, role: updated.role, previousStatus: member.status, status: updated.status } } });
    return NextResponse.json({ membership: updated });
  } catch (error) {
    console.error("Team member update failed:", error);
    return NextResponse.json({ error: "Could not update this team member." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ membershipId: string }> }) {
  const { membershipId } = await context.params;
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  const result = await manager(tenantId);
  if (!result.access) return result.response;
  const access = result.access;
  try {
    const member = await prisma.membership.findFirst({ where: { id: membershipId, tenantId } });
    if (!member) return NextResponse.json({ error: "Team member not found." }, { status: 404 });
    if (member.role === "OWNER") return NextResponse.json({ error: "The workspace owner cannot be removed." }, { status: 409 });
    if (member.userId === access.userId) return NextResponse.json({ error: "You cannot remove your own membership." }, { status: 409 });
    if (access.role === "ADMIN" && member.role === "ADMIN") return NextResponse.json({ error: "Admins cannot remove another admin." }, { status: 403 });
    await prisma.$transaction([
      prisma.membership.delete({ where: { id: membershipId } }),
      prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "team.member_removed", entityType: "Membership", entityId: membershipId, metadata: { removedUserId: member.userId, previousRole: member.role } } }),
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Team member removal failed:", error);
    return NextResponse.json({ error: "Could not remove this team member." }, { status: 503 });
  }
}
