import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

function accessError(reason: string) {
  return NextResponse.json(
    { error: reason === "UNAUTHENTICATED" ? "Please sign in." : reason === "PERMISSION_DENIED" ? "You do not have permission to view customers." : "You do not have access to this workspace." },
    { status: reason === "UNAUTHENTICATED" ? 401 : 403 },
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId || !customerId) return NextResponse.json({ error: "Customer and workspace are required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "customers.read");
    if (!access.ok) return accessError(access.reason);
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        orders: {
          where: { tenantId, status: { notIn: ["CANCELLED", "RETURNED"] } },
          orderBy: { createdAt: "desc" },
          take: 100,
          include: { items: true },
        },
      },
    });
    if (!customer) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const lifetimeOrderValue = customer.orders.reduce((sum, order) => sum + Number(order.total), 0);
    return NextResponse.json({
      customer: {
        ...customer,
        orders: customer.orders,
        purchaseSummary: {
          orderCount: customer.orders.length,
          lifetimeOrderValue,
          deliveredOrders: customer.orders.filter((order) => order.status === "DELIVERED").length,
          latestOrderAt: customer.orders[0]?.createdAt || null,
        },
      },
    });
  } catch (error) {
    console.error("Customer detail failed:", error);
    return NextResponse.json({ error: "Customer details are temporarily unavailable." }, { status: 503 });
  }
}
