import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import {
  beforeAll,
  beforeEach,
  afterAll,
  afterEach,
  describe,
  expect,
  it,
} from "vitest";

let db: PGlite;
const owner = "20000000-0000-4000-8000-000000000001",
  member = "20000000-0000-4000-8000-000000000002",
  outsider = "20000000-0000-4000-8000-000000000003",
  admin = "20000000-0000-4000-8000-000000000004";
const category = "10000000-0000-4000-8000-000000000001";
let group: string, assignment: string;
const scalar = async <T = string>(sql: string, params: unknown[] = []) =>
  Object.values((await db.query<Record<string, T>>(sql, params)).rows[0])[0];
async function asUser(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function asService() {
  await db.exec("reset role");
  await db.exec("set role service_role");
}
async function denied(sql: string, params: unknown[] = [], pattern?: RegExp) {
  await db.exec("savepoint denial");
  let caught: unknown;
  try {
    await db.query(sql, params);
  } catch (e) {
    caught = e;
  }
  await db.exec("rollback to savepoint denial; release savepoint denial");
  expect(caught).toBeTruthy();
  if (pattern) expect(String(caught)).toMatch(pattern);
}
async function submit(user = member) {
  await asUser(user);
  const id = randomUUID();
  await db.query("select begin_submission($1,$2)", [assignment, id]);
  await asService();
  await db.query("select finish_upload($1,$2)", [id, randomUUID()]);
  return id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',created_at timestamptz default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  `);
  await db.exec(
    await readFile(
      new URL("../supabase/migrations/202609210001_beta.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/202609210002_review_status.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  for (const [id, email] of [
    [owner, "owner@illinois.edu"],
    [member, "member@illinois.edu"],
    [outsider, "outsider@illinois.edu"],
    [admin, "admin@illinois.edu"],
  ])
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at)values($1,$2,now())",
      [id, email],
    );
  await db.exec(
    "insert into organizer_emails(email)values('owner@illinois.edu'); insert into platform_admins values('admin@illinois.edu')",
  );
  for (let i = 1; i <= 8; i++)
    await db.query(
      "insert into missions(category_id,title,instructions,proof_criteria,nuts,published)values($1,$2,'Take a photo of visible campus art.','A piece of outdoor campus art clearly visible.',20,true)",
      [category, `Mission ${i}`],
    );
});
beforeEach(async () => {
  await db.exec("begin");
  await asUser(owner);
  group = await scalar(
    "select create_group('Test group','A campus discovery group.','open','',array[$1::uuid])",
    [category],
  );
  await asUser(member);
  await db.query("select join_group($1)", [group]);
  await db.query("select refresh_missions($1)", [group]);
  assignment = await scalar(
    "select id from assignments where group_id=$1 order by slot limit 1",
    [group],
  );
});
afterEach(async () => {
  await db.exec("rollback; reset role");
});
afterAll(async () => {
  await db.close();
});

describe("authentication and permissions", () => {
  it("rejects non-campus accounts at the database boundary", async () => {
    await db.exec("reset role");
    await denied(
      "insert into auth.users(id,email,email_confirmed_at)values($1,'someone@gmail.com',now())",
      [randomUUID()],
      /illinois.edu/,
    );
  });
  it("rejects changing an account to a non-campus domain", async () => {
    await db.exec("reset role");
    await denied(
      "update auth.users set email='owner@gmail.com' where id=$1",
      [owner],
      /illinois.edu/,
    );
  });
  it("requires confirmed campus email even with an authenticated token", async () => {
    await db.exec("reset role");
    await db.query(
      "update auth.users set email_confirmed_at=null where id=$1",
      [member],
    );
    await asUser(member);
    await denied("select refresh_missions($1)", [group], /Join/);
  });
  it("does not let members create groups or approve themselves", async () => {
    await asUser(member);
    await denied(
      "select create_group('Bad group','Unauthorized group creation','open','',array[$1::uuid])",
      [category],
      /approval/,
    );
    await denied(
      "select approve_organizer('member@illinois.edu',true)",
      [],
      /admin/,
    );
  });
  it("does not expose organizer emails to members", async () => {
    await asUser(member);
    await denied("select * from organizer_emails", [], /permission/);
    await denied("select * from platform_admins", [], /permission/);
    await denied("select * from admin_users('')", [], /admin/);
  });
  it("keeps profile role fields out of client control", async () => {
    await asUser(member);
    await denied(
      "update profiles set id=$1 where id=$2",
      [outsider, member],
      /permission/,
    );
  });
  it("allows public profiles but not private mission submissions", async () => {
    await submit();
    await db.exec("reset role;set role anon");
    expect(Number(await scalar("select count(*) from profiles"))).toBe(4);
    await denied("select * from submissions", [], /permission/);
  });
  it("prevents points forgery and client-side AI settlement", async () => {
    await asUser(member);
    await denied(
      "insert into nut_transactions(assignment_id,group_id,user_id,amount)values($1,$2,$3,999)",
      [assignment, group, member],
      /permission/,
    );
    await denied(
      "select settle_submission($1,'approved','Fake')",
      [randomUUID()],
      /permission/,
    );
    await denied(
      "select finish_upload($1,'fake')",
      [randomUUID()],
      /permission/,
    );
  });
  it("hides other groups' assignments", async () => {
    await asUser(outsider);
    expect(
      Number(
        await scalar("select count(*) from assignments where group_id=$1", [
          group,
        ]),
      ),
    ).toBe(0);
    await denied(
      "select begin_submission($1,$2)",
      [assignment, randomUUID()],
      /Join/,
    );
  });
  it("revoking organizer status disables organizer controls", async () => {
    await asUser(admin);
    await db.exec("select approve_organizer('owner@illinois.edu',false)");
    await asUser(owner);
    await denied("select create_invite($1)", [group], /organizer/);
  });
  it("shares review status with group members without leaking private reasons", async () => {
    const id = await submit();
    await db.query(
      "select settle_submission($1,'needs_review','Private reason')",
      [id],
    );
    await asUser(owner);
    const rows = (
      await db.query<{ status: string; reason: string | null }>(
        "select * from group_submission_status($1)",
        [group],
      )
    ).rows;
    expect(rows[0]).toMatchObject({ status: "needs_review", reason: null });
    await asUser(member);
    expect(
      await scalar("select reason from group_submission_status($1)", [group]),
    ).toBe("Private reason");
    await asUser(outsider);
    await denied("select * from group_submission_status($1)", [group], /Join/);
  });
});
describe("shared mission lifecycle", () => {
  it("fills exactly three slots even after repeated refreshes", async () => {
    for (let i = 0; i < 3; i++)
      await db.query("select refresh_missions($1)", [group]);
    expect(
      Number(
        await scalar("select count(*) from assignments where group_id=$1", [
          group,
        ]),
      ),
    ).toBe(3);
  });
  it("blocks a teammate's second submission while proof is under review", async () => {
    await submit();
    await asUser(owner);
    await denied(
      "select begin_submission($1,$2)",
      [assignment, randomUUID()],
      /already submitted/,
    );
  });
  it("allows only organizers to decline a group mission", async () => {
    await asUser(member);
    await denied("select decline_mission($1)", [assignment], /organizer/);
  });
  it("keeps the original timer when declining and prevents immediate replacement", async () => {
    await asUser(owner);
    await db.query("select decline_mission($1)", [assignment]);
    expect(
      await scalar(
        "select available_at>=expires_at from assignments where id=$1",
        [assignment],
      ),
    ).toBe(true);
    await db.query("select refresh_missions($1)", [group]);
    expect(
      Number(
        await scalar("select count(*) from assignments where group_id=$1", [
          group,
        ]),
      ),
    ).toBe(3);
  });
  it("replaces declined missions only after cooldown and never repeats a mission", async () => {
    await asUser(owner);
    await db.query("select decline_mission($1)", [assignment]);
    await asService();
    await db.query(
      "update assignments set available_at=now()-interval '1 second' where id=$1",
      [assignment],
    );
    await asUser(member);
    await db.query("select refresh_missions($1)", [group]);
    expect(
      Number(
        await scalar("select count(*) from assignments where group_id=$1", [
          group,
        ]),
      ),
    ).toBe(4);
    expect(
      Number(
        await scalar(
          "select count(distinct mission_id) from assignments where group_id=$1",
          [group],
        ),
      ),
    ).toBe(4);
  });
  it("cannot submit after expiry", async () => {
    await asService();
    await db.query(
      "update assignments set expires_at=now()-interval '1 second' where id=$1",
      [assignment],
    );
    await asUser(member);
    await denied(
      "select begin_submission($1,$2)",
      [assignment, randomUUID()],
      /ended/,
    );
  });
  it("applies expiry cooldown at the deadline", async () => {
    await asService();
    await db.query(
      "update assignments set expires_at=now()-interval '1 minute' where id=$1",
      [assignment],
    );
    await asUser(member);
    await db.query("select refresh_missions($1)", [group]);
    expect(
      await scalar("select status from assignments where id=$1", [assignment]),
    ).toBe("expired");
    expect(
      await scalar(
        "select available_at=expires_at+make_interval(secs=>cooldown_seconds) from assignments where id=$1",
        [assignment],
      ),
    ).toBe(true);
  });
  it("preserves a timely submission during review after the deadline", async () => {
    const id = await submit();
    await db.query(
      "update assignments set expires_at=now()-interval '1 second' where id=$1",
      [assignment],
    );
    await asUser(member);
    await db.query("select refresh_missions($1)", [group]);
    expect(
      await scalar("select status from assignments where id=$1", [assignment]),
    ).toBe("active");
    await asService();
    expect(
      await scalar(
        "select settle_submission($1,'approved','Evidence visible')",
        [id],
      ),
    ).toBe("approved");
  });
  it("awards both group and submitter credit exactly once on repeated settlement", async () => {
    const id = await submit();
    for (let i = 0; i < 3; i++)
      await db.query(
        "select settle_submission($1,'approved','Evidence visible')",
        [id],
      );
    expect(
      Number(
        await scalar(
          "select count(*) from nut_transactions where assignment_id=$1",
          [assignment],
        ),
      ),
    ).toBe(1);
    expect(
      Number(
        await scalar("select nuts from group_leaderboard where id=$1", [group]),
      ),
    ).toBe(20);
    expect(
      Number(
        await scalar("select nuts from player_leaderboard where id=$1", [
          member,
        ]),
      ),
    ).toBe(20);
  });
  it("rejects further attempts once the shared mission is done", async () => {
    const id = await submit();
    await db.query(
      "select settle_submission($1,'approved','Evidence visible')",
      [id],
    );
    await asUser(owner);
    await denied(
      "select begin_submission($1,$2)",
      [assignment, randomUUID()],
      /ended/,
    );
  });
  it("rejection awards no points and allows a new attempt", async () => {
    const id = await submit();
    await db.query("select settle_submission($1,'rejected','Wrong subject')", [
      id,
    ]);
    expect(Number(await scalar("select count(*) from nut_transactions"))).toBe(
      0,
    );
    await asUser(member);
    await db.query("select begin_submission($1,$2)", [
      assignment,
      randomUUID(),
    ]);
  });
  it("snapshots reward and criteria for in-flight assignments", async () => {
    await asUser(admin);
    await db.query("select update_settings(2,7200,120)");
    await asService();
    await db.query(
      "update missions set nuts=99,proof_criteria='Changed criteria' where id=(select mission_id from assignments where id=$1)",
      [assignment],
    );
    expect(
      Number(
        await scalar("select nuts from assignments where id=$1", [assignment]),
      ),
    ).toBe(20);
    expect(
      Number(
        await scalar("select cooldown_seconds from assignments where id=$1", [
          assignment,
        ]),
      ),
    ).toBe(3600);
  });
  it("does not let admins approve a missing photo", async () => {
    await asUser(member);
    const id = randomUUID();
    await db.query("select begin_submission($1,$2)", [assignment, id]);
    await asUser(admin);
    await denied(
      "select review_submission($1,true,'Looks good')",
      [id],
      /finished photo/,
    );
  });
});
describe("verification leases and recovery", () => {
  it("claims a pending photo only once and ignores stale verifier callbacks", async () => {
    const id = await submit();
    const claim = (
      await db.query<{ lease_token: string }>(
        "select * from claim_submission($1)",
        [id],
      )
    ).rows[0];
    expect(claim.lease_token).toBeTruthy();
    expect(
      (await db.query("select * from claim_submission($1)", [id])).rows,
    ).toHaveLength(0);
    await db.query(
      "select settle_submission($1,'approved','Bad stale result',null,$2)",
      [id, randomUUID()],
    );
    expect(
      await scalar("select status from submissions where id=$1", [id]),
    ).toBe("processing");
    await db.query(
      "select settle_submission($1,'approved','Valid result',null,$2)",
      [id, claim.lease_token],
    );
    expect(
      await scalar("select status from submissions where id=$1", [id]),
    ).toBe("approved");
  });
  it("reclaims a crashed worker's expired lease", async () => {
    const id = await submit();
    await db.query("select * from claim_submission($1)", [id]);
    await db.query(
      "update submissions set lease_until=now()-interval '1 second' where id=$1",
      [id],
    );
    const rows = (
      await db.query<{ attempts: number }>(
        "select * from claim_submission($1)",
        [id],
      )
    ).rows;
    expect(rows[0].attempts).toBe(2);
  });
  it("detects reused photos for the same submitter", async () => {
    const id = await submit();
    const hash = await scalar(
      "select photo_hash from submissions where id=$1",
      [id],
    );
    await db.query("select settle_submission($1,'rejected','Try again')", [id]);
    await asUser(member);
    const second = randomUUID();
    await db.query("select begin_submission($1,$2)", [assignment, second]);
    await asService();
    await denied(
      "select finish_upload($1,$2)",
      [second, hash],
      /unique_photo_per_user/,
    );
  });
});
describe("membership and organizer approval", () => {
  it("invite groups reject invalid codes and accept an actual invite", async () => {
    await asUser(owner);
    const g = await scalar(
      "select create_group('Private group','An invitation-only campus group.','invite','',array[$1::uuid])",
      [category],
    );
    const code = await scalar("select create_invite($1)", [g]);
    await asUser(outsider);
    await denied("select join_group($1,'wrong')", [g], /valid invitation/);
    expect(await scalar("select join_by_code($1)", [code])).toBe(g);
  });
  it("organization joins stay pending until platform verification and organizer approval", async () => {
    await asUser(owner);
    const g = await scalar(
      "select create_group('Campus RSO','A registered student organization.','organization','Test RSO',array[$1::uuid])",
      [category],
    );
    await asUser(outsider);
    expect(await scalar("select join_group($1)", [g])).toBe("pending");
    await asUser(owner);
    await denied("select review_member($1,$2,true)", [g, outsider], /verify/);
    await asUser(admin);
    await db.query("select verify_organization($1,true)", [g]);
    await asUser(owner);
    await db.query("select review_member($1,$2,true)", [g, outsider]);
    await asUser(outsider);
    expect(await scalar("select is_member($1)", [g])).toBe(true);
  });
  it("lets platform admins preapprove organizer emails and records an audit", async () => {
    await asUser(admin);
    await db.exec("select approve_organizer('outsider@illinois.edu',true)");
    await asUser(outsider);
    expect(await scalar("select is_organizer()")).toBe(true);
    await asUser(admin);
    expect(
      Number(
        await scalar(
          "select count(*) from audit_log where action='organizer_access'",
        ),
      ),
    ).toBe(1);
  });
});
