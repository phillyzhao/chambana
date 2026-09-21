import { z } from "zod";

const record = z.object({
  title: z.string().trim().min(3).max(100),
  category: z.enum(["Campus discoveries", "Squirrel spotting", "Around town"]),
  nuts: z.coerce.number().int().min(1).max(1000),
  instructions: z.string().trim().min(10).max(2000),
  proof: z.string().trim().min(10).max(1500),
});

/** Blank lines and # comments are ignored; --- separates mission records. */
export function parseCatalog(text) {
  const blocks = text.split(/^---\s*$/m).filter((s) => s.trim());
  const missions = blocks
    .map((block, index) => {
      const fields = {};
      let current = "";
      for (const line of block.split(/\r?\n/)) {
        if (!line.trim() || line.trimStart().startsWith("#")) continue;
        const field = line.match(
          /^(Title|Category|Nuts|Instructions|Proof):\s*(.*)$/i,
        );
        if (field) {
          current = field[1].toLowerCase();
          if (current in fields)
            throw new Error(
              `Mission ${index + 1}: duplicate field ${current}.`,
            );
          fields[current] = field[2];
        } else if (current) fields[current] += "\n" + line;
        else
          throw new Error(`Mission ${index + 1}: start with a Title: field.`);
      }
      if (!Object.keys(fields).length) return null;
      const parsed = record.safeParse(fields);
      if (!parsed.success)
        throw new Error(
          `Mission ${index + 1}: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}`,
        );
      return parsed.data;
    })
    .filter(Boolean);
  const keys = new Set();
  for (const m of missions) {
    const key = `${m.category}:${m.title.toLowerCase()}`;
    if (keys.has(key)) throw new Error(`Duplicate mission: ${m.title}`);
    keys.add(key);
  }
  if (!missions.length) throw new Error("The catalog contains no missions.");
  return missions;
}
