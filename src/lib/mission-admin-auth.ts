// Server-only: next/headers prevents this module from entering a client bundle.
import { cookies } from "next/headers";
import {
  MISSION_ADMIN_COOKIE,
  verifyMissionAdminToken,
} from "./mission-admin-token";

export function missionAdminConfigured() {
  return (process.env.MISSION_ADMIN_SECRET?.length ?? 0) >= 32;
}

export async function hasMissionAdminAccess() {
  return verifyMissionAdminToken(
    (await cookies()).get(MISSION_ADMIN_COOKIE)?.value,
    process.env.MISSION_ADMIN_SECRET,
  );
}

export async function requireMissionAdminAccess() {
  if (!(await hasMissionAdminAccess()))
    throw new Error("Sign in to mission administration to continue.");
}
