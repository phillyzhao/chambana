"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bookmark,
  Clock3,
  MapPin,
  Search,
  Users,
  X,
} from "lucide-react";
import {
  MISSION_CATEGORIES,
  isPublishedMission,
  type MissionLibraryRecord,
} from "@/lib/mission-library";
import styles from "./mission-library-feed.module.css";

export type MissionLibraryFeedData = {
  missions: MissionLibraryRecord[];
  error?: string;
};

const sentenceSegmenter = new Intl.Segmenter("en", { granularity: "sentence" });

function descriptionLines(text: string) {
  return Array.from(sentenceSegmenter.segment(text), ({ segment }) =>
    segment.trim(),
  ).join("\n");
}

/** Both experiences render the same server-filtered, approved catalog. */
export function MissionLibraryFeed({
  data,
  compact = false,
  home = false,
  saved,
  onToggleSave,
  selectedId,
  onSelectMission,
  savedOnly,
  onSavedOnlyChange,
}: {
  data: MissionLibraryFeedData;
  compact?: boolean;
  home?: boolean;
  saved: string[];
  onToggleSave: (id: string) => void;
  selectedId: string | null;
  onSelectMission: (id: string | null) => void;
  savedOnly: boolean;
  onSavedOnlyChange: (value: boolean) => void;
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const dialog = useRef<HTMLDialogElement>(null);
  const uid = useId();
  const published = data.error
    ? []
    : data.missions.filter((item) => isPublishedMission(item, now));
  const mission = published.find((item) => item.id === selectedId);
  const matches = published.filter(
    (item) =>
      home ||
      ((category === "All" || item.category === category) &&
        (!savedOnly || saved.includes(item.id)) &&
        `${item.title} ${item.location_name} ${item.city} ${item.instructions}`
          .toLowerCase()
          .includes(query.trim().toLowerCase())),
  );
  const visible = home ? matches.slice(0, 3) : matches;
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      setNow(Date.now());
      router.refresh();
    };
    const interval = window.setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router]);

  useEffect(() => {
    if (!mission) return;
    const current = dialog.current;
    const trigger = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    current?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      current?.close();
      document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [mission?.id]);

  return (
    <section
      className={styles.feed}
      data-compact={compact}
      aria-label="Urbana–Champaign missions"
    >
      <header className={styles.intro}>
        <p>URBANA–CHAMPAIGN</p>
        <h1 id="desktop-preview-title" tabIndex={-1}>
          {home ? "Got a little time?" : "Pick something fun."}
        </h1>
        <span>
          Quick challenges around Urbana–Champaign.
          <br />
          Try one solo or bring a friend.
        </span>
      </header>
      {!home && (
        <div className={styles.tools}>
          <label className={styles.search}>
            <Search size={17} aria-hidden="true" />
            <span className={styles.srOnly}>Search missions</span>
            <input
              type="search"
              placeholder="Search by challenge or place"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className={styles.category}>
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option>All</option>
              {MISSION_CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <button
            className={styles.saveFilter}
            type="button"
            aria-pressed={savedOnly}
            onClick={() => onSavedOnlyChange(!savedOnly)}
          >
            <Bookmark size={16} aria-hidden="true" />
            Saved
          </button>
        </div>
      )}
      {data.error ? (
        <p className={styles.empty} role="status">
          Missions are temporarily unavailable. Please try again shortly.
        </p>
      ) : visible.length ? (
        <div className={styles.grid}>
          {visible.map((item, index) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span>{item.category}</span>
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <button
                className={styles.title}
                type="button"
                onClick={() => onSelectMission(item.id)}
              >
                <h2>{item.title}</h2>
                <ArrowUpRight size={24} aria-hidden="true" />
              </button>
              <p className={styles.description}>
                {descriptionLines(item.instructions)}
              </p>
              <div className={styles.facts}>
                <span>
                  <MapPin size={14} aria-hidden="true" />
                  {item.location_name}, {item.city}
                </span>
                <span>
                  <Clock3 size={14} aria-hidden="true" />
                  {item.duration_minutes} min · {item.cost_label}
                </span>
              </div>
              <footer>
                <span>+{item.nuts} nuts</span>
                <button
                  type="button"
                  aria-label={`${saved.includes(item.id) ? "Unsave" : "Save"} ${item.title}`}
                  aria-pressed={saved.includes(item.id)}
                  onClick={() => onToggleSave(item.id)}
                >
                  <Bookmark
                    size={18}
                    fill={saved.includes(item.id) ? "currentColor" : "none"}
                    aria-hidden="true"
                  />
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <h2>
            {published.length
              ? "Nothing matches that."
              : "New missions are on the way."}
          </h2>
          <p>
            {published.length
              ? "Try another category or search."
              : "Check back for the next local adventure."}
          </p>
        </div>
      )}
      <dialog
        ref={dialog}
        className={styles.dialog}
        data-compact={compact}
        aria-labelledby={`${uid}-title`}
        onClose={(event) => {
          // Effect cleanup can queue a close event before Strict Mode (or a
          // mission change) immediately reopens this same dialog.
          if (!event.currentTarget.open) onSelectMission(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) onSelectMission(null);
        }}
      >
        {mission && (
          <div className={styles.detail}>
            <button
              className={styles.close}
              type="button"
              aria-label="Close mission"
              onClick={() => onSelectMission(null)}
              autoFocus
            >
              <X size={22} aria-hidden="true" />
            </button>
            <p className={styles.eyebrow}>
              {mission.category} · +{mission.nuts} nuts
            </p>
            <h2 id={`${uid}-title`}>{mission.title}</h2>
            <div className={styles.facts}>
              <span>
                <MapPin size={16} aria-hidden="true" />
                {mission.location_name}, {mission.city}
              </span>
              <span>{mission.location_address}</span>
              <span>
                <Clock3 size={16} aria-hidden="true" />
                {mission.duration_minutes} minutes · {mission.cost_label}
              </span>
              <span>
                <Users size={16} aria-hidden="true" />
                {mission.min_people === mission.max_people
                  ? mission.min_people
                  : `${mission.min_people}–${mission.max_people}`}{" "}
                {mission.max_people === 1 ? "person" : "people"}
              </span>
            </div>
            <p className={styles.instructions}>
              {descriptionLines(mission.instructions)}
            </p>
            <h3>Get it on camera.</h3>
            <p>{mission.proof_prompt}</p>
            {mission.ends_at && (
              <p>
                Available until{" "}
                {new Intl.DateTimeFormat("en-US", {
                  timeZone: "America/Chicago",
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(mission.ends_at))}{" "}
                (Central).
              </p>
            )}
            <a
              className={styles.source}
              href={mission.source_url}
              target="_blank"
              rel="noreferrer"
            >
              Location details & hours{" "}
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
            <button
              className={styles.primary}
              type="button"
              aria-pressed={saved.includes(mission.id)}
              onClick={() => onToggleSave(mission.id)}
            >
              {saved.includes(mission.id)
                ? "Saved for later"
                : "Save for later"}
              <Bookmark size={18} aria-hidden="true" />
            </button>
            <small className={styles.note}>
              Saving is local to this preview. No booking or completion is
              submitted.
            </small>
          </div>
        )}
      </dialog>
    </section>
  );
}
