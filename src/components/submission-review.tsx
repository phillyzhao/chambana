"use client";

import { useActionState, useState } from "react";
import { ArrowLeft, Check, Clock3, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { decideSubmission } from "@/app/mission-admin/submissions/actions";
import type { ReviewSubmission } from "@/lib/member-missions";
import styles from "./submission-review.module.css";

const dateFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function ProofReviewCard({ submission }: { submission: ReviewSubmission }) {
  const [feedback, action, pending] = useActionState(decideSubmission, {});
  const [proofUrl, setProofUrl] = useState("");
  const [proofError, setProofError] = useState("");
  const [loadingProof, setLoadingProof] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const current = feedback.submission ?? submission;

  async function viewProof() {
    setProofError("");
    setLoadingProof(true);
    try {
      const response = await fetch(
        `/api/member/submissions/${submission.id}/proof`,
        { credentials: "same-origin", cache: "no-store" },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Could not open this proof.");
      setProofUrl(result.url);
    } catch (error) {
      setProofError(
        error instanceof Error ? error.message : "Could not open this proof.",
      );
    } finally {
      setLoadingProof(false);
    }
  }

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.status}>
          {current.status === "approved" ? (
            <Check size={14} />
          ) : (
            <Clock3 size={14} />
          )}
          {current.status === "pending"
            ? "Awaiting review"
            : current.status === "approved"
              ? "Approved"
              : "Rejected"}
        </span>
        <span className={styles.reward}>+{current.nuts} nuts</span>
      </div>
      <h2>{current.mission_title}</h2>
      <p className={styles.member}>
        {submission.member_name}
        {submission.member_handle && ` · @${submission.member_handle}`}
      </p>
      <p className={styles.date}>
        {dateFormat.format(
          new Date(submission.submitted_at ?? submission.created_at),
        )}{" "}
        CT
      </p>
      <details className={styles.instructions}>
        <summary>Mission and required proof</summary>
        <p>{current.mission_instructions}</p>
        <p>{current.proof_prompt}</p>
      </details>
      {proofUrl ? (
        <div className={styles.proof}>
          {submission.mime_type.startsWith("video/") ? (
            <video
              controls
              playsInline
              preload="metadata"
              src={proofUrl}
              aria-label={`Video proof for ${submission.mission_title}`}
              onError={() =>
                setProofError(
                  "This preview may have expired. Refresh the proof to try again.",
                )
              }
            />
          ) : (
            <img
              src={proofUrl}
              alt={`Submitted proof for ${submission.mission_title}`}
              onError={() =>
                setProofError(
                  "This preview may have expired. Refresh the proof to try again.",
                )
              }
            />
          )}
          <button
            type="button"
            className={styles.textButton}
            onClick={viewProof}
            disabled={loadingProof}
          >
            Refresh proof
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.openProof}
          onClick={viewProof}
          disabled={loadingProof}
        >
          {loadingProof
            ? "Opening proof…"
            : submission.mime_type.startsWith("video/")
              ? "View video proof"
              : "View photo proof"}
        </button>
      )}
      {proofError && (
        <p className={styles.error} role="alert">
          {proofError}
        </p>
      )}
      {current.status === "pending" ? (
        <form action={action} className={styles.reviewForm}>
          <input type="hidden" name="id" value={submission.id} />
          {rejecting && (
            <label className={styles.reason}>
              What should they change?
              <textarea
                name="reason"
                maxLength={1000}
                rows={3}
                required
                placeholder="Tell them what proof you need to see."
                disabled={pending}
              />
            </label>
          )}
          <div className={styles.actions}>
            {rejecting ? (
              <>
                <button
                  className={styles.reject}
                  name="decision"
                  value="reject"
                  disabled={pending}
                >
                  Reject submission
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setRejecting(false)}
                  disabled={pending}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  className={styles.approve}
                  name="decision"
                  value="approve"
                  disabled={pending || !proofUrl || Boolean(proofError)}
                >
                  {pending
                    ? "Saving decision…"
                    : `Approve +${submission.nuts} nuts`}
                </button>
                <button
                  className={styles.secondary}
                  type="button"
                  onClick={() => setRejecting(true)}
                  disabled={pending}
                >
                  Reject
                </button>
              </>
            )}
          </div>
          {!proofUrl && (
            <p className={styles.hint}>Open the proof before approving.</p>
          )}
          {feedback.error && (
            <p className={styles.error} role="alert">
              {feedback.error}
            </p>
          )}
        </form>
      ) : (
        <div className={styles.decision} role="status">
          {current.status === "approved" ? (
            `Approved. ${current.nuts} nuts awarded.`
          ) : (
            <>
              <strong>Rejected</strong>
              <p>{current.rejection_reason}</p>
            </>
          )}
        </div>
      )}
    </article>
  );
}

export function SubmissionReview({
  submissions,
  error,
}: {
  submissions: ReviewSubmission[];
  error?: string;
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("pending");
  const visible = submissions.filter(
    (submission) => filter === "all" || submission.status === filter,
  );
  const pendingCount = submissions.filter(
    (submission) => submission.status === "pending",
  ).length;
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <a href="/mission-admin" className={styles.brand}>
          chambana.
        </a>
        <span className={styles.owner}>
          <ShieldCheck size={14} /> Owner review
        </span>
      </header>
      <main className={styles.main}>
        <a href="/mission-admin" className={styles.back}>
          <ArrowLeft size={14} /> Mission library
        </a>
        <div className={styles.titleRow}>
          <div>
            <p className={styles.eyebrow}>Urbana–Champaign</p>
            <h1>
              A little proof.
              <br />A well-earned nut.
            </h1>
            <p className={styles.lede}>
              {pendingCount}{" "}
              {pendingCount === 1 ? "submission needs" : "submissions need"}{" "}
              your review.
            </p>
            <p className={styles.hint}>
              Showing up to 200 waiting submissions, oldest first, and 50 recent
              decisions.
            </p>
          </div>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => router.refresh()}
          >
            <RefreshCw size={15} /> Refresh queue
          </button>
        </div>
        <div className={styles.filters} aria-label="Submission status">
          {[
            ["pending", "Awaiting review"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : visible.length ? (
          <div className={styles.grid}>
            {visible.map((submission) => (
              <ProofReviewCard
                key={`${submission.id}:${submission.status}`}
                submission={submission}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>
            <Check size={25} />
            <h2>
              {filter === "pending"
                ? "You’re all caught up."
                : "Nothing here yet."}
            </h2>
            <p>
              {filter === "pending"
                ? "New photo and video submissions will appear here."
                : "Review decisions will appear here."}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
