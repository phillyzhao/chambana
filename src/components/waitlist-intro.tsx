import type { CSSProperties } from "react";
import styles from "./waitlist.module.css";

/** A stable, server-rendered heading; motion is purely presentational. */
export function WaitlistIntro() {
  const lines = ["Bringing Chambana", "together."];
  return (
    <h1
      id="waitlist-title"
      className={styles.intro}
      aria-label={lines.join(" ")}
    >
      {lines.map((line, lineIndex) => (
        <span className={styles.introLine} aria-hidden="true" key={line}>
          {Array.from(line).map((character, index) => (
            <span
              className={styles.letter}
              key={index}
              style={
                {
                  "--delay": `${300 + lineIndex * 780 + index * 43}ms`,
                } as CSSProperties
              }
            >
              {character === " " ? "\u00a0" : character}
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}
