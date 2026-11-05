import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const orderSchema = z.object({
  tenantId: z.string().min(1),
  customerId: z.string().optional(),
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(5).max(30),
  shippingAddress: z.string().trim().min(5).max(500),
  shippingCity: z.string().trim().max(100).optional(),
  customerNote: z.string().trim().max(1000).optional(),
  internalNote: z.string().trim().max(1000).optional(),
  paymentMethod: z.enum(["COD", "CASH", "BANK_TRANSFER", "CARD", "MOBILE_BANKING", "OTHER"]).default("COD"),
  discount: z.number().finite().min(0).max(999999999).default(0),
  shippingCharge: z.number().finite().min(0).max(999999999).default(0),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(100000) }).strict()).min(1).max(50),
}).strict();

function accessError(reason: string) {
  return NextResponse.json(
    { error: reason === "UNAUTHENTICATED" ? "Please sign in." : reason === "PERMISSION_DENIED" ? "You do not have permission to manage orders." : "You do not have access to this workspace." },
    { status: reason === "UNAUTHENTICATED" ? 401 : 403 },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantId = params.get("tenantId") || "";
  const search = (params.get("search") || "").trim().slice(0, 100);
  const status = params.get("status");
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  const validStatuses = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"];
  if (status && !validStatuses.includes(status)) return NextResponse.json({ error: "Invalid order status." }, { status: 400 });

  try {
    const access = await checkTenantAccess(tenantId, "orders.read");
    if (!access.ok) return accessError(access.reason);
    const where = {
      tenantId,
      ...(status ? { status: status as "PENDING" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "RETURNED" } : {}),
      ...(search ? { OR: [
        { orderNumber: { contains: search, mode: "insensitive" as const } },
        { customerName: { contains: search, mode: "insensitive" as const } },
        { customerPhone: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };
    const [orders, total, pending, delivered, revenue] = await prisma.$transaction([
      prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.order.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId, status: "PENDING" } }),
      prisma.order.count({ where: { tenantId, status: "DELIVERED" } }),
      prisma.order.aggregate({ where: { tenantId, status: { notIn: ["CANCELLED", "RETURNED"] } }, _sum: { total: true } }),
    ]);
    return NextResponse.json({ orders, summary: { total, pending, delivered, orderValue: revenue._sum.total || 0 } });
  } catch (error) {
    console.error("Order list failed:", error);
    return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Check customer details, order items, discount and shipping charge." }, { status: 400 });
  const data = parsed.data;

  try {
    const access = await checkTenantAccess(data.tenantId, "orders.write");
    if (!access.ok) return accessError(access.reason);

    const order = await prisma.$transaction(async (tx) => {
      if (data.customerId) {
        const customer = await tx.customer.findFirst({ where: { id: data.customerId, tenantId: data.tenantId }, select: { id: true } });
        if (!customer) throw new Error("CUSTOMER_NOT_FOUND");
      }

      const quantities = new Map<string, number>();
      for (const item of data.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
      const productIds = [...quantities.keys()];
      const products = await tx.product.findMany({
        where: { tenantId: data.tenantId, id: { in: productIds }, status: "ACTIVE" },
        select: { id: true, name: true, sku: true, price: true, stockQuantity: true },
      });
      if (products.length !== productIds.length) throw new Error("PRODUCT_NOT_AVAILABLE");

      const productMap = new Map(products.map((product) => [product.id, product]));
      const lineItems = data.items.map((item) => {
        const product = productMap.get(item.productId)!;
        return { productId: product.id, productName: product.name, sku: product.sku, quantity: item.quantity, unitPrice: Number(product.price), lineTotal: Number(product.price) * item.quantity };
      });
      const subtotal = lineItems.reduce((sum, item) => sum + Math.round(item.lineTotal * 100), 0) / 100;
      if (data.discount > subtotal) throw new Error("DISCOUNT_EXCEEDS_SUBTOTAL");
      const total = Math.round((subtotal - data.discount + data.shippingCharge) * 100) / 100;

      for (const [productId, quantity] of quantities) {
        const product = productMap.get(productId)!;
        const changed = await tx.product.updateMany({
          where: { id: productId, tenantId: data.tenantId, status: "ACTIVE", stockQuantity: { gte: quantity } },
          data: { stockQuantity: { decrement: quantity } },
        });
        if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
        await tx.inventoryMovement.create({
          data: { tenantId: data.tenantId, productId, actorId: access.userId, type: "SALE", quantityDelta: -quantity, stockBefore: product.stockQuantity, stockAfter: product.stockQuantity - quantity, reason: "Order placed - inventory reserved" },
        });
      }

      const created = await tx.order.create({
        data: {
          tenantId: data.tenantId,
          customerId: data.customerId || null,
          orderNumber: `EF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 5).toUpperCase()}`,
          paymentMethod: data.paymentMethod,
          subtotal,
          discount: data.discount,
          shippingCharge: data.shippingCharge,
          total,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress,
          shippingCity: data.shippingCity || null,
          customerNote: data.customerNote || null,
          internalNote: data.internalNote || null,
          items: { create: lineItems.map((item) => ({ tenantId: data.tenantId, ...item })) },
        },
        include: { items: true },
      });
      await tx.auditLog.create({ data: { tenantId: data.tenantId, actorId: access.userId, action: "order.created", entityType: "Order", entityId: created.id, metadata: { orderNumber: created.orderNumber, total, currency: "BDT" } } });
      return created;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ order }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "CUSTOMER_NOT_FOUND") return NextResponse.json({ error: "Selected customer was not found in this workspace." }, { status: 404 });
    if (error instanceof Error && error.message === "PRODUCT_NOT_AVAILABLE") return NextResponse.json({ error: "One or more products are unavailable in this workspace." }, { status: 400 });
    if (error instanceof Error && error.message === "DISCOUNT_EXCEEDS_SUBTOTAL") return NextResponse.json({ error: "Discount cannot exceed the product subtotal." }, { status: 400 });
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "One or more products do not have enough stock. Refresh inventory and try again." }, { status: 409 });
    console.error("Order creation failed:", error);
    return NextResponse.json({ error: "Could not create order. Please refresh and try again." }, { status: 503 });
  }
}
