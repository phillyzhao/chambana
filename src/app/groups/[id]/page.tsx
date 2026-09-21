import Link from "next/link";
import { notFound } from "next/navigation";
import {
  checked,
  demoAssignments,
  demoGroups,
  viewer,
  type Assignment,
  type Submission,
} from "@/lib/data";
import { database } from "@/lib/supabase";
import { Action, Empty, Notice, PageIntro, ReportForm } from "@/components/ui";
import { MissionCard } from "@/components/mission-card";

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
      const points = checked(
        await db.from("group_leaderboard").select("nuts").eq("id", id).single(),
      );
      score = Number(points.nuts);
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
      if (me.organizer && group.owner_id === me.user.id) {
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
        {group.description}
      </PageIntro>
      <div className="group-stats">
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
            {!me.demo && (
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
              Refresh slots to draw missions from this group’s selected
              categories. New challenges will appear as they are published.
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
                  <button name="approve" value="true" className="button small">
                    Approve
                  </button>
                  <button name="approve" value="false" className="text-button">
                    Decline
                  </button>
                </Action>
              </div>
            ))
          ) : (
            <p>No pending requests.</p>
          )}
        </section>
      )}
      {me.user && <ReportForm type="group" id={id} back={back} />}
    </>
  );
}
