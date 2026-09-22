import { cache } from "react";
import { database, isConfigured } from "./supabase";
import temporaryCatalog from "../../missions/temporary-catalog.json";

export type Group = {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  join_mode: string;
  organization: string;
  organization_verified: boolean;
};
export type Assignment = {
  id: string;
  group_id: string;
  slot: number;
  title: string;
  instructions: string;
  proof_criteria: string;
  nuts: number;
  status: string;
  expires_at: string;
  available_at: string;
  assigned_at: string;
  manual_review?: boolean;
};
export type Profile = {
  id: string;
  display_name: string;
  bio: string;
  created_at: string;
};
export type Submission = {
  id: string;
  assignment_id: string;
  status: string;
  reason: string | null;
  created_at: string;
};
export type Category = { id: string; name: string };
export const viewer = cache(async () => {
  if (!isConfigured())
    return {
      user: null,
      profile: null as Profile | null,
      admin: false,
      organizer: false,
      demo: true,
    };
  const db = await database();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error && error.name !== "AuthSessionMissingError")
    throw new Error("Could not check your sign-in. Please try again.");
  if (!user)
    return {
      user: null,
      profile: null as Profile | null,
      admin: false,
      organizer: false,
      demo: false,
    };
  const [profile, admin, organizer] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.rpc("is_admin"),
    db.rpc("is_organizer"),
  ]);
  if (profile.error || admin.error || organizer.error)
    throw new Error(
      "The backend needs its database migration before sign-in can finish.",
    );
  return {
    user,
    profile: profile.data as Profile,
    admin: Boolean(admin.data),
    organizer: Boolean(organizer.data),
    demo: false,
  };
});
export function checked<T>(result: {
  data: T;
  error: unknown;
}): NonNullable<T> {
  if (result.error || result.data === null)
    throw new Error("We could not load campus data. Please try again.");
  return result.data as NonNullable<T>;
}
export const demoCategories: Category[] = [
  { id: "10000000-0000-4000-8000-000000000001", name: "Campus discoveries" },
  { id: "10000000-0000-4000-8000-000000000002", name: "Squirrel spotting" },
  { id: "10000000-0000-4000-8000-000000000003", name: "Around town" },
];
export const demoGroups: Group[] = [
  {
    id: "demo-quad",
    name: "The Quad Crew",
    description:
      "Little adventures between classes. Explore campus, discover new corners, and make a few friends along the way.",
    owner_id: "demo",
    join_mode: "open",
    organization: "",
    organization_verified: false,
  },
  {
    id: "demo-squirrels",
    name: "Squirrel Spotters",
    description:
      "For the campus squirrels we all know and love. Watch from a distance, grab a photo, and leave them to their day.",
    owner_id: "demo",
    join_mode: "open",
    organization: "",
    organization_verified: false,
  },
  {
    id: "demo-wanderers",
    name: "Weekend Wanderers",
    description:
      "Get out of your usual route. A group for curious Illini with a little time to explore Champaign-Urbana.",
    owner_id: "demo",
    join_mode: "organization",
    organization: "Example campus organization",
    organization_verified: true,
  },
];
export function demoAssignments(): Assignment[] {
  return temporaryCatalog.slice(0, 3).map((m, i) => ({
    ...m,
    proof_criteria: m.proof,
    id: `demo-${i}`,
    group_id: "demo-quad",
    slot: i + 1,
    status: "active",
    assigned_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 18 * 3600000).toISOString(),
    available_at: new Date(Date.now() + 18 * 3600000).toISOString(),
  }));
}
