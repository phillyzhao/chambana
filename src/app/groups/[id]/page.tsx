import Link from "next/link";
import { notFound } from "next/navigation";
import {
  checked,
  demoAssignments,
  demoCategories,
  demoGroups,
  viewer,
  type Assignment,
  type Submission,
} from "@/lib/data";
import { database } from "@/lib/supabase";
import { Action, Empty, Notice, PageIntro, ReportForm } from "@/components/ui";
import { MissionCard } from "@/components/mission-card";
import { DeleteGroupForm } from "@/components/delete-group-form";
import { LinkedText } from "@/components/linked-text";
import { Avatar } from "@/components/avatar";

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [{ id }, query, me] = await Promise.all([
    params,
    searchParams,
    viewer(),
  ]);
  let group = demoGroups.find((g) => g.id === id);
  let member = false,
    status = "",
    missions: Assignment[] = [],
    pending: { user_id: string; profiles: { display_name: string } }[] = [];
  let submissions: Submission[] = [];
  let score = 0;
  let categories = demoCategories;
  let selectedCategoryIds: string[] = [];
  let memberCount = 0;
  let members: {
    id: string;
    display_name: string;
    has_avatar: boolean;
    is_owner: boolean;
    can_own: boolean;
  }[] = [];
  if (!me.demo) {
    const db = await database();
    const result = await db
      .from("groups")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (result.error) notFound();
    group = result.data || undefined;
    if (group) {
      const [allCategories, selectedCategories] = await Promise.all([
        db.from("categories").select("*").order("name").then(checked),
        db
          .from("group_categories")
          .select("category_id")
          .eq("group_id", id)
          .then(checked),
      ]);
      categories = allCategories;
      selectedCategoryIds = selectedCategories.map((c) => c.category_id);
      const points = checked(
        await db.from("group_leaderboard").select("nuts").eq("id", id).single(),
      );
      score = Number(points.nuts);
      const counts = checked(
        await db.rpc("group_member_counts", { p_groups: [id] }),
      );
      memberCount = Number(counts[0]?.member_count || 0);
    }
    if (me.user && group) {
      const membershipResult = await db
        .from("group_members")
        .select("status")
        .eq("group_id", id)
        .eq("user_id", me.user.id)
        .maybeSingle();
      if (membershipResult.error) throw new Error("Could not load membership.");
      const membership = membershipResult.data as { status: string } | null;
      status = membership?.status || "";
      member = status === "active";
      if (member || me.admin)
        members = checked(await db.rpc("group_directory", { p_group: id }));
      if (member)
        missions = checked(
          await db
            .from("assignments")
            .select("*")
            .eq("group_id", id)
            .order("assigned_at", { ascending: false }),
        )
          .filter(
            (m: Assignment, i: number, all: Assignment[]) =>
              all.findIndex((x) => x.slot === m.slot) === i,
          )
          .sort((a: Assignment, b: Assignment) => a.slot - b.slot);
      if (member)
        submissions = checked(
          await db.rpc("group_submission_status", { p_group: id }),
        );
      if (
        me.organizer &&
        group.owner_id === me.user.id &&
        group.join_mode === "organization"
      ) {
        const rows = checked(
          await db
            .from("group_members")
            .select("user_id,profiles(display_name)")
            .eq("group_id", id)
            .eq("status", "pending"),
        );
        pending = rows as unknown as typeof pending;
      }
    }
  } else if (group) {
    missions = demoAssignments().map((m) => ({ ...m, group_id: id }));
  }
  if (!group) notFound();
  const owner = me.organizer && group.owner_id === me.user?.id,
    back = `/groups/${id}`;
  return (
    <>
      <Link className="back-link" href="/groups">
        ← All groups
      </Link>
      <Notice params={query} />
      <PageIntro
        eyebrow={
          group.organization_verified
            ? "VERIFIED CAMPUS ORGANIZATION"
            : "FIND YOUR PEOPLE"
        }
        title={group.name}
      >
        <LinkedText text={group.description} />
      </PageIntro>
      <div className="group-stats">
        <span>
          <strong>{me.demo ? "—" : memberCount}</strong>{" "}
          {memberCount === 1 ? "member" : "members"}
        </span>
        <span>
          <strong>{me.demo ? "—" : score}</strong> nuts earned
        </span>
        <span>
          <strong>
            {group.join_mode === "open"
              ? "Open"
              : group.join_mode === "invite"
                ? "Invite only"
                : "Organization"}
          </strong>{" "}
          membership
        </span>
      </div>
      <section className="panel">
        <h2>Mission categories</h2>
        {selectedCategoryIds.length ? (
          <ul>
            {categories
              .filter((c) => selectedCategoryIds.includes(c.id))
              .map((c) => (
                <li key={c.id}>{c.name}</li>
              ))}
          </ul>
        ) : (
          <p>All categories · Missions can come from any category.</p>
        )}
        {owner && (
          <details>
            <summary>Edit mission categories</summary>
            <Action
              kind="update_group_categories"
              back={back}
              fields={{ group_id: id }}
            >
              <fieldset aria-describedby="edit-categories-help">
                <legend>Choose mission categories</legend>
                <p id="edit-categories-help" className="muted">
                  Choose up to 10 categories, or leave all unchecked for all
                  categories. Changes apply to future mission draws; current
                  missions stay available.
                </p>
                {categories.map((c) => (
                  <label className="check-label" key={c.id}>
                    <input
                      type="checkbox"
                      name="category_ids"
                      value={c.id}
                      defaultChecked={selectedCategoryIds.includes(c.id)}
                    />
                    {c.name}
                  </label>
                ))}
              </fieldset>
              <button className="button">Save categories</button>
            </Action>
          </details>
        )}
      </section>
      {me.admin && (
        <details className="panel">
          <summary>Edit group about section</summary>
          <Action kind="edit_group_about" back={back} fields={{ group_id: id }}>
            <label>
              About this group
              <textarea
                name="description"
                defaultValue={group.description}
                required
                minLength={10}
                maxLength={500}
              />
            </label>
            <p className="muted">Website addresses become clickable links.</p>
            <button className="button">Save about section</button>
          </Action>
        </details>
      )}
      {(member || me.admin) && (
        <details className="panel">
          <summary>Members ({memberCount})</summary>
          <ul className="member-list">
            {members.map((person) => (
              <li key={person.id}>
                <Link href={`/people/${person.id}`}>
                  <Avatar
                    id={person.id}
                    name={person.display_name}
                    hasAvatar={person.has_avatar}
                  />
                  <span>
                    {person.display_name}
                    {person.is_owner && <small>Owner · Organizer</small>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
      {me.user &&
        group.owner_id !== me.user.id &&
        (member || status === "pending") && (
          <details className="leave-group">
            <summary className="text-button">
              {member ? "Leave group" : "Cancel join request"}
            </summary>
            <p>
              {member
                ? "You’ll lose access to this group’s missions. Your past submissions and earned points stay recorded. We’ll email you a confirmation."
                : "Cancel your pending membership request."}
            </p>
            <Action kind="leave_group" back={back} fields={{ group_id: id }}>
              <button className="button secondary">
                {member ? "Confirm leave group" : "Confirm cancellation"}
              </button>
            </Action>
          </details>
        )}
      {group.join_mode === "organization" && !group.organization_verified && (
        <p className="notice">
          Organization verification is pending. Join requests can be submitted,
          but cannot be approved yet.
        </p>
      )}
      {!member &&
        !me.demo &&
        (me.user ? (
          <Action kind="join_group" back={back} fields={{ group_id: id }}>
            {group.join_mode === "invite" && (
              <label>
                Invitation code
                <input name="code" required />
              </label>
            )}
            <button className="button" disabled={status === "pending"}>
              {status === "pending"
                ? "Join request pending"
                : group.join_mode === "organization"
                  ? "Request to join"
                  : "Join group"}
            </button>
          </Action>
        ) : (
          <Link href="/login" className="button">
            Sign in to join
          </Link>
        ))}
      {me.demo && (
        <p className="notice">
          Sample group · real memberships become available when the beta is
          connected.
        </p>
      )}
      {(member || me.demo) && (
        <>
          <div className="section-heading">
            <h2>Group missions</h2>
            {owner && !me.demo && (
              <Action kind="refresh" back={back} fields={{ group_id: id }}>
                <button className="text-button">Refresh slots ↻</button>
              </Action>
            )}
          </div>
          <div className="mission-grid">
            {missions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                submission={submissions.find((s) => s.assignment_id === m.id)}
                owner={owner}
                demo={me.demo}
                back={back}
              />
            ))}
          </div>
          {!missions.length && (
            <Empty title="Ready when you are">
              {owner
                ? "Refresh slots to draw missions for your group."
                : "Your group organizer can refresh the mission slots."}{" "}
              New challenges will appear as they are published.
            </Empty>
          )}
        </>
      )}
      {owner && (
        <section className="panel">
          <h2>Organizer controls</h2>
          <Action kind="create_invite" back={back} fields={{ group_id: id }}>
            <button className="button secondary">
              Create 7-day invite link
            </button>
          </Action>
          {group.join_mode === "organization" && (
            <>
              <h3>Join requests</h3>
              {pending.length ? (
                pending.map((p) => (
                  <div className="review-row" key={p.user_id}>
                    <Link href={`/people/${p.user_id}`}>
                      {p.profiles.display_name}
                    </Link>
                    <Action
                      kind="review_member"
                      back={back}
                      fields={{ group_id: id, user_id: p.user_id }}
                    >
                      <button
                        name="approve"
                        value="true"
                        className="button small"
                      >
                        Approve
                      </button>
                      <button
                        name="approve"
                        value="false"
                        className="text-button"
                      >
                        Decline
                      </button>
                    </Action>
                  </div>
                ))
              ) : (
                <p>No pending requests.</p>
              )}
            </>
          )}
        </section>
      )}
      {member && me.user && group.owner_id !== me.user.id && (
        <ReportForm type="group" id={id} back={back} />
      )}
      {owner && (
        <details className="panel">
          <summary>Transfer group ownership</summary>
          <p>
            Choose an active member who is already an approved organizer.
            They’ll become the owner, and you’ll become a regular member of this
            group. You can then leave the group.
          </p>
          {members.some((person) => !person.is_owner && person.can_own) ? (
            <Action kind="transfer_group" back={back} fields={{ group_id: id }}>
              <label>
                New group owner
                <select name="owner_id" required defaultValue="">
                  <option value="" disabled>
                    Choose an approved organizer
                  </option>
                  {members
                    .filter((person) => !person.is_owner && person.can_own)
                    .map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.display_name}
                      </option>
                    ))}
                </select>
              </label>
              <button className="button secondary">
                Transfer ownership and become a member
              </button>
            </Action>
          ) : (
            <p>
              No other active members are approved organizers yet. Ask a
              platform admin to approve the member you want to transfer
              ownership to.
            </p>
          )}
        </details>
      )}
      {owner && <DeleteGroupForm id={id} name={group.name} />}
    </>
  );
}
