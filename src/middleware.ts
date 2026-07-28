import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const OWNER_ONLY_PAGE_PATTERNS = [/^\/new$/, /^\/recordings\/[^/]+\/edit$/];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const role = await verifySessionCookie(token);

  if (!role) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const isMutatingApiCall = pathname.startsWith("/api/") && request.method !== "GET";
  const isOwnerOnlyPage = OWNER_ONLY_PAGE_PATTERNS.some((pattern) => pattern.test(pathname));

  if (role !== "owner" && (isMutatingApiCall || isOwnerOnlyPage)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Visitors can't make changes." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}
