import Link from "next/link";
import { signOut } from "@/app/actions";
import { Action, Empty, Notice, PageIntro } from "@/components/ui";
import { checked, viewer } from "@/lib/data";
import { database } from "@/lib/supabase";
export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [params, me] = await Promise.all([searchParams, viewer()]);
  if (!me.user || !me.profile)
    return (
      <>
        <PageIntro eyebrow="YOUR CAMPUS STORY" title="A little more you." />
        <Empty
          title="Your adventures start here"
          link="/login"
          label="Join with Illinois email"
        >
          Create your public profile and start earning nuts with your group.
        </Empty>
      </>
    );
  const db = await database();
  const stats = checked(
    await db
      .from("player_leaderboard")
      .select("nuts,completed")
      .eq("id", me.user.id)
      .single(),
  );
  return (
    <div className="narrow">
      <Notice params={params} />
      <PageIntro eyebrow="YOUR CAMPUS STORY" title={me.profile.display_name} />
      <div className="group-stats">
        <span>
          <strong>{stats.nuts}</strong> nuts earned
        </span>
        <span>
          <strong>{stats.completed}</strong> missions completed
        </span>
      </div>
      <section className="panel">
        <h2>Your public profile</h2>
        <Action kind="profile" back="/profile">
          <label>
            Display name
            <input
              name="display_name"
              defaultValue={me.profile.display_name}
              required
              minLength={2}
              maxLength={40}
            />
          </label>
          <label>
            A little about you
            <textarea
              name="bio"
              defaultValue={me.profile.bio}
              maxLength={240}
              placeholder="What gets you out of the house?"
            />
          </label>
          <button className="button">Save profile</button>
        </Action>
        <p>
          <Link href={`/people/${me.user.id}`} className="text-link">
            View public profile ↗
          </Link>
        </p>
      </section>
      <section className="panel">
        <h2>Your account</h2>
        <p>{me.user.email}</p>
        <p>
          {me.admin
            ? "Platform admin"
            : me.organizer
              ? "Approved organizer"
              : "Campus member"}
        </p>
        {me.admin && (
          <p>
            <Link href="/admin">Open admin panel →</Link>
          </p>
        )}
        <form action={signOut}>
          <button className="button secondary">Sign out</button>
        </form>
      </section>
    </div>
  );
}
