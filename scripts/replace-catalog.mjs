import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const catalogSchema = z
  .array(
    z
      .object({
        key: z.string().regex(/^[a-z0-9][a-z0-9-]{2,99}$/),
        title: z.string().trim().min(3).max(100),
        category: z.enum([
          "Campus discoveries",
          "Squirrel spotting",
          "Around town",
        ]),
        nuts: z.number().int().min(1).max(1000),
        instructions: z.string().trim().min(10).max(2000),
        proof: z.string().trim().min(10).max(1500),
        manual_review: z.boolean(),
      })
      .strict(),
  )
  .min(1)
  .max(200)
  .refine(
    (rows) => new Set(rows.map((r) => r.key)).size === rows.length,
    "Duplicate catalog key",
  );

export async function replaceCatalog(args) {
  if (args.some((a) => a.startsWith("--") && a !== "--write"))
    throw new Error("Unknown option.");
  const file =
    args.find((a) => !a.startsWith("--")) || "missions/temporary-catalog.json";
  const missions = catalogSchema.parse(
    JSON.parse(await readFile(file, "utf8")),
  );
  if (!args.includes("--write")) {
    console.table(
      missions.map(({ title, manual_review }) => ({ title, manual_review })),
    );
    console.log(
      `${missions.length} missions ready. --write publishes these and unpublishes the previous catalog atomically. Existing assignments and scores are preserved.`,
    );
    return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error("Configure Supabase URL and server key first.");
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db.rpc("replace_mission_catalog", {
    p_missions: missions,
  });
  if (error)
    throw new Error(
      `Catalog replacement failed (${error.code || "unknown"}); no partial replacement was committed. Check migrations, then retry after the API schema cache refreshes.`,
    );
  console.log(
    `Published ${data} temporary missions. Previous catalog entries are unpublished, not deleted.`,
  );
}

// Importable by tests without executing a live write.
if (process.argv[1]?.endsWith("replace-catalog.mjs")) {
  replaceCatalog(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
