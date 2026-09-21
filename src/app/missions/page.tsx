import Link from "next/link";
import { ArrowUpRight, Sprout, Users } from "lucide-react";
import { Action, Empty, Notice, PageIntro } from "@/components/ui";
import { MissionCard } from "@/components/mission-card";
import {
  checked,
  demoAssignments,
  demoGroups,
  viewer,
  type Assignment,
  type Submission,
} from "@/lib/data";
import { database } from "@/lib/supabase";

export default async function Missions({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [me, params] = await Promise.all([viewer(), searchParams]);
  let groups = me.demo ? demoGroups.slice(0, 1) : [];
  let missions: Assignment[] = me.demo ? demoAssignments() : [];
  let submissions: Submission[] = [];
  let score = 0;
  if (me.user) {
    const db = await database();
    const memberships = checked(
      await db
        .from("group_members")
        .select("group_id")
        .eq("user_id", me.user.id)
        .eq("status", "active"),
    );
    if (memberships.length)
      groups = checked(
        await db
          .from("groups")
          .select("*")
          .in(
            "id",
            memberships.map((m) => m.group_id),
          )
          .order("name"),
      );
    const selected = groups.find((g) => g.id === params.group) || groups[0];
    if (selected) {
      const [a, s, points] = await Promise.all([
        db
          .from("assignments")
          .select("*")
          .eq("group_id", selected.id)
          .order("assigned_at", { ascending: false }),
        db.rpc("group_submission_status", { p_group: selected.id }),
        db
          .from("group_leaderboard")
          .select("nuts")
          .eq("id", selected.id)
          .single(),
      ]);
      missions = checked(a)
        .filter(
          (m: Assignment, i: number, all: Assignment[]) =>
            all.findIndex((x) => x.slot === m.slot) === i,
        )
        .sort((a: Assignment, b: Assignment) => a.slot - b.slot);
      submissions = checked(s);
      score = Number(checked(points).nuts);
    }
  }
  const group = groups.find((g) => g.id === params.group) || groups[0];
  return (
    <>
      <Notice params={params} />
      <PageIntro eyebrow="UIUC • CAMPUS, TOGETHER" title="Go make a memory.">
        A little outside your routine. A little closer to your people.
      </PageIntro>
      <section className="hero-note">
        <div className="hero-symbol">
          <Sprout size={36} />
        </div>
        <div>
          <h2>Small adventures. Shared wins.</h2>
          <p>
            Join a group, tackle a mission, and collect nuts together. One
            person completes it. The whole group wins.
          </p>
        </div>
        <span className="hero-stamp">
          GO
          <br />
          ILLINI ↗
        </span>
      </section>
      {group ? (
        <>
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR GROUP</p>
              <Link href={`/groups/${group.id}`} className="group-title">
                <Users size={19} />
                {group.name}
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <span className="score">
              <Sprout size={16} />
              {me.demo ? "—" : score} <small>nuts</small>
            </span>
          </div>
          {groups.length > 1 && (
            <div className="chips">
              {groups.map((g) => (
                <Link
                  key={g.id}
                  className={`chip ${group.id === g.id ? "selected" : ""}`}
                  href={`/missions?group=${g.id}`}
                >
                  {g.name}
                </Link>
              ))}
            </div>
          )}
          <div className="section-heading compact">
            <h2>
              Current missions{" "}
              <span className="count">
                {missions.filter((m) => m.status === "active").length}
              </span>
            </h2>
            {!me.demo && (
              <Action
                kind="refresh"
                back={`/missions?group=${group.id}`}
                fields={{ group_id: group.id }}
              >
                <button className="text-button">Refresh slots ↻</button>
              </Action>
            )}
          </div>
          <p className="section-caption">
            Shared by your group. First approved photo completes the mission.
          </p>
          <div className="mission-grid">
            {missions.map((m) => (
              <MissionCard
                key={m.id}
                mission={m}
                submission={submissions.find((s) => s.assignment_id === m.id)}
                owner={me.organizer && group.owner_id === me.user?.id}
                demo={me.demo}
                back={`/missions?group=${group.id}`}
              />
            ))}
          </div>
          {!missions.length && (
            <Empty title="Your next adventure starts here">
              Use “Refresh slots” to draw missions from your group’s categories.
              Your organizer may still be waiting for the first mission catalog.
            </Empty>
          )}
          <Link className="explore-link" href="/groups">
            More people, more possibilities.{" "}
            <span>
              Explore groups <ArrowUpRight size={16} />
            </span>
          </Link>
        </>
      ) : (
        <Empty
          title={me.user ? "Find your people" : "Your campus is waiting"}
          link={me.user ? "/groups" : "/login"}
          label={me.user ? "Find a group" : "Join with Illinois email"}
        >
          {me.user
            ? "Join a group to start exploring. Missions belong to everyone in the group, and anyone can complete them."
            : "An @illinois.edu email gets you in. Your next good memory could start between classes."}
        </Empty>
      )}
    </>
  );
}
