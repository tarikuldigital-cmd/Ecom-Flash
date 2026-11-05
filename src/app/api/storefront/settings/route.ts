import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";
const schema = z.object({
  name: z.string().trim().min(2).max(100),
  tagline: z.string().max(160).nullable(),
  description: z.string().max(2000).nullable(),
  logoUrl: z.string().url().max(1000).nullable().or(z.literal("")),
  bannerUrl: z.string().url().max(1000).nullable().or(z.literal("")),
  announcement: z.string().max(180).nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  contactPhone: z.string().max(40).nullable(),
  contactEmail: z.string().email().max(254).nullable().or(z.literal("")),
});

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  const access = await checkTenantAccess(tenantId, "store.read");
  if (!access.ok) return NextResponse.json({ error: "Workspace access denied." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
  const store = await prisma.store.findFirst({ where: { tenantId, slug: "main" } });
  if (!store) return NextResponse.json({ error: "Store not found." }, { status: 404 });
  return NextResponse.json({ store });
}

export async function PATCH(request: Request) {
  try {
    const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
    if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
    const access = await checkTenantAccess(tenantId, "store.write");
    if (!access.ok) return NextResponse.json({ error: "Workspace access denied." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const body = schema.parse(await request.json());
    const store = await prisma.store.update({ where: { tenantId_slug: { tenantId, slug: "main" } }, data: { ...body, logoUrl: body.logoUrl || null, bannerUrl: body.bannerUrl || null, contactEmail: body.contactEmail || null } });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "storefront.settings_updated", entityType: "Store", entityId: store.id } });
    return NextResponse.json({ store });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid store settings." }, { status: 400 });
    console.error("Storefront settings update failed:", error);
    return NextResponse.json({ error: "Could not update store settings." }, { status: 500 });
  }
}
