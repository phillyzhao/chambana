import { NextRequest, NextResponse } from "next/server";
import { retiredBetaDestination } from "@/lib/site-routes";
import { refreshMemberSession } from "@/lib/member-session";

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (
    path === "/app" ||
    path.startsWith("/app/") ||
    path === "/account" ||
    path.startsWith("/account/") ||
    path.startsWith("/api/member/")
  ) {
    return refreshMemberSession(request);
  }
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
    "/app/:path*",
    "/account/:path*",
    "/api/member/:path*",
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
