import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  MISSION_CATEGORIES,
  missionDraftSchema,
} from "../src/lib/mission-library.ts";

// Run with Node 24 and the desired environment explicitly loaded, for example:
// node --env-file=.env.local scripts/seed-mission-library.mjs
// Repeated runs preserve every existing record, including owner edits/approval.
async function main() {
  if (Number(process.versions.node.split(".")[0]) < 24)
    throw new Error("Node 24 is required.");
  const source = JSON.parse(
    await readFile(
      new URL("../data/mission-library-seed.json", import.meta.url),
      "utf8",
    ),
  );
  const seeds = z
    .array(missionDraftSchema.and(z.object({ id: z.string().uuid() })))
    .length(25)
    .parse(source);
  if (
    new Set(seeds.map((mission) => mission.id)).size !== 25 ||
    MISSION_CATEGORIES.some(
      (category) =>
        seeds.filter((mission) => mission.category === category).length !== 5,
    )
  )
    throw new Error(
      "Starter missions must have unique IDs and five per category.",
    );

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Supabase server configuration is missing.");
  const database = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rows = seeds.map((mission) => ({
    ...mission,
    starts_at: null,
    ends_at: null,
    approved_at: null,
    archived_at: null,
  }));
  const { data, error } = await database
    .from("mission_library")
    .upsert(rows, { onConflict: "id", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error("Draft import failed.");
  console.log(
    JSON.stringify({ total: rows.length, inserted: data?.length ?? 0 }),
  );
}

main().catch(() => {
  // Raw errors may contain credentials, URLs, or submitted content.
  console.error("Mission draft import failed.");
  process.exitCode = 1;
});
