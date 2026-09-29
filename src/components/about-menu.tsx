"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronDown } from "lucide-react";

export function AboutMenu() {
  const menu = useRef<HTMLDetailsElement>(null);
  return (
    <details
      ref={menu}
      className="header-menu"
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
      <summary>
        About <ChevronDown size={14} />
      </summary>
      <nav aria-label="About Chambana" className="dropdown-panel">
        {["Team", "Origin", "Mission"].map((name) => (
          <Link
            key={name}
            href={`/about#${name.toLowerCase()}`}
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
