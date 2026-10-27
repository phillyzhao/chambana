"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock3,
  Compass,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useRef } from "react";
import type { DesktopMissionFilter } from "@/lib/desktop-mission-filters";
import styles from "./desktop-missions.module.css";

type Mission = {
  id: number;
  title: string;
  category: string;
  location: string;
  time: string;
  duration: string;
  nuts: number;
  image: string;
  alt: string;
  people: string[];
};

type Props = {
  missions: Mission[];
  query: string;
  filters: DesktopMissionFilter[];
  saved: number[];
  joined: number[];
  onQueryChange: (query: string) => void;
  onFilters: () => void;
  onRemoveFilter: (filter: DesktopMissionFilter) => void;
  onReset: () => void;
  onOpenMission: (id: number) => void;
  onSave: (id: number) => void;
};

export function DesktopMissions({
  missions,
  query,
  filters,
  saved,
  joined,
  onQueryChange,
  onFilters,
  onRemoveFilter,
  onReset,
  onOpenMission,
  onSave,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  function reset() {
    onReset();
    searchRef.current?.focus();
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 id="desktop-preview-title" tabIndex={-1}>
          Missions.
        </h1>
        <span className={styles.campus}>
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          Urbana–Champaign
        </span>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={18} strokeWidth={1.5} aria-hidden="true" />
          <label className={styles.srOnly} htmlFor="desktop-mission-search">
            Search missions
          </label>
          <input
            id="desktop-mission-search"
            ref={searchRef}
            type="search"
            placeholder="Search missions or places"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                onQueryChange("");
                searchRef.current?.focus();
              }}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <button
          type="button"
          className={styles.filterButton}
          aria-haspopup="dialog"
          onClick={onFilters}
        >
          <SlidersHorizontal size={16} strokeWidth={1.5} aria-hidden="true" />
          Filters{filters.length > 0 && <span>{filters.length}</span>}
        </button>
        <span className={styles.results} role="status" aria-live="polite">
          {missions.length} {missions.length === 1 ? "mission" : "missions"}
        </span>
      </div>
      {filters.length > 0 && (
        <div
          className={styles.selectedFilters}
          aria-label="Active mission filters"
        >
          {filters.map((filter) => (
            <button
              type="button"
              key={filter}
              aria-label={`Remove ${filter} filter`}
              onClick={() => {
                onRemoveFilter(filter);
                searchRef.current?.focus();
              }}
            >
              {filter}
              <X size={12} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className={styles.clearFilters} onClick={reset}>
            Clear all
          </button>
        </div>
      )}

      <div className={styles.missionList} aria-label="Missions">
        {missions.map((mission) => {
          const isJoined = joined.includes(mission.id);
          const isSaved = saved.includes(mission.id);
          return (
            <article
              className={styles.card}
              key={mission.id}
              aria-labelledby={`mission-${mission.id}-title`}
            >
              <button
                type="button"
                className={styles.photo}
                aria-label={`Explore ${mission.title}`}
                onClick={() => onOpenMission(mission.id)}
              >
                <img
                  src={mission.image}
                  alt={mission.alt}
                  width={640}
                  height={480}
                />
                {isJoined && (
                  <span className={styles.joinedBadge}>
                    <Check size={12} aria-hidden="true" />
                    Joined
                  </span>
                )}
              </button>
              <div className={styles.cardBody}>
                <div className={styles.meta}>
                  <span>
                    {mission.category} <i aria-hidden="true">/</i>{" "}
                    {mission.time}
                  </span>
                  <span>+{mission.nuts} nuts</span>
                </div>
                <button
                  type="button"
                  className={styles.titleButton}
                  onClick={() => onOpenMission(mission.id)}
                >
                  <h2 id={`mission-${mission.id}-title`}>{mission.title}</h2>
                  <ArrowUpRight
                    size={21}
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />
                </button>
                <div className={styles.facts}>
                  <span>
                    <MapPin size={13} aria-hidden="true" />
                    {mission.location}
                  </span>
                  <span>
                    <Clock3 size={13} aria-hidden="true" />
                    {mission.duration}
                  </span>
                </div>
                <div className={styles.cardBottom}>
                  <span className={styles.going}>
                    {isJoined ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      <Users size={14} strokeWidth={1.5} aria-hidden="true" />
                    )}
                    {isJoined ? "You’re in · " : ""}
                    {mission.people.length + (isJoined ? 1 : 0)} of 6 going
                  </span>
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.save}
                      aria-label={`${isSaved ? "Unsave" : "Save"} ${mission.title}`}
                      aria-pressed={isSaved}
                      onClick={() => {
                        onSave(mission.id);
                        if (
                          isSaved &&
                          filters.includes("Saved") &&
                          !(filters.includes("Joined") && isJoined)
                        )
                          searchRef.current?.focus();
                      }}
                    >
                      <Bookmark
                        size={18}
                        strokeWidth={1.5}
                        fill={isSaved ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className={styles.view}
                      aria-label={`View ${mission.title}`}
                      onClick={() => onOpenMission(mission.id)}
                    >
                      View mission
                      <ArrowRight
                        size={16}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {missions.length === 0 && (
        <div className={styles.empty}>
          <Compass size={35} strokeWidth={1} aria-hidden="true" />
          <h2>No matching missions.</h2>
          <p>
            {query.trim()
              ? "Try another title or place, or clear your filters."
              : filters.length === 1 && filters[0] === "Saved"
                ? "Save a mission with the bookmark to find it here."
                : filters.length === 1 && filters[0] === "Joined"
                  ? "Join a mission to see it here."
                  : "Your saved and joined missions will appear here."}
          </p>
          <button type="button" onClick={reset}>
            Show all missions
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
