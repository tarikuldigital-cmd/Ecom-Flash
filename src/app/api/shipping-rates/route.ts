import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";
const createSchema = z.object({
  tenantId: z.string().min(1),
  zoneName: z.string().trim().min(2).max(100),
  city: z.string().trim().min(2).max(100),
  charge: z.number().min(0).max(1000000),
  freeShippingMinimum: z.number().min(0).max(10000000).nullable().optional(),
  isActive: z.boolean().default(true),
}).strict();
const updateSchema = createSchema.extend({ rateId: z.string().min(1) }).strict();

function deny(reason: string) {
  return NextResponse.json({ error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have permission to manage delivery rates." }, { status: reason === "UNAUTHENTICATED" ? 401 : 403 });
}

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "courier.read");
    if (!access.ok) return deny(access.reason);
    const rates = await prisma.deliveryRate.findMany({ where: { tenantId }, orderBy: [{ city: "asc" }] });
    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Delivery rates list failed:", error);
    return NextResponse.json({ error: "Could not load delivery rates." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid zone, city and delivery charge." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "courier.write");
    if (!access.ok) return deny(access.reason);
    const rate = await prisma.deliveryRate.upsert({
      where: { tenantId_city: { tenantId: data.tenantId, city: data.city } },
      create: { tenantId: data.tenantId, zoneName: data.zoneName, city: data.city, charge: data.charge, freeShippingMinimum: data.freeShippingMinimum ?? null, isActive: data.isActive },
      update: { zoneName: data.zoneName, charge: data.charge, freeShippingMinimum: data.freeShippingMinimum ?? null, isActive: data.isActive },
    });
    await prisma.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "shipping.rate_saved", entityType: "DeliveryRate", entityId: rate.id, metadata: { city: rate.city, charge: Number(rate.charge), isActive: rate.isActive } } });
    return NextResponse.json({ rate }, { status: 201 });
  } catch (error) {
    console.error("Delivery rate save failed:", error);
    return NextResponse.json({ error: "Could not save delivery rate." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid delivery rate." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "courier.write");
    if (!access.ok) return deny(access.reason);
    const updated = await prisma.deliveryRate.updateMany({
      where: { id: data.rateId, tenantId: data.tenantId },
      data: { zoneName: data.zoneName, city: data.city, charge: data.charge, freeShippingMinimum: data.freeShippingMinimum ?? null, isActive: data.isActive },
    });
    if (!updated.count) return NextResponse.json({ error: "Delivery rate not found." }, { status: 404 });
    const rate = await prisma.deliveryRate.findFirst({ where: { id: data.rateId, tenantId: data.tenantId } });
    await prisma.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "shipping.rate_updated", entityType: "DeliveryRate", entityId: data.rateId, metadata: { city: data.city, charge: data.charge, isActive: data.isActive } } });
    return NextResponse.json({ rate });
  } catch (error) {
    console.error("Delivery rate update failed:", error);
    return NextResponse.json({ error: "Could not update delivery rate." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantId = params.get("tenantId") || "";
  const rateId = params.get("rateId") || "";
  if (!tenantId || !rateId) return NextResponse.json({ error: "tenantId and rateId are required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "courier.write");
    if (!access.ok) return deny(access.reason);
    const removed = await prisma.deliveryRate.deleteMany({ where: { id: rateId, tenantId } });
    if (!removed.count) return NextResponse.json({ error: "Delivery rate not found." }, { status: 404 });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "shipping.rate_deleted", entityType: "DeliveryRate", entityId: rateId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delivery rate delete failed:", error);
    return NextResponse.json({ error: "Could not delete delivery rate." }, { status: 503 });
  }
}
