"use client";

import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { groupModes, parseGroupModes } from "@/lib/group-filters";

export function GroupFilter({ mode, query }: { mode: string; query: string }) {
  const menu = useRef<HTMLDetailsElement>(null);
  const [selected, setSelected] = useState(() => parseGroupModes(mode));
  useEffect(() => setSelected(parseGroupModes(mode)), [mode]);
  const applied = parseGroupModes(mode);
  const label = !applied.length
    ? "All groups"
    : groupModes
        .filter(([key]) => key && applied.includes(key))
        .map(([, name]) => name)
        .join(", ");
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
        <SlidersHorizontal size={16} /> Filter: {label}
      </summary>
      <form
        className="dropdown-panel"
        action="/groups"
        aria-label="Filter groups"
      >
        <input type="hidden" name="q" value={query} />
        <input type="hidden" name="mode" value={selected.join(",")} />
        {groupModes.map(([key, name]) => (
          <label className="check-label" key={key}>
            <input
              type="checkbox"
              checked={key ? selected.includes(key) : !selected.length}
              onChange={() =>
                setSelected((current) =>
                  !key
                    ? []
                    : current.includes(key)
                      ? current.filter((mode) => mode !== key)
                      : [...current, key],
                )
              }
            />
            {name}
          </label>
        ))}
        <button className="button small">Apply filters</button>
      </form>
    </details>
  );
}
