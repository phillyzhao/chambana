"use client";

import { useEffect, useState } from "react";
import { Camera, ChevronDown, Clock3, Check, Sprout } from "lucide-react";
import { useFormStatus } from "react-dom";
import { mutate } from "@/app/actions";
import type { Assignment, Submission } from "@/lib/data";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button" disabled={pending}>
      <Camera size={17} />
      {pending ? "Saving & checking photo…" : "Submit photo"}
    </button>
  );
}
function timeLeft(at: string, now: number) {
  const delta = Math.max(0, new Date(at).getTime() - now);
  if (!delta) return "Ready to refresh";
  const hours = Math.floor(delta / 3600000),
    minutes = Math.floor((delta % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
}
export function MissionCard({
  mission,
  submission,
  owner,
  demo = false,
  back,
}: {
  mission: Assignment;
  submission?: Submission;
  owner: boolean;
  demo?: boolean;
  back: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);
  const active = mission.status === "active";
  const underReview =
    submission &&
    ["uploading", "pending", "processing", "needs_review"].includes(
      submission.status,
    );
  const canSubmit =
    active &&
    !underReview &&
    (now === null || new Date(mission.expires_at).getTime() > now);
  return (
    <article className={`mission-card ${!active ? "inactive" : ""}`}>
      <div className="mission-top">
        <span className="small-label">MISSION 0{mission.slot}</span>
        <span className="points">
          <Sprout size={14} />
          {mission.nuts} nuts
        </span>
      </div>
      <h2>{mission.title}</h2>
      <p>{mission.instructions}</p>
      {mission.manual_review && (
        <p className="footnote">An admin reviews proof for this mission.</p>
      )}
      <div className="mission-meta">
        <span>
          <Clock3 size={14} />
          {active ? "Ends in " : "Next mission in "}
          {now === null
            ? "—"
            : timeLeft(active ? mission.expires_at : mission.available_at, now)}
        </span>
        <span className={`status ${mission.status}`}>
          {mission.status === "completed" ? (
            <>
              <Check size={12} />
              Completed
            </>
          ) : active ? (
            "Group mission"
          ) : (
            mission.status
          )}
        </span>
      </div>
      {submission && (
        <p
          className={`submission-note ${submission.status === "approved" ? "success" : ""}`}
          role="status"
        >
          <strong>{submission.status.replaceAll("_", " ")}</strong>
          {submission.reason && ` · ${submission.reason}`}
        </p>
      )}
      <details>
        <summary>
          {canSubmit ? "Complete this mission" : "Mission details"}
          <ChevronDown size={17} />
        </summary>
        <div className="mission-detail">
          <p>
            <strong>Your photo needs to show:</strong> {mission.proof_criteria}
          </p>
          {canSubmit &&
            (demo ? (
              <p className="notice">
                This is a sample mission. Real submissions become available once
                the beta is connected.
              </p>
            ) : (
              <form action={mutate}>
                <input type="hidden" name="action" value="photo" />
                <input type="hidden" name="back" value={back} />
                <input type="hidden" name="assignment_id" value={mission.id} />
                <label>
                  Photo proof
                  <input
                    name="photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    required
                  />
                </label>
                <small>
                  JPG, PNG, or WebP · up to 8 MB. One photo completes the
                  mission for your whole group.
                </small>
                <label className="check-label">
                  <input type="checkbox" name="consent" value="yes" required />I
                  have permission to share this photo and agree to send it to
                  Google Gemini for review. It stays private to me and Chambana
                  reviewers.
                </label>
                <SubmitButton />
              </form>
            ))}
          {owner && active && !underReview && !demo && (
            <form action={mutate} className="decline">
              <input type="hidden" name="action" value="decline" />
              <input type="hidden" name="back" value={back} />
              <input type="hidden" name="assignment_id" value={mission.id} />
              <p>
                Declining removes this mission for everyone. The original timer
                still applies, with at least the configured cooldown.
              </p>
              <button className="text-button">Decline for the group</button>
            </form>
          )}
        </div>
      </details>
    </article>
  );
}
