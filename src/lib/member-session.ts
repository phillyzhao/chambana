import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

/** Refresh cookies on the new member routes; authorization remains server-side. */
export async function refreshMemberSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (
    url &&
    key &&
    request.cookies.getAll().some(({ name }) => name.startsWith("sb-"))
  ) {
    const db = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          items.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = response.cookies.getAll();
          response = NextResponse.next({ request });
          // Refresh can rotate chunked credentials in several batches. Keep
          // every earlier write while forwarding the latest request cookies.
          previousCookies.forEach((cookie) => response.cookies.set(cookie));
          items.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    });
    try {
      await db.auth.getUser();
    } catch {
      /* The page/API handles unavailable sessions. */
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
