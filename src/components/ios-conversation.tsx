"use client";

import { ArrowLeft, ArrowUp, ChevronRight } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import styles from "./ios-conversation.module.css";

type Conversation = {
  name: string;
  initials: string;
  messages: { name: string; text: string }[];
  members: { name: string; initials: string }[];
};

export function IOSConversation({
  conversation,
  sentMessages,
  onSend,
  onBack,
}: {
  conversation: Conversation;
  sentMessages: string[];
  onSend: (text: string) => void;
  onBack: () => void;
}) {
  const [showMembers, setShowMembers] = useState(false);
  const [draft, setDraft] = useState("");
  const titleId = useId();
  const composerId = useId();
  const backRef = useRef<HTMLButtonElement>(null);
  const membersRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const previousMembersView = useRef(false);

  useEffect(() => {
    const opener = document.activeElement;
    const firstControl = backRef.current;
    firstControl?.focus({ preventScroll: true });
    return () => {
      if (opener instanceof HTMLElement) {
        requestAnimationFrame(() => {
          if (!firstControl?.isConnected && opener.isConnected) {
            opener.focus({ preventScroll: true });
          }
        });
      }
    };
  }, []);

  useEffect(() => {
    if (showMembers) {
      backRef.current?.focus({ preventScroll: true });
    } else if (previousMembersView.current) {
      membersRef.current?.focus({ preventScroll: true });
    }
    previousMembersView.current = showMembers;
  }, [showMembers]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [conversation.messages.length, sentMessages.length, showMembers]);

  function goBack() {
    if (showMembers) setShowMembers(false);
    else onBack();
  }

  return (
    <section
      className={styles.page}
      aria-labelledby={titleId}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          goBack();
        }
      }}
    >
      <header className={styles.header}>
        <button
          ref={backRef}
          type="button"
          className={styles.back}
          aria-label={showMembers ? "Back to conversation" : "Back to inbox"}
          onClick={goBack}
        >
          <ArrowLeft size={21} strokeWidth={1.6} aria-hidden="true" />
        </button>
        <div className={styles.heading}>
          <h2 id={titleId}>{showMembers ? "Members" : conversation.name}</h2>
          {showMembers ? (
            <p>{conversation.name}</p>
          ) : (
            <button
              ref={membersRef}
              className={styles.membersButton}
              type="button"
              aria-label={`View ${conversation.members.length} members`}
              onClick={() => setShowMembers(true)}
            >
              {conversation.members.length} members
              <ChevronRight size={12} aria-hidden="true" />
            </button>
          )}
        </div>
        <span className={styles.groupAvatar} aria-hidden="true">
          {conversation.initials}
        </span>
      </header>

      {showMembers ? (
        <div className={styles.membersPage}>
          <p className={styles.memberCount}>
            {conversation.members.length} people in this conversation
          </p>
          <ul className={styles.membersList}>
            {conversation.members.map((member, index) => (
              <li key={member.name}>
                <span
                  className={styles.memberAvatar}
                  data-shade={index % 3}
                  aria-hidden="true"
                >
                  {member.initials}
                </span>
                <span>{member.name}</span>
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
            aria-label={`Messages in ${conversation.name}`}
            aria-live="polite"
            aria-relevant="additions"
            tabIndex={0}
          >
            <p className={styles.date}>Today</p>
            {conversation.messages.map((message, index) => (
              <div className={styles.message} key={`${index}-${message.name}`}>
                <span className={styles.sender}>{message.name}</span>
                <p className={styles.bubble}>{message.text}</p>
              </div>
            ))}
            {sentMessages.map((text, index) => (
              <div
                className={`${styles.message} ${styles.sentMessage}`}
                key={`sent-${index}`}
              >
                <span className={styles.sender}>You</span>
                <p className={styles.bubble}>{text}</p>
              </div>
            ))}
          </div>
          <form
            className={styles.composer}
            onSubmit={(event) => {
              event.preventDefault();
              const text = draft.trim();
              if (!text) return;
              onSend(text);
              setDraft("");
              composerRef.current?.focus({ preventScroll: true });
            }}
          >
            <label className={styles.srOnly} htmlFor={composerId}>
              Message {conversation.name}
            </label>
            <input
              ref={composerRef}
              id={composerId}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Message…"
              autoComplete="off"
              enterKeyHint="send"
              maxLength={2000}
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim()}
            >
              <ArrowUp size={21} strokeWidth={1.7} aria-hidden="true" />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
