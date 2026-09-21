import { Action, Empty, Notice, PageIntro } from "@/components/ui";
import { viewer } from "@/lib/data";
export default async function Join({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [params, me] = await Promise.all([searchParams, viewer()]);
  return (
    <div className="narrow">
      <Notice params={params} />
      <PageIntro eyebrow="YOU’RE INVITED" title="Make room for a memory.">
        Join a group with an invitation code from its organizer.
      </PageIntro>
      {me.user ? (
        <Action kind="join_code" back="/join">
          <label>
            Invitation code
            <input
              name="code"
              defaultValue={params.code}
              required
              maxLength={40}
            />
          </label>
          <button className="button">Accept invitation</button>
        </Action>
      ) : (
        <Empty
          title="Sign in to accept"
          link={`/login?next=${encodeURIComponent(`/join?code=${encodeURIComponent(params.code || "")}`)}`}
          label="Sign in"
        >
          Sign in with your Illinois email to continue with this invitation.
        </Empty>
      )}
    </div>
  );
}
