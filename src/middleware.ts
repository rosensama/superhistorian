import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, isValidAuthCookie, sitePassword } from "@/lib/site-auth";

function isPublic(pathname: string): boolean {
  return pathname === "/login" || pathname === "/api/login";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/screenshot.png"
  ) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const password = sitePassword();
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  const ok = await isValidAuthCookie(cookie, password);

  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: password ? "Unauthorized" : "Site locked: SITE_PASSWORD is not set" },
      { status: 401 }
    );
  }

  const login = new URL("/login", req.url);
  login.searchParams.set("from", pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
