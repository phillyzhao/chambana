"use server";

import { revalidatePath } from "next/cache";
import { appOrigin } from "@/lib/auth";
import {
  eligibleMember,
  getMemberAccount,
  memberProfileSchema,
  requireMemberAccount,
  type MemberAccount,
} from "@/lib/member-auth";
import { operationalEvent } from "@/lib/observability";
import { allowRequest } from "@/lib/rate-limit";
import { campusEmail } from "@/lib/rules";
import { database, isConfigured, serviceDatabase } from "@/lib/supabase";

export type MemberAuthResult =
  { ok: true; account?: MemberAccount } | { ok: false; error: string };
const unavailable: MemberAuthResult = {
  ok: false,
  error: "Sign-in is temporarily unavailable. Please try again shortly.",
};

export async function requestMemberCode(
  rawEmail: string,
): Promise<MemberAuthResult> {
  const email = campusEmail.safeParse(rawEmail);
  if (!email.success || email.data.length > 254)
    return { ok: false, error: "Enter your @illinois.edu email." };
  if (
    process.env.CHAMBANA_EMAIL_OTP_ENABLED !== "true" ||
    !isConfigured() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return unavailable;
  try {
    if (
      !(await allowRequest("member-login-email", email.data, 3, 300)) ||
      !(await allowRequest("member-login-global", "all", 50, 60))
    )
      return {
        ok: false,
        error: "Please wait a few minutes before requesting another email.",
      };
    const db = await database();
    const { error } = await db.auth.signInWithOtp({
      email: email.data,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${appOrigin()}/account/callback`,
      },
    });
    if (error) {
      operationalEvent("member_signin_email_failed");
      return unavailable;
    }
    return { ok: true };
  } catch {
    operationalEvent("member_signin_email_failed");
    return unavailable;
  }
}

export async function verifyMemberCode(
  rawEmail: string,
  token: string,
): Promise<MemberAuthResult> {
  const email = campusEmail.safeParse(rawEmail);
  if (
    !email.success ||
    email.data.length > 254 ||
    typeof token !== "string" ||
    !/^\d{6,8}$/.test(token)
  )
    return { ok: false, error: "Enter the verification code from your email." };
  if (process.env.CHAMBANA_EMAIL_OTP_ENABLED !== "true") return unavailable;
  try {
    if (
      !(await allowRequest("member-code-email", email.data, 8, 600)) ||
      !(await allowRequest("member-code-global", "all", 120, 60))
    )
      return {
        ok: false,
        error:
          "Too many attempts. Please wait a few minutes and request a fresh email.",
      };
    const db = await database();
    const { data, error } = await db.auth.verifyOtp({
      email: email.data,
      token,
      type: "email",
    });
    if (error)
      return {
        ok: false,
        error:
          "That code is invalid or expired. Request a new email and try again.",
      };
    if (
      !eligibleMember(data.user) ||
      data.user.email.toLowerCase() !== email.data
    ) {
      await db.auth.signOut({ scope: "local" });
      return { ok: false, error: "Sign in with your verified Illinois email." };
    }
    const account = await getMemberAccount();
    if (!account) return unavailable;
    revalidatePath("/app");
    return { ok: true, account };
  } catch {
    operationalEvent("member_code_verification_failed");
    return unavailable;
  }
}

export async function saveMemberProfile(
  input: unknown,
): Promise<MemberAuthResult> {
  const profile = memberProfileSchema.safeParse(input);
  if (!profile.success)
    return {
      ok: false,
      error:
        "Use a name of 2–40 characters and a username of 3–20 letters, numbers, dots or underscores.",
    };
  try {
    const account = await requireMemberAccount();
    if (!(await allowRequest("member-profile", account.id, 20, 300)))
      return {
        ok: false,
        error: "Please wait a few minutes before changing your profile again.",
      };
    const { error } = await serviceDatabase()
      .from("member_profiles")
      .upsert({ id: account.id, ...profile.data }, { onConflict: "id" });
    if (error) {
      if (error.code === "23505")
        return {
          ok: false,
          error: "That username is taken. Choose another one.",
        };
      operationalEvent("member_profile_save_failed");
      return {
        ok: false,
        error: "Your profile could not be saved. Please try again.",
      };
    }
    revalidatePath("/app");
    return { ok: true, account: { ...account, profile: profile.data } };
  } catch {
    return { ok: false, error: "Sign in again to save your profile." };
  }
}

export async function signOutMember(): Promise<MemberAuthResult> {
  try {
    const db = await database();
    const { error } = await db.auth.signOut({ scope: "local" });
    if (error)
      return {
        ok: false,
        error: "We couldn't sign you out. Please try again.",
      };
    revalidatePath("/app");
    return { ok: true };
  } catch {
    return unavailable;
  }
}
