"use client";

import {
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  MessageCircle,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import {
  DESKTOP_CHAT_SAMPLES,
  desktopConversationPreview,
  filterDesktopConversations,
  type DesktopInboxGroup,
} from "@/lib/desktop-inbox";
import styles from "./desktop-inbox.module.css";

type Props = {
  groups: DesktopInboxGroup[];
  selectedId: number | null;
  query: string;
  unreadOnly: boolean;
  unreadIds: number[];
  sentMessages: Record<number, string[]>;
  drafts: Record<number, string>;
  onQueryChange: (query: string) => void;
  onUnreadOnlyChange: (value: boolean) => void;
  onSelect: (id: number | null) => void;
  onDraftChange: (id: number, text: string) => void;
  onSend: (id: number, text: string) => void;
  onJoinGroup: (id: number) => void;
};

function initials(name: string) {
  return name
    .replace(/ \(you\)$/, "")
    .split(" ")
    .map((part) => part[0])
    .join("");
}

export function DesktopInbox({
  groups,
  selectedId,
  query,
  unreadOnly,
  unreadIds,
  sentMessages,
  drafts,
  onQueryChange,
  onUnreadOnlyChange,
  onSelect,
  onDraftChange,
  onSend,
  onJoinGroup,
}: Props) {
  const [showMembers, setShowMembers] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const membersRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const previousSelection = useRef(selectedId);
  const previousMembers = useRef(false);
  const lastOpened = useRef<number | null>(selectedId);
  const rowRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const titleId = useId();
  const composerId = useId();
  const selected = groups.find((group) => group.id === selectedId);
  const sample = selected ? DESKTOP_CHAT_SAMPLES[selected.id] : undefined;
  const sent = selected ? (sentMessages[selected.id] ?? []) : [];
  const draft = selected ? (drafts[selected.id] ?? "") : "";
  const isMember = selected?.members.includes("Julian Park (you)") ?? false;
  const previousMembership = useRef({ id: selectedId, isMember });
  const filtered = filterDesktopConversations(
    groups,
    query,
    unreadOnly,
    unreadIds,
    sentMessages,
  );
  const unreadCount = groups.filter((group) =>
    unreadIds.includes(group.id),
  ).length;

  useEffect(() => {
    if (previousSelection.current === selectedId) return;
    previousSelection.current = selectedId;
    setShowMembers(false);
    previousMembers.current = false;
    if (selectedId !== null) {
      headingRef.current?.focus({ preventScroll: true });
    } else {
      const row =
        lastOpened.current !== null
          ? rowRefs.current[lastOpened.current]
          : null;
      (row ?? searchRef.current)?.focus({ preventScroll: true });
    }
  }, [selectedId]);

  useEffect(() => {
    if (showMembers) headingRef.current?.focus({ preventScroll: true });
    else if (previousMembers.current)
      membersRef.current?.focus({ preventScroll: true });
    previousMembers.current = showMembers;
  }, [showMembers]);

  useEffect(() => {
    if (
      previousMembership.current.id === selectedId &&
      !previousMembership.current.isMember &&
      isMember
    ) {
      composerRef.current?.focus({ preventScroll: true });
    }
    previousMembership.current = { id: selectedId, isMember };
  }, [isMember, selectedId]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [selectedId, sent.length, showMembers]);

  function reset() {
    onQueryChange("");
    onUnreadOnlyChange(false);
    searchRef.current?.focus();
  }

  function send() {
    const text = draft.trim();
    if (!selected || !isMember || !text || text.length > 1000) return;
    onSend(selected.id, text);
    composerRef.current?.focus();
  }

  function back() {
    if (showMembers) setShowMembers(false);
    else onSelect(null);
  }

  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <h1 id="desktop-preview-title" tabIndex={-1}>
          Inbox.
        </h1>
        <span className={styles.summary} role="status">
          {unreadCount
            ? `${unreadCount} unread ${unreadCount === 1 ? "conversation" : "conversations"}`
            : "You’re all caught up"}
        </span>
      </div>

      <div
        className={styles.workspace}
        data-conversation={selected ? "open" : "closed"}
      >
        <aside className={styles.sidebar} aria-label="Conversations">
          <div className={styles.listControls}>
            <div className={styles.search}>
              <Search size={17} strokeWidth={1.5} aria-hidden="true" />
              <label className={styles.srOnly} htmlFor="desktop-inbox-search">
                Search conversations
              </label>
              <input
                id="desktop-inbox-search"
                ref={searchRef}
                type="search"
                placeholder="Search conversations"
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
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
            <div
              className={styles.filters}
              role="group"
              aria-label="Conversation filters"
            >
              <button
                type="button"
                aria-pressed={!unreadOnly}
                onClick={() => onUnreadOnlyChange(false)}
              >
                All <span>{groups.length}</span>
              </button>
              <button
                type="button"
                aria-pressed={unreadOnly}
                onClick={() => onUnreadOnlyChange(true)}
              >
                Unread <span>{unreadCount}</span>
              </button>
            </div>
          </div>
          <div className={styles.list}>
            {filtered.length ? (
              filtered.map((group) => {
                const unread = unreadIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    ref={(element) => {
                      rowRefs.current[group.id] = element;
                    }}
                    type="button"
                    className={styles.chatRow}
                    aria-current={group.id === selectedId ? "true" : undefined}
                    aria-label={`Open ${group.name}${unread ? ", unread" : ""}`}
                    onClick={() => {
                      lastOpened.current = group.id;
                      onSelect(group.id);
                    }}
                  >
                    <span className={styles.avatar} aria-hidden="true">
                      {group.initials}
                    </span>
                    <span className={styles.rowText}>
                      <strong>{group.name}</strong>
                      <small>
                        {desktopConversationPreview(group.id, sentMessages)}
                      </small>
                    </span>
                    <span className={styles.rowMeta} aria-hidden="true">
                      <span>
                        {sentMessages[group.id]?.length
                          ? "Now"
                          : DESKTOP_CHAT_SAMPLES[group.id]?.time}
                      </span>
                      {unread ? (
                        <i className={styles.unreadDot} />
                      ) : (
                        <ChevronRight size={13} strokeWidth={1.4} />
                      )}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className={styles.emptyList}>
                {unreadOnly && !query.trim() ? (
                  <Check size={23} strokeWidth={1.3} aria-hidden="true" />
                ) : (
                  <Search size={23} strokeWidth={1.3} aria-hidden="true" />
                )}
                <h2>
                  {unreadOnly && !query.trim()
                    ? "All caught up."
                    : "No conversations found."}
                </h2>
                <p>
                  {unreadOnly && !query.trim()
                    ? "You’ve read every conversation."
                    : "Try a group, person, or recent message."}
                </p>
                <button type="button" onClick={reset}>
                  Show all conversations{" "}
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          <p className={styles.listNote} role="status">
            {filtered.length}{" "}
            {filtered.length === 1 ? "conversation" : "conversations"}
          </p>
        </aside>

        <section
          className={styles.conversation}
          aria-labelledby={selected ? titleId : undefined}
          aria-label={selected ? undefined : "Conversation"}
          onKeyDown={(event) => {
            if (
              selected &&
              event.key === "Escape" &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              event.stopPropagation();
              back();
            }
          }}
        >
          {selected ? (
            <>
              <header className={styles.conversationHeader}>
                <button
                  type="button"
                  className={`${styles.backButton} ${showMembers ? styles.membersBack : styles.conversationBack}`}
                  aria-label={
                    showMembers ? "Back to conversation" : "Back to inbox"
                  }
                  onClick={back}
                >
                  <ArrowLeft size={19} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <span className={styles.headerAvatar} aria-hidden="true">
                  {selected.initials}
                </span>
                <div className={styles.conversationHeading}>
                  <h2 id={titleId} ref={headingRef} tabIndex={-1}>
                    {showMembers ? "Members" : selected.name}
                  </h2>
                  {showMembers ? (
                    <p>{selected.name}</p>
                  ) : (
                    <button
                      ref={membersRef}
                      type="button"
                      className={styles.membersButton}
                      onClick={() => setShowMembers(true)}
                      aria-label={`View ${selected.members.length} members`}
                    >
                      {selected.members.length} members{" "}
                      <ChevronRight size={12} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {!showMembers && (
                  <span className={styles.groupLabel}>
                    <Users size={14} strokeWidth={1.5} aria-hidden="true" />{" "}
                    Group
                  </span>
                )}
              </header>
              {showMembers ? (
                <div className={styles.membersPage}>
                  <p className={styles.memberCount}>
                    {selected.members.length} people in this conversation
                  </p>
                  <ul className={styles.memberList}>
                    {selected.members.map((name) => (
                      <li key={name}>
                        <span
                          className={styles.memberAvatar}
                          aria-hidden="true"
                        >
                          {initials(name)}
                        </span>
                        <span>{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <>
                  <div
                    ref={logRef}
                    className={styles.messages}
                    role="log"
                    aria-label={`Messages in ${selected.name}`}
                    aria-live="polite"
                    aria-relevant="additions"
                    tabIndex={0}
                  >
                    <p className={styles.date}>Today</p>
                    {(sample?.messages ?? []).map((message, index) => (
                      <div
                        key={`sample-${selected.id}-${index}`}
                        className={styles.message}
                      >
                        <span
                          className={styles.messageAvatar}
                          aria-hidden="true"
                        >
                          {initials(message.name)}
                        </span>
                        <div className={styles.messageBody}>
                          <p className={styles.sender}>{message.name}</p>
                          <p className={styles.bubble}>{message.text}</p>
                        </div>
                      </div>
                    ))}
                    {sent.map((text, index) => (
                      <div
                        key={`sent-${selected.id}-${index}`}
                        className={`${styles.message} ${styles.outgoing}`}
                      >
                        <div className={styles.messageBody}>
                          <p className={styles.sender}>
                            You <span>· Now</span>
                          </p>
                          <p className={styles.bubble}>{text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {isMember ? (
                    <form
                      className={styles.composer}
                      onSubmit={(event) => {
                        event.preventDefault();
                        send();
                      }}
                    >
                      <div className={styles.composerField}>
                        <label className={styles.srOnly} htmlFor={composerId}>
                          Message {selected.name}
                        </label>
                        <textarea
                          id={composerId}
                          ref={composerRef}
                          value={draft}
                          rows={1}
                          maxLength={1000}
                          placeholder="Write a message…"
                          onChange={(event) =>
                            onDraftChange(selected.id, event.target.value)
                          }
                          onKeyDown={(event) => {
                            if (
                              event.key === "Enter" &&
                              !event.shiftKey &&
                              !event.nativeEvent.isComposing &&
                              event.keyCode !== 229
                            ) {
                              event.preventDefault();
                              send();
                            }
                          }}
                        />
                        <button
                          className={styles.sendButton}
                          type="submit"
                          aria-label="Send message"
                          disabled={!draft.trim() || draft.trim().length > 1000}
                        >
                          <ArrowUp
                            size={19}
                            strokeWidth={1.7}
                            aria-hidden="true"
                          />
                        </button>
                      </div>
                      <div className={styles.composerHint}>
                        <span>
                          Enter to send · Shift + Enter for a new line
                        </span>
                        <span>{draft.length}/1000</span>
                      </div>
                      <p className={styles.previewNote}>
                        Messages are local to this preview.
                      </p>
                    </form>
                  ) : (
                    <div className={styles.joinPrompt}>
                      <p>Join this group to send messages.</p>
                      <button
                        type="button"
                        onClick={() => onJoinGroup(selected.id)}
                      >
                        Join group <ChevronRight size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className={styles.emptyConversation}>
              <span className={styles.emptyIcon}>
                <MessageCircle size={29} strokeWidth={1.2} aria-hidden="true" />
              </span>
              <h2>Choose a conversation.</h2>
              <p>Select a group to read and reply.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
