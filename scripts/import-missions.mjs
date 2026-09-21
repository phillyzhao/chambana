import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { parseCatalog } from "./catalog.mjs";

const args = process.argv.slice(2),
  file = args.find((arg) => !arg.startsWith("--"));
if (!file) {
  console.error(
    "Usage: npm run missions:import -- path/to/missions.txt [--write]",
  );
  process.exitCode = 1;
} else {
  try {
    const missions = parseCatalog(await readFile(file, "utf8"));
    if (!args.includes("--write")) {
      console.table(
        missions.map(({ title, category, nuts }) => ({
          title,
          category,
          nuts,
          published: false,
        })),
      );
      console.log(
        `${missions.length} valid draft missions. Nothing written. Add --write to import into your configured Supabase project.`,
      );
    } else {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
        key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key)
        throw new Error(
          "Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
        );
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { data: categories, error } = await db
        .from("categories")
        .select("id,name");
      if (error)
        throw new Error("Could not load categories. Apply migrations first.");
      const existing = await db.from("missions").select("title,category_id");
      if (existing.error)
        throw new Error("Could not inspect the existing catalog.");
      const rows = missions.map((m) => {
        const category = categories.find((c) => c.name === m.category);
        if (!category) throw new Error(`Missing category: ${m.category}`);
        if (
          existing.data.some(
            (x) =>
              x.category_id === category.id &&
              x.title.toLowerCase() === m.title.toLowerCase(),
          )
        )
          throw new Error(
            `Mission already exists: ${m.title}. Edit it in the admin panel instead.`,
          );
        return {
          title: m.title,
          category_id: category.id,
          nuts: m.nuts,
          instructions: m.instructions,
          proof_criteria: m.proof,
          published: false,
        };
      });
      const result = await db.from("missions").insert(rows);
      if (result.error)
        throw new Error(
          "Import failed. No missions from this batch were written.",
        );
      console.log(
        `Imported ${rows.length} drafts. Review and publish them in /admin.`,
      );
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
