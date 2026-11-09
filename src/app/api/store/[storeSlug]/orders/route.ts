import { createHash, randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
const schema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerPhone: z.string().trim().min(5).max(30),
  shippingAddress: z.string().trim().min(5).max(500),
  shippingCity: z.string().trim().max(100).optional(),
  customerNote: z.string().trim().max(1000).optional(),
  couponCode: z.string().trim().max(40).optional(),
  recoveryToken: z.string().regex(/^[A-Za-z0-9_-]{40,60}$/).optional(),
  items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(100) }).strict()).min(1).max(30),
}).strict();

export async function POST(request: Request, { params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  let raw: unknown;
  try { raw = await request.json(); } catch { return NextResponse.json({ error: "Invalid checkout details." }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "Please check your contact details and cart items." }, { status: 400 });
  const data = parsed.data;
  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug: storeSlug, status: "ACTIVE", stores: { some: { slug: "main", status: "ACTIVE" } } }, select: { id: true } });
    if (!tenant) return NextResponse.json({ error: "This store is not available." }, { status: 404 });
    const trackingToken = randomBytes(32).toString("base64url");
    const trackingTokenHash = createHash("sha256").update(trackingToken).digest("hex");
    const order = await prisma.$transaction(async tx => {
      const quantities = new Map<string, number>();
      for (const item of data.items) quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
      const ids = [...quantities.keys()];
      const products = await tx.product.findMany({ where: { tenantId: tenant.id, id: { in: ids }, status: "ACTIVE" }, select: { id: true, name: true, sku: true, price: true, stockQuantity: true } });
      if (products.length !== ids.length) throw new Error("PRODUCT_UNAVAILABLE");
      const byId = new Map(products.map(p => [p.id, p]));
      const lineItems = [...quantities].map(([id, quantity]) => {
        const product = byId.get(id)!;
        if (product.stockQuantity < quantity) throw new Error("INSUFFICIENT_STOCK");
        return { productId: id, productName: product.name, sku: product.sku, quantity, unitPrice: Number(product.price), lineTotal: Math.round(Number(product.price) * quantity * 100) / 100 };
      });
      const subtotal = Math.round(lineItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100) / 100;
      const city = (data.shippingCity || "").trim();
      const rate = city ? await tx.deliveryRate.findFirst({ where: { tenantId: tenant.id, isActive: true, city: { equals: city, mode: "insensitive" } } }) : null;
      const rateCharge = rate ? Number(rate.charge) : 0;
      const shippingCharge = rate && rate.freeShippingMinimum !== null && subtotal >= Number(rate.freeShippingMinimum) ? 0 : rateCharge;
      let discount = 0;
      let appliedCoupon: { id: string; code: string } | null = null;
      if (data.couponCode) {
        const code = data.couponCode.toUpperCase();
        const coupon = await tx.coupon.findFirst({ where: { tenantId: tenant.id, code, isActive: true } });
        const now = new Date();
        if (!coupon || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now) || (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) || subtotal < Number(coupon.minSubtotal)) throw new Error("COUPON_INVALID");
        discount = coupon.type === "PERCENTAGE" ? subtotal * Number(coupon.value) / 100 : Number(coupon.value);
        if (coupon.maxDiscount !== null) discount = Math.min(discount, Number(coupon.maxDiscount));
        discount = Math.min(subtotal, Math.round(discount * 100) / 100);
        const usage = await tx.coupon.updateMany({ where: { id: coupon.id, tenantId: tenant.id, isActive: true, ...(coupon.usageLimit !== null ? { usageCount: { lt: coupon.usageLimit } } : {}) }, data: { usageCount: { increment: 1 } } });
        if (usage.count !== 1) throw new Error("COUPON_INVALID");
        appliedCoupon = { id: coupon.id, code: coupon.code };
      }
      const total = Math.round((subtotal - discount + shippingCharge) * 100) / 100;
      for (const [productId, quantity] of quantities) {
        const product = byId.get(productId)!;
        const changed = await tx.product.updateMany({ where: { id: productId, tenantId: tenant.id, status: "ACTIVE", stockQuantity: { gte: quantity } }, data: { stockQuantity: { decrement: quantity } } });
        if (changed.count !== 1) throw new Error("INSUFFICIENT_STOCK");
        await tx.inventoryMovement.create({ data: { tenantId: tenant.id, productId, type: "SALE", quantityDelta: -quantity, stockBefore: product.stockQuantity, stockAfter: product.stockQuantity - quantity, reason: "Customer storefront order - stock reserved" } });
      }
      const normalizedPhone = data.customerPhone.replace(/[\s()-]/g, "");
      const existingCustomer = await tx.customer.findFirst({ where: { tenantId: tenant.id, phone: normalizedPhone }, orderBy: { createdAt: "asc" } });
      const customer = existingCustomer
        ? await tx.customer.update({ where: { id: existingCustomer.id }, data: { name: data.customerName, address: data.shippingAddress, city: city || null, isArchived: false } })
        : await tx.customer.create({ data: { tenantId: tenant.id, name: data.customerName, phone: normalizedPhone, address: data.shippingAddress, city: city || null } });
      const created = await tx.order.create({
        data: {
          tenantId: tenant.id,
          customerId: customer.id,
          trackingTokenHash,
          orderNumber: `EF-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,5).toUpperCase()}`,
          paymentMethod: "COD", subtotal, discount, shippingCharge, total, couponId: appliedCoupon?.id || null, couponCode: appliedCoupon?.code || null,
          customerName: data.customerName, customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress, shippingCity: city || null,
          customerNote: data.customerNote || null,
          items: { create: lineItems.map(item => ({ tenantId: tenant.id, ...item })) },
        },
        include: { items: true },
      });
      await tx.orderActivity.create({ data: { tenantId: tenant.id, orderId: created.id, type: "CREATED", title: "Online order received", details: "Customer placed an order through the public storefront. Payment method: Cash on Delivery." } });
      if (data.recoveryToken) { const recoveryHash = createHash("sha256").update(data.recoveryToken).digest("hex"); await tx.abandonedCart.updateMany({ where: { tenantId: tenant.id, recoveryTokenHash: recoveryHash, status: "OPEN", consentToRecovery: true }, data: { status: "RECOVERED", recoveredAt: new Date() } }); }
      await tx.notification.create({data:{tenantId:tenant.id,type:"ORDER_CREATED",title:"New order received",message:`Order ${created.orderNumber} was placed by ${data.customerName}. Total ৳ ${total.toLocaleString("en-BD")}.`,entityType:"Order",entityId:created.id}});
      await tx.auditLog.create({ data: { tenantId: tenant.id, action: "storefront.order_created", entityType: "Order", entityId: created.id, metadata: { orderNumber: created.orderNumber, total, discount, couponCode: appliedCoupon?.code || null, shippingCharge, shippingRateId: rate?.id || null, currency: "BDT" } } });
      return created;
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber, total: Number(order.total), shippingCharge: Number(order.shippingCharge), currency: "BDT", trackingUrl: `/track/${trackingToken}` } }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_UNAVAILABLE") return NextResponse.json({ error: "One or more products are no longer available." }, { status: 409 });
    if (error instanceof Error && error.message === "COUPON_INVALID") return NextResponse.json({ error: "This coupon is invalid, expired, used up, or does not meet the minimum order amount." }, { status: 400 });
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "Stock changed while checking out. Please update your cart." }, { status: 409 });
    console.error("Storefront checkout failed:", error);
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
