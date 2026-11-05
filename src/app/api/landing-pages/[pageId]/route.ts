import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

const schema = z.object({
  title: z.string().trim().min(2).max(100).optional(),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  sections: z.array(z.object({ id: z.string().min(1).max(80), type: z.enum(["HERO","TEXT","FEATURES","PRODUCTS","TESTIMONIAL","CTA"]), title: z.string().max(160), body: z.string().max(2000), buttonText: z.string().max(60), buttonUrl: z.string().max(500) })).max(30).optional(),
  seoTitle: z.string().max(160).nullable().optional(),
  seoDescription: z.string().max(320).nullable().optional(),
  status: z.enum(["DRAFT","PUBLISHED"]).optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  try {
    const { pageId } = await params;
    const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
    if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
    const access = await checkTenantAccess(tenantId, "pages.write");
    if (!access.ok) return NextResponse.json({ error: "Workspace access denied." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const body = schema.parse(await request.json());
    const existing = await prisma.landingPage.findFirst({ where: { id: pageId, tenantId } });
    if (!existing) return NextResponse.json({ error: "Page not found." }, { status: 404 });
    const page = await prisma.landingPage.update({ where: { id: existing.id }, data: { ...body, publishedAt: body.status === "PUBLISHED" ? existing.publishedAt || new Date() : body.status === "DRAFT" ? null : undefined } });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "landing_page.updated", entityType: "LandingPage", entityId: page.id } });
    return NextResponse.json({ page });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid page data." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This page URL is already in use." }, { status: 409 });
    console.error("Landing page update failed:", error);
    return NextResponse.json({ error: "Could not update landing page." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  const access = await checkTenantAccess(tenantId, "pages.write");
  if (!access.ok) return NextResponse.json({ error: "Workspace access denied." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
  const result = await prisma.landingPage.deleteMany({ where: { id: pageId, tenantId } });
  if (!result.count) return NextResponse.json({ error: "Page not found." }, { status: 404 });
  await prisma.auditLog.create({ data: { tenantId, actorId: access.userId, action: "landing_page.deleted", entityType: "LandingPage", entityId: pageId } });
  return NextResponse.json({ success: true });
}
