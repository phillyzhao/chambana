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
const member = "10000000-0000-4000-8000-000000000001";
const other = "10000000-0000-4000-8000-000000000002";
const mission = "20000000-0000-4000-8000-000000000001";

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,metadata jsonb);
    grant usage on schema storage to service_role;
    grant all on storage.objects to service_role;
  `);
  for (const name of [
    "202610280010_mission_library.sql",
    "202611110011_member_missions.sql",
    "202611120012_mission_placement.sql",
  ])
    await db.exec(
      await readFile(
        new URL(`../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
});
beforeEach(async () => {
  await db.exec("begin;");
  await db.query("insert into auth.users(id) values($1),($2)", [member, other]);
  await db.query(
    "insert into member_profiles(id,name,handle) values($1,'First Member','firstmember'),($2,'Other Member','othermember')",
    [member, other],
  );
  await db.query(
    `insert into mission_library(id,title,category,instructions,location_name,city,duration_minutes,cost_label,proof_prompt,source_url,source_checked_on,nuts,approved_at)
    values($1,'Quad high five','Kindness','Give a willing friend a high five.','Main Quad','Urbana',5,'Free','Required photo of your high five.','https://illinois.edu/','2026-11-11',35,now())`,
    [mission],
  );
  await db.exec("set role service_role;");
});
afterEach(async () => {
  await db.exec("rollback; reset role;");
});
afterAll(async () => {
  await db.close();
});

async function reserve(user = member, mime = "image/jpeg", size = 24) {
  const result = await db.query<Record<string, unknown>>(
    "select * from reserve_member_submission($1,$2,$3,$4)",
    [user, mission, mime, size],
  );
  return result.rows[0];
}
async function upload(
  submission: Record<string, unknown>,
  overrides: Record<string, unknown> = {},
) {
  await db.query(
    "insert into storage.objects(bucket_id,name,metadata) values('member-mission-proof',$1,$2)",
    [
      submission.proof_path,
      JSON.stringify({
        size: submission.size_bytes,
        mimetype: submission.mime_type,
        ...overrides,
      }),
    ],
  );
}
async function pending(user = member) {
  const submission = await reserve(user);
  await upload(submission);
  await db.query("select finalize_member_submission($1,$2)", [
    user,
    submission.id,
  ]);
  return submission;
}
async function fails(sql: string, args: unknown[], message: RegExp) {
  await db.exec("savepoint expected_failure;");
  await expect(db.query(sql, args)).rejects.toThrow(message);
  await db.exec(
    "rollback to savepoint expected_failure; release savepoint expected_failure;",
  );
}

describe("real member proof and owner-only nuts", () => {
  it("snapshots approved mission terms and awards nothing while uploading or pending", async () => {
    const s = await reserve();
    expect(s).toMatchObject({
      status: "uploading",
      nuts: 35,
      mission_revision: 1,
      mission_title: "Quad high five",
    });
    await db.query(
      "update mission_library set nuts=90,title='Changed mission',placement='play' where id=$1",
      [mission],
    );
    await upload(s);
    const result = await db.query<Record<string, unknown>>(
      "select * from finalize_member_submission($1,$2)",
      [member, s.id],
    );
    expect(result.rows[0]).toMatchObject({
      status: "pending",
      nuts: 35,
      mission_title: "Quad high five",
    });
    expect((await db.query("select * from member_nut_ledger")).rows).toEqual(
      [],
    );
  });

  it("credits the snapshot exactly once and rejects a contradictory later decision", async () => {
    const s = await pending();
    await db.query("update mission_library set nuts=90 where id=$1", [mission]);
    await db.query("select review_member_submission($1,'approve','')", [s.id]);
    await db.query("select review_member_submission($1,'approve','')", [s.id]);
    expect(
      (await db.query("select amount from member_nut_ledger")).rows,
    ).toEqual([{ amount: 35 }]);
    await fails(
      "select review_member_submission($1,'reject','No longer approved')",
      [s.id],
      /already changed/,
    );
    await fails(
      "select reserve_member_submission($1,$2,'image/jpeg',24)",
      [member, mission],
      /not available/,
    );
    await db.query("update mission_library set approved_at=now() where id=$1", [
      mission,
    ]);
    await fails(
      "select reserve_member_submission($1,$2,'image/jpeg',24)",
      [member, mission],
      /pending or approved/,
    );
  });

  it("requires a reason for rejection and permits a new attempt without awarding the old attempt", async () => {
    const first = await pending();
    await fails(
      "select review_member_submission($1,'reject',' ')",
      [first.id],
      /rejection reason/,
    );
    await db.query(
      "select review_member_submission($1,'reject','The activity is not visible.')",
      [first.id],
    );
    await fails(
      "select review_member_submission($1,'approve','')",
      [first.id],
      /already changed/,
    );
    const second = await pending();
    expect(second.id).not.toBe(first.id);
    await db.query("select review_member_submission($1,'approve','')", [
      second.id,
    ]);
    expect(
      (await db.query("select submission_id,amount from member_nut_ledger"))
        .rows,
    ).toEqual([{ submission_id: second.id, amount: 35 }]);
  });

  it("will not finalize missing, mismatched, or another member's media", async () => {
    const s = await reserve();
    await fails(
      "select finalize_member_submission($1,$2)",
      [member, s.id],
      /incomplete/,
    );
    await upload(s, { size: 999 });
    await fails(
      "select finalize_member_submission($1,$2)",
      [member, s.id],
      /incomplete/,
    );
    await fails(
      "select finalize_member_submission($1,$2)",
      [other, s.id],
      /not found/,
    );
    await db.query("update storage.objects set metadata=$1 where name=$2", [
      JSON.stringify({ size: 24, mimetype: "video/mp4" }),
      s.proof_path,
    ]);
    await fails(
      "select finalize_member_submission($1,$2)",
      [member, s.id],
      /incomplete/,
    );
    await fails(
      "select review_member_submission($1,'approve','')",
      [s.id],
      /already changed/,
    );
  });

  it("makes interrupted uploads resumable and stale cancellation harmless", async () => {
    const s = await reserve();
    expect((await reserve()).id).toBe(s.id);
    await fails(
      "select reserve_member_submission($1,$2,'image/png',30)",
      [member, mission],
      /Finish or cancel/,
    );
    await upload(s);
    await db.query("select finalize_member_submission($1,$2)", [member, s.id]);
    await fails(
      "select cancel_member_upload($1,$2)",
      [member, s.id],
      /unfinished upload/,
    );
    expect(
      (
        await db.query("select status from mission_submissions where id=$1", [
          s.id,
        ])
      ).rows,
    ).toEqual([{ status: "pending" }]);
  });

  it("allows an uploading attempt to be canceled but cannot subsequently finalize it", async () => {
    const s = await reserve();
    await db.query("select cancel_member_upload($1,$2)", [member, s.id]);
    await upload(s);
    await fails(
      "select finalize_member_submission($1,$2)",
      [member, s.id],
      /cannot be changed/,
    );
    expect((await reserve()).id).not.toBe(s.id);
  });

  it("expires abandoned uploads and enforces mission availability and file limits", async () => {
    const s = await reserve();
    await db.query(
      "update mission_submissions set created_at=now()-interval '3 hours' where id=$1",
      [s.id],
    );
    expect((await reserve()).id).not.toBe(s.id);
    await fails(
      "select reserve_member_submission($1,$2,'image/jpeg',10485761)",
      [other, mission],
      /supported photo/,
    );
    await fails(
      "select reserve_member_submission($1,$2,'text/html',24)",
      [other, mission],
      /supported photo/,
    );
    await db.query(
      "update mission_library set archived_at=now(),approved_at=null where id=$1",
      [mission],
    );
    await fails(
      "select reserve_member_submission($1,$2,'image/jpeg',24)",
      [other, mission],
      /not available/,
    );
  });

  it("isolates member reads and forbids direct writes or review RPCs", async () => {
    const s = await pending();
    await db.query("select review_member_submission($1,'approve','')", [s.id]);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
      other,
    ]);
    await db.exec("set role authenticated;");
    expect((await db.query("select * from mission_submissions")).rows).toEqual(
      [],
    );
    expect((await db.query("select * from member_nut_ledger")).rows).toEqual(
      [],
    );
    expect((await db.query("select handle from member_profiles")).rows).toEqual(
      [{ handle: "othermember" }],
    );
    await fails(
      "select review_member_submission($1,'approve','')",
      [s.id],
      /permission denied/,
    );
    await fails(
      "select reserve_member_submission($1,$2,'image/jpeg',24)",
      [other, mission],
      /permission denied/,
    );
    await fails(
      "update member_profiles set name='Forged' where id=$1",
      [other],
      /permission denied/,
    );
    await fails(
      "update mission_submissions set status='approved'",
      [],
      /permission denied/,
    );
    await fails(
      "insert into member_nut_ledger(user_id,mission_id,submission_id,amount) values($1,$2,$3,1000)",
      [other, mission, s.id],
      /permission denied/,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
      member,
    ]);
    expect(
      (await db.query("select amount from member_nut_ledger")).rows,
    ).toEqual([{ amount: 35 }]);
    await db.exec("set role anon;");
    await fails("select * from member_profiles", [], /permission denied/);
    await fails("select * from mission_submissions", [], /permission denied/);
  });

  it("accepts supported video proof with the same manual approval requirement", async () => {
    const s = await reserve(member, "video/quicktime", 40 * 1024 * 1024);
    await upload(s);
    await db.query("select finalize_member_submission($1,$2)", [member, s.id]);
    expect((await db.query("select * from member_nut_ledger")).rows).toEqual(
      [],
    );
    await db.query("select review_member_submission($1,'approve','')", [s.id]);
    expect(
      (await db.query("select amount from member_nut_ledger")).rows,
    ).toEqual([{ amount: 35 }]);
  });
});
