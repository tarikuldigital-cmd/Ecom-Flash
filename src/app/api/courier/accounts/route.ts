import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";
const providerSchema = z.enum(["PATHAO", "STEADFAST", "REDX", "PAPERFLY", "ECOURIER", "OTHER"]);
const schema = z.object({ tenantId: z.string().min(1), provider: providerSchema, displayName: z.string().trim().min(2).max(100), accountReference: z.string().trim().max(160).optional(), isEnabled: z.boolean().default(false) }).strict();

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid courier provider and display name." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "courier.write");
    if (!access.ok) return NextResponse.json({ error: access.reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have permission to configure couriers." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const account = await prisma.courierAccount.upsert({
      where: { tenantId_provider: { tenantId: data.tenantId, provider: data.provider } },
      create: { tenantId: data.tenantId, provider: data.provider, displayName: data.displayName, accountReference: data.accountReference || null, isEnabled: data.isEnabled },
      update: { displayName: data.displayName, accountReference: data.accountReference || null, isEnabled: data.isEnabled },
    });
    await prisma.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "courier.account_configured", entityType: "CourierAccount", entityId: account.id, metadata: { provider: data.provider, isEnabled: data.isEnabled } } });
    return NextResponse.json({ account, message: "Courier profile saved. API credentials and official booking integration are not connected yet." }, { status: 201 });
  } catch (error) {
    console.error("Courier account save failed:", error);
    return NextResponse.json({ error: "Could not save courier profile." }, { status: 503 });
  }
}
