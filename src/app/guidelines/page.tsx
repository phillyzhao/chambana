import { PageIntro } from "@/components/ui";
import { PROHIBITED } from "@/lib/rules";
export default function Guidelines() {
  const support = process.env.SUPPORT_EMAIL;
  return (
    <div className="narrow">
      <PageIntro
        eyebrow="LOOK OUT FOR EACH OTHER"
        title="Keep it a good time."
      />
      <section className="panel prose">
        <h2>Campus, with care</h2>
        <p>{PROHIBITED}</p>
        <p>
          Every mission is optional. Group organizers can decline a shared
          mission; its replacement timer still applies. Never pressure someone
          to participate or to appear in a photo.
        </p>
        <h2>Photo proof</h2>
        <p>
          Upload a photo you took for the mission. Get permission from
          identifiable people in it. Avoid student IDs, private messages, faces
          of bystanders, or other personal information that is not needed for
          the mission.
        </p>
        <p>
          We remove photo metadata before storage. Photos are sent to Google
          Gemini to check visible evidence and may be reviewed by Chambana
          platform admins. AI can make mistakes; uncertain results go to admin
          review. A photo alone cannot prove when it was taken or who performed
          an action.
        </p>
        <h2>What is public</h2>
        <p>
          Your display name, bio, score, and group details are public, including
          to people who are not signed in. Your Illinois email and submission
          photos are not public. You can see your submission status and review
          explanation. Platform reviewers can view proof through private,
          short-lived links.
        </p>
        <h2>Beta data</h2>
        <p>
          Accounts, proof, and scoring records are stored in the beta’s Supabase
          project. This beta does not yet have automatic proof deletion or
          self-service account deletion. The operator needs to publish a support
          contact, retention policy, and final privacy terms before opening
          signups.
        </p>
        <h2>Something off?</h2>
        {support && (
          <p>
            For support or a data/deletion request, contact{" "}
            <a href={`mailto:${support}`}>{support}</a>. Do not email passwords,
            API keys, or sensitive proof photos.
          </p>
        )}
        <p>
          Signed-in members can report public profiles or groups from their
          pages. Chambana admins review reports. This site is not affiliated
          with or endorsed by the University of Illinois Urbana-Champaign.
        </p>
      </section>
    </div>
  );
}
