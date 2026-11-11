"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Clock3, Upload } from "lucide-react";
import type { MemberSubmission } from "@/lib/member-missions";
import styles from "./mission-submission.module.css";

const accepted = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

async function sendJson(url: string, body: object) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "same-origin",
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      result.error || "That didn’t go through. Please try again.",
    );
  return result;
}

export function visibleSubmission(
  server: MemberSubmission | undefined,
  justSent: MemberSubmission | null,
) {
  if (!justSent) return server;
  if (!server) return justSent;
  if (server.id === justSent.id)
    return server.status === "uploading" ? justSent : server;
  // A refreshed attempt from another device must replace local feedback for
  // an earlier attempt, including its eventual approval or rejection.
  return Date.parse(server.created_at) >= Date.parse(justSent.created_at)
    ? server
    : justSent;
}

export function MissionSubmission({
  missionId,
  submission,
}: {
  missionId: string;
  submission?: MemberSubmission;
}) {
  const router = useRouter();
  const id = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [stage, setStage] = useState<"idle" | "uploading" | "sending">("idle");
  const [sent, setSent] = useState<MemberSubmission | null>(null);
  const [uploadedId, setUploadedId] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(
    submission?.status === "uploading" ? submission.id : null,
  );
  const [replaceAttempt, setReplaceAttempt] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const current = visibleSubmission(submission, sent);
  const busy = stage !== "idle";

  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function finish(submissionId: string) {
    setStage("sending");
    const result = await sendJson(
      `/api/member/submissions/${submissionId}/complete`,
      {},
    );
    setSent(result.submission);
    setFile(null);
    setUploadedId(null);
    setAttemptId(null);
    router.refresh();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    try {
      if (uploadedId) {
        await finish(uploadedId);
        return;
      }
      if (!file) throw new Error("Choose a photo or video before submitting.");
      if (!accepted.includes(file.type))
        throw new Error(
          "Choose a JPEG, PNG, or WebP photo, or an MP4, MOV, or WebM video.",
        );
      const maximum = (file.type.startsWith("image/") ? 10 : 50) * 1024 * 1024;
      if (!file.size || file.size > maximum)
        throw new Error("Choose a photo up to 10 MB or a video up to 50 MB.");
      setStage("uploading");
      if (attemptId && replaceAttempt) {
        await sendJson(`/api/member/submissions/${attemptId}/cancel`, {});
        setAttemptId(null);
        setReplaceAttempt(false);
      }
      const reservation = await sendJson("/api/member/submissions", {
        missionId,
        mime: file.type,
        size: file.size,
      });
      setAttemptId(reservation.submission.id);
      const body = new FormData();
      body.append("cacheControl", "0");
      body.append("", file);
      const response = await fetch(reservation.upload.signedUrl, {
        method: "PUT",
        body,
        headers: { "x-upsert": "false" },
        credentials: "omit",
        referrerPolicy: "no-referrer",
      });
      // A timed-out first upload may already exist. Finalization safely checks
      // ownership and the stored proof before changing its state.
      if (!response.ok) {
        await finish(reservation.submission.id);
        return;
      }
      setUploadedId(reservation.submission.id);
      await finish(reservation.submission.id);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Your upload didn’t finish. Please try again.",
      );
    } finally {
      setStage("idle");
    }
  }

  if (current?.status === "approved")
    return (
      <section className={styles.status} aria-label="Submission approved">
        <Check size={18} aria-hidden="true" />
        <div>
          <strong>Approved. +{current.nuts} nuts.</strong>
          <p>Your mission is complete.</p>
        </div>
      </section>
    );
  if (current?.status === "pending")
    return (
      <section
        className={styles.status}
        aria-label="Submission awaiting review"
      >
        <Clock3 size={18} aria-hidden="true" />
        <div>
          <strong>Sent for review.</strong>
          <p>Your nuts will arrive after the owner approves your proof.</p>
        </div>
      </section>
    );

  return (
    <section className={styles.submission} aria-label="Mission proof">
      {current?.status === "rejected" && (
        <div className={styles.reviewNote}>
          <strong>Try this one again.</strong>
          <p>{current.rejection_reason}</p>
        </div>
      )}
      <form onSubmit={submit}>
        <label className={styles.label} htmlFor={id}>
          <Camera size={17} aria-hidden="true" /> Your photo or video
        </label>
        <input
          ref={input}
          id={id}
          type="file"
          accept={accepted.join(",")}
          required={!uploadedId}
          disabled={busy}
          aria-describedby={`${id}-help`}
          onChange={(event) => {
            setFile(event.target.files?.[0] ?? null);
            setUploadedId(null);
            setReplaceAttempt(Boolean(attemptId));
            setError("");
          }}
        />
        <p className={styles.help} id={`${id}-help`}>
          Required to complete this mission.
          <br />
          Photos up to 10 MB. Videos up to 50 MB.
        </p>
        {preview &&
          (file?.type.startsWith("video/") ? (
            <video
              className={styles.preview}
              src={preview}
              controls
              playsInline
              preload="metadata"
              aria-label="Your selected proof video"
            />
          ) : (
            <img
              className={styles.preview}
              src={preview}
              alt="Your selected mission proof"
            />
          ))}
        {file && <p className={styles.filename}>{file.name}</p>}
        <button
          className={styles.submit}
          disabled={busy || (!file && !uploadedId)}
          type="submit"
        >
          {stage === "uploading"
            ? "Uploading proof…"
            : stage === "sending"
              ? "Submitting…"
              : uploadedId
                ? "Finish submitting"
                : "Submit"}
          <Upload size={17} aria-hidden="true" />
        </button>
        {!file && attemptId && !busy && (
          <button
            className={styles.resume}
            type="button"
            onClick={async () => {
              setError("");
              try {
                await finish(attemptId);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "Choose your file and try again.",
                );
              } finally {
                setStage("idle");
              }
            }}
          >
            Finish previous upload
          </button>
        )}
        <p className={styles.help}>
          Only you and the owner can view your proof.
          <br />
          Nuts are awarded after approval.
        </p>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {busy && (
          <p className={styles.help} role="status">
            Keep this open while your proof is sent.
          </p>
        )}
      </form>
    </section>
  );
}
