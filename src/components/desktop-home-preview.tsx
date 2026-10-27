"use client";

import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Home,
  MapPin,
  MessageCircle,
  Users,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  filterDesktopMissions,
  toggleDesktopMissionFilter,
  type DesktopMissionFilter,
} from "@/lib/desktop-mission-filters";
import { DesktopMissions } from "./desktop-missions";
import styles from "./desktop-home-preview.module.css";

const missions = [
  {
    id: 0,
    title: "Take the long way home",
    category: "Wander",
    location: "Japan House gardens",
    time: "Today · 5:30 PM",
    duration: "45 minutes",
    nuts: 50,
    image: "/design-assets/campus.jpg",
    alt: "Tree and bench beside the Japan House garden pond",
    people: ["JL", "AM", "SK", "RD"],
  },
  {
    id: 1,
    title: "A table for six",
    category: "Connect",
    location: "Campustown",
    time: "Today · 7:00 PM",
    duration: "1 hour",
    nuts: 75,
    image: "/design-assets/social.jpg",
    alt: "Friends sharing a conversation at a cafe",
    people: ["ML", "TK", "AS"],
  },
  {
    id: 2,
    title: "Find your next favorite",
    category: "Discover",
    location: "Main Library",
    time: "Tomorrow · 4:00 PM",
    duration: "30 minutes",
    nuts: 40,
    image: "/design-assets/main-library.jpg",
    alt: "Main Library at the University of Illinois Urbana-Champaign",
    people: ["EC", "JN"],
  },
];

const destinations = [
  { label: "Home", icon: Home },
  { label: "Missions", icon: Compass },
  { label: "Groups", icon: Users },
  { label: "Inbox", icon: MessageCircle },
] as const;

type Destination = (typeof destinations)[number]["label"];
type Panel =
  | { type: "mission"; id: number }
  | { type: "profile" }
  | { type: "notifications" }
  | { type: "group" }
  | { type: "filters" }
  | { type: "next"; destination: Destination }
  | null;

function Avatars({ people }: { people: string[] }) {
  return (
    <span
      className={styles.avatars}
      aria-label={`${people.length} people going`}
    >
      {people.slice(0, 3).map((person, index) => (
        <span key={person} data-shade={index} aria-hidden="true">
          {person}
        </span>
      ))}
      {people.length > 3 && (
        <small aria-hidden="true">+{people.length - 3}</small>
      )}
    </span>
  );
}

export function DesktopHomePreview({ dateLabel }: { dateLabel: string }) {
  const searchParams = useSearchParams();
  const screens = searchParams.getAll("screen");
  const screen =
    screens.length === 1 && screens[0] === "missions" ? "Missions" : "Home";
  const [panel, setPanel] = useState<Panel>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [joined, setJoined] = useState<number[]>([]);
  const [missionQuery, setMissionQuery] = useState("");
  const [missionFilters, setMissionFilters] = useState<DesktopMissionFilter[]>(
    [],
  );
  const [notificationsRead, setNotificationsRead] = useState(false);
  const [notice, setNotice] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const open = panel !== null;
  const previousScreen = useRef(screen);
  const filteredMissions = filterDesktopMissions(
    missions,
    missionQuery,
    missionFilters,
    saved,
    joined,
  );

  useEffect(() => {
    if (previousScreen.current === screen) return;
    previousScreen.current = screen;
    setPanel(null);
    window.scrollTo({ top: 0, behavior: "auto" });
    document
      .getElementById("desktop-preview-title")
      ?.focus({ preventScroll: true });
  }, [screen]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    triggerRef.current = document.activeElement as HTMLElement;
    dialog?.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      const returnTarget = triggerRef.current?.isConnected
        ? triggerRef.current
        : document.getElementById("desktop-preview-title");
      returnTarget?.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!panel) return;
    dialogRef.current?.scrollTo({ top: 0 });
    closeRef.current?.focus({ preventScroll: true });
  }, [panel]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  function navigate(destination: Destination) {
    if (destination === "Home" || destination === "Missions") {
      setPanel(null);
      if (screen !== destination) {
        window.history.pushState(
          null,
          "",
          destination === "Missions"
            ? "/design-preview?view=desktop&screen=missions"
            : "/design-preview?view=desktop",
        );
      }
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    setPanel({ type: "next", destination });
  }

  function toggleSave(id: number) {
    const wasSaved = saved.includes(id);
    setSaved((current) =>
      wasSaved ? current.filter((value) => value !== id) : [...current, id],
    );
    setNotice(
      wasSaved ? "Removed from saved missions" : "Mission saved for later",
    );
  }

  const activeDestination = panel?.type === "next" ? panel.destination : screen;
  const selectedMission = panel?.type === "mission" ? missions[panel.id] : null;
  const selectedId = panel?.type === "mission" ? panel.id : 0;
  const panelTitle =
    panel?.type === "mission"
      ? selectedMission?.title
      : panel?.type === "profile"
        ? "Julian Park"
        : panel?.type === "notifications"
          ? "Notifications"
          : panel?.type === "group"
            ? "The in-between club"
            : panel?.type === "filters"
              ? "Filter missions"
              : panel?.type === "next"
                ? panel.destination
                : "";

  return (
    <div className={styles.preview}>
      <a className={styles.skipLink} href="#desktop-preview-title">
        Skip to content
      </a>
      <header className={styles.header}>
        <a
          className={styles.brand}
          href="/design-preview?view=desktop"
          aria-label="Chambana Home"
          onClick={(event) => {
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            )
              return;
            event.preventDefault();
            navigate("Home");
          }}
        >
          chambana<span>.</span>
        </a>
        <nav
          className={styles.navigation}
          aria-label="Chambana main navigation"
        >
          {destinations.map(({ label, icon: Icon }) => (
            <button
              type="button"
              key={label}
              aria-current={activeDestination === label ? "page" : undefined}
              aria-haspopup={
                label === "Home" || label === "Missions" ? undefined : "dialog"
              }
              onClick={() => navigate(label)}
            >
              <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className={styles.accountControls}>
          <button
            type="button"
            className={styles.notificationButton}
            aria-label={`Open notifications${notificationsRead ? "" : ", 2 unread"}`}
            aria-haspopup="dialog"
            onClick={() => setPanel({ type: "notifications" })}
          >
            <Bell size={19} strokeWidth={1.5} aria-hidden="true" />
            {!notificationsRead && <span className={styles.unreadDot} />}
          </button>
          <button
            type="button"
            className={styles.profileButton}
            aria-label="Open your profile"
            aria-haspopup="dialog"
            onClick={() => setPanel({ type: "profile" })}
          >
            JP
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {screen === "Missions" ? (
          <DesktopMissions
            missions={filteredMissions}
            query={missionQuery}
            filters={missionFilters}
            saved={saved}
            joined={joined}
            onQueryChange={setMissionQuery}
            onFilters={() => setPanel({ type: "filters" })}
            onRemoveFilter={(filter) =>
              setMissionFilters((current) =>
                toggleDesktopMissionFilter(current, filter),
              )
            }
            onReset={() => {
              setMissionQuery("");
              setMissionFilters([]);
            }}
            onOpenMission={(id) => setPanel({ type: "mission", id })}
            onSave={toggleSave}
          />
        ) : (
          <>
            <div className={styles.intro}>
              <p className={styles.eyebrow}>{dateLabel}</p>
              <h1 id="desktop-preview-title" tabIndex={-1}>
                Let’s go explore.
              </h1>
            </div>

            <section aria-labelledby="featured-label">
              <div className={styles.sectionLabel}>
                <h2 id="featured-label">Today’s mission</h2>
                <span>01 / 03</span>
              </div>
              <article className={styles.feature}>
                <button
                  type="button"
                  className={styles.featureImage}
                  aria-label="Explore Take the long way home"
                  onClick={() => setPanel({ type: "mission", id: 0 })}
                >
                  <img
                    src={missions[0].image}
                    alt={missions[0].alt}
                    width={1200}
                    height={800}
                  />
                  <span className={styles.locationPill}>
                    <MapPin size={12} aria-hidden="true" />
                    Japan House
                  </span>
                  <span className={styles.imageArrow}>
                    <ArrowUpRight
                      size={22}
                      strokeWidth={1.4}
                      aria-hidden="true"
                    />
                  </span>
                </button>
                <div className={styles.featureBody}>
                  <div className={styles.featureMeta}>
                    <span>Today · 5:30 PM</span>
                    <span>+50 nuts</span>
                  </div>
                  <button
                    type="button"
                    className={styles.featureTitle}
                    onClick={() => setPanel({ type: "mission", id: 0 })}
                  >
                    <h3>
                      Take the long
                      <br /> way home.
                    </h3>
                  </button>
                  <div className={styles.featureFacts}>
                    <MapPin size={14} aria-hidden="true" />
                    <span>Japan House gardens</span>
                    <i aria-hidden="true">·</i>
                    <span>45 min</span>
                  </div>
                  <div className={styles.featureActions}>
                    <div className={styles.company}>
                      <Avatars
                        people={[
                          ...missions[0].people,
                          ...(joined.includes(0) ? ["JP"] : []),
                        ]}
                      />
                      <span>
                        {joined.includes(0) ? "You’re going" : "4 of 6 going"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`${saved.includes(0) ? "Unsave" : "Save"} Take the long way home`}
                      aria-pressed={saved.includes(0)}
                      onClick={() => toggleSave(0)}
                    >
                      <Bookmark
                        size={19}
                        strokeWidth={1.5}
                        fill={saved.includes(0) ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setPanel({ type: "mission", id: 0 })}
                  >
                    View mission{" "}
                    <ArrowRight
                      size={18}
                      strokeWidth={1.5}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </article>
            </section>

            <div className={styles.belowFeature}>
              <section
                className={styles.upcoming}
                aria-labelledby="later-title"
              >
                <div className={styles.sectionHeading}>
                  <h2 id="later-title">A little later</h2>
                  <button type="button" onClick={() => navigate("Missions")}>
                    View all <ArrowUpRight size={15} aria-hidden="true" />
                  </button>
                </div>
                {[1, 2].map((id) => (
                  <button
                    type="button"
                    key={id}
                    className={styles.missionRow}
                    onClick={() => setPanel({ type: "mission", id })}
                  >
                    <span className={styles.rowIcon}>
                      {id === 1 ? (
                        <Users size={20} strokeWidth={1.5} aria-hidden="true" />
                      ) : (
                        <Bookmark
                          size={20}
                          strokeWidth={1.5}
                          aria-hidden="true"
                        />
                      )}
                    </span>
                    <span className={styles.rowContent}>
                      <strong>{missions[id].title}</strong>
                      <small>
                        {missions[id].location}
                        <span>·</span>
                        {missions[id].time}
                      </small>
                    </span>
                    <span className={styles.reward}>
                      +{missions[id].nuts}
                      <small>nuts</small>
                    </span>
                    <ArrowUpRight
                      className={styles.rowArrow}
                      size={17}
                      aria-hidden="true"
                    />
                  </button>
                ))}
              </section>
              <section className={styles.groups} aria-labelledby="groups-title">
                <div className={styles.sectionHeading}>
                  <h2 id="groups-title">Your groups</h2>
                  <button
                    type="button"
                    aria-label="Explore groups"
                    onClick={() => navigate("Groups")}
                  >
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.groupRow}
                  onClick={() => setPanel({ type: "group" })}
                >
                  <span className={styles.groupAvatar}>IC</span>
                  <span className={styles.rowContent}>
                    <strong>The in-between club</strong>
                    <small>Outdoors · 4 members</small>
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
                <div className={styles.groupNext}>
                  <span>Up next</span>
                  <p>
                    The long way home <span>Today, 5:30 PM</span>
                  </p>
                </div>
              </section>
            </div>
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <span>
          Desktop preview <span aria-hidden="true">/</span> Sample activity
        </span>
        <a href="/design-preview">
          View iPhone design <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      </footer>
      <div
        className={styles.toast}
        role="status"
        aria-live="polite"
        data-visible={Boolean(notice)}
      >
        {notice && <Check size={16} aria-hidden="true" />}
        {notice}
      </div>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onKeyDown={(event) => {
          if (event.key !== "Tab") return;
          const controls = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled), a[href], [tabindex="0"]',
            ),
          ).filter((element) => element.getClientRects().length);
          const first = controls[0];
          const last = controls.at(-1);
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }}
        onCancel={() => setPanel(null)}
        onClose={() => setPanel(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPanel(null);
        }}
      >
        {panel && (
          <div className={styles.dialogContent}>
            <button
              ref={closeRef}
              type="button"
              className={styles.closeButton}
              aria-label="Close panel"
              onClick={() => setPanel(null)}
              autoFocus
            >
              <X size={20} strokeWidth={1.5} aria-hidden="true" />
            </button>
            {selectedMission?.image && (
              <img
                className={styles.dialogImage}
                src={selectedMission.image}
                alt={selectedMission.alt}
              />
            )}
            <div className={styles.dialogBody}>
              {selectedMission && (
                <p className={styles.eyebrow}>
                  {selectedMission.category} / +{selectedMission.nuts} nuts
                </p>
              )}
              {panel.type === "profile" && (
                <div className={styles.largeAvatar}>JP</div>
              )}
              {panel.type === "group" && (
                <div className={styles.largeAvatar}>IC</div>
              )}
              <h2 id={titleId}>
                {panelTitle}
                {selectedMission ? "." : ""}
              </h2>

              {panel.type === "filters" && (
                <>
                  <p className={styles.muted}>Choose Saved, Joined, or both.</p>
                  <div
                    className={styles.filterOptions}
                    role="group"
                    aria-label="Mission filters"
                  >
                    {(["All", "Saved", "Joined"] as const).map((option) => {
                      const selected =
                        option === "All"
                          ? missionFilters.length === 0
                          : missionFilters.includes(option);
                      return (
                        <button
                          type="button"
                          key={option}
                          aria-pressed={selected}
                          onClick={() =>
                            setMissionFilters((current) =>
                              toggleDesktopMissionFilter(current, option),
                            )
                          }
                        >
                          <span>
                            {option === "All" ? (
                              <Compass size={19} aria-hidden="true" />
                            ) : option === "Saved" ? (
                              <Bookmark size={19} aria-hidden="true" />
                            ) : (
                              <Users size={19} aria-hidden="true" />
                            )}
                            {option}
                          </span>
                          <span className={styles.filterCheck}>
                            {selected && <Check size={14} aria-hidden="true" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <div className={styles.filterSummary}>
                    <span role="status">
                      {filteredMissions.length} matching{" "}
                      {filteredMissions.length === 1 ? "mission" : "missions"}
                    </span>
                    <button type="button" onClick={() => setMissionFilters([])}>
                      Reset filters
                    </button>
                  </div>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setPanel(null)}
                  >
                    Show {filteredMissions.length}{" "}
                    {filteredMissions.length === 1 ? "mission" : "missions"}
                    <ArrowRight size={17} aria-hidden="true" />
                  </button>
                </>
              )}

              {selectedMission && (
                <>
                  <div className={styles.missionFacts}>
                    <span>
                      <MapPin size={16} aria-hidden="true" />
                      {selectedMission.location}
                    </span>
                    <span>
                      <Clock3 size={16} aria-hidden="true" />
                      {selectedMission.time} · {selectedMission.duration}
                    </span>
                    <span>
                      <Users size={16} aria-hidden="true" />
                      {selectedMission.people.length +
                        (joined.includes(selectedId) ? 1 : 0)}{" "}
                      of 6 going
                    </span>
                  </div>
                  <div className={styles.dialogActions}>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() =>
                        setJoined((current) =>
                          current.includes(selectedId)
                            ? current.filter((id) => id !== selectedId)
                            : [...current, selectedId],
                        )
                      }
                    >
                      {joined.includes(selectedId)
                        ? "Leave mission"
                        : "Join mission"}
                      {joined.includes(selectedId) ? (
                        <X size={17} aria-hidden="true" />
                      ) : (
                        <ArrowRight size={17} aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={styles.iconButton}
                      aria-label={`${saved.includes(selectedId) ? "Unsave" : "Save"} ${selectedMission.title}`}
                      aria-pressed={saved.includes(selectedId)}
                      onClick={() => toggleSave(selectedId)}
                    >
                      <Bookmark
                        size={20}
                        fill={
                          saved.includes(selectedId) ? "currentColor" : "none"
                        }
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                  {joined.includes(selectedId) && (
                    <p className={styles.joinedNote} role="status">
                      <Check size={16} aria-hidden="true" />
                      You’re in. See you there.
                    </p>
                  )}
                  <p className={styles.demoNote}>
                    Sample mission. Joining and saving are local to this
                    preview.
                  </p>
                  {selectedId === 2 && (
                    <p className={styles.photoCredit}>
                      Photo:{" "}
                      <a
                        href="https://commons.wikimedia.org/wiki/File:Main_Library-University_of_Illinois_at_Urbana-Champaign_01.jpg"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Killivalavan Solai / Wikimedia Commons
                      </a>
                      .{" "}
                      <a
                        href="https://creativecommons.org/licenses/by-sa/4.0/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        CC BY-SA 4.0
                      </a>
                      . Cropped and shown in grayscale under the same license.
                    </p>
                  )}
                </>
              )}

              {panel.type === "profile" && (
                <>
                  <p className={styles.handle}>@julianpark</p>
                  <div className={styles.stats}>
                    <span>
                      <strong>340</strong>Nuts
                    </span>
                    <span>
                      <strong>6</strong>Missions
                    </span>
                    <span>
                      <strong>1</strong>Group
                    </span>
                  </div>
                  <div className={styles.interests}>
                    <span>Outdoors</span>
                    <span>Books</span>
                    <span>Coffee</span>
                  </div>
                  <h3 className={styles.smallHeading}>
                    Saved missions <span>{saved.length}</span>
                  </h3>
                  {saved.length ? (
                    saved.map((id) => (
                      <button
                        className={styles.panelRow}
                        type="button"
                        key={id}
                        onClick={() => setPanel({ type: "mission", id })}
                      >
                        <Bookmark size={17} aria-hidden="true" />
                        <span>{missions[id].title}</span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    ))
                  ) : (
                    <p className={styles.muted}>
                      Save a mission to come back to it here.
                    </p>
                  )}
                  <p className={styles.demoNote}>
                    Sample profile for the design preview.
                  </p>
                </>
              )}

              {panel.type === "notifications" && (
                <>
                  <div className={styles.notificationSummary}>
                    <span>
                      {notificationsRead
                        ? "You’re all caught up"
                        : "2 unread notifications"}
                    </span>
                    <button
                      type="button"
                      aria-disabled={notificationsRead}
                      onClick={() => {
                        if (!notificationsRead) setNotificationsRead(true);
                      }}
                    >
                      {notificationsRead ? "All read" : "Mark all read"}
                    </button>
                  </div>
                  <button
                    className={styles.panelRow}
                    type="button"
                    onClick={() => {
                      setNotificationsRead(true);
                      setPanel({ type: "mission", id: 0 });
                    }}
                  >
                    <Compass size={20} aria-hidden="true" />
                    <span>
                      <strong>Take the long way home</strong>
                      <small>10 minutes ago</small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  <button
                    className={styles.panelRow}
                    type="button"
                    onClick={() => {
                      setNotificationsRead(true);
                      setPanel({ type: "group" });
                    }}
                  >
                    <Users size={20} aria-hidden="true" />
                    <span>
                      <strong>Joined The in-between club</strong>
                      <small>1 hour ago</small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                </>
              )}

              {panel.type === "group" && (
                <>
                  <p className={styles.muted}>Outdoors · 4 members</p>
                  <h3 className={styles.smallHeading}>Up next</h3>
                  <button
                    className={styles.panelRow}
                    type="button"
                    onClick={() => setPanel({ type: "mission", id: 0 })}
                  >
                    <Compass size={20} aria-hidden="true" />
                    <span>
                      <strong>Take the long way home</strong>
                      <small>Today · 5:30 PM · Japan House</small>
                    </span>
                    <ChevronRight size={16} aria-hidden="true" />
                  </button>
                  <p className={styles.demoNote}>
                    Sample group for the design preview.
                  </p>
                </>
              )}

              {panel.type === "next" && (
                <>
                  <p className={styles.muted}>
                    This review includes desktop Home and Missions. The{" "}
                    {panel.destination} page will be designed in a later pass.
                  </p>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setPanel(null)}
                  >
                    Back to {screen} <ArrowRight size={17} aria-hidden="true" />
                  </button>
                  <a className={styles.previewLink} href="/design-preview">
                    Explore the iPhone preview{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
