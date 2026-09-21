import Link from "next/link";
import { Sprout, Trophy } from "lucide-react";
import { checked, viewer, demoGroups } from "@/lib/data";
import { database } from "@/lib/supabase";
import { Empty, PageIntro } from "@/components/ui";

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [me, params] = await Promise.all([viewer(), searchParams]);
  const players = params.view === "people";
  let rows: {
    id: string;
    name?: string;
    display_name?: string;
    nuts: number;
    completed: number;
  }[] = me.demo
    ? demoGroups.map((g, i) => ({
        id: g.id,
        name: g.name,
        nuts: [240, 180, 120][i],
        completed: [8, 6, 4][i],
      }))
    : [];
  if (me.demo && players) rows = [];
  if (!me.demo) {
    const db = await database();
    rows = checked(
      await db
        .from(players ? "player_leaderboard" : "group_leaderboard")
        .select("*")
        .order("nuts", { ascending: false })
        .order("id")
        .limit(100),
    );
  }
  return (
    <>
      <PageIntro
        eyebrow="A LITTLE FRIENDLY COMPETITION"
        title="Good times add up."
      >
        Every completed mission earns nuts. See who’s getting out there.
      </PageIntro>
      <div className="segmented">
        <Link className={!players ? "active" : ""} href="/leaderboard">
          Groups
        </Link>
        <Link
          className={players ? "active" : ""}
          href="/leaderboard?view=people"
        >
          People
        </Link>
      </div>
      <div className="section-heading">
        <h2>Across campus</h2>
        <span className="muted">All-time · top 100</span>
      </div>
      {me.demo && (
        <p className="notice">
          Illustrative scores only. No real points have been awarded.
        </p>
      )}
      <div className="leaderboard">
        {rows.map((r, i) => (
          <Link
            className="leaderboard-row"
            key={r.id}
            href={players ? `/people/${r.id}` : `/groups/${r.id}`}
          >
            <span className="rank">
              {i === 0 ? <Trophy size={22} /> : String(i + 1).padStart(2, "0")}
            </span>
            <span className={`initial tone-${i % 3}`}>
              {(r.name || r.display_name || "I").charAt(0)}
            </span>
            <span className="leader-name">
              <strong>{r.name || r.display_name}</strong>
              <small>{r.completed} missions completed</small>
            </span>
            <span className="points">
              <Sprout size={15} />
              {r.nuts}
            </span>
          </Link>
        ))}
      </div>
      {!rows.length && (
        <Empty title="The first spot is wide open">
          Complete a group mission to start collecting nuts. Individual scores
          credit the person whose photo completes the mission.
        </Empty>
      )}
      <p className="footnote">
        Nuts are leaderboard points only. Group and individual scores come from
        the same approved completion. Equal scores share bragging rights;
        display order is stable.
      </p>
    </>
  );
}
