import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const movementSchema = z.object({
  tenantId: z.string().min(1),
  productId: z.string().min(1),
  type: z.enum(["ADJUSTMENT", "RESTOCK", "SALE", "RETURN", "DAMAGE", "CORRECTION"]),
  quantityDelta: z.number().int().min(-1000000).max(1000000).refine((value) => value !== 0),
  reason: z.string().trim().min(3).max(300),
}).strict();

function accessError(reason: string) {
  return NextResponse.json(
    { error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have access to this workspace." },
    { status: reason === "UNAUTHENTICATED" ? 401 : 403 },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantId = params.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "inventory.read");
    if (!access.ok) return accessError(access.reason);
    const [products, movements] = await Promise.all([
      prisma.product.findMany({
        where: { tenantId, status: { not: "ARCHIVED" } },
        select: { id: true, name: true, sku: true, stockQuantity: true, status: true },
        orderBy: [{ stockQuantity: "asc" }, { name: "asc" }],
      }),
      prisma.inventoryMovement.findMany({
        where: { tenantId },
        include: { product: { select: { id: true, name: true, sku: true } }, actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);
    return NextResponse.json({
      products,
      movements,
      summary: {
        totalProducts: products.length,
        lowStock: products.filter((item) => item.stockQuantity > 0 && item.stockQuantity <= 5).length,
        outOfStock: products.filter((item) => item.stockQuantity === 0).length,
        totalUnits: products.reduce((sum, item) => sum + item.stockQuantity, 0),
      },
    });
  } catch (error) {
    console.error("Inventory list failed:", error);
    return NextResponse.json({ error: "Inventory is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = movementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a product, movement type, non-zero quantity and a reason." }, { status: 400 });
  const data = parsed.data;

  try {
    const access = await checkTenantAccess(data.tenantId, "inventory.write");
    if (!access.ok) return accessError(access.reason);

    const movement = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: data.productId, tenantId: data.tenantId, status: { not: "ARCHIVED" } },
        select: { id: true, stockQuantity: true },
      });
      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      const stockAfter = product.stockQuantity + data.quantityDelta;
      if (stockAfter < 0) throw new Error("INSUFFICIENT_STOCK");

      const changed = await tx.product.updateMany({
        where: { id: product.id, tenantId: data.tenantId, stockQuantity: product.stockQuantity },
        data: { stockQuantity: { increment: data.quantityDelta } },
      });
      if (changed.count !== 1) throw new Error("STOCK_CONFLICT");

      const record = await tx.inventoryMovement.create({
        data: {
          tenantId: data.tenantId,
          productId: product.id,
          actorId: access.userId,
          type: data.type,
          quantityDelta: data.quantityDelta,
          stockBefore: product.stockQuantity,
          stockAfter,
          reason: data.reason,
        },
        include: { product: { select: { id: true, name: true, sku: true } } },
      });
      await tx.auditLog.create({
        data: {
          tenantId: data.tenantId,
          actorId: access.userId,
          action: "inventory.stock_adjusted",
          entityType: "Product",
          entityId: product.id,
          metadata: { type: data.type, quantityDelta: data.quantityDelta, stockBefore: product.stockQuantity, stockAfter, reason: data.reason },
        },
      });
      return record;
    }, { isolationLevel: "Serializable" });

    return NextResponse.json({ movement }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") return NextResponse.json({ error: "Product not found in this workspace." }, { status: 404 });
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return NextResponse.json({ error: "This movement would make stock negative. Reduce the quantity or check current stock." }, { status: 409 });
    if (error instanceof Error && error.message === "STOCK_CONFLICT") return NextResponse.json({ error: "Stock changed in another request. Refresh inventory and try again." }, { status: 409 });
    console.error("Inventory movement failed:", error);
    return NextResponse.json({ error: "Could not save stock movement." }, { status: 503 });
  }
}
