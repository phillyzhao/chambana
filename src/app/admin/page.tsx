import { redirect } from "next/navigation";
import { Action, Notice, PageIntro } from "@/components/ui";
import { checked, viewer } from "@/lib/data";
import { database, serviceDatabase } from "@/lib/supabase";

export default async function Admin({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [me, params] = await Promise.all([viewer(), searchParams]);
  if (!me.user) redirect("/login");
  if (!me.admin) redirect("/profile?error=Platform+admin+access+required.");
  const db = await database();
  const [users, settings, categories, missions, groups, submissions, reports] =
    await Promise.all([
      db.rpc("admin_users", { p_search: params.q || "" }).then(checked),
      db.from("settings").select("*").single().then(checked),
      db.from("categories").select("*").order("name").then(checked),
      db
        .from("missions")
        .select("*")
        .order("created_at", { ascending: false })
        .then(checked),
      db
        .from("groups")
        .select("*")
        .eq("join_mode", "organization")
        .then(checked),
      db
        .from("submissions")
        .select("*")
        .in("status", ["needs_review", "pending", "processing"])
        .order("created_at")
        .limit(50)
        .then(checked),
      db
        .from("reports")
        .select("*")
        .eq("resolved", false)
        .order("created_at")
        .limit(50)
        .then(checked),
    ]);
  const photos = await Promise.all(
    submissions.map(async (s) => {
      try {
        const url = await serviceDatabase()
          .storage.from("mission-proof")
          .createSignedUrl(s.storage_path, 300);
        return { ...s, url: url.data?.signedUrl };
      } catch {
        return { ...s, url: undefined };
      }
    }),
  );
  const blank = {
    id: "",
    title: "",
    category_id: categories[0]?.id,
    instructions: "",
    proof_criteria: "",
    nuts: 20,
    published: false,
  };
  return (
    <>
      <Notice params={params} />
      <PageIntro eyebrow="CHAMBANA OPERATIONS" title="Keep campus moving.">
        Approve organizers, manage the mission catalog, and review uncertain
        photos.
      </PageIntro>
      <section className="panel">
        <h2>Organizer approvals</h2>
        <p>
          Select a signed-up campus account below, or preapprove an Illinois
          email before signup.
        </p>
        <form action="/admin" className="inline-form">
          <input
            name="q"
            placeholder="Search signup emails"
            defaultValue={params.q}
            aria-label="Search signup emails"
          />
          <button className="button secondary">Search</button>
        </form>
        {(
          users as {
            id: string;
            email: string;
            display_name: string;
            organizer: boolean;
          }[]
        ).map((u) => (
          <div className="review-row" key={u.id}>
            <div>
              <strong>{u.display_name}</strong>
              <small>{u.email}</small>
            </div>
            <Action
              kind="organizer"
              back="/admin"
              fields={{ email: u.email, approve: String(!u.organizer) }}
            >
              <button
                className={`button small ${u.organizer ? "secondary" : ""}`}
              >
                {u.organizer ? "Revoke organizer" : "Approve organizer"}
              </button>
            </Action>
          </div>
        ))}
        <Action
          kind="organizer"
          back="/admin"
          fields={{ approve: "true" }}
          className="inline-form"
        >
          <input
            name="email"
            type="email"
            placeholder="organizer@illinois.edu"
            required
            aria-label="Organizer email to preapprove"
          />
          <button className="button secondary">Preapprove email</button>
        </Action>
      </section>
      <section className="panel">
        <h2>Mission timing</h2>
        <p>
          Settings apply to newly assigned missions. Declining preserves the
          original deadline and requires at least the cooldown. Expiry starts
          the cooldown at the deadline; completion starts it at approval.
        </p>
        <Action kind="settings" back="/admin">
          <div className="form-grid">
            <label>
              Shared slots per group
              <input
                type="number"
                name="slots"
                min={1}
                max={3}
                defaultValue={settings.mission_slots}
                required
              />
            </label>
            <label>
              Mission window (hours)
              <input
                type="number"
                name="hours"
                min={1}
                max={168}
                defaultValue={settings.mission_seconds / 3600}
                required
              />
            </label>
            <label>
              Replacement cooldown (minutes)
              <input
                type="number"
                name="cooldown_minutes"
                min={1}
                max={10080}
                defaultValue={settings.cooldown_seconds / 60}
                required
              />
            </label>
          </div>
          <button className="button">Save timing</button>
        </Action>
      </section>
      <section className="panel">
        <h2>Campus organizations</h2>
        {groups.length ? (
          groups.map((g) => (
            <div key={g.id} className="review-row">
              <div>
                <strong>{g.name}</strong>
                <small>{g.organization}</small>
              </div>
              <Action
                kind="organization"
                back="/admin"
                fields={{
                  group_id: g.id,
                  verified: String(!g.organization_verified),
                }}
              >
                <button className="button secondary small">
                  {g.organization_verified
                    ? "Remove verification"
                    : "Verify organization"}
                </button>
              </Action>
            </div>
          ))
        ) : (
          <p>No organization requests yet.</p>
        )}
      </section>
      <section className="panel">
        <h2>
          Photo review queue <span className="count">{photos.length}</span>
        </h2>
        <p>
          AI uncertainty, unsafe evidence, or unavailable AI goes here. Verify
          against the mission’s criteria before approving. Proof photos are
          private; preview links expire in five minutes.
        </p>
        {!photos.length && <p>The queue is clear.</p>}
        {photos.map((s) => (
          <div key={s.id} className="review-photo">
            {s.url ? (
              <a href={s.url} target="_blank" rel="noreferrer">
                Open private proof photo ↗
              </a>
            ) : (
              <p>
                Photo preview unavailable. Check server storage configuration.
              </p>
            )}
            <p>
              <strong>{s.status.replaceAll("_", " ")}</strong> ·{" "}
              {s.reason || "Awaiting automatic review"}
            </p>
            <MissionEvidence assignmentId={s.assignment_id} />
            <Action
              kind="review"
              back="/admin"
              fields={{ submission_id: s.id }}
            >
              <label>
                Review reason
                <input name="reason" required minLength={3} maxLength={600} />
              </label>
              <div className="button-row">
                <button className="button" name="approve" value="true">
                  Approve & award nuts
                </button>
                <button
                  className="button secondary"
                  name="approve"
                  value="false"
                >
                  Reject photo
                </button>
              </div>
            </Action>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Content reports</h2>
        {reports.length ? (
          reports.map((r) => (
            <div className="review-photo" key={r.id}>
              <p>
                {r.target_type}: <code>{r.target_id}</code>
              </p>
              <p>{r.reason}</p>
              <Action
                kind="resolve_report"
                back="/admin"
                fields={{ report_id: r.id }}
              >
                <button className="button secondary">Mark resolved</button>
              </Action>
            </div>
          ))
        ) : (
          <p>No open reports.</p>
        )}
      </section>
      <section className="panel">
        <h2>Mission catalog</h2>
        <p>
          Only publish challenges your team has reviewed. Require evidence a
          photo can actually establish. Catalog edits do not change missions
          already assigned to a group.
        </p>
        {[blank, ...missions].map((m) => (
          <details key={m.id || "new"} className="catalog-entry">
            <summary>
              {m.id
                ? `${m.title} · ${m.published ? "Published" : "Draft"}`
                : "+ Add a mission"}
            </summary>
            <Action kind="mission" back="/admin" fields={{ mission_id: m.id }}>
              <label>
                Title
                <input
                  name="title"
                  defaultValue={m.title}
                  required
                  minLength={3}
                  maxLength={100}
                />
              </label>
              <label>
                Category
                <select name="category_id" defaultValue={m.category_id}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Instructions
                <textarea
                  name="instructions"
                  defaultValue={m.instructions}
                  required
                  minLength={10}
                  maxLength={2000}
                />
              </label>
              <label>
                Photo verification criteria
                <textarea
                  name="proof_criteria"
                  defaultValue={m.proof_criteria}
                  required
                  minLength={10}
                  maxLength={1500}
                />
              </label>
              <label>
                Nuts
                <input
                  type="number"
                  name="nuts"
                  min={1}
                  max={1000}
                  defaultValue={m.nuts}
                  required
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  name="published"
                  defaultChecked={m.published}
                />
                Reviewed and ready to publish
              </label>
              <button className="button">Save mission</button>
            </Action>
          </details>
        ))}
      </section>
    </>
  );
}
async function MissionEvidence({ assignmentId }: { assignmentId: string }) {
  const db = await database();
  const m = checked(
    await db
      .from("assignments")
      .select("title,proof_criteria")
      .eq("id", assignmentId)
      .single(),
  );
  return (
    <p>
      <strong>{m.title}</strong>
      <br />
      {m.proof_criteria}
    </p>
  );
}
