import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, createSessionCookieValue } from "@/lib/auth";
import { findUserByCredential } from "@/lib/users";

export async function POST(request: NextRequest) {
  const { password } = await request.json().catch(() => ({ password: "" }));

  if (typeof password !== "string") {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const match = await findUserByCredential(password);
  if (!match) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, role: match.role, isAdmin: match.isAdmin });
  response.cookies.set(
    SESSION_COOKIE,
    await createSessionCookieValue({ userId: match.id, role: match.role, isAdmin: match.isAdmin }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    }
  );
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
