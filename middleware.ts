import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  console.log("🔥 Middleware hit:", request.nextUrl.pathname);

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: "/:path*",
};