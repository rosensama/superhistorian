import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authCookieValue, sitePassword } from "@/lib/site-auth";

export async function POST(req: NextRequest) {
  const password = sitePassword();
  if (!password) {
    return NextResponse.json(
      { error: "Site locked: set SITE_PASSWORD in the server environment." },
      { status: 503 }
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body.password || body.password !== password) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const value = await authCookieValue(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
