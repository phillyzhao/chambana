import { NextRequest, NextResponse } from "next/server";
import { database, isConfigured } from "@/lib/supabase";
import { campusEmail } from "@/lib/rules";
import { safePath } from "@/lib/paths";

export async function GET(request: NextRequest) {
  const origin = process.env.APP_URL || request.nextUrl.origin;
  if (!isConfigured()) return NextResponse.redirect(new URL("/login", origin));
  const code = request.nextUrl.searchParams.get("code");
  const db = await database();
  if (code) {
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await db.auth.getUser();
      if (
        user?.email_confirmed_at &&
        campusEmail.safeParse(user.email).success
      ) {
        const next = request.nextUrl.searchParams.get("next") || "/missions";
        const target = safePath(next);
        return NextResponse.redirect(new URL(target, origin));
      }
      await db.auth.signOut();
    }
  }
  return NextResponse.redirect(
    new URL(
      "/login?error=Sign-in+failed.+Use+a+verified+%40illinois.edu+account+and+request+a+new+link.",
      origin,
    ),
  );
}
