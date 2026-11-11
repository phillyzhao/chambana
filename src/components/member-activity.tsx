"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOutMember } from "@/app/account/actions";
import type { MemberExperience } from "@/lib/member-experience";
import styles from "./member-activity.module.css";

export function MemberActivity({
  member,
  heading = true,
}: {
  member: MemberExperience;
  heading?: boolean;
}) {
  const router = useRouter();
  return (
    <section className={styles.activity} aria-label="Your submissions">
      {heading && <h3>Your submissions</h3>}
      <button
        type="button"
        className={styles.refresh}
        onClick={() => router.refresh()}
      >
        Refresh status
      </button>
      {member.submissions.length ? (
        <ul>
          {member.submissions.map((submission) => (
            <li key={submission.id}>
              <strong>{submission.mission_title}</strong>
              <span>
                {submission.status === "approved"
                  ? `Approved · +${submission.nuts} nuts`
                  : submission.status === "pending"
                    ? "Waiting for review"
                    : submission.status === "rejected"
                      ? "Needs another try"
                      : "Upload not finished"}
              </span>
              {submission.status === "rejected" && (
                <p>{submission.rejection_reason}</p>
              )}
              {submission.status === "pending" && (
                <p>Nuts are added after approval.</p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p>Complete a mission and send your photo or video to get started.</p>
      )}
    </section>
  );
}

export function MemberSignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className={styles.signOut}>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const result = await signOutMember();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          } catch {
            setError("Could not sign out. Please try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Signing out…" : "Sign out"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
