"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, LoaderCircle } from "lucide-react";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist-actions";
import styles from "./waitlist.module.css";

const initialState: WaitlistState = { status: "idle", message: "" };

export function WaitlistForm() {
  const [state, action, pending] = useActionState(joinWaitlist, initialState);
  const [email, setEmail] = useState("");

  if (state.status === "success") {
    return (
      <div className={styles.success} role="status" aria-live="polite">
        <span className={styles.successIcon}>
          <Check size={21} />
        </span>
        <div>
          <h2>You’re on the list.</h2>
          <p>We’ll be in touch.</p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className={styles.form} aria-busy={pending}>
      <label className={styles.visuallyHidden} htmlFor="waitlist-email">
        Your Illinois email
      </label>
      <div className={styles.entry}>
        <input
          id="waitlist-email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="Your Illinois email"
          required
          maxLength={254}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={state.status === "error"}
          aria-describedby={
            state.status === "error"
              ? "waitlist-error waitlist-note"
              : "waitlist-note"
          }
        />
        <button
          type="submit"
          disabled={pending}
          aria-label={pending ? "Reserving your place" : "Join the waitlist"}
        >
          {pending ? (
            <LoaderCircle className={styles.spinner} size={18} />
          ) : (
            <ArrowRight size={19} />
          )}
        </button>
      </div>
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="waitlist-website">Website</label>
        <input
          id="waitlist-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>
      {state.status === "error" && (
        <p className={styles.error} role="alert" id="waitlist-error">
          {state.message}
        </p>
      )}
      <p className={styles.formNote}>JOIN THE WAITLIST</p>
      <p className={styles.visuallyHidden} id="waitlist-note">
        Chambana by GateMatch will use your email to let you know when Chambana
        opens.
      </p>
    </form>
  );
}
