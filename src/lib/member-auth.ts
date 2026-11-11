import type { User } from "@supabase/supabase-js";
import { z } from "zod";
import { database, isConfigured, serviceDatabase } from "./supabase";

export const memberProfileSchema = z.object({
  name: z.string().trim().min(2).max(40),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9._]{2,19}$/),
  interests: z
    .array(
      z.enum([
        "Coffee",
        "Outdoors",
        "Books",
        "Food",
        "Music",
        "Film",
        "Sports",
        "Art",
      ]),
    )
    .max(8)
    .transform((items) => [...new Set(items)]),
});

export type MemberProfile = z.infer<typeof memberProfileSchema>;
export type MemberAccount = {
  id: string;
  email: string;
  profile: MemberProfile | null;
};

export class MemberAuthError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 503,
  ) {
    super(message);
    this.name = "MemberAuthError";
  }
}

export function eligibleMember(
  user: User | null | undefined,
): user is User & { email: string } {
  return Boolean(
    user?.id &&
    user.email_confirmed_at &&
    user.email &&
    /^[^\s@]+@illinois\.edu$/i.test(user.email),
  );
}

/** Always asks Auth to validate the session; never trusts a browser-supplied ID. */
export async function getMemberAccount(): Promise<MemberAccount | null> {
  if (!isConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new MemberAuthError(
      "Accounts are temporarily unavailable. Please try again shortly.",
      503,
    );
  try {
    const db = await database();
    const { data, error } = await db.auth.getUser();
    if (error) {
      if (
        error.name === "AuthSessionMissingError" ||
        [400, 401, 403].includes(error.status ?? 0)
      )
        return null;
      throw error;
    }
    if (!eligibleMember(data.user)) return null;
    const profile = await serviceDatabase()
      .from("member_profiles")
      .select("name,handle,interests")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profile.error) throw profile.error;
    return {
      id: data.user.id,
      email: data.user.email.toLowerCase(),
      profile: profile.data ? memberProfileSchema.parse(profile.data) : null,
    };
  } catch {
    throw new MemberAuthError(
      "Your account could not be loaded. Please try again shortly.",
      503,
    );
  }
}

export async function requireMemberAccount(
  options: { profile?: boolean } = {},
): Promise<MemberAccount> {
  const account = await getMemberAccount();
  if (!account)
    throw new MemberAuthError(
      "Sign in with your verified Illinois email to continue.",
      401,
    );
  if (options.profile && !account.profile)
    throw new MemberAuthError(
      "Finish setting up your profile to continue.",
      403,
    );
  return account;
}
