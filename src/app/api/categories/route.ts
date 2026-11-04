import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const categorySchema = z.object({
  tenantId: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
}).strict();

function slugify(value: string) {
  return value.normalize("NFKD").toLowerCase().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 54) || "category";
}

function accessError(reason: string) {
  const status = reason === "UNAUTHENTICATED" ? 401 : reason === "TENANT_FORBIDDEN" ? 403 : 403;
  return NextResponse.json({ error: reason === "UNAUTHENTICATED" ? "Please sign in." : "You do not have access to this workspace." }, { status });
}

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  try {
    const access = await checkTenantAccess(tenantId, "products.read");
    if (!access.ok) return accessError(access.reason);
    const categories = await prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Category list failed:", error);
    return NextResponse.json({ error: "Categories are temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = categorySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Enter a category name between 2 and 80 characters." }, { status: 400 });

  const { tenantId, name, description } = parsed.data;
  try {
    const access = await checkTenantAccess(tenantId, "products.write");
    if (!access.ok) return accessError(access.reason);
    const category = await prisma.category.create({
      data: { tenantId, name, slug: `${slugify(name)}-${Date.now().toString(36)}`, description },
    });
    await prisma.auditLog.create({
      data: { tenantId, actorId: access.userId, action: "category.created", entityType: "Category", entityId: category.id },
    });
    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Category create failed:", error);
    return NextResponse.json({ error: "Could not create category. Please try again." }, { status: 503 });
  }
}
