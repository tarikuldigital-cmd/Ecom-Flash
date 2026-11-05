import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";
const inviteSchema = z.object({ tenantId: z.string().min(1), email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), role: z.enum(["ADMIN", "MANAGER", "STAFF", "VIEWER"]) }).strict();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "team.read");
    if (!access.ok) return NextResponse.json({ error: "You do not have permission to view this team." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const [members, invitations] = await Promise.all([
      prisma.membership.findMany({ where: { tenantId }, include: { user: { select: { id: true, name: true, email: true, createdAt: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] }),
      prisma.teamInvitation.findMany({ where: { tenantId, acceptedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, email: true, role: true, expiresAt: true, createdAt: true }, orderBy: { createdAt: "desc" } }),
    ]);
    return NextResponse.json({ members, invitations, currentUserId: access.userId, canManage: access.role === "OWNER" || access.role === "ADMIN", currentRole: access.role });
  } catch (error) {
    console.error("Team list failed:", error);
    return NextResponse.json({ error: "Team information is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email and role." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "team.write");
    if (!access.ok) return NextResponse.json({ error: "Only workspace owners and admins can invite team members." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    if (data.role === "ADMIN" && access.role !== "OWNER") return NextResponse.json({ error: "Only the workspace owner can invite an admin." }, { status: 403 });

    const existingUser = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
    if (existingUser) {
      const existingMembership = await prisma.membership.findUnique({ where: { userId_tenantId: { userId: existingUser.id, tenantId: data.tenantId } } });
      if (existingMembership) return NextResponse.json({ error: "This user is already part of the workspace." }, { status: 409 });
      const membership = await prisma.membership.create({ data: { userId: existingUser.id, tenantId: data.tenantId, role: data.role, status: "ACTIVE" }, include: { user: { select: { id: true, name: true, email: true } } } });
      await prisma.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "team.member_added", entityType: "Membership", entityId: membership.id, metadata: { email: data.email, role: data.role } } });
      return NextResponse.json({ membership, message: "Existing account added to the workspace." }, { status: 201 });
    }

    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const invitation = await prisma.teamInvitation.upsert({
      where: { tenantId_email: { tenantId: data.tenantId, email: data.email } },
      create: { tenantId: data.tenantId, email: data.email, role: data.role, tokenHash: hash(token), invitedById: access.userId, expiresAt },
      update: { role: data.role, tokenHash: hash(token), invitedById: access.userId, expiresAt, acceptedAt: null },
      select: { id: true, email: true, role: true, expiresAt: true },
    });
    await prisma.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "team.invitation_created", entityType: "TeamInvitation", entityId: invitation.id, metadata: { email: data.email, role: data.role } } });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    return NextResponse.json({ invitation, inviteUrl: `${origin.replace(/\/$/, "")}/invite/accept?token=${token}`, message: "Invitation link created. Share it securely with the invited person; email delivery is not configured yet." }, { status: 201 });
  } catch (error) {
    console.error("Team invitation failed:", error);
    return NextResponse.json({ error: "Could not create this invitation." }, { status: 503 });
  }
}
