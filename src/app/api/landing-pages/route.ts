import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkTenantAccess } from "@/lib/auth/tenant-access";

export const runtime = "nodejs";

const sectionSchema = z.object({
  id: z.string().min(1).max(80),
  type: z.enum(["HERO", "TEXT", "FEATURES", "PRODUCTS", "TESTIMONIAL", "CTA"]),
  title: z.string().max(160).default(""),
  body: z.string().max(2000).default(""),
  buttonText: z.string().max(60).default(""),
  buttonUrl: z.string().max(500).default(""),
});
const pageSchema = z.object({
  title: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sections: z.array(sectionSchema).max(30),
  seoTitle: z.string().max(160).optional().nullable(),
  seoDescription: z.string().max(320).optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).optional(),
});

export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
  if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
  const access = await checkTenantAccess(tenantId, "pages.read");
  if (!access.ok) return NextResponse.json({ error: "Workspace access denied." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
  const pages = await prisma.landingPage.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ pages });
}

export async function POST(request: Request) {
  try {
    const body = pageSchema.parse(await request.json());
    const tenantId = new URL(request.url).searchParams.get("tenantId") || "";
    if (!tenantId) return NextResponse.json({ error: "tenantId is required." }, { status: 400 });
    const access = await checkTenantAccess(tenantId, "pages.write");
    if (!access.ok) return NextResponse.json({ error: "Workspace access denied." }, { status: access.reason === "UNAUTHENTICATED" ? 401 : 403 });
    const status = body.status || "DRAFT";
    const page = await prisma.landingPage.create({ data: { tenantId, title: body.title, slug: body.slug, sections: body.sections, seoTitle: body.seoTitle, seoDescription: body.seoDescription, status, publishedAt: status === "PUBLISHED" ? new Date() : null } });
    await prisma.auditLog.create({ data: { tenantId, actorId: access.user.id, action: "landing_page.created", entityType: "LandingPage", entityId: page.id } });
    return NextResponse.json({ page }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: error.issues[0]?.message || "Invalid page data." }, { status: 400 });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "This page URL is already in use." }, { status: 409 });
    console.error("Landing page creation failed:", error);
    return NextResponse.json({ error: "Could not create landing page." }, { status: 500 });
  }
}
