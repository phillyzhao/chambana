import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { eligibleMember } from "@/lib/member-auth";
import { isConfigured } from "@/lib/supabase";

/** Separate from the retired beta callback. Never accepts a redirect target. */
export async function GET(request: NextRequest) {
  const destination = new URL("/app", request.url);
  const response = NextResponse.redirect(destination, 303);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  const writtenCookies = new Set<string>();
  const fail = () => {
    // Only discard credentials written by this failed attempt. An expired link
    // must not sign someone out of a previously working session.
    writtenCookies.forEach((name) =>
      response.cookies.set(name, "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      }),
    );
    destination.searchParams.set("auth_error", "expired");
    response.headers.set("Location", destination.toString());
    return response;
  };
  if (!isConfigured()) return fail();
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  if ((code && tokenHash) || request.nextUrl.searchParams.has("error"))
    return fail();
  if (
    (!code || code.length > 2048) &&
    (!tokenHash || !/^[a-f0-9]{32,256}$/i.test(tokenHash) || type !== "email")
  )
    return fail();
  try {
    const db = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (items) =>
            items.forEach(({ name, value, options }) => {
              writtenCookies.add(name);
              request.cookies.set(name, value);
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              });
            }),
        },
      },
    );
    const result = code
      ? await db.auth.exchangeCodeForSession(code)
      : await db.auth.verifyOtp({ token_hash: tokenHash!, type: "email" });
    if (result.error) return fail();
    const { data, error } = await db.auth.getUser();
    if (error || !eligibleMember(data.user)) {
      await db.auth.signOut({ scope: "local" });
      return fail();
    }
    return response;
  } catch {
    return fail();
  }
}
