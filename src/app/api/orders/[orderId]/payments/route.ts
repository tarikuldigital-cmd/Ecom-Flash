import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const schema = z.object({
  tenantId: z.string().min(1),
  type: z.enum(["PAYMENT", "REFUND"]),
  amount: z.number().finite().positive().max(999999999),
  method: z.enum(["COD", "CASH", "BANK_TRANSFER", "CARD", "MOBILE_BANKING", "OTHER"]),
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
}).strict();

export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "orders.read");
    if (!access.ok) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const records = await prisma.paymentTransaction.findMany({ where: { tenantId, orderId }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ transactions: records });
  } catch (error) {
    console.error("Payment history failed:", error);
    return NextResponse.json({ error: "Payment history is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await context.params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid transaction type, amount and payment method." }, { status: 400 });
  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "orders.write");
    if (!access.ok) return NextResponse.json({ error: "You do not have permission to manage payments." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, tenantId: data.tenantId }, select: { id: true, orderNumber: true, total: true, amountPaid: true, status: true } });
      if (!order) throw new Error("ORDER_NOT_FOUND");
      if (["CANCELLED", "RETURNED"].includes(order.status)) throw new Error("ORDER_CLOSED");

      const total = Number(order.total);
      const currentPaid = Number(order.amountPaid);
      const nextPaid = data.type === "PAYMENT" ? currentPaid + data.amount : currentPaid - data.amount;
      if (data.type === "PAYMENT" && nextPaid > total + 0.001) throw new Error("OVERPAYMENT");
      if (data.type === "REFUND" && data.amount > currentPaid + 0.001) throw new Error("REFUND_EXCEEDS_PAID");

      const roundedPaid = Math.round(nextPaid * 100) / 100;
      const paymentStatus = roundedPaid >= total ? "PAID" : roundedPaid > 0 ? "PARTIAL" : data.type === "REFUND" ? "REFUNDED" : "UNPAID";
      const transaction = await tx.paymentTransaction.create({
        data: { tenantId: data.tenantId, orderId, actorId: access.userId, type: data.type, amount: data.amount, method: data.method, reference: data.reference || null, note: data.note || null },
      });
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { amountPaid: roundedPaid, paymentStatus },
        select: { id: true, orderNumber: true, total: true, amountPaid: true, paymentStatus: true },
      });
      await tx.orderActivity.create({
        data: { tenantId: data.tenantId, orderId, actorId: access.userId, type: "PAYMENT", title: data.type === "PAYMENT" ? "Payment recorded" : "Refund recorded", details: `${data.type === "PAYMENT" ? "Received" : "Refunded"} ৳ ${data.amount.toFixed(2)} via ${data.method.replaceAll("_", " ")}. Balance: ৳ ${Math.max(0, total - roundedPaid).toFixed(2)}.`, metadata: { transactionId: transaction.id, type: data.type, amount: data.amount, method: data.method, amountPaid: roundedPaid, paymentStatus } },
      });
      await tx.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: data.type === "PAYMENT" ? "payment.recorded" : "payment.refunded", entityType: "Order", entityId: orderId, metadata: { orderNumber: order.orderNumber, amount: data.amount, method: data.method, amountPaid: roundedPaid, paymentStatus } } });
      return { transaction, order: updatedOrder, balanceDue: Math.max(0, total - roundedPaid) };
    }, { isolationLevel: "Serializable" });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_FOUND") return NextResponse.json({ error: "Order not found in this workspace." }, { status: 404 });
    if (error instanceof Error && error.message === "ORDER_CLOSED") return NextResponse.json({ error: "Payments cannot be recorded against cancelled or returned orders." }, { status: 409 });
    if (error instanceof Error && error.message === "OVERPAYMENT") return NextResponse.json({ error: "Payment exceeds the remaining balance." }, { status: 409 });
    if (error instanceof Error && error.message === "REFUND_EXCEEDS_PAID") return NextResponse.json({ error: "Refund cannot exceed the amount already collected." }, { status: 409 });
    console.error("Payment transaction failed:", error);
    return NextResponse.json({ error: "Could not save this payment transaction." }, { status: 503 });
  }
}
