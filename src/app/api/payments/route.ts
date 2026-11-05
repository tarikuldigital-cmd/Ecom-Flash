import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "orders.read");
    if (!access.ok) return NextResponse.json({ error: "You do not have access to this workspace." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const excluded = { status: { notIn: ["CANCELLED", "RETURNED"] as const } };
    const [orders, collections, refunds, unpaidCodOrders, recentTransactions] = await Promise.all([
      prisma.order.aggregate({ where: { tenantId, ...excluded }, _count: { _all: true }, _sum: { total: true, amountPaid: true } }),
      prisma.paymentTransaction.aggregate({ where: { tenantId, type: "PAYMENT" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.paymentTransaction.aggregate({ where: { tenantId, type: "REFUND" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.order.findMany({ where: { tenantId, paymentMethod: "COD", paymentStatus: { in: ["UNPAID", "PARTIAL"] }, ...excluded }, select: { id: true, orderNumber: true, customerName: true, customerPhone: true, total: true, amountPaid: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.paymentTransaction.findMany({ where: { tenantId }, include: { order: { select: { id: true, orderNumber: true, customerName: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    const outstandingCod = unpaidCodOrders.reduce((sum, order) => sum + Math.max(0, Number(order.total) - Number(order.amountPaid)), 0);
    return NextResponse.json({
      summary: {
        orderValue: Number(orders._sum.total || 0),
        collectedNet: Number(orders._sum.amountPaid || 0),
        balanceDue: Math.max(0, Number(orders._sum.total || 0) - Number(orders._sum.amountPaid || 0)),
        codOutstanding: outstandingCod,
        codOrders: unpaidCodOrders.length,
        paymentTransactions: collections._count._all,
        grossCollections: Number(collections._sum.amount || 0),
        refunds: Number(refunds._sum.amount || 0),
      },
      codOrders: unpaidCodOrders.map(order => ({ ...order, total: Number(order.total), amountPaid: Number(order.amountPaid), balanceDue: Math.max(0, Number(order.total)-Number(order.amountPaid)) })),
      recentTransactions: recentTransactions.map(item => ({ ...item, amount: Number(item.amount) })),
    });
  } catch (error) {
    console.error("Payment overview failed:", error);
    return NextResponse.json({ error: "Payment overview is temporarily unavailable." }, { status: 503 });
  }
}
