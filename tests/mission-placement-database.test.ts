import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

let db: PGlite;
let before: Record<string, unknown>[];
const playIds = [
  "6b10ca00-2026-4028-8025-000000000012",
  "6b10ca00-2026-4028-8025-000000000013",
  "6b10ca00-2026-4028-8025-000000000015",
];
const contentColumns =
  "id,title,category,instructions,location_name,location_address,city,duration_minutes,cost_label,min_people,max_people,nuts,proof_prompt,source_url,source_checked_on,starts_at,ends_at,approved_at,archived_at,created_at";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; grant usage on schema public to anon,authenticated,service_role;",
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202610280010_mission_library.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const seeds = JSON.parse(
    await readFile(
      new URL("../data/mission-library-seed.json", import.meta.url),
      "utf8",
    ),
  ) as Record<string, unknown>[];
  const columns =
    "id,title,category,instructions,location_name,location_address,city,duration_minutes,cost_label,min_people,max_people,nuts,proof_prompt,source_url,source_checked_on,starts_at,ends_at".split(
      ",",
    );
  for (const seed of seeds)
    await db.query(
      `insert into mission_library(${columns.join(",")},approved_at) values(${columns.map((_, index) => `$${index + 1}`).join(",")},'2026-11-11T18:00:00Z')`,
      columns.map((key) => seed[key]),
    );
  before = (
    await db.query<Record<string, unknown>>(
      `select ${contentColumns} from mission_library order by id`,
    )
  ).rows;
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202611120012_mission_placement.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
});
beforeEach(async () => {
  await db.exec("begin; set role service_role;");
});
afterEach(async () => {
  await db.exec("rollback; reset role;");
});
afterAll(async () => {
  await db.close();
});

describe("mission placement migration", () => {
  it("assigns the owner-selected three to Play and preserves the other 22 in Missions", async () => {
    expect(
      (
        await db.query(
          "select id from mission_library where placement='play' order by id",
        )
      ).rows,
    ).toEqual(playIds.map((id) => ({ id })));
    expect(
      (
        await db.query(
          "select id from mission_library where placement='missions'",
        )
      ).rows,
    ).toHaveLength(22);
    expect(
      (
        await db.query(
          `select ${contentColumns} from mission_library order by id`,
        )
      ).rows,
    ).toEqual(before);
  });

  it("requires fresh approval after a later placement change", async () => {
    await db.query(
      "update mission_library set placement='missions' where id=$1",
      [playIds[0]],
    );
    expect(
      (
        await db.query(
          "select placement,approved_at from mission_library where id=$1",
          [playIds[0]],
        )
      ).rows[0],
    ).toEqual({ placement: "missions", approved_at: null });
    await db.exec("set role anon");
    expect(
      (
        await db.query("select id from mission_library where id=$1", [
          playIds[0],
        ])
      ).rows,
    ).toEqual([]);
  });

  it("rejects invalid placements", async () => {
    await expect(
      db.query("update mission_library set placement='both' where id=$1", [
        playIds[0],
      ]),
    ).rejects.toThrow(/check constraint/);
  });

  it("defaults newly created drafts to Missions", async () => {
    const row = await db.query(
      "insert into mission_library(title,category,instructions,location_name,city,duration_minutes,cost_label,proof_prompt,source_url,source_checked_on) values('A new local activity','Kindness','Help a willing friend with a small task.','Main Quad','Urbana',5,'Free','Required photo of the completed task.','https://illinois.edu/','2026-11-12') returning placement,approved_at",
    );
    expect(row.rows[0]).toEqual({ placement: "missions", approved_at: null });
  });
});
