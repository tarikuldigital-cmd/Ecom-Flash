import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const customerSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email().max(254).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional(),
  city: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  segment: z.enum(["NEW", "REGULAR", "VIP"]).default("NEW"),
}).strict();

function accessError(reason: string) {
  return NextResponse.json(
    { error: reason === "UNAUTHENTICATED" ? "Please sign in." : reason === "PERMISSION_DENIED" ? "You do not have permission to manage customers." : "You do not have access to this workspace." },
    { status: reason === "UNAUTHENTICATED" ? 401 : 403 },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantId = params.get("tenantId") || "";
  const search = (params.get("search") || "").trim().slice(0, 100);
  const segment = params.get("segment");
  const archived = params.get("archived") === "true";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  if (segment && !["NEW", "REGULAR", "VIP"].includes(segment)) return NextResponse.json({ error: "Invalid customer segment." }, { status: 400 });

  try {
    const access = await checkTenantAccess(tenantId, "customers.read");
    if (!access.ok) return accessError(access.reason);
    const where = {
      tenantId,
      isArchived: archived,
      ...(segment ? { segment: segment as "NEW" | "REGULAR" | "VIP" } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const [customers, total, newCount, regularCount, vipCount] = await prisma.$transaction([
      prisma.customer.findMany({ where, include: { orders: { where: { tenantId, status: { notIn: ["CANCELLED", "RETURNED"] } }, select: { total: true, status: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.customer.count({ where: { tenantId, isArchived: false } }),
      prisma.customer.count({ where: { tenantId, isArchived: false, segment: "NEW" } }),
      prisma.customer.count({ where: { tenantId, isArchived: false, segment: "REGULAR" } }),
      prisma.customer.count({ where: { tenantId, isArchived: false, segment: "VIP" } }),
    ]);
    const enrichedCustomers = customers.map(({ orders, ...customer }) => ({ ...customer, purchaseSummary: { orderCount: orders.length, lifetimeOrderValue: orders.reduce((sum, order) => sum + Number(order.total), 0), latestOrderAt: orders[0]?.createdAt || null } }));
    return NextResponse.json({ customers: enrichedCustomers, summary: { total, new: newCount, regular: regularCount, vip: vipCount } });
  } catch (error) {
    console.error("Customer list failed:", error);
    return NextResponse.json({ error: "Customers are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = customerSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Check the customer name, email and contact details." }, { status: 400 });
  const data = parsed.data;

  try {
    const access = await checkTenantAccess(data.tenantId, "customers.write");
    if (!access.ok) return accessError(access.reason);
    const customer = await prisma.customer.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        city: data.city || null,
        notes: data.notes || null,
        segment: data.segment,
      },
    });
    await prisma.auditLog.create({
      data: { tenantId: data.tenantId, actorId: access.userId, action: "customer.created", entityType: "Customer", entityId: customer.id },
    });
    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    console.error("Customer create failed:", error);
    return NextResponse.json({ error: "Could not create customer. Please try again." }, { status: 503 });
  }
}
