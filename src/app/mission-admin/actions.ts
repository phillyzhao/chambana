"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  hasMissionAdminAccess,
  missionAdminConfigured,
} from "@/lib/mission-admin-auth";
import {
  createMissionAdminToken,
  MISSION_ADMIN_COOKIE,
  MISSION_ADMIN_MAX_AGE,
  validMissionAdminSecret,
} from "@/lib/mission-admin-token";
import {
  missionDraftSchema,
  missionFormInput,
  missionReferenceSchema,
  type MissionActionState,
} from "@/lib/mission-library";
import {
  approveMissionRecord,
  archiveMissionRecord,
  importMissionDraftRecords,
  renameMissionTitle,
  saveMissionDraft,
  type MissionTitleUpdate,
} from "@/lib/mission-library-store";

export type { MissionActionState } from "@/lib/mission-library";

export type RenameMissionState = MissionActionState & {
  mission?: MissionTitleUpdate;
};

// A high-entropy owner key is the security boundary. This local throttle also
// makes repeated password guessing costly without relying on the retired beta.
const attempts = new Map<string, { count: number; resetAt: number }>();
function allowLoginAttempt() {
  const now = Date.now();
  const prior = attempts.get("owner");
  if (!prior || prior.resetAt <= now) {
    attempts.set("owner", { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (prior.count >= 20) return false;
  prior.count += 1;
  return true;
}

function refreshLibrary() {
  revalidatePath("/mission-admin");
  revalidatePath("/design-preview");
}
const unauthorized: MissionActionState = {
  error: "Sign in to mission administration to continue.",
};

export async function loginMissionAdmin(
  _previous: MissionActionState,
  form: FormData,
): Promise<MissionActionState> {
  if (!missionAdminConfigured())
    return { error: "Mission administration is not configured yet." };
  if (
    !validMissionAdminSecret(
      form.get("secret"),
      process.env.MISSION_ADMIN_SECRET,
    )
  ) {
    if (!allowLoginAttempt())
      return {
        error: "Too many sign-in attempts. Wait one minute and try again.",
      };
    return { error: "That admin key is not correct." };
  }
  // Failed attempts by other visitors must never lock out the correct owner.
  attempts.delete("owner");
  (await cookies()).set(
    MISSION_ADMIN_COOKIE,
    createMissionAdminToken(process.env.MISSION_ADMIN_SECRET!),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: MISSION_ADMIN_MAX_AGE,
    },
  );
  redirect("/mission-admin");
}

export async function logoutMissionAdmin() {
  (await cookies()).delete(MISSION_ADMIN_COOKIE);
  redirect("/mission-admin");
}

export async function saveMission(
  _previous: MissionActionState,
  form: FormData,
): Promise<MissionActionState> {
  if (!(await hasMissionAdminAccess())) return unauthorized;
  let input;
  let reference: { id: string; revision: number } | undefined;
  try {
    input = missionFormInput(form);
    const id = form.get("id");
    if (id) {
      const result = missionReferenceSchema.safeParse({
        id,
        revision: form.get("revision"),
      });
      if (!result.success)
        return {
          error: "This mission reference is invalid. Refresh the page.",
        };
      reference = result.data;
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Check the mission fields and try again.",
    };
  }
  try {
    const id = await saveMissionDraft(
      input,
      reference?.id,
      reference?.revision,
    );
    refreshLibrary();
    return {
      success:
        "Draft saved. It needs your separate approval before it can appear in the MVP.",
      id,
    };
  } catch (error) {
    return { error: safeStoreError(error) };
  }
}

function referenceFrom(form: FormData) {
  return missionReferenceSchema.safeParse({
    id: form.get("id"),
    revision: form.get("revision"),
  });
}

export async function renameMission(
  _previous: RenameMissionState,
  form: FormData,
): Promise<RenameMissionState> {
  if (!(await hasMissionAdminAccess())) return unauthorized;
  const reference = referenceFrom(form);
  if (!reference.success)
    return { error: "This mission reference is invalid. Refresh the page." };
  const title = missionDraftSchema.shape.title.safeParse(form.get("title"));
  if (!title.success)
    return { error: "Enter a mission title between 4 and 120 characters." };
  try {
    const mission = await renameMissionTitle(
      reference.data.id,
      reference.data.revision,
      title.data,
    );
    refreshLibrary();
    return {
      success:
        "Title saved. This mission needs your approval before it can appear in the MVP.",
      id: mission.id,
      mission,
    };
  } catch (error) {
    const message = safeStoreError(error);
    // Refresh the current saved title/revision for an explicit owner decision.
    // A conflict never retries or overwrites the newer record automatically.
    if (message.startsWith("This mission changed")) refreshLibrary();
    return { error: message };
  }
}

function safeStoreError(error: unknown) {
  // Store functions emit only these operational messages; never echo raw
  // database/network errors, credentials, URLs, or submitted content.
  const message = error instanceof Error ? error.message : "";
  return /^(This mission changed|The mission library|Sign in to mission administration)/.test(
    message,
  )
    ? message
    : "The change could not be saved. Please try again.";
}

export async function approveMission(
  _previous: MissionActionState,
  form: FormData,
): Promise<MissionActionState> {
  if (!(await hasMissionAdminAccess())) return unauthorized;
  if (form.get("confirmation") !== "APPROVE")
    return {
      error: "Confirm your approval for this mission before continuing.",
    };
  const reference = referenceFrom(form);
  if (!reference.success)
    return { error: "This mission reference is invalid. Refresh the page." };
  try {
    await approveMissionRecord(reference.data.id, reference.data.revision);
    refreshLibrary();
    return {
      success:
        "Mission approved. Its schedule and the shared-feed setting control when it appears.",
      id: reference.data.id,
    };
  } catch (error) {
    return { error: safeStoreError(error) };
  }
}

export async function archiveMission(
  _previous: MissionActionState,
  form: FormData,
): Promise<MissionActionState> {
  if (!(await hasMissionAdminAccess())) return unauthorized;
  const reference = referenceFrom(form);
  if (!reference.success)
    return { error: "This mission reference is invalid. Refresh the page." };
  try {
    await archiveMissionRecord(reference.data.id, reference.data.revision);
    refreshLibrary();
    return {
      success: "Mission archived and its approval removed.",
      id: reference.data.id,
    };
  } catch (error) {
    return { error: safeStoreError(error) };
  }
}

export async function importMissionDrafts(
  _previous: MissionActionState,
  _form: FormData,
): Promise<MissionActionState> {
  if (!(await hasMissionAdminAccess())) return unauthorized;
  try {
    const count = await importMissionDraftRecords();
    refreshLibrary();
    return {
      success: count
        ? `${count} starter drafts added. None are approved or scheduled.`
        : "The starter drafts are already in your library. Your edits are preserved.",
    };
  } catch {
    return {
      error:
        "The starter drafts could not be imported. Check the mission-library migration and starter file.",
    };
  }
}
