"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  MapPin,
  Search,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import { useRef } from "react";
import type { DesktopGroupFilter } from "@/lib/desktop-group-filters";
import styles from "./desktop-groups.module.css";

type Group = {
  id: number;
  name: string;
  initials: string;
  category: string;
  members: string[];
  nextMission: {
    title: string;
    time: string;
    location: string;
  };
};

type Props = {
  groups: Group[];
  query: string;
  filters: DesktopGroupFilter[];
  joined: number[];
  onQueryChange: (query: string) => void;
  onFilters: () => void;
  onRemoveFilter: (filter: DesktopGroupFilter) => void;
  onReset: () => void;
  onOpenGroup: (id: number) => void;
};

export function DesktopGroups({
  groups,
  query,
  filters,
  joined,
  onQueryChange,
  onFilters,
  onRemoveFilter,
  onReset,
  onOpenGroup,
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
          Groups.
        </h1>
        <span className={styles.campus}>
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          Urbana–Champaign
        </span>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search size={18} strokeWidth={1.5} aria-hidden="true" />
          <label className={styles.srOnly} htmlFor="desktop-group-search">
            Search groups
          </label>
          <input
            id="desktop-group-search"
            ref={searchRef}
            type="search"
            placeholder="Search groups"
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
          {groups.length} {groups.length === 1 ? "group" : "groups"}
        </span>
      </div>

      {filters.length > 0 && (
        <div
          className={styles.selectedFilters}
          aria-label="Active group filters"
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

      <div className={styles.groupList} aria-label="Groups">
        {groups.map((group) => {
          const isJoined = joined.includes(group.id);
          const memberCount = group.members.length + (isJoined ? 1 : 0);

          return (
            <article
              key={group.id}
              className={styles.card}
              aria-labelledby={`desktop-group-${group.id}-title`}
            >
              <div className={styles.cardTop}>
                <span className={styles.initials} aria-hidden="true">
                  {group.initials}
                </span>
                <span className={styles.members}>
                  {isJoined ? (
                    <>
                      <Check size={12} strokeWidth={1.5} aria-hidden="true" />
                      Joined
                      <span className={styles.srOnly}>
                        {` · ${memberCount} ${memberCount === 1 ? "member" : "members"}`}
                      </span>
                    </>
                  ) : (
                    `${memberCount} ${memberCount === 1 ? "member" : "members"}`
                  )}
                </span>
              </div>
              <h2 id={`desktop-group-${group.id}-title`}>{group.name}</h2>
              <p className={styles.category}>{group.category}</p>
              <div className={styles.nextMission}>
                <span className={styles.nextLabel}>
                  Next mission
                  <ArrowUpRight
                    size={17}
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </span>
                <h3>{group.nextMission.title}</h3>
                <div className={styles.facts}>
                  <span>
                    <Clock3 size={12} strokeWidth={1.5} aria-hidden="true" />
                    {group.nextMission.time}
                  </span>
                  <span>
                    <MapPin size={12} strokeWidth={1.5} aria-hidden="true" />
                    {group.nextMission.location}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.openGroup}
                aria-label={`View ${group.name}`}
                onClick={() => onOpenGroup(group.id)}
              >
                <span className={styles.srOnly}>View {group.name}</span>
              </button>
            </article>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className={styles.empty}>
          <Users size={35} strokeWidth={1} aria-hidden="true" />
          <h2>No matching groups.</h2>
          <p>
            {query.trim()
              ? "Try another name or interest, or clear your filters."
              : "Try another filter to find your people."}
          </p>
          <button type="button" onClick={reset}>
            Show all groups
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
