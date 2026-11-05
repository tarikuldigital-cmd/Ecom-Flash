import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";
const schema = z.object({ token: z.string().min(20).max(200) }).strict();
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Sign in with the invited email address before accepting this invitation." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid invitation token." }, { status: 400 });
  try {
    const invitation = await prisma.teamInvitation.findUnique({ where: { tokenHash: hash(parsed.data.token) } });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) return NextResponse.json({ error: "This invitation is invalid, expired or already used." }, { status: 410 });
    if (invitation.email.toLowerCase() !== session.user.email.toLowerCase()) return NextResponse.json({ error: "This invitation was sent to a different email address. Sign in with the invited account." }, { status: 403 });
    const membership = await prisma.$transaction(async tx => {
      const existing = await tx.membership.findUnique({ where: { userId_tenantId: { userId: session.user.id, tenantId: invitation.tenantId } } });
      if (existing) throw new Error("ALREADY_MEMBER");
      const joined = await tx.membership.create({ data: { userId: session.user.id, tenantId: invitation.tenantId, role: invitation.role, status: "ACTIVE" } });
      await tx.teamInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
      await tx.auditLog.create({ data: { tenantId: invitation.tenantId, actorId: session.user.id, action: "team.invitation_accepted", entityType: "Membership", entityId: joined.id, metadata: { email: invitation.email, role: invitation.role } } });
      return joined;
    });
    return NextResponse.json({ membership, message: "You have joined the workspace." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ALREADY_MEMBER") return NextResponse.json({ error: "You are already a member of this workspace." }, { status: 409 });
    console.error("Invitation acceptance failed:", error);
    return NextResponse.json({ error: "Could not accept this invitation." }, { status: 503 });
  }
}
