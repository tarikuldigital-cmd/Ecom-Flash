import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) return NextResponse.json({ user: null }, { status: 401 });
    return NextResponse.json({ user: session.user, expiresAt: session.expiresAt });
  } catch (error) {
    console.error("Session lookup failed:", error);
    return NextResponse.json({ error: "Session service is temporarily unavailable." }, { status: 503 });
  }
}
