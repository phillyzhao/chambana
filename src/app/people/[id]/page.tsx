import { notFound } from "next/navigation";
import { database } from "@/lib/supabase";
import { checked, viewer } from "@/lib/data";
import { Notice, PageIntro, ReportForm } from "@/components/ui";
export default async function Person({
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
  if (me.demo) notFound();
  const db = await database();
  const result = await db
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (result.error || !result.data) notFound();
  const profile = result.data,
    stats = checked(
      await db
        .from("player_leaderboard")
        .select("nuts,completed")
        .eq("id", id)
        .single(),
    );
  return (
    <div className="narrow">
      <Notice params={query} />
      <PageIntro eyebrow="MEET AN ILLINI" title={profile.display_name}>
        {profile.bio || "Making a little more of campus life."}
      </PageIntro>
      <div className="group-stats">
        <span>
          <strong>{stats.nuts}</strong> nuts earned
        </span>
        <span>
          <strong>{stats.completed}</strong> missions completed
        </span>
      </div>
      <p className="footnote">
        On Chambana since{" "}
        {new Date(profile.created_at).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          timeZone: "America/Chicago",
        })}
        .
      </p>
      {me.user && <ReportForm type="profile" id={id} back="/profile" />}
    </div>
  );
}
