import Link from "next/link";
import { Search, ArrowRight } from "lucide-react";
import { GroupFilter } from "@/components/group-filter";
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
  const modes = [
    ["", "All groups"],
    ["open", "Open to everyone"],
    ["organization", "Organizations"],
    ["invite", "Invite only"],
    ["mine", "My groups"],
  ];
  const mode = modes.some(([key]) => key === params.mode)
    ? params.mode || ""
    : "";
  let myGroups: string[] = [];
  if (!me.demo) {
    const db = await database();
    if (me.user)
      myGroups = checked(
        await db
          .from("group_members")
          .select("group_id")
          .eq("user_id", me.user.id)
          .eq("status", "active"),
      ).map((m) => m.group_id);
    let groupQuery = db
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });
    if (mode === "mine")
      groupQuery = groupQuery.in(
        "id",
        myGroups.length ? myGroups : ["00000000-0000-0000-0000-000000000000"],
      );
    else if (mode) groupQuery = groupQuery.eq("join_mode", mode);
    [groups, categories] = await Promise.all([
      groupQuery.then(checked),
      db.from("categories").select("*").order("name").then(checked),
    ]);
    if (groups.length) {
      const counts = checked(
        await db.rpc("group_member_counts", {
          p_groups: groups.map((g) => g.id),
        }),
      ) as { group_id: string; member_count: number }[];
      const byId = new Map(
        counts.map((c) => [c.group_id, Number(c.member_count)]),
      );
      groups = groups.map((g) => ({ ...g, member_count: byId.get(g.id) ?? 0 }));
    }
  }
  const filtered = groups.filter(
    (g) =>
      `${g.name} ${g.description} ${g.organization}`
        .toLowerCase()
        .includes((params.q || "").toLowerCase()) &&
      (!mode ||
        (mode === "mine" ? myGroups.includes(g.id) : g.join_mode === mode)),
  );
  return (
    <>
      <Notice params={params} />
      <PageIntro eyebrow="FIND YOUR PEOPLE" title="Better with a group.">
        Same campus. A thousand ways to explore it.
      </PageIntro>
      <form className="search" action="/groups">
        <input type="hidden" name="mode" value={mode} />
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
      <GroupFilter mode={mode} query={params.q || ""} />
      {mode === "mine" && !me.user && (
        <p className="notice">
          <Link href="/login">Sign in</Link> to see your groups.
        </p>
      )}
      <div className="section-heading">
        <h2>Explore campus groups</h2>
        <span className="muted">
          {filtered.length} {filtered.length === 1 ? "group" : "groups"}
        </span>
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
            <fieldset aria-describedby="mission-categories-help">
              <legend>Mission categories (optional)</legend>
              <p id="mission-categories-help" className="muted">
                Leave all unchecked to receive missions from any category, or
                select categories to narrow your group’s missions.
              </p>
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
