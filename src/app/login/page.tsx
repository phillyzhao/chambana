import { signIn } from "@/app/actions";
import { Notice, PageIntro } from "@/components/ui";
import { isConfigured } from "@/lib/supabase";
import Link from "next/link";
import { microsoftEnabled } from "@/lib/auth";
import { hasPreviewAccess } from "@/lib/preview-access";
import { PreviewAccessGate } from "@/components/preview-access-gate";
import { CommunityLayout } from "@/components/community-layout";
import { safePath } from "@/lib/paths";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  if (!(await hasPreviewAccess())) {
    const destination = params.next
      ? `/login?next=${encodeURIComponent(safePath(params.next))}`
      : "/login";
    return <PreviewAccessGate destination={destination} />;
  }
  const configured = isConfigured();
  return (
    <CommunityLayout>
      <div className="narrow">
        <Notice params={params} />
        <PageIntro
          eyebrow="EXCLUSIVELY FOR ILLINI"
          title="Your people are here."
        >
          Sign in with your @illinois.edu account to join a group and make your
          first memory.
        </PageIntro>
        {!configured && (
          <p className="notice">
            The preview is ready. Campus sign-in will open once the beta’s
            accounts are connected.
          </p>
        )}
        <section className="panel">
          {microsoftEnabled() && (
            <>
              <form action={signIn}>
                <input name="method" type="hidden" value="microsoft" />
                <input
                  name="next"
                  type="hidden"
                  value={params.next || "/missions"}
                />
                <button className="button full" disabled={!configured}>
                  Continue with Microsoft
                </button>
              </form>
              <div className="divider">or use your campus inbox</div>
            </>
          )}
          <form action={signIn}>
            <input
              name="next"
              type="hidden"
              value={params.next || "/missions"}
            />
            <label>
              Illinois email
              <input
                type="email"
                name="email"
                placeholder="you@illinois.edu"
                required
                autoComplete="email"
              />
            </label>
            <button className="button secondary full" disabled={!configured}>
              Email me a sign-in link
            </button>
          </form>
          <p className="footnote">
            Use your Illinois inbox. Personal Outlook and Gmail accounts cannot
            join.
          </p>
        </section>
        <p className="footnote">
          Your profile name, bio, and score are public. Your email stays
          private. Read the Chambana by GateMatch{" "}
          <Link href="/guidelines">
            community guidelines and photo privacy details
          </Link>
          .
        </p>
      </div>
    </CommunityLayout>
  );
}
