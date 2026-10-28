import { NextRequest, NextResponse } from "next/server";
import { retiredBetaDestination } from "@/lib/site-routes";

export function proxy(request: NextRequest) {
  const destination = retiredBetaDestination(request.nextUrl.pathname);
  if (!destination) return NextResponse.next();

  // A fresh URL drops old callback codes, invitation codes, and notices.
  // 303 also prevents stale beta forms from replaying their POST at a preview.
  const response = NextResponse.redirect(
    new URL(destination, request.url),
    303,
  );
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

export const config = {
  matcher: [
    "/login/:path*",
    "/join/:path*",
    "/missions/:path*",
    "/groups/:path*",
    "/profile/:path*",
    "/people/:path*",
    "/leaderboard/:path*",
    "/admin/:path*",
    "/about/:path*",
    "/guidelines/:path*",
    "/auth/callback/:path*",
  ],
};
