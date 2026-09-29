"use client";

import Link from "next/link";
import { useRef } from "react";
import { SlidersHorizontal } from "lucide-react";

export const groupModes = [
  ["", "All groups"],
  ["open", "Open to everyone"],
  ["organization", "Organizations"],
  ["invite", "Invite only"],
  ["mine", "My groups"],
];

export function GroupFilter({ mode, query }: { mode: string; query: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      className="group-filter"
      ref={menu}
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current) {
          menu.current.open = false;
          menu.current.querySelector("summary")?.focus();
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          event.currentTarget.open = false;
      }}
    >
      <summary className="button secondary">
        <SlidersHorizontal size={16} /> Filter:{" "}
        {groupModes.find(([key]) => key === mode)?.[1]}
      </summary>
      <nav className="dropdown-panel" aria-label="Filter groups">
        {groupModes.map(([key, name]) => (
          <Link
            key={key}
            aria-current={mode === key ? "true" : undefined}
            href={`/groups?mode=${key}&q=${encodeURIComponent(query)}`}
            onClick={() => {
              if (menu.current) menu.current.open = false;
            }}
          >
            {name}
          </Link>
        ))}
      </nav>
    </details>
  );
}
