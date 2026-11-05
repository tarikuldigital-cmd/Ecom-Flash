import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return NextResponse.json({ error: "Tracking link is invalid or expired." }, { status: 404 });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const order = await prisma.order.findFirst({
      where: { trackingTokenHash: tokenHash, tenant: { status: "ACTIVE" } },
      select: {
        orderNumber: true, status: true, paymentStatus: true, paymentMethod: true,
        subtotal: true, shippingCharge: true, total: true, createdAt: true,
        items: { select: { productName: true, quantity: true, lineTotal: true }, orderBy: { createdAt: "asc" } },
        shipments: {
          select: { provider: true, status: true, trackingNumber: true, consignmentId: true, trackingUrl: true, createdAt: true, events: { select: { status: true, title: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 30 } },
          orderBy: { createdAt: "desc" }, take: 1,
        },
      },
    });
    if (!order) return NextResponse.json({ error: "Tracking link is invalid or expired." }, { status: 404 });
    const shipment = order.shipments[0] || null;
    return NextResponse.json({
      order: {
        orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod, subtotal: Number(order.subtotal), shippingCharge: Number(order.shippingCharge),
        total: Number(order.total), createdAt: order.createdAt,
        items: order.items.map(item => ({ ...item, lineTotal: Number(item.lineTotal) })),
        shipment: shipment ? {
          provider: shipment.provider, status: shipment.status, trackingNumber: shipment.trackingNumber,
          consignmentId: shipment.consignmentId, trackingUrl: shipment.trackingUrl, createdAt: shipment.createdAt,
          events: shipment.events,
        } : null,
      },
    }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Public order tracking failed:", error);
    return NextResponse.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });
  }
}
