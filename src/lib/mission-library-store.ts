// Server-only: this module imports the cookie-based admin guard. Never import it
// from client components; pass only the explicitly selected records as props.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { requireMissionAdminAccess } from "./mission-admin-auth";
import { serviceDatabase } from "./supabase";
import {
  isPublishedMission,
  missionDraftSchema,
  missionReferenceSchema,
  type MissionDraftInput,
  type MissionLibraryRecord,
  type MissionLibraryResult,
} from "./mission-library";

const columns =
  "id,title,category,instructions,location_name,location_address,city,duration_minutes,cost_label,min_people,max_people,nuts,proof_prompt,source_url,source_checked_on,starts_at,ends_at,approved_at,archived_at,revision,created_at,updated_at";
const unavailable =
  "The mission library is unavailable. Check its Supabase connection and apply the mission-library migration.";
const conflict =
  "This mission changed in another window. Refresh the page before trying again.";

export type MissionTitleUpdate = Pick<
  MissionLibraryRecord,
  "id" | "title" | "revision" | "approved_at"
>;

function libraryDatabase() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    throw new Error(
      "The mission library needs its Supabase URL and server key configured.",
    );
  return serviceDatabase();
}

export async function listAdminMissions(): Promise<MissionLibraryResult> {
  await requireMissionAdminAccess();
  try {
    const { data, error } = await libraryDatabase()
      .from("mission_library")
      .select(columns)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (error) return { missions: [], error: unavailable };
    return { missions: (data ?? []) as MissionLibraryRecord[] };
  } catch {
    return { missions: [], error: unavailable };
  }
}

/** Drafts never reach the shared desktop/iPhone component, including on errors. */
export async function listPublishedMissions(): Promise<MissionLibraryResult> {
  try {
    const now = new Date().toISOString();
    const { data, error } = await libraryDatabase()
      .from("mission_library")
      .select(columns)
      .not("approved_at", "is", null)
      .is("archived_at", null)
      .or(`starts_at.is.null,starts_at.lte.${now}`)
      .or(`ends_at.is.null,ends_at.gt.${now}`)
      .order("starts_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error)
      return {
        missions: [],
        error:
          "Missions are temporarily unavailable. Please try again shortly.",
      };
    return {
      missions: ((data ?? []) as MissionLibraryRecord[]).filter((mission) =>
        isPublishedMission(mission),
      ),
    };
  } catch {
    return {
      missions: [],
      error: "Missions are temporarily unavailable. Please try again shortly.",
    };
  }
}

export async function saveMissionDraft(
  input: MissionDraftInput,
  id?: string,
  revision?: number,
): Promise<string> {
  await requireMissionAdminAccess();
  const validated = missionDraftSchema.parse(input);
  const db = libraryDatabase();
  const values = { ...validated, approved_at: null, archived_at: null };
  const query = id
    ? db
        .from("mission_library")
        .update(values)
        .eq("id", id)
        .eq("revision", revision)
    : db.from("mission_library").insert(values);
  const { data, error } = await query.select("id").maybeSingle();
  if (error) throw new Error(unavailable);
  if (!data) throw new Error(conflict);
  return data.id as string;
}

export async function renameMissionTitle(
  id: string,
  revision: number,
  title: string,
): Promise<MissionTitleUpdate> {
  await requireMissionAdminAccess();
  const reference = missionReferenceSchema.parse({ id, revision });
  const validatedTitle = missionDraftSchema.shape.title.parse(title);
  const { data, error } = await libraryDatabase()
    .from("mission_library")
    // A title edit never restores an archive or overwrites scheduling/content.
    // Even a repeated title cannot reinstate a previous approval.
    .update({ title: validatedTitle, approved_at: null })
    .eq("id", reference.id)
    .eq("revision", reference.revision)
    .select("id,title,revision,approved_at")
    .maybeSingle();
  if (error) throw new Error(unavailable);
  if (!data) throw new Error(conflict);
  return {
    id: data.id as string,
    title: data.title as string,
    revision: data.revision as number,
    approved_at: data.approved_at as string | null,
  };
}

export async function approveMissionRecord(
  id: string,
  revision: number,
): Promise<void> {
  await requireMissionAdminAccess();
  const now = new Date().toISOString();
  const { data, error } = await libraryDatabase()
    .from("mission_library")
    .update({ approved_at: now })
    .eq("id", id)
    .eq("revision", revision)
    .is("archived_at", null)
    .or(`ends_at.is.null,ends_at.gt.${now}`)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(unavailable);
  if (!data)
    throw new Error(
      "This mission changed, is archived, or has already ended. Refresh it and check its dates before approving.",
    );
}

export async function archiveMissionRecord(
  id: string,
  revision: number,
): Promise<void> {
  await requireMissionAdminAccess();
  const { data, error } = await libraryDatabase()
    .from("mission_library")
    .update({ archived_at: new Date().toISOString(), approved_at: null })
    .eq("id", id)
    .eq("revision", revision)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(unavailable);
  if (!data) throw new Error(conflict);
}

export async function importMissionDraftRecords(): Promise<number> {
  await requireMissionAdminAccess();
  const json: unknown = JSON.parse(
    await readFile(
      join(process.cwd(), "data", "mission-library-seed.json"),
      "utf8",
    ),
  );
  const seeds = z
    .array(missionDraftSchema.and(z.object({ id: z.string().uuid() })))
    .length(25)
    .parse(json);
  if (new Set(seeds.map((seed) => seed.id)).size !== seeds.length)
    throw new Error("The starter mission file has duplicate identifiers.");
  const rows = seeds.map((seed) => ({
    ...seed,
    starts_at: null,
    ends_at: null,
    approved_at: null,
    archived_at: null,
  }));
  const { data, error } = await libraryDatabase()
    .from("mission_library")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(unavailable);
  return data?.length ?? 0;
}
