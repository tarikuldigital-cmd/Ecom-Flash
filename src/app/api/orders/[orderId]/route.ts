import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const updateSchema = z.object({
  tenantId: z.string().min(1),
  status: z.enum(["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"]).optional(),
}).strict().refine((value) => Boolean(value.status), "Provide an order or payment status.");

const transitions: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["RETURNED"],
  CANCELLED: [],
  RETURNED: [],
};

export async function PATCH(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid status update." }, { status: 400 });
  const data = parsed.data;

  try {
    const access = await checkTenantAccess(data.tenantId, "orders.write");
    if (!access.ok) return NextResponse.json({ error: access.reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have permission to update orders." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });

    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findFirst({ where: { id: orderId, tenantId: data.tenantId }, include: { items: true } });
      if (!existing) throw new Error("ORDER_NOT_FOUND");
      if (data.status && !transitions[existing.status].includes(data.status)) throw new Error("INVALID_TRANSITION");

      if (data.status === "CANCELLED" || data.status === "RETURNED") {
        for (const item of existing.items) {
          if (!item.productId) continue;
          const product = await tx.product.findFirst({ where: { id: item.productId, tenantId: data.tenantId }, select: { id: true, stockQuantity: true } });
          if (!product) continue;
          await tx.product.updateMany({ where: { id: product.id, tenantId: data.tenantId }, data: { stockQuantity: { increment: item.quantity } } });
          await tx.inventoryMovement.create({
            data: { tenantId: data.tenantId, productId: product.id, actorId: access.userId, type: "RETURN", quantityDelta: item.quantity, stockBefore: product.stockQuantity, stockAfter: product.stockQuantity + item.quantity, reason: data.status === "CANCELLED" ? `Order ${existing.orderNumber} cancelled - stock released` : `Order ${existing.orderNumber} returned - stock received` },
          });
        }
      }

      const updated = await tx.order.update({
        where: { id: existing.id },
        data: { ...(data.status ? { status: data.status } : {}) },
        include: { items: true },
      });
      if (data.status && data.status !== existing.status) {
        await tx.orderActivity.create({ data: { tenantId: data.tenantId, orderId: existing.id, actorId: access.userId, type: "STATUS", title: `Order status: ${existing.status} → ${data.status}`, details: `Status changed from ${existing.status} to ${data.status}.`, metadata: { previousStatus: existing.status, status: data.status } } });
      }

      await tx.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "order.updated", entityType: "Order", entityId: existing.id, metadata: { previousStatus: existing.status, status: data.status, paymentStatus: undefined } } });
      return updated;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found in this workspace." }, { status: 404 });
    if (error instanceof Error && error.message === "INVALID_TRANSITION") return NextResponse.json({ error: "This order status transition is not allowed." }, { status: 409 });
    console.error("Order update failed:", error);
    return NextResponse.json({ error: "Could not update order." }, { status: 503 });
  }
}
