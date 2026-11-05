import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const noteSchema = z.object({
  tenantId: z.string().min(1),
  note: z.string().trim().min(1).max(2000),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "orders.read");
    if (!access.ok) return NextResponse.json({ error: access.reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have access to this workspace." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: { orderBy: { createdAt: "asc" } },
        customer: { select: { id: true, name: true, phone: true, email: true, address: true, city: true, segment: true } },
        activities: { orderBy: { createdAt: "desc" }, take: 100, include: { actor: { select: { name: true, email: true } } } },\n        paymentTransactions: { orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    if (!order) return NextResponse.json({ error: "Order not found in this workspace." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    console.error("Order detail failed:", error);
    return NextResponse.json({ error: "Order details are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a note of up to 2,000 characters." }, { status: 400 });
  const { tenantId, note } = parsed.data;
  try {
    const access = await checkTenantAccess(tenantId, "orders.write");
    if (!access.ok) return NextResponse.json({ error: access.reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have permission to add order notes." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const order = await prisma.order.findFirst({ where: { id: orderId, tenantId }, select: { id: true, orderNumber: true } });
    if (!order) return NextResponse.json({ error: "Order not found in this workspace." }, { status: 404 });
    const activity = await prisma.orderActivity.create({
      data: { tenantId, orderId, actorId: access.userId, type: "NOTE", title: "Internal note added", details: note },
      include: { actor: { select: { name: true, email: true } } },
    });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "order.note_added", entityType: "Order", entityId: orderId, metadata: { orderNumber: order.orderNumber } } });
    return NextResponse.json({ activity }, { status: 201 });
  } catch (error) {
    console.error("Order note failed:", error);
    return NextResponse.json({ error: "Could not save the note." }, { status: 503 });
  }
}
