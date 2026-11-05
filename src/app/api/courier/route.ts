import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const providers = ["PATHAO", "STEADFAST", "REDX", "PAPERFLY", "ECOURIER", "OTHER"] as const;
const createSchema = z.object({
  tenantId: z.string().min(1),
  orderId: z.string().min(1),
  provider: z.enum(providers),
  parcelDescription: z.string().trim().max(300).optional(),
  weightGrams: z.number().int().positive().max(100000).optional(),
  deliveryCharge: z.number().min(0).max(1000000).default(0),
}).strict();
const updateSchema = z.object({
  tenantId: z.string().min(1),
  shipmentId: z.string().min(1),
  status: z.enum(["BOOKED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "DELIVERY_FAILED", "RETURNED", "CANCELLED"]),
  trackingNumber: z.string().trim().max(120).optional(),
  consignmentId: z.string().trim().max(120).optional(),
  bookingReference: z.string().trim().max(120).optional(),
  trackingUrl: z.string().url().max(1000).optional().or(z.literal("")),
  details: z.string().trim().max(1000).optional(),
}).strict();

function denied(reason: string) {
  return NextResponse.json({ error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have permission to access courier operations." }, { status: reason === "UNAUTHENTICATED" ? 401 : 403 });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantId = params.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "courier.read");
    if (!access.ok) return denied(access.reason);
    const [shipments, orders, accounts, counts] = await prisma.$transaction([
      prisma.shipment.findMany({ where: { tenantId }, include: { order: { select: { id: true, orderNumber: true, total: true, paymentMethod: true, paymentStatus: true } }, events: { orderBy: { createdAt: "desc" }, take: 5 }, courierAccount: { select: { displayName: true, isEnabled: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.order.findMany({ where: { tenantId, status: { in: ["CONFIRMED", "PROCESSING"] }, shipments: { none: { status: { notIn: ["CANCELLED", "DELIVERED", "RETURNED"] } } } }, select: { id: true, orderNumber: true, customerName: true, customerPhone: true, shippingAddress: true, shippingCity: true, total: true, paymentMethod: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.courierAccount.findMany({ where: { tenantId }, orderBy: { provider: "asc" } }),
      prisma.shipment.groupBy({ by: ["status"], where: { tenantId }, orderBy: { status: "asc" }, _count: true }),
    ]);
    return NextResponse.json({ shipments, eligibleOrders: orders, accounts, summary: counts.reduce((out, item) => ({ ...out, [item.status]: (typeof item._count === "number" ? item._count : 0) }), {} as Record<string, number>) });
  } catch (error) {
    console.error("Courier list failed:", error);
    return NextResponse.json({ error: "Courier operations are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Select a valid order and courier, then check parcel details." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "courier.write");
    if (!access.ok) return denied(access.reason);
    const shipment = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: data.orderId, tenantId: data.tenantId }, select: { id: true, orderNumber: true, status: true, paymentMethod: true, total: true, customerName: true, customerPhone: true, shippingAddress: true, shippingCity: true } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (!["CONFIRMED", "PROCESSING"].includes(order.status)) throw new Error("ORDER_NOT_READY");
      const existing = await tx.shipment.findFirst({ where: { tenantId: data.tenantId, orderId: order.id, status: { notIn: ["CANCELLED", "DELIVERED", "RETURNED"] } }, select: { id: true } });
      if (existing) throw new Error("ACTIVE_SHIPMENT_EXISTS");
      const account = await tx.courierAccount.findUnique({ where: { tenantId_provider: { tenantId: data.tenantId, provider: data.provider } } });
      const created = await tx.shipment.create({
        data: {
          tenantId: data.tenantId, orderId: order.id, courierAccountId: account?.id || null, provider: data.provider,
          recipientName: order.customerName, recipientPhone: order.customerPhone, deliveryAddress: order.shippingAddress, deliveryCity: order.shippingCity,
          parcelDescription: data.parcelDescription || null, weightGrams: data.weightGrams || null,
          codAmount: order.paymentMethod === "COD" ? order.total : 0, deliveryCharge: data.deliveryCharge,
          status: "DRAFT",
        },
      });
      await tx.shipmentEvent.create({ data: { tenantId: data.tenantId, shipmentId: created.id, actorId: access.userId, status: "DRAFT", title: "Shipment draft created", details: "Shipment details saved. No courier booking request has been sent.", source: "SYSTEM" } });
      await tx.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "shipment.draft_created", entityType: "Shipment", entityId: created.id, metadata: { orderNumber: order.orderNumber, provider: data.provider } } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ shipment, message: "Shipment draft saved. Connect official courier credentials before booking." }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found in this workspace." }, { status: 404 });
    if (error instanceof Error && error.message === "ORDER_NOT_READY") return NextResponse.json({ error: "Only confirmed or processing orders can be prepared for shipment." }, { status: 409 });
    if (error instanceof Error && error.message === "ACTIVE_SHIPMENT_EXISTS") return NextResponse.json({ error: "This order already has an active shipment." }, { status: 409 });
    console.error("Shipment draft failed:", error);
    return NextResponse.json({ error: "Could not create shipment draft." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid shipment update." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "courier.write");
    if (!access.ok) return denied(access.reason);
    const shipment = await prisma.$transaction(async (tx) => {
      const existing = await tx.shipment.findFirst({ where: { id: data.shipmentId, tenantId: data.tenantId }, include: { order: { select: { orderNumber: true } } } });
      if (!existing) throw new Error("SHIPMENT_NOT_FOUND");
      const allowed: Record<string, string[]> = {
        DRAFT: ["BOOKED", "CANCELLED"], BOOKED: ["PICKED_UP", "CANCELLED"], PICKED_UP: ["IN_TRANSIT", "DELIVERY_FAILED", "RETURNED"], IN_TRANSIT: ["DELIVERED", "DELIVERY_FAILED", "RETURNED"], DELIVERY_FAILED: ["IN_TRANSIT", "RETURNED", "CANCELLED"], DELIVERED: [], RETURNED: [], CANCELLED: [],
      };
      if (!allowed[existing.status].includes(data.status)) throw new Error("INVALID_SHIPMENT_TRANSITION");
      if (data.status === "BOOKED" && !data.trackingNumber && !data.consignmentId && !data.bookingReference) throw new Error("BOOKING_REFERENCE_REQUIRED");
      const updated = await tx.shipment.update({ where: { id: existing.id }, data: {
        status: data.status,
        ...(data.trackingNumber !== undefined ? { trackingNumber: data.trackingNumber || null } : {}),
        ...(data.consignmentId !== undefined ? { consignmentId: data.consignmentId || null } : {}),
        ...(data.bookingReference !== undefined ? { bookingReference: data.bookingReference || null } : {}),
        ...(data.trackingUrl !== undefined ? { trackingUrl: data.trackingUrl || null } : {}),
        ...(data.status === "BOOKED" ? { bookedAt: new Date() } : {}),
        ...(data.status === "DELIVERED" ? { deliveredAt: new Date() } : {}),
      } });
      await tx.shipmentEvent.create({ data: { tenantId: data.tenantId, shipmentId: existing.id, actorId: access.userId, status: data.status, title: `Shipment status updated: ${data.status.replaceAll("_", " ")}`, details: data.details || "Status updated manually by workspace team.", source: "MANUAL" } });
      if (data.status === "DELIVERED") {
        await tx.order.updateMany({ where: { id: existing.orderId, tenantId: data.tenantId, status: "SHIPPED" }, data: { status: "DELIVERED" } });
      }
      await tx.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "shipment.status_updated", entityType: "Shipment", entityId: existing.id, metadata: { orderNumber: existing.order.orderNumber, status: data.status } } });
      return updated;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ shipment });
  } catch (error) {
    if (error instanceof Error && error.message === "SHIPMENT_NOT_FOUND") return NextResponse.json({ error: "Shipment not found." }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_SHIPMENT_TRANSITION") return NextResponse.json({ error: "This shipment status transition is not allowed." }, { status: 409 });
    if (error instanceof Error && error.message === "BOOKING_REFERENCE_REQUIRED") return NextResponse.json({ error: "Enter a real courier booking, consignment or tracking reference before marking it booked." }, { status: 400 });
    console.error("Shipment update failed:", error);
    return NextResponse.json({ error: "Could not update shipment." }, { status: 503 });
  }
}
