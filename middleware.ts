import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/demo-credentials";

type PortalHint = "admin" | "client" | "developer";

function parseCookie(
  value: string | undefined
): { portal: PortalHint; exp: number } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as {
      portal?: PortalHint;
      exp?: number;
    };
    if (!parsed.portal || !parsed.exp) return null;
    if (parsed.exp <= Date.now()) return null;
    return { portal: parsed.portal, exp: parsed.exp };
  } catch {
    return null;
  }
}

function isPublic(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/access-denied") ||
    pathname.startsWith("/auth/") ||
    pathname === "/developer/register" ||
    pathname.startsWith("/developer/register/") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

function requiredPortal(pathname: string): PortalHint | null {
  // Use /client/ prefix — do NOT match admin /clients
  if (pathname === "/client" || pathname.startsWith("/client/")) {
    return "client";
  }
  if (
    pathname === "/developer/register" ||
    pathname.startsWith("/developer/register/")
  ) {
    return null;
  }
  if (pathname.startsWith("/developer")) return "developer";
  // Admin app routes (everything else app-facing)
  if (
    pathname === "/" ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/my-work") ||
    pathname.startsWith("/boards") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/timeline") ||
    pathname.startsWith("/approvals") ||
    pathname.startsWith("/team") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/marketplace") ||
    pathname.startsWith("/finance") ||
    pathname.startsWith("/ai") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/super-admin")
  ) {
    return "admin";
  }
  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const needed = requiredPortal(pathname);
  if (!needed) {
    return NextResponse.next();
  }

  const session = parseCookie(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (session.portal !== needed) {
    const denied = request.nextUrl.clone();
    denied.pathname = "/access-denied";
    denied.searchParams.set("from", pathname);
    return NextResponse.redirect(denied);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
