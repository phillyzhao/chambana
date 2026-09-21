import { signIn } from "@/app/actions";
import { Notice, PageIntro } from "@/components/ui";
import { isConfigured } from "@/lib/supabase";
import Link from "next/link";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams,
    configured = isConfigured();
  return (
    <div className="narrow">
      <Notice params={params} />
      <PageIntro eyebrow="EXCLUSIVELY FOR ILLINI" title="Your people are here.">
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
        <form action={signIn}>
          <input name="method" type="hidden" value="google" />
          <input name="next" type="hidden" value={params.next || "/missions"} />
          <button className="button full" disabled={!configured}>
            Continue with Google
          </button>
        </form>
        <div className="divider">or use your campus inbox</div>
        <form action={signIn}>
          <input name="next" type="hidden" value={params.next || "/missions"} />
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
          Use the email link if your Illinois account does not support Google
          sign-in. A personal Gmail account cannot join.
        </p>
      </section>
      <p className="footnote">
        Your profile name, bio, and score are public. Your email stays private.
        Read our{" "}
        <Link href="/guidelines">
          community guidelines and photo privacy details
        </Link>
        .
      </p>
    </div>
  );
}
