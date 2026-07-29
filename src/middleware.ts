import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionCookie } from "@/lib/auth";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

const OWNER_ONLY_PAGE_PATTERNS = [
  /^\/new$/,
  /^\/recordings\/[^/]+\/edit$/,
  /^\/settings$/,
];

// Deliberately excludes /api/users/me/* — every owner (admin or not) manages their own
// password/visitor password there, not just the admin.
const ADMIN_ONLY_API_PATTERNS = [
  /^\/api\/users$/,
  /^\/api\/users\/[^/]+$/,
  /^\/api\/users\/(?!me\/)[^/]+\/password$/,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/api/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionCookie(token);

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role, isAdmin } = session;
  const isMutatingApiCall = pathname.startsWith("/api/") && request.method !== "GET";
  const isOwnerOnlyPage = OWNER_ONLY_PAGE_PATTERNS.some((pattern) => pattern.test(pathname));

  if (role !== "owner" && (isMutatingApiCall || isOwnerOnlyPage)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Visitors can't make changes." }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  const isAdminOnlyApiCall = ADMIN_ONLY_API_PATTERNS.some((pattern) => pattern.test(pathname));
  if (isAdminOnlyApiCall && !(isAdmin && role === "owner")) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  return NextResponse.next();
}
