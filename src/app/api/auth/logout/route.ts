import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { clearSessionCookie, hashSessionToken, SESSION_COOKIE } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE)?.value;
    if (token) {
      await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
    }
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/login?loggedOut=1", request.url), 303);
  } catch (error) {
    console.error("Logout failed:", error);
    await clearSessionCookie();
    return NextResponse.redirect(new URL("/login?logoutError=1", request.url), 303);
  }
}
