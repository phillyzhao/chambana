import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { checked, demoCategories, demoGroups, viewer } from "@/lib/data";
import { database } from "@/lib/supabase";
import { Action, Empty, GroupCard, Notice, PageIntro } from "@/components/ui";

export default async function Groups({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [me, params] = await Promise.all([viewer(), searchParams]);
  let groups = demoGroups,
    categories = demoCategories;
  if (!me.demo) {
    const db = await database();
    [groups, categories] = await Promise.all([
      db
        .from("groups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100)
        .then(checked),
      db.from("categories").select("*").order("name").then(checked),
    ]);
  }
  const filtered = groups.filter(
    (g) =>
      `${g.name} ${g.description} ${g.organization}`
        .toLowerCase()
        .includes((params.q || "").toLowerCase()) &&
      (!params.mode || g.join_mode === params.mode),
  );
  return (
    <>
      <Notice params={params} />
      <PageIntro eyebrow="FIND YOUR PEOPLE" title="Better with a group.">
        Same campus. A thousand ways to explore it.
      </PageIntro>
      <form className="search" action="/groups">
        <Search size={19} />
        <input
          name="q"
          aria-label="Search groups"
          placeholder="Search groups or organizations"
          defaultValue={params.q}
        />
        <button aria-label="Search">
          <ArrowRight size={18} />
        </button>
      </form>
      <div className="chips">
        {[
          ["", "All groups"],
          ["open", "Open to everyone"],
          ["organization", "Organizations"],
          ["invite", "Invite only"],
        ].map(([key, name]) => (
          <Link
            className={`chip ${(params.mode || "") === key ? "selected" : ""}`}
            key={key}
            href={`/groups?mode=${key}&q=${encodeURIComponent(params.q || "")}`}
          >
            {name}
          </Link>
        ))}
      </div>
      <div className="section-heading">
        <h2>Explore campus groups</h2>
        <span className="muted">{filtered.length} groups</span>
      </div>
      <div className="groups-grid">
        {filtered.map((g, i) => (
          <GroupCard key={g.id} group={g} index={i} />
        ))}
      </div>
      {!filtered.length && (
        <Empty title="Room for something new">
          No groups match yet. Try a different search, or ask an approved
          organizer to start a group.
        </Empty>
      )}
      <section className="panel">
        <h2>Got an invite?</h2>
        <p>A friend can send you a link or a group code.</p>
        {me.user ? (
          <Action kind="join_code" back="/groups" className="inline-form">
            <input
              name="code"
              placeholder="Paste invitation code"
              required
              maxLength={40}
              aria-label="Invitation code"
            />
            <button className="button">Join</button>
          </Action>
        ) : (
          <Link className="button secondary" href="/login">
            Sign in to use a code
          </Link>
        )}
      </section>
      {me.organizer && (
        <section className="panel">
          <h2>Start a group</h2>
          <Action kind="create_group" back="/groups">
            <label>
              Group name
              <input name="name" required minLength={3} maxLength={60} />
            </label>
            <label>
              What is your group about?
              <textarea
                name="description"
                required
                minLength={10}
                maxLength={500}
              />
            </label>
            <label>
              How do people join?
              <select name="join_mode">
                <option value="open">
                  Open — any verified Illini can join
                </option>
                <option value="invite">Invite — link or code required</option>
                <option value="organization">
                  Organization — verification + approval
                </option>
              </select>
            </label>
            <label>
              Organization name, if applicable
              <input name="organization" maxLength={120} />
            </label>
            <fieldset>
              <legend>Mission categories</legend>
              {categories.map((c) => (
                <label className="check-label" key={c.id}>
                  <input type="checkbox" name="category_ids" value={c.id} />
                  {c.name}
                </label>
              ))}
            </fieldset>
            <button className="button">Create group</button>
          </Action>
        </section>
      )}
      {!me.organizer && (
        <p className="footnote">
          Want to organize? Sign up with your Illinois email, then ask the
          Chambana team to approve your account.
        </p>
      )}
    </>
  );
}
