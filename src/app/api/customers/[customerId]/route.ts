import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const updateSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  segment: z.enum(["NEW", "REGULAR", "VIP"]).optional(),
  isArchived: z.boolean().optional(),
}).strict();


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

export async function PATCH(request: Request, { params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check customer details and try again." }, { status: 400 });
  const { tenantId, ...changes } = parsed.data;
  if (!Object.keys(changes).length) return NextResponse.json({ error: "No changes were supplied." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "customers.write");
    if (!access.ok) return accessError(access.reason);
    const existing = await prisma.customer.findFirst({ where: { id: customerId, tenantId }, select: { id: true, isArchived: true } });
    if (!existing) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    const data = {
      ...(changes.name !== undefined ? { name: changes.name } : {}),
      ...(changes.phone !== undefined ? { phone: changes.phone || null } : {}),
      ...(changes.email !== undefined ? { email: changes.email || null } : {}),
      ...(changes.address !== undefined ? { address: changes.address || null } : {}),
      ...(changes.city !== undefined ? { city: changes.city || null } : {}),
      ...(changes.notes !== undefined ? { notes: changes.notes || null } : {}),
      ...(changes.segment !== undefined ? { segment: changes.segment } : {}),
      ...(changes.isArchived !== undefined ? { isArchived: changes.isArchived } : {}),
    };
    const customer = await prisma.customer.update({ where: { id: existing.id }, data });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: changes.isArchived === true ? "customer.archived" : changes.isArchived === false ? "customer.restored" : "customer.updated", entityType: "Customer", entityId: customerId } });
    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Customer update failed:", error);
    return NextResponse.json({ error: "Could not update customer. Please try again." }, { status: 503 });
  }
}
