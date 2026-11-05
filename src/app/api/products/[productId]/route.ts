import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const updateSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(160).optional(),
  sku: z.string().trim().max(80).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  categoryId: z.string().nullable().optional(),
  price: z.number().finite().positive().max(9999999999.99).optional(),
  compareAtPrice: z.number().finite().positive().max(9999999999.99).nullable().optional(),
  costPrice: z.number().finite().nonnegative().max(9999999999.99).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(100000000).optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
}).strict();

function accessError(reason: string) {
  const status = reason === "UNAUTHENTICATED" ? 401 : 403;
  return NextResponse.json({ error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have access to this workspace." }, { status });
}

type Context = { params: Promise<{ productId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const { productId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data || {}).every((key) => key === "tenantId")) {
    return NextResponse.json({ error: "Provide at least one valid product field to update." }, { status: 400 });
  }

  const { tenantId, ...changes } = parsed.data;
  try {
    const access = await checkTenantAccess(tenantId, "products.write");
    if (!access.ok) return accessError(access.reason);

    const existing = await prisma.product.findFirst({ where: { id: productId, tenantId }, select: { id: true } });
    if (!existing) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    if (changes.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: changes.categoryId, tenantId }, select: { id: true } });
      if (!category) return NextResponse.json({ error: "Selected category was not found in this workspace." }, { status: 400 });
    }

    const updated = await prisma.product.updateMany({
      where: { id: productId, tenantId },
      data: changes,
    });
    if (updated.count !== 1) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "product.updated", entityType: "Product", entityId: product.id } });
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Product update failed:", error);
    return NextResponse.json({ error: "Could not update product. Check whether the SKU is already in use." }, { status: 503 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { productId } = await params;
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "products.write");
    if (!access.ok) return accessError(access.reason);
    const result = await prisma.product.updateMany({
      where: { id: productId, tenantId, status: { not: "ARCHIVED" } },
      data: { status: "ARCHIVED" },
    });
    if (!result.count) return NextResponse.json({ error: "Product not found or already archived." }, { status: 404 });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "product.archived", entityType: "Product", entityId: productId } });
    return NextResponse.json({ success: true, archived: true });
  } catch (error) {
    console.error("Product archive failed:", error);
    return NextResponse.json({ error: "Could not archive this product." }, { status: 503 });
  }
}
