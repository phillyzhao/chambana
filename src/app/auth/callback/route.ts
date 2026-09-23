import { randomUUID } from "node:crypto";
import { createServerClient, isChunkLike } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { isConfigured } from "@/lib/supabase";
import { campusEmail } from "@/lib/rules";
import { safePath } from "@/lib/paths";
import { appOrigin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const origin = appOrigin();
  // Keep every cookie write on the response that actually leaves this route.
  // This route must not use the shared Server Component helper, which tolerates
  // cookie-write failures when a component cannot modify headers.
  const response = NextResponse.redirect(
    new URL(
      "/login?error=Sign-in+failed.+Use+a+verified+%40illinois.edu+account+and+request+a+new+link.",
      origin,
    ),
  );
  response.headers.set(
    "Cache-Control",
    "private, no-cache, no-store, must-revalidate, max-age=0",
  );
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Expires", "0");
  response.headers.set("Referrer-Policy", "no-referrer");
  const id = randomUUID();
  response.headers.set("X-Auth-Callback-Id", id);
  let stage = "configuration";
  // Only controlled labels, byte counts, and HTTP statuses: never log the
  // callback URL/code, cookies, user data, or arbitrary exception messages.
  const log = (outcome: string, error?: unknown) => {
    const headers = response.headers.getSetCookie();
    const status = (error as { status?: unknown } | null)?.status;
    const cause = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
    const transport = [
      "ECONNRESET",
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
      "UND_ERR_CONNECT_TIMEOUT",
    ].find((code) => code === cause);
    console.error(
      JSON.stringify({
        event: "auth_callback",
        id,
        stage,
        outcome,
        cookieCount: headers.length,
        cookieBytes: headers.reduce(
          (sum, header) => sum + Buffer.byteLength(header),
          0,
        ),
        largestCookieBytes: Math.max(
          0,
          ...headers.map((header) => Buffer.byteLength(header)),
        ),
        ...(typeof status === "number" &&
        Number.isInteger(status) &&
        status >= 400 &&
        status <= 599
          ? { upstreamStatus: status }
          : {}),
        ...(transport ? { transport } : {}),
        at: new Date().toISOString(),
      }),
    );
  };
  if (!isConfigured()) {
    response.headers.set("Location", new URL("/login", origin).href);
    log("not_configured");
    return response;
  }
  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    log("missing_code");
    return response;
  }
  let sessionKey: string | undefined;
  let sessionWritten = false;
  let accepted = false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    sessionKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    const db = createServerClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll(items, headers) {
            const previousStage = stage;
            stage = "cookie_write";
            try {
              for (const { name, value, options } of items) {
                if (isChunkLike(name, sessionKey!) && value)
                  sessionWritten = true;
                response.cookies.set(name, value, options);
                if (options.maxAge === 0) request.cookies.delete(name);
                else request.cookies.set(name, value);
              }
              for (const [name, value] of Object.entries(headers))
                response.headers.set(name, value);
            } catch (error) {
              log("write_failed", error);
              // auth-js logs subscriber errors itself. Do not hand it an
              // exception that could contain the cookie it failed to write.
              throw new Error("Auth callback cookie write failed");
            }
            stage = previousStage;
          },
        },
      },
    );
    stage = "exchange";
    log("started");
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (error) {
      log("failed", error);
      return response;
    }
    stage = "user_validation";
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser();
    if (userError) {
      log("failed", userError);
      return response;
    }
    if (
      !user?.email_confirmed_at ||
      !campusEmail.safeParse(user.email).success
    ) {
      log("ineligible");
      stage = "sign_out";
      const { error: signOutError } = await db.auth.signOut({ scope: "local" });
      if (signOutError) log("failed", signOutError);
      return response;
    }
    const target = safePath(
      request.nextUrl.searchParams.get("next") || "/missions",
    );
    response.headers.set("Location", new URL(target, origin).href);
    accepted = true;
    return response;
  } catch (error) {
    log("exception", error);
    return response;
  } finally {
    if (!accepted && sessionWritten && sessionKey) {
      // Remove any newly issued partial/rejected session, including stale
      // chunks. An invalid link with no session write leaves an existing
      // email-link session alone. Other projects and PKCE flows are untouched.
      const cookies = [
        ...request.cookies.getAll(),
        ...response.cookies.getAll(),
      ];
      for (const { name } of cookies) {
        if (isChunkLike(name, sessionKey))
          response.cookies.set(name, "", { path: "/", maxAge: 0 });
      }
    }
    stage = "response";
    log(accepted ? "success" : "failure");
  }
}
