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
const id = "30000000-0000-4000-8000-000000000001";
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
});
beforeEach(async () => {
  await db.exec("begin; set role service_role;");
  await db.query(
    `insert into mission_library(id,title,category,instructions,location_name,city,duration_minutes,cost_label,proof_prompt,source_url,source_checked_on)
    values($1,'Quad victory lap','Self Improvement','Take a lap and invent a team name.','Main Quad','Urbana',10,'Free','Share your team name.','https://illinois.edu/','2026-10-28')`,
    [id],
  );
});
afterEach(async () => {
  await db.exec("rollback; reset role;");
});
afterAll(async () => {
  await db.close();
});
async function visible(role = "anon") {
  await db.exec(`set role ${role}`);
  return (await db.query("select id from mission_library")).rows.length;
}
async function service(sql: string, args: unknown[] = []) {
  await db.exec("set role service_role");
  return db.query<Record<string, unknown>>(sql, args);
}

describe("Supabase mission approval and permissions", () => {
  it("hides seeded drafts from both anonymous and signed-in members", async () => {
    expect(await visible()).toBe(0);
    expect(await visible("authenticated")).toBe(0);
  });
  it("requires approval even when the schedule has begun", async () => {
    await service(
      "update mission_library set starts_at=now()-interval '1 day' where id=$1",
      [id],
    );
    expect(await visible()).toBe(0);
    await service("update mission_library set approved_at=now() where id=$1", [
      id,
    ]);
    expect(await visible()).toBe(1);
  });
  it("hides future, expired, and archived missions", async () => {
    await service(
      "update mission_library set starts_at=now()+interval '1 day' where id=$1",
      [id],
    );
    await service("update mission_library set approved_at=now() where id=$1", [
      id,
    ]);
    expect(await visible()).toBe(0);
    await service(
      "update mission_library set starts_at=null,ends_at=now() where id=$1",
      [id],
    );
    await service("update mission_library set approved_at=now() where id=$1", [
      id,
    ]);
    expect(await visible()).toBe(0);
    await service("update mission_library set ends_at=null where id=$1", [id]);
    await service("update mission_library set approved_at=now() where id=$1", [
      id,
    ]);
    expect(await visible()).toBe(1);
    await service("update mission_library set archived_at=now() where id=$1", [
      id,
    ]);
    expect(await visible()).toBe(0);
  });
  it("withdraws approval on content edits and on schedule-only edits", async () => {
    await service("update mission_library set approved_at=now() where id=$1", [
      id,
    ]);
    const first = await service(
      "select revision from mission_library where id=$1",
      [id],
    );
    await service(
      "update mission_library set title='A better Quad victory lap' where id=$1",
      [id],
    );
    const edited = await service(
      "select revision,approved_at from mission_library where id=$1",
      [id],
    );
    expect(edited.rows[0]).toEqual({
      revision: Number(first.rows[0].revision) + 1,
      approved_at: null,
    });
    expect(await visible()).toBe(0);
    await service("update mission_library set approved_at=now() where id=$1", [
      id,
    ]);
    await service(
      "update mission_library set starts_at=now()-interval '1 minute' where id=$1",
      [id],
    );
    expect(await visible()).toBe(0);
  });
  it("makes stale editor revisions unable to overwrite newer work", async () => {
    await service(
      "update mission_library set title='Newer editor content' where id=$1 and revision=1",
      [id],
    );
    const stale = await service(
      "update mission_library set title='Stale editor content' where id=$1 and revision=1 returning id",
      [id],
    );
    expect(stale.rows).toHaveLength(0);
  });
  it.each(["anon", "authenticated"])(
    "denies %s direct mutation and approval",
    async (role) => {
      await db.exec(`set role ${role}; savepoint denied;`);
      await expect(
        db.query("update mission_library set approved_at=now() where id=$1", [
          id,
        ]),
      ).rejects.toThrow(/permission denied/);
      await db.exec("rollback to savepoint denied; release savepoint denied;");
    },
  );
});
