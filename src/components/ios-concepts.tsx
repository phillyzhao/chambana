"use client";

import {
  ArrowRight,
  ArrowUpRight,
  BatteryFull,
  Bell,
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Home,
  MapPin,
  MessageCircle,
  Plus,
  SlidersHorizontal,
  Search,
  Signal,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { IOSConversation } from "./ios-conversation";
import { SignupFlow } from "./ios-signup";
import styles from "./ios-concepts.module.css";

type PreviewMode = "app" | "signup";
type PreviewProfile = { name: string; handle: string; interests: string[] };
type Tab = "Home" | "Missions" | "Groups" | "Inbox";
type Sheet =
  | { type: "profile" }
  | { type: "notifications" }
  | { type: "mission"; id: number }
  | { type: "group"; id: number }
  | { type: "filters"; target: "missions" | "groups" };

const missions = [
  {
    id: 0,
    title: "Take the long way home",
    short: "The long way home",
    category: "WANDER",
    time: "5:30 PM",
    duration: "45 minutes",
    location: "Japan House gardens",
    count: 4,
    nuts: 50,
    image: "/design-assets/campus.jpg",
    people: ["JL", "AM", "SK", "RD"],
  },
  {
    id: 1,
    title: "A table for six",
    short: "A table for six",
    category: "CONNECT",
    time: "7:00 PM",
    duration: "1 hour",
    location: "Campustown",
    count: 3,
    nuts: 75,
    image: "/design-assets/social.jpg",
    people: ["ML", "TK", "AS"],
  },
  {
    id: 2,
    title: "Find your next favorite",
    short: "A book worth sharing",
    category: "DISCOVER",
    time: "Tomorrow · 4 PM",
    duration: "30 minutes",
    location: "Main Library",
    count: 2,
    nuts: 40,
    image: "/design-assets/campus.jpg",
    people: ["EC", "JN"],
  },
];

const groups = [
  {
    name: "The in-between club",
    initials: "IC",
    members: 4,
    category: "Outdoors",
    next: "The long way home · Today, 5:30 PM",
    mission: 0,
  },
  {
    name: "Good company",
    initials: "GC",
    members: 3,
    category: "Social",
    next: "A table for six · Today, 7 PM",
    mission: 1,
  },
  {
    name: "Outside the syllabus",
    initials: "OS",
    members: 4,
    category: "Arts",
    next: "A book worth sharing · Tomorrow, 4 PM",
    mission: 2,
  },
];

const chats = [
  {
    name: "The in-between club",
    initials: "IC",
    preview: "Julia: Meet by the garden entrance?",
    time: "4m",
    members: ["Maya Chen", "Julia Lee", "Alex Morgan", "Sam Kim"],
    messages: [
      "Hey everyone! Looking forward to the walk later.",
      "Meet by the garden entrance? I’ll be there at 5:25.",
    ],
  },
  {
    name: "Good company",
    initials: "GC",
    preview: "That sounds like a perfect Monday.",
    time: "18m",
    members: ["Maya Chen", "Theo Kim", "Avery Shah"],
    messages: [
      "Thanks for the coffee invite!",
      "That sounds like a perfect Monday.",
    ],
  },
  {
    name: "Outside the syllabus",
    initials: "OS",
    preview: "Eli: Bringing my favorite Joan Didion.",
    time: "1h",
    members: ["Maya Chen", "Eli Carter", "Jamie Nguyen", "Nora Patel"],
    messages: [
      "What’s everyone reading this week?",
      "Bringing my favorite Joan Didion.",
    ],
  },
];

function AvatarStack({
  people,
  extra = 0,
}: {
  people: string[];
  extra?: number;
}) {
  return (
    <span
      className={styles.avatarStack}
      aria-label={`${people.length + extra} people`}
    >
      {people.slice(0, 3).map((person, index) => (
        <span key={person} className={styles.miniAvatar} data-shade={index}>
          {person}
        </span>
      ))}
      {people.length > 3 || extra > 0 ? (
        <span className={styles.avatarMore}>+{people.length - 3 + extra}</span>
      ) : null}
    </span>
  );
}

export function IOSConcepts() {
  const [mode, setMode] = useState<PreviewMode>("app");
  const [device, setDevice] = useState("16");
  const [signupCount, setSignupCount] = useState(0);
  const [profile, setProfile] = useState<PreviewProfile>({
    name: "Julian Park",
    handle: "julianpark",
    interests: ["Outdoors", "Books", "Coffee"],
  });

  return (
    <section className={styles.preview} aria-label="Chambana iOS concept">
      <header className={styles.previewHeader}>
        <a href="/" className={styles.previewBrand}>
          chambana.
        </a>

        <div className={styles.previewLinks}>
          <a href="/design-preview?view=desktop">Desktop preview <ArrowUpRight size={13} aria-hidden="true" /></a>
          <span className={styles.privateLabel}>LOCAL DEMO</span>
        </div>
      </header>
      <div className={styles.previewControls}>
        <div className={styles.modeSwitch} aria-label="Preview screen">
          <button
            type="button"
            aria-pressed={mode === "app"}
            onClick={() => setMode("app")}
          >
            App
          </button>
          <button
            type="button"
            aria-pressed={mode === "signup"}
            onClick={() => setMode("signup")}
          >
            Sign up
          </button>
        </div>
        <label className={styles.deviceSelect}>
          <span className={styles.srOnly}>iPhone model</span>
          <select
            aria-label="iPhone model"
            value={device}
            onChange={(event) => setDevice(event.target.value)}
          >
            <option value="15">iPhone 15 · 393 × 852</option>
            <option value="16">iPhone 16 · 393 × 852</option>
            <option value="17">iPhone 17 · 402 × 874</option>
          </select>
        </label>
        <span className={styles.mobileDemo}>LOCAL DEMO</span>
      </div>
      <AppPhone
        key={signupCount}
        mode={mode}
        device={device}
        profile={profile}
        isNewProfile={signupCount > 0}
        onBack={() => setMode("app")}
        onComplete={(next) => {
          setProfile(next);
          setSignupCount((count) => count + 1);
          setMode("app");
        }}
      />
      <footer className={styles.previewFooter}>
        Prototype only. No accounts, messages, or reservations are created.
      </footer>
    </section>
  );
}

function AppPhone({
  mode,
  device,
  profile,
  isNewProfile,
  onBack,
  onComplete,
}: {
  mode: PreviewMode;
  device: string;
  profile: PreviewProfile;
  isNewProfile: boolean;
  onBack: () => void;
  onComplete: (profile: PreviewProfile) => void;
}) {
  const [tab, setTab] = useState<Tab>("Home");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const [joined, setJoined] = useState<number[]>([]);
  const [joinedGroups, setJoinedGroups] = useState<number[]>(
    isNewProfile ? [] : [0],
  );
  const [notificationsRead, setNotificationsRead] = useState(isNewProfile);
  const [missionFilters, setMissionFilters] = useState<string[]>([]);
  const [conversation, setConversation] = useState<number | null>(null);
  const [sentMessages, setSentMessages] = useState<Record<number, string[]>>(
    {},
  );
  const [toast, setToast] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);
  const uid = useId();
  const [groupSearch, setGroupSearch] = useState("");
  const [groupFilters, setGroupFilters] = useState<string[]>([]);
  const groupCategories = groupFilters.filter((value) => value !== "Joined");
  const filteredMissions = missions.filter(
    (mission) =>
      missionFilters.length === 0 ||
      (missionFilters.includes("Saved") && saved.includes(mission.id)) ||
      (missionFilters.includes("Joined") && joined.includes(mission.id)),
  );
  const initials = profile.name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const filteredGroups = groups
    .map((group, id) => ({ ...group, id }))
    .filter(
      (group) =>
        (groupCategories.length === 0 ||
          groupCategories.includes(group.category)) &&
        (!groupFilters.includes("Joined") || joinedGroups.includes(group.id)) &&
        `${group.name} ${group.category}`
          .toLowerCase()
          .includes(groupSearch.trim().toLowerCase()),
    );
  const resetGroups = () => {
    setGroupSearch("");
    setGroupFilters([]);
  };

  const hasSheet = sheet !== null && mode === "app";

  useEffect(() => {
    if (!hasSheet) return;
    lastTrigger.current = document.activeElement as HTMLElement;
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSheet(null);
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!dialogRef.current?.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (lastTrigger.current?.getClientRects().length) {
        lastTrigger.current.focus({ preventScroll: true });
      }
    };
  }, [hasSheet]);

  useEffect(() => {
    if (hasSheet) {
      dialogRef.current?.scrollTo({ top: 0 });
      closeRef.current?.focus({ preventScroll: true });
    }
  }, [sheet, hasSheet]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const switchTab = (next: Tab) => {
    setConversation(null);
    setTab(next);
    scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
  };
  const toggleSave = (id: number) => {
    const isSaved = saved.includes(id);
    setSaved((current) =>
      isSaved ? current.filter((value) => value !== id) : [...current, id],
    );
    setToast(
      isSaved ? "Removed from saved missions" : "Added to your saved missions",
    );
  };
  const toggleJoin = (id: number) => {
    setJoined((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  };
  const openMission = (id: number) => setSheet({ type: "mission", id });
  const openConversation = (id: number) => {
    setSheet(null);
    setConversation(id);
    setTab("Inbox");
  };
  const toggleFilter = (value: string, target: "missions" | "groups") => {
    const update = target === "missions" ? setMissionFilters : setGroupFilters;
    update((current) =>
      value === "All"
        ? []
        : current.includes(value)
          ? current.filter((item) => item !== value)
          : [...current, value],
    );
  };
  const primaryId = 0;

  function MissionRow({ id }: { id: number }) {
    const mission = missions[id];
    return (
      <button
        type="button"
        className={styles.missionRow}
        onClick={() => openMission(id)}
      >
        <span className={styles.rowIcon}>
          {id === 0 ? (
            <Compass size={19} />
          ) : id === 1 ? (
            <Users size={19} />
          ) : (
            <Bookmark size={19} />
          )}
        </span>
        <span>
          <strong>{mission.short}</strong>
          <small>
            {mission.location} <span>·</span> {mission.time}
          </small>
        </span>
        <span className={styles.rowReward}>
          +{mission.nuts}
          <small>nuts</small>
        </span>
      </button>
    );
  }

  function MissionCard({ id }: { id: number }) {
    const mission = missions[id];
    return (
      <div className={styles.listCard}>
        <button
          type="button"
          onClick={() => openMission(id)}
          className={styles.listCardMain}
        >
          <img
            src={mission.image}
            alt={
              id === 1
                ? "Friends talking around a cafe table"
                : "A tree and bench by the Japan House garden pond"
            }
          />
          <span className={styles.listCardText}>
            <small>
              {mission.category} / {mission.nuts} NUTS
            </small>
            <strong>{mission.title}</strong>
            <span>
              {mission.location} · {mission.time}
            </span>
          </span>
          <ArrowUpRight size={18} />
        </button>
        <div className={styles.listCardBottom}>
          <span>
            {joined.includes(id) ? (
              <>
                <Check size={13} /> You’re in · {mission.count + 1} of 6
              </>
            ) : (
              `${mission.count} of 6 going`
            )}
          </span>
          <button
            type="button"
            aria-label={`${saved.includes(id) ? "Unsave" : "Save"} ${mission.title}`}
            aria-pressed={saved.includes(id)}
            onClick={() => toggleSave(id)}
          >
            <Bookmark
              size={16}
              fill={saved.includes(id) ? "currentColor" : "none"}
            />
          </button>
        </div>
      </div>
    );
  }

  const home = (
    <>
      <div className={styles.homeIntro}>
        <p className={styles.eyebrow}>MONDAY, OCTOBER 12</p>
        <h2>Let’s go explore.</h2>
      </div>
      <div className={styles.featureLabel}>
        <span>TODAY’S MISSION</span>
        <span>01 / 03</span>
      </div>
      <div className={styles.homeFeature}>
        <button
          type="button"
          className={styles.featureImageButton}
          onClick={() => openMission(0)}
          aria-label="Explore Take the long way home"
        >
          <img
            src="/design-assets/campus.jpg"
            alt="Tree and bench by the Japan House garden pond in black and white"
          />
          <span className={styles.imagePill}>
            <MapPin size={11} /> JAPAN HOUSE
          </span>
          <span className={styles.imageArrow}>
            <ArrowUpRight size={19} />
          </span>
        </button>
        <div className={styles.homeFeatureBody}>
          <div className={styles.metaLine}>
            <span>TODAY · 5:30 PM</span>
            <span>+50 NUTS</span>
          </div>
          <button
            type="button"
            className={styles.titleButton}
            onClick={() => openMission(0)}
          >
            <h3>
              Take the long
              <br />
              way home.
            </h3>
          </button>
          <div className={styles.featureBottom}>
            <AvatarStack
              people={missions[0].people}
              extra={joined.includes(0) ? 1 : 0}
            />
            <button
              type="button"
              className={styles.textButton}
              onClick={() => openMission(0)}
            >
              {joined.includes(0) ? "Joined" : "View mission"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
      <div className={styles.sectionHeading}>
        <h3>A little later</h3>
        <button type="button" onClick={() => switchTab("Missions")}>
          View all <ArrowUpRight size={14} />
        </button>
      </div>
      <MissionRow id={1} />
    </>
  );

  return (
    <div className={styles.phone} data-concept="chambana" data-device={device}>
      <div className={styles.statusBar} aria-hidden="true">
        <span>9:41</span>
        <i />
        <span>
          <Signal size={14} fill="currentColor" />
          <Wifi size={14} />
          <BatteryFull size={20} />
        </span>
      </div>
      <div className={styles.signupPane} hidden={mode !== "signup"}>
        <SignupFlow
          active={mode === "signup"}
          onBack={onBack}
          onComplete={onComplete}
        />
      </div>
      <div
        className={styles.appPane}
        hidden={mode !== "app" || conversation !== null}
        inert={hasSheet}
      >
        <header className={styles.appHeader}>
          <button
            type="button"
            className={styles.profileButton}
            aria-label="Open your profile"
            onClick={() => setSheet({ type: "profile" })}
          >
            {initials}
          </button>
          <span className={styles.appBrand}>
            chambana<span className={styles.brandPeriod}>.</span>
          </span>
          <button
            type="button"
            className={styles.notificationButton}
            aria-label={`Open notifications${notificationsRead ? "" : ", 2 unread"}`}
            onClick={() => setSheet({ type: "notifications" })}
          >
            <Bell size={19} strokeWidth={1.6} />
            {!notificationsRead && <span />}
          </button>
        </header>
        <div
          ref={scrollRef}
          className={styles.appScroll}
          role="tabpanel"
          id={`${uid}-panel`}
          aria-labelledby={`${uid}-${tab}-tab`}
        >
          {tab === "Home" && home}
          {tab === "Missions" && (
            <div className={styles.secondaryScreen}>
              <div className={styles.filterToolbar}>
                <button
                  type="button"
                  className={styles.filterTrigger}
                  onClick={() =>
                    setSheet({ type: "filters", target: "missions" })
                  }
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal size={16} /> Filters
                  {missionFilters.length > 0 && (
                    <span>{missionFilters.length}</span>
                  )}
                </button>
                <span aria-live="polite">
                  {filteredMissions.length}{" "}
                  {filteredMissions.length === 1 ? "mission" : "missions"}
                </span>
              </div>
              <div className={styles.missionList}>
                {filteredMissions.map((mission) => (
                  <MissionCard key={mission.id} id={mission.id} />
                ))}
              </div>
              {filteredMissions.length === 0 && (
                <div className={styles.emptyState}>
                  <Compass size={35} strokeWidth={1} />
                  <h3>No matching missions</h3>
                  <button
                    type="button"
                    className={styles.primaryButton}
                    onClick={() => setMissionFilters([])}
                  >
                    Show all missions <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
          {tab === "Groups" && (
            <div className={styles.secondaryScreen}>
              <label className={styles.groupSearch}>
                <Search size={17} aria-hidden="true" />
                <span className={styles.srOnly}>Search groups</span>
                <input
                  type="search"
                  placeholder="Search groups"
                  value={groupSearch}
                  onChange={(event) => setGroupSearch(event.target.value)}
                />
              </label>
              <div className={styles.filterToolbar}>
                <button
                  type="button"
                  className={styles.filterTrigger}
                  onClick={() =>
                    setSheet({ type: "filters", target: "groups" })
                  }
                  aria-haspopup="dialog"
                >
                  <SlidersHorizontal size={16} /> Filters
                  {groupFilters.length > 0 && (
                    <span>{groupFilters.length}</span>
                  )}
                </button>
                <span aria-live="polite">
                  {filteredGroups.length}{" "}
                  {filteredGroups.length === 1 ? "group" : "groups"}
                </span>
              </div>
              <div className={styles.groupList}>
                {filteredGroups.map(({ id, ...group }) => (
                  <button
                    type="button"
                    className={styles.groupCard}
                    key={group.name}
                    onClick={() => setSheet({ type: "group", id })}
                  >
                    <span className={styles.groupTop}>
                      <span className={styles.groupAvatar}>
                        {group.initials}
                      </span>
                      <span className={styles.groupBadge}>
                        {joinedGroups.includes(id) ? (
                          <>
                            <Check size={11} /> Joined
                          </>
                        ) : (
                          `${group.members} members`
                        )}
                      </span>
                    </span>
                    <strong>{group.name}</strong>
                    <span className={styles.groupCategory}>
                      {group.category}
                    </span>
                    <span className={styles.groupNext}>
                      NEXT UP <ArrowUpRight size={14} />
                      <span>{group.next}</span>
                    </span>
                  </button>
                ))}
              </div>
              {filteredGroups.length === 0 && (
                <div className={styles.emptyState}>
                  <h3>No groups found</h3>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetGroups}
                  >
                    Reset filters <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
          {tab === "Inbox" && (
            <div className={styles.secondaryScreen}>
              {chats.map((chat, id) => (
                <button
                  type="button"
                  key={chat.name}
                  className={styles.chatRow}
                  onClick={() => openConversation(id)}
                >
                  <span className={styles.chatAvatar}>{chat.initials}</span>
                  <span>
                    <strong>{chat.name}</strong>
                    <small>
                      {sentMessages[id]?.length
                        ? `You: ${sentMessages[id].at(-1)}`
                        : chat.preview}
                    </small>
                  </span>
                  <span className={styles.chatTime}>
                    {sentMessages[id]?.length ? "Now" : chat.time}
                    <ChevronRight size={14} />
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {toast && (
          <div className={styles.toast} role="status">
            <Check size={14} />
            {toast}
          </div>
        )}
        <nav
          className={styles.glassNav}
          aria-label="Chambana main navigation"
          role="tablist"
        >
          {(
            [
              { name: "Home", Icon: Home },
              { name: "Missions", Icon: Compass },
              { name: "Groups", Icon: Users },
              { name: "Inbox", Icon: MessageCircle },
            ] as const
          ).map(({ name, Icon }) => (
            <button
              type="button"
              role="tab"
              tabIndex={tab === name ? 0 : -1}
              aria-selected={tab === name}
              aria-controls={`${uid}-panel`}
              id={`${uid}-${name}-tab`}
              key={name}
              onClick={() => switchTab(name)}
              onKeyDown={(event) => {
                const tabs: Tab[] = ["Home", "Missions", "Groups", "Inbox"];
                const offset =
                  event.key === "ArrowRight"
                    ? 1
                    : event.key === "ArrowLeft"
                      ? -1
                      : 0;
                if (!offset && event.key !== "Home" && event.key !== "End")
                  return;
                event.preventDefault();
                const next =
                  event.key === "Home"
                    ? "Home"
                    : event.key === "End"
                      ? "Inbox"
                      : tabs[
                          (tabs.indexOf(name) + offset + tabs.length) %
                            tabs.length
                        ];
                switchTab(next);
                document.getElementById(`${uid}-${next}-tab`)?.focus();
              }}
            >
              <Icon
                size={20}
                strokeWidth={tab === name ? 2 : 1.55}
                fill={tab === name && name === "Home" ? "currentColor" : "none"}
              />
              <span>{name}</span>
            </button>
          ))}
        </nav>
      </div>
      {mode === "app" && conversation !== null && (
        <div className={styles.conversationPane}>
          <IOSConversation
            key={conversation}
            conversation={{
              ...chats[conversation],
              messages: chats[conversation].messages.map((text, index) => ({
                name:
                  index === 0
                    ? "Maya"
                    : conversation === 0
                      ? "Julia"
                      : conversation === 2
                        ? "Eli"
                        : "Maya",
                text,
              })),
              members: [
                ...chats[conversation].members.map((name) => ({
                  name,
                  initials: name
                    .split(" ")
                    .map((part) => part[0])
                    .join(""),
                })),
                ...(joinedGroups.includes(conversation)
                  ? [{ name: `${profile.name} (you)`, initials }]
                  : []),
              ],
            }}
            sentMessages={sentMessages[conversation] ?? []}
            onSend={(text) =>
              setSentMessages((current) => ({
                ...current,
                [conversation]: [...(current[conversation] ?? []), text],
              }))
            }
            onBack={() => {
              setConversation(null);
              requestAnimationFrame(() =>
                document.getElementById(`${uid}-Inbox-tab`)?.focus(),
              );
            }}
          />
        </div>
      )}
      <div className={styles.homeIndicator} aria-hidden="true" />
      {hasSheet && (
        <div
          className={styles.sheetBackdrop}
          onClick={(event) => {
            if (event.target === event.currentTarget) setSheet(null);
          }}
        >
          <div
            ref={dialogRef}
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${uid}-sheet-title`}
          >
            <div className={styles.sheetHandle} />
            <button
              type="button"
              ref={closeRef}
              className={styles.closeSheet}
              aria-label="Close dialog"
              onClick={() => setSheet(null)}
            >
              <X size={20} />
            </button>
            {sheet?.type === "profile" && (
              <div className={styles.sheetBody}>
                <div className={styles.largeAvatar}>{initials}</div>
                <h2 id={`${uid}-sheet-title`}>{profile.name}</h2>
                <p className={styles.profileMeta}>@{profile.handle}</p>
                <div className={styles.profileStats}>
                  <span>
                    <strong>{isNewProfile ? 0 : 340}</strong>NUTS
                  </span>
                  <span>
                    <strong>{isNewProfile ? 0 : 6}</strong>MISSIONS
                  </span>
                  <span>
                    <strong>{joinedGroups.length}</strong>
                    GROUPS
                  </span>
                </div>
                <div className={styles.profileInterests}>
                  {profile.interests.map((interest) => (
                    <span key={interest}>{interest}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className={styles.sheetRow}
                  onClick={() => {
                    setMissionFilters(["Saved"]);
                    switchTab("Missions");
                    setSheet(null);
                  }}
                >
                  <Bookmark size={18} />
                  <span>Saved missions</span>
                  <small>{saved.length}</small>
                  <ChevronRight size={16} />
                </button>
                <button
                  type="button"
                  className={styles.sheetRow}
                  onClick={() => {
                    setGroupFilters(["Joined"]);
                    setGroupSearch("");
                    switchTab("Groups");
                    setSheet(null);
                  }}
                >
                  <Users size={18} />
                  <span>Your groups</span>
                  <small>{joinedGroups.length}</small>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
            {sheet?.type === "notifications" && (
              <div className={styles.sheetBody}>
                <h2 id={`${uid}-sheet-title`}>Notifications</h2>
                <div className={styles.notificationSummary}>
                  <span>
                    {notificationsRead
                      ? "You’re all caught up"
                      : "2 unread notifications"}
                  </span>
                  <button
                    type="button"
                    disabled={notificationsRead}
                    onClick={() => setNotificationsRead(true)}
                  >
                    {notificationsRead ? (
                      <>
                        <Check size={14} /> All read
                      </>
                    ) : (
                      "Mark all read"
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.notificationItem}
                  onClick={() => {
                    setNotificationsRead(true);
                    openMission(primaryId);
                  }}
                >
                  <span className={styles.notificationIcon}>
                    <Compass size={21} />
                  </span>
                  <span>
                    <strong>{missions[primaryId].title}</strong>
                    <small>10 MINUTES AGO</small>
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.notificationItem}
                  onClick={() => {
                    setNotificationsRead(true);
                    setSheet({ type: "group", id: 0 });
                  }}
                >
                  <span className={styles.notificationIcon}>
                    <Users size={21} />
                  </span>
                  <span>
                    <strong>Joined The in-between club</strong>
                    <small>1 HOUR AGO</small>
                  </span>
                </button>
              </div>
            )}
            {sheet?.type === "mission" &&
              (() => {
                const mission = missions[sheet.id];
                const isJoined = joined.includes(sheet.id);
                return (
                  <>
                    <div className={styles.sheetHero}>
                      <img
                        src={mission.image}
                        alt={
                          sheet.id === 1
                            ? "Friends sharing a conversation at a cafe"
                            : "The pond and trees in the Japan House gardens"
                        }
                      />
                      <span>
                        {mission.category} / +{mission.nuts} NUTS
                      </span>
                    </div>
                    <div className={styles.sheetBody}>
                      <h2 id={`${uid}-sheet-title`}>{mission.title}.</h2>
                      <div className={styles.missionFacts}>
                        <span>
                          <MapPin size={15} />
                          {mission.location}
                        </span>
                        <span>
                          <Clock3 size={15} />
                          {mission.time}
                        </span>
                        <span>
                          <Users size={15} />
                          {mission.count + (isJoined ? 1 : 0)} of 6 going
                        </span>
                      </div>
                      <div className={styles.missionCompany}>
                        <AvatarStack
                          people={mission.people}
                          extra={isJoined ? 1 : 0}
                        />
                        <span>{mission.duration}</span>
                      </div>
                      {isJoined && (
                        <div className={styles.joinConfirmation} role="status">
                          <Check size={18} />
                          <span>Joined</span>
                        </div>
                      )}
                      <div className={styles.missionActions}>
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => toggleJoin(mission.id)}
                        >
                          {isJoined ? "Leave mission" : "Join mission"}
                          {isJoined ? (
                            <X size={16} />
                          ) : (
                            <ArrowRight size={17} />
                          )}
                        </button>
                        <button
                          type="button"
                          className={styles.saveAction}
                          aria-pressed={saved.includes(mission.id)}
                          aria-label={`${saved.includes(mission.id) ? "Unsave" : "Save"} ${mission.title}`}
                          onClick={() => toggleSave(mission.id)}
                        >
                          <Bookmark
                            size={19}
                            fill={
                              saved.includes(mission.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            {sheet?.type === "group" &&
              (() => {
                const group = groups[sheet.id];
                const isJoined = joinedGroups.includes(sheet.id);
                const id = sheet.id;
                return (
                  <div className={styles.sheetBody}>
                    <div className={styles.largeAvatar}>{group.initials}</div>
                    <h2 id={`${uid}-sheet-title`}>{group.name}</h2>
                    <span className={styles.groupCategory}>
                      {group.category}
                    </span>
                    <div className={styles.groupSheetMeta}>
                      <Users size={17} />
                      {group.members + (isJoined ? 1 : 0)} members · UIUC
                    </div>
                    <h3 className={styles.sheetSubheading}>Next mission</h3>
                    <button
                      type="button"
                      className={styles.groupPlan}
                      onClick={() => openMission(group.mission)}
                    >
                      <Compass size={21} />
                      <span>
                        <strong>{missions[group.mission].short}</strong>
                        <small>
                          {missions[group.mission].location} ·{" "}
                          {missions[group.mission].time}
                        </small>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() =>
                        setJoinedGroups((current) =>
                          current.includes(id)
                            ? current.filter((value) => value !== id)
                            : [...current, id],
                        )
                      }
                    >
                      {isJoined ? "Leave group" : "Join group"}
                      {isJoined ? <Check size={17} /> : <Plus size={17} />}
                    </button>
                    {isJoined && (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => openConversation(id)}
                      >
                        Open conversation <MessageCircle size={17} />
                      </button>
                    )}
                  </div>
                );
              })()}
            {sheet?.type === "filters" &&
              (() => {
                const selected =
                  sheet.target === "groups" ? groupFilters : missionFilters;
                const options =
                  sheet.target === "groups"
                    ? ["All", "Outdoors", "Social", "Arts", "Joined"]
                    : ["All", "Saved", "Joined"];
                const count =
                  sheet.target === "groups"
                    ? filteredGroups.length
                    : filteredMissions.length;
                return (
                  <div className={`${styles.sheetBody} ${styles.filterSheet}`}>
                    <h2 id={`${uid}-sheet-title`}>Filters</h2>
                    <p className={styles.filterHint}>
                      Choose as many as you like.
                    </p>
                    <div className={styles.filterOptions}>
                      {options.map((option) => {
                        const checked =
                          option === "All"
                            ? selected.length === 0
                            : selected.includes(option);
                        return (
                          <button
                            type="button"
                            key={option}
                            aria-pressed={checked}
                            onClick={() => toggleFilter(option, sheet.target)}
                          >
                            <span>{option}</span>
                            <span className={styles.filterCheck}>
                              {checked && <Check size={15} />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className={styles.primaryButton}
                      onClick={() => setSheet(null)}
                    >
                      Show {count}{" "}
                      {sheet.target === "groups"
                        ? count === 1
                          ? "group"
                          : "groups"
                        : count === 1
                          ? "mission"
                          : "missions"}
                      <ArrowRight size={17} />
                    </button>
                  </div>
                );
              })()}
          </div>
        </div>
      )}
    </div>
  );
}
