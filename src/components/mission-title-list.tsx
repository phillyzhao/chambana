"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check } from "lucide-react";
import {
  renameMission,
  type RenameMissionState,
} from "@/app/mission-admin/actions";
import {
  missionDraftSchema,
  missionStatus,
  type MissionLibraryRecord,
} from "@/lib/mission-library";
import styles from "./mission-admin.module.css";

export type RenamedMission = NonNullable<RenameMissionState["mission"]>;
type TitleDraft = { value: string; revision: number };
type TitleFeedback = { saving?: boolean; saved?: boolean; error?: string };

export function MissionTitleList({
  missions,
  selectedId,
  protectedMissionId,
  disabled,
  now,
  onSelect,
  onRenamed,
  onPending,
}: {
  missions: MissionLibraryRecord[];
  selectedId: string | null;
  protectedMissionId?: string;
  disabled: boolean;
  now: string;
  onSelect: (id: string) => void;
  onRenamed: (mission: RenamedMission) => void;
  onPending: (id: string, pending: boolean) => void;
}) {
  // Keep edits above the rows so filtering never discards a failed/unsaved name.
  const [drafts, setDrafts] = useState<Record<string, TitleDraft>>({});
  const [feedback, setFeedback] = useState<Record<string, TitleFeedback>>({});
  const inFlight = useRef(new Set<string>());
  const inputs = useRef(new Map<string, HTMLInputElement>());

  useEffect(() => {
    if (!Object.keys(drafts).length) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [drafts]);

  function discard(id: string) {
    if (inFlight.current.has(id)) return;
    setDrafts((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setFeedback((current) => ({ ...current, [id]: {} }));
  }

  function saveTitle(
    mission: MissionLibraryRecord,
    value: string,
    useCurrentRevision = false,
  ): boolean {
    const id = mission.id;
    if (disabled || protectedMissionId === id) return false;
    if (inFlight.current.has(id)) return true;
    const title = missionDraftSchema.shape.title.safeParse(value);
    if (!title.success) {
      setFeedback((current) => ({
        ...current,
        [id]: { error: "Use 4–120 characters. Your name has not been saved." },
      }));
      return false;
    }
    if (title.data === mission.title) {
      // Normalize whitespace locally without an unnecessary database write.
      discard(id);
      return true;
    }

    const form = new FormData();
    form.set("id", id);
    form.set(
      "revision",
      String(
        useCurrentRevision
          ? mission.revision
          : (drafts[id]?.revision ?? mission.revision),
      ),
    );
    form.set("title", title.data);
    inFlight.current.add(id);
    onPending(id, true);
    setFeedback((current) => ({ ...current, [id]: { saving: true } }));
    startTransition(async () => {
      try {
        const result = await renameMission({}, form);
        if (!result.mission || result.error) {
          setFeedback((current) => ({
            ...current,
            [id]: { error: result.error ?? "Could not save. Try again." },
          }));
          return;
        }
        onRenamed(result.mission);
        setDrafts((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        setFeedback((current) => ({ ...current, [id]: { saved: true } }));
      } catch {
        setFeedback((current) => ({
          ...current,
          [id]: {
            error: "Could not save. Your name is still here; try again.",
          },
        }));
      } finally {
        inFlight.current.delete(id);
        onPending(id, false);
      }
    });
    return true;
  }

  return missions.map((mission, index) => {
    const id = mission.id;
    const draft = drafts[id];
    const state = feedback[id] ?? {};
    const conflicted = Boolean(
      state.error && draft && draft.revision !== mission.revision,
    );
    const protectedTitle = protectedMissionId === id;
    const feedbackId = `title-feedback-${id}`;
    const hasFeedback = Boolean(
      protectedTitle || state.saving || state.error || state.saved || draft,
    );
    return (
      <div
        key={id}
        className={styles.missionItem}
        data-selected={selectedId === id}
      >
        <span className={styles.itemNumber} aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className={styles.titleCell}>
          <label className={styles.srOnly} htmlFor={`list-title-${id}`}>
            Challenge name {index + 1}
          </label>
          <input
            ref={(input) => {
              if (input) inputs.current.set(id, input);
              else inputs.current.delete(id);
            }}
            id={`list-title-${id}`}
            className={styles.inlineTitle}
            value={draft?.value ?? mission.title}
            readOnly={Boolean(state.saving || protectedTitle)}
            disabled={disabled}
            minLength={4}
            maxLength={120}
            autoComplete="off"
            enterKeyHint="next"
            aria-invalid={Boolean(state.error)}
            aria-describedby={
              hasFeedback ? `rename-help ${feedbackId}` : "rename-help"
            }
            onChange={(event) => {
              const value = event.currentTarget.value;
              setDrafts((current) => ({
                ...current,
                [id]: {
                  value,
                  revision: current[id]?.revision ?? mission.revision,
                },
              }));
              setFeedback((current) => ({ ...current, [id]: {} }));
            }}
            onBlur={(event) => {
              if (draft && !state.error)
                saveTitle(mission, event.currentTarget.value);
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Escape") {
                event.preventDefault();
                discard(id);
              }
              if (event.key === "Enter" || event.key === "Tab") {
                // A protected title must not trap keyboard users on their way
                // back to the detail form's Save button.
                if (protectedTitle) return;
                const next = missions[index + (event.shiftKey ? -1 : 1)];
                if (event.key === "Enter") event.preventDefault();
                if (saveTitle(mission, event.currentTarget.value) && next) {
                  event.preventDefault();
                  inputs.current.get(next.id)?.focus();
                  inputs.current.get(next.id)?.select();
                }
              }
            }}
          />
          {hasFeedback && (
            <div className={styles.inlineActions}>
              <span
                id={feedbackId}
                className={styles.inlineFeedback}
                role={state.error ? "alert" : "status"}
                aria-live="polite"
              >
                {protectedTitle ? (
                  "Save your detail edits before renaming here."
                ) : state.saving ? (
                  "Saving…"
                ) : state.error ? (
                  conflicted ? (
                    "Another window changed this mission. Review the saved name below."
                  ) : (
                    state.error
                  )
                ) : state.saved ? (
                  <>
                    <Check size={12} aria-hidden="true" /> Saved · private
                  </>
                ) : draft ? (
                  "Not saved yet"
                ) : (
                  ""
                )}
              </span>
              {state.error && (
                <>
                  {conflicted && (
                    <p className={styles.conflictTitle}>
                      Current saved name: <strong>{mission.title}</strong>. Your
                      typed name is still above.
                    </p>
                  )}
                  <button
                    type="button"
                    className={styles.inlineButton}
                    onClick={() =>
                      saveTitle(
                        mission,
                        draft?.value ?? mission.title,
                        conflicted,
                      )
                    }
                  >
                    {conflicted ? "Save my name" : "Retry"}
                  </button>
                  <button
                    type="button"
                    className={styles.inlineButton}
                    onClick={() => discard(id)}
                  >
                    Discard
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className={styles.itemContext}>
          <span>{mission.category}</span>
          <span
            className={styles.itemLocation}
            title={`${mission.location_name}, ${mission.city}`}
          >
            {mission.location_name}, {mission.city}
          </span>
        </div>
        <span className={styles.badge}>
          {missionStatus(mission, Date.parse(now))}
        </span>
        <button
          type="button"
          className={styles.detailsButton}
          aria-label={`Edit details for ${mission.title}`}
          aria-haspopup="dialog"
          onClick={() => onSelect(id)}
        >
          Details <ArrowUpRight size={12} aria-hidden="true" />
        </button>
      </div>
    );
  });
}
