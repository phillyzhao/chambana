"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  Clock3,
  Compass,
  MapPin,
  Users,
} from "lucide-react";
import { useId, useRef } from "react";
import styles from "./desktop-profile.module.css";

type Group = {
  id: number;
  name: string;
  initials: string;
  category: string;
  members: string[];
  nextMission: { title: string; time: string; location: string };
};

type Mission = {
  id: number;
  title: string;
  location: string;
  time: string;
  duration: string;
  nuts: number;
  image: string;
  alt: string;
};

type MissionTab = "saved" | "joined";

type Props = {
  groups: Group[];
  missions: Mission[];
  saved: number[];
  joined: number[];
  activeTab: MissionTab;
  onTabChange: (value: MissionTab) => void;
  onOpenGroup: (id: number) => void;
  onOpenMission: (id: number) => void;
  onBrowseGroups: () => void;
  onBrowseMissions: () => void;
  onSave: (id: number) => void;
};

const tabs: MissionTab[] = ["saved", "joined"];

export function DesktopProfile({
  groups,
  missions,
  saved,
  joined,
  activeTab,
  onTabChange,
  onOpenGroup,
  onOpenMission,
  onBrowseGroups,
  onBrowseMissions,
  onSave,
}: Props) {
  const uid = useId();
  const tabRefs = useRef<Record<MissionTab, HTMLButtonElement | null>>({
    saved: null,
    joined: null,
  });
  const savedMissions = missions.filter((mission) =>
    saved.includes(mission.id),
  );
  const joinedMissions = missions.filter((mission) =>
    joined.includes(mission.id),
  );
  const visibleMissions =
    activeTab === "saved" ? savedMissions : joinedMissions;

  function selectTab(tab: MissionTab) {
    onTabChange(tab);
    tabRefs.current[tab]?.focus({ preventScroll: true });
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 id="desktop-preview-title" tabIndex={-1}>
          Profile.
        </h1>
        <span className={styles.location}>
          <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
          Urbana–Champaign
        </span>
      </div>

      <div className={styles.layout}>
        <section className={styles.identity} aria-labelledby={`${uid}-name`}>
          <div className={styles.avatar} aria-hidden="true">
            JP
          </div>
          <h2 id={`${uid}-name`}>Julian Park</h2>
          <p className={styles.handle}>@julianpark</p>
          <dl className={styles.stats}>
            <div>
              <dt>Nuts</dt>
              <dd>340</dd>
            </div>
            <div>
              <dt>Completed missions</dt>
              <dd>6</dd>
            </div>
            <div>
              <dt>{groups.length === 1 ? "Group" : "Groups"}</dt>
              <dd>{groups.length}</dd>
            </div>
          </dl>
          <h3 className={styles.smallHeading}>Interests</h3>
          <ul className={styles.interests} aria-label="Interests">
            <li>Outdoors</li>
            <li>Books</li>
            <li>Coffee</li>
          </ul>
          <p className={styles.previewNote}>Sample profile</p>
        </section>

        <div className={styles.activity}>
          <section aria-labelledby={`${uid}-groups`}>
            <div className={styles.sectionHeading}>
              <h2 id={`${uid}-groups`}>
                Your groups <span>{groups.length}</span>
              </h2>
              {groups.length > 0 && (
                <button type="button" onClick={onBrowseGroups}>
                  Explore groups <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            {groups.length ? (
              <div className={styles.groupList}>
                {groups.map((group) => (
                  <button
                    key={group.id}
                    className={styles.groupCard}
                    type="button"
                    aria-label={`View ${group.name}`}
                    onClick={() => onOpenGroup(group.id)}
                  >
                    <span className={styles.groupTop}>
                      <span className={styles.groupInitials} aria-hidden="true">
                        {group.initials}
                      </span>
                      <span className={styles.groupIdentity}>
                        <strong>{group.name}</strong>
                        <span>
                          {group.category} <i aria-hidden="true">·</i>{" "}
                          {group.members.length} members
                        </span>
                      </span>
                      <ArrowUpRight
                        className={styles.groupArrow}
                        size={19}
                        strokeWidth={1.4}
                        aria-hidden="true"
                      />
                    </span>
                    <span className={styles.nextMission}>
                      <span className={styles.nextLabel}>Next mission</span>
                      <strong>{group.nextMission.title}</strong>
                      <span className={styles.nextFacts}>
                        <span>
                          <Clock3 size={12} aria-hidden="true" />
                          {group.nextMission.time}
                        </span>
                        <span>
                          <MapPin size={12} aria-hidden="true" />
                          {group.nextMission.location}
                        </span>
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className={styles.emptyGroups}>
                <Users size={25} strokeWidth={1.3} aria-hidden="true" />
                <div>
                  <h3>No groups joined yet.</h3>
                  <p>Find a group that shares your interests.</p>
                </div>
                <button type="button" onClick={onBrowseGroups}>
                  Explore groups <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </section>

          <section aria-labelledby={`${uid}-missions`}>
            <div className={styles.sectionHeading}>
              <h2 id={`${uid}-missions`}>Your missions</h2>
              {visibleMissions.length > 0 && (
                <button type="button" onClick={onBrowseMissions}>
                  Explore missions <ArrowUpRight size={14} aria-hidden="true" />
                </button>
              )}
            </div>
            <div
              className={styles.missionTabs}
              role="tablist"
              aria-label="Your missions"
            >
              {tabs.map((tab) => (
                <button
                  key={tab}
                  id={`${uid}-${tab}-tab`}
                  ref={(element) => {
                    tabRefs.current[tab] = element;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  aria-controls={`${uid}-mission-panel`}
                  tabIndex={activeTab === tab ? 0 : -1}
                  onClick={() => onTabChange(tab)}
                  onKeyDown={(event) => {
                    if (
                      !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                        event.key,
                      )
                    )
                      return;
                    event.preventDefault();
                    selectTab(
                      event.key === "Home"
                        ? "saved"
                        : event.key === "End"
                          ? "joined"
                          : tab === "saved"
                            ? "joined"
                            : "saved",
                    );
                  }}
                >
                  {tab === "saved" ? (
                    <Bookmark size={15} strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Check size={15} strokeWidth={1.5} aria-hidden="true" />
                  )}
                  {tab === "saved" ? "Saved" : "Joined"}
                  <span>
                    {tab === "saved"
                      ? savedMissions.length
                      : joinedMissions.length}
                  </span>
                </button>
              ))}
            </div>
            <div
              id={`${uid}-mission-panel`}
              role="tabpanel"
              aria-labelledby={`${uid}-${activeTab}-tab`}
              className={styles.missionPanel}
              tabIndex={0}
            >
              {visibleMissions.length ? (
                <div className={styles.missionList}>
                  {visibleMissions.map((mission) => (
                    <article className={styles.missionRow} key={mission.id}>
                      <button
                        className={styles.openMission}
                        type="button"
                        onClick={() => onOpenMission(mission.id)}
                        aria-label={`View ${mission.title}`}
                      >
                        <img
                          src={mission.image}
                          alt={mission.alt}
                          width={160}
                          height={130}
                        />
                        <span className={styles.missionInfo}>
                          <span className={styles.missionTime}>
                            {mission.time}
                          </span>
                          <strong>{mission.title}</strong>
                          <span className={styles.missionFacts}>
                            <MapPin size={12} aria-hidden="true" />
                            {mission.location}
                          </span>
                          <span className={styles.missionDetails}>
                            {mission.duration}
                            <i aria-hidden="true">·</i>+{mission.nuts} nuts
                          </span>
                        </span>
                      </button>
                      <button
                        className={styles.saveButton}
                        type="button"
                        aria-label={`${saved.includes(mission.id) ? "Unsave" : "Save"} ${mission.title}`}
                        aria-pressed={saved.includes(mission.id)}
                        onClick={() => {
                          if (activeTab === "saved")
                            tabRefs.current.saved?.focus({
                              preventScroll: true,
                            });
                          onSave(mission.id);
                        }}
                      >
                        <Bookmark
                          size={18}
                          strokeWidth={1.5}
                          fill={
                            saved.includes(mission.id) ? "currentColor" : "none"
                          }
                          aria-hidden="true"
                        />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyMissions}>
                  {activeTab === "saved" ? (
                    <Bookmark size={27} strokeWidth={1.2} aria-hidden="true" />
                  ) : (
                    <Compass size={27} strokeWidth={1.2} aria-hidden="true" />
                  )}
                  <h3>
                    {activeTab === "saved"
                      ? "Nothing saved yet."
                      : "No missions joined yet."}
                  </h3>
                  <p>
                    {activeTab === "saved"
                      ? "Save a mission to find it here."
                      : "Join a mission and it will appear here."}
                  </p>
                  <button type="button" onClick={onBrowseMissions}>
                    Explore missions <ArrowRight size={16} aria-hidden="true" />
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
