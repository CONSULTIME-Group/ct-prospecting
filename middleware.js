import { NextResponse } from "next/server";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Routes publiques
  if (pathname === "/login" || pathname.startsWith("/api/auth") || pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const pwd = process.env.ACCESS_PASSWORD;
  if (!pwd) return NextResponse.next(); // Pas de mot de passe configuré = accès libre

  const cookie = request.cookies.get("ct_auth")?.value;
  if (cookie === pwd) return NextResponse.next();

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
