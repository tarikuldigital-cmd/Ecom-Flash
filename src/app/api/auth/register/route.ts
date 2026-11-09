import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(128),
  businessName: z.string().trim().min(2).max(100),
}).strict();

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "store";
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check your name, email, business name and password (at least 12 characters)." }, { status: 400 });
  }

  const { name, email, password, businessName } = parsed.data;
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) return NextResponse.json({ error: "Unable to create account with these details." }, { status: 409 });

    const passwordHash = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({ data: { name, email, passwordHash } });
      const baseSlug = slugify(businessName);
      const tenantSlug = `${baseSlug}-${createdUser.id.slice(-6).toLowerCase()}`;
      const tenant = await tx.tenant.create({
        data: {
          name: businessName,
          slug: tenantSlug,
          currency: "BDT",
          timezone: "Asia/Dhaka",
          subscriptions: { create: { plan: "STARTER", status: "TRIAL", interval: "MONTHLY", trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) } },
          members: { create: { userId: createdUser.id, role: "OWNER", status: "ACTIVE" } },
          stores: { create: { name: businessName, slug: "main", currency: "BDT", timezone: "Asia/Dhaka" } },
        },
      });
      await tx.auditLog.create({
        data: { tenantId: tenant.id, actorId: createdUser.id, action: "auth.register", entityType: "User", entityId: createdUser.id },
      });
      return createdUser;
    });

    const token = await createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, redirectTo: "/dashboard" }, { status: 201 });
  } catch (error) {
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Account registration is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
