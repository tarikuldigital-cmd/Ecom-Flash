import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

const loginSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(128),
}).strict();

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid email or password." }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    const valid = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
    if (!user || !valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });

    const token = await createSession(user.id);
    await setSessionCookie(token);
    return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email }, redirectTo: "/dashboard" });
  } catch (error) {
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login is temporarily unavailable. Please try again later." }, { status: 503 });
  }
}
