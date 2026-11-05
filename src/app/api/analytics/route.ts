import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

function accessError(reason: string) {
  return NextResponse.json(
    { error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have access to this workspace." },
    { status: reason === "UNAUTHENTICATED" ? 401 : 403 },
  );
}

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });

  try {
    const access = await checkTenantAccess(tenantId, "orders.read");
    if (!access.ok) return accessError(access.reason);

    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 13);
    start.setHours(0, 0, 0, 0);
    const [orders, allTime, paid, unpaidCod, statusCounts, shipmentCounts, topProducts, stock] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, createdAt: { gte: start }, status: { notIn: ["CANCELLED", "RETURNED"] } },
        select: { id: true, orderNumber: true, status: true, paymentStatus: true, paymentMethod: true, total: true, createdAt: true, customerName: true },
        orderBy: { createdAt: "desc" },
        take: 5000,
      }),
      prisma.order.aggregate({ where: { tenantId, status: { notIn: ["CANCELLED", "RETURNED"] } }, _count: { _all: true }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { tenantId, status: { notIn: ["CANCELLED", "RETURNED"] }, paymentStatus: "PAID" }, _sum: { total: true } }),
      prisma.order.aggregate({ where: { tenantId, status: { notIn: ["CANCELLED", "RETURNED"] }, paymentMethod: "COD", paymentStatus: { in: ["UNPAID", "PARTIAL"] } }, _sum: { total: true }, _count: { _all: true } }),
      prisma.order.groupBy({ by: ["status"], where: { tenantId }, orderBy: { status: "asc" }, _count: { _all: true } }),
      prisma.shipment.groupBy({ by: ["status"], where: { tenantId }, orderBy: { status: "asc" }, _count: { _all: true } }),
      prisma.orderItem.groupBy({ by: ["productName"], where: { tenantId, order: { status: { notIn: ["CANCELLED", "RETURNED"] } } }, orderBy: { _sum: { quantity: "desc" } }, _sum: { quantity: true, lineTotal: true }, take: 5 }),
      prisma.product.aggregate({ where: { tenantId, status: { not: "ARCHIVED" } }, _count: { _all: true }, _sum: { stockQuantity: true } }),
    ]);

    const days = Array.from({ length: 14 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      const key = day.toISOString().slice(0, 10);
      const dayOrders = orders.filter((order) => order.createdAt.toISOString().slice(0, 10) === key);
      return {
        date: key,
        label: day.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
        orders: dayOrders.length,
        sales: dayOrders.reduce((sum, order) => sum + Number(order.total), 0),
      };
    });

    return NextResponse.json({
      currency: "BDT",
      range: { from: start.toISOString(), to: now.toISOString() },
      summary: {
        totalOrders: allTime._count._all,
        totalOrderValue: Number(allTime._sum.total || 0),
        paidOrderValue: Number(paid._sum.total || 0),
        unpaidCodValue: Number(unpaidCod._sum.total || 0),
        unpaidCodOrders: unpaidCod._count._all,
        products: stock._count._all,
        stockUnits: stock._sum.stockQuantity || 0,
      },
      orderStatuses: statusCounts.map((item) => ({ status: item.status, count: item._count._all })),
      shipmentStatuses: shipmentCounts.map((item) => ({ status: item.status, count: item._count._all })),
      salesTrend: days,
      topProducts: topProducts.map((item) => ({ name: item.productName, units: item._sum.quantity || 0, sales: Number(item._sum.lineTotal || 0) })),
      recentOrders: orders.slice(0, 8).map((order) => ({ ...order, total: Number(order.total) })),
    });
  } catch (error) {
    console.error("Analytics request failed:", error);
    return NextResponse.json({ error: "Business analytics are temporarily unavailable." }, { status: 503 });
  }
}
