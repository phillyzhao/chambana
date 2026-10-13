"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { unlockPreview } from "@/app/preview-access-actions";
import styles from "./preview-access-gate.module.css";

export function PreviewAccessGate({ destination }: { destination: string }) {
  const [state, action, pending] = useActionState(unlockPreview, { error: "" });
  return (
    <main className={styles.gate}>
      <Link href="/" className={styles.brand} aria-label="Chambana home">
        chambana.
      </Link>
      <section className={styles.entry} aria-labelledby="access-title">
        <h1 id="access-title">You’re invited.</h1>
        <form action={action}>
          <input type="hidden" name="destination" value={destination} />
          <label className={styles.label} htmlFor="preview-access-code">
            Access code
          </label>
          <div className={styles.field}>
            <input
              id="preview-access-code"
              name="code"
              type="password"
              inputMode="numeric"
              pattern="[0-9]{7}"
              maxLength={7}
              minLength={7}
              placeholder="Enter your code"
              autoComplete="off"
              required
              aria-describedby={state.error ? "access-error" : undefined}
              aria-invalid={Boolean(state.error)}
            />
            <button type="submit" disabled={pending} aria-label="Unlock access">
              <ArrowRight size={20} strokeWidth={1.5} />
            </button>
          </div>
          <p className={styles.error} id="access-error" role="status">
            {pending ? "Opening…" : state.error}
          </p>
        </form>
      </section>
      <Link className={styles.back} href="/">
        <ArrowLeft size={15} strokeWidth={1.5} /> Back home
      </Link>
    </main>
  );
}
