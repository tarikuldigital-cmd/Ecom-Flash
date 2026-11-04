import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const productSchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(160),
  sku: z.string().trim().max(80).optional().transform((value) => value || undefined),
  description: z.string().trim().max(5000).optional(),
  categoryId: z.string().optional(),
  price: z.number().finite().positive().max(9999999999.99),
  compareAtPrice: z.number().finite().positive().max(9999999999.99).optional(),
  costPrice: z.number().finite().nonnegative().max(9999999999.99).optional(),
  stockQuantity: z.number().int().min(0).max(100000000).default(0),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
}).strict();

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "product";
}

function accessError(reason: string) {
  const status = reason === "UNAUTHENTICATED" ? 401 : 403;
  return NextResponse.json({ error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have access to this workspace." }, { status });
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const tenantId = params.get("tenantId") || "";
  const search = (params.get("search") || "").trim().slice(0, 100);
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(params.get("pageSize") || "20", 10) || 20));
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });

  try {
    const access = await checkTenantAccess(tenantId, "products.read");
    if (!access.ok) return accessError(access.reason);
    const where = {
      tenantId,
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { sku: { contains: search, mode: "insensitive" as const } }] } : {}),
    };
    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.product.count({ where }),
    ]);
    return NextResponse.json({ products, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } });
  } catch (error) {
    console.error("Product list failed:", error);
    return NextResponse.json({ error: "Products are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Check the product name, price, stock quantity and other fields." }, { status: 400 });

  const data = parsed.data;
  try {
    const access = await checkTenantAccess(data.tenantId, "products.write");
    if (!access.ok) return accessError(access.reason);

    if (data.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: data.categoryId, tenantId: data.tenantId }, select: { id: true } });
      if (!category) return NextResponse.json({ error: "Selected category was not found in this workspace." }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        tenantId: data.tenantId,
        categoryId: data.categoryId,
        name: data.name,
        slug: `${slugify(data.name)}-${Date.now().toString(36)}`,
        sku: data.sku,
        description: data.description,
        price: data.price,
        compareAtPrice: data.compareAtPrice,
        costPrice: data.costPrice,
        stockQuantity: data.stockQuantity,
        status: data.status,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    await prisma.auditLog.create({
      data: { tenantId: data.tenantId, actorId: access.userId, action: "product.created", entityType: "Product", entityId: product.id },
    });
    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Product create failed:", error);
    return NextResponse.json({ error: "Could not create product. Check whether the SKU is already in use." }, { status: 503 });
  }
}
