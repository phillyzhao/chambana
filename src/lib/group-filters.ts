export const groupModes = [
  ["", "All groups"],
  ["open", "Open to everyone"],
  ["organization", "Organizations"],
  ["invite", "Invite only"],
  ["mine", "My groups"],
] as const;

export type GroupMode = Exclude<(typeof groupModes)[number][0], "">;

export function parseGroupModes(
  value: string | string[] | undefined,
): GroupMode[] {
  const values = (Array.isArray(value) ? value : [value || ""]).flatMap(
    (entry) => entry.split(","),
  );
  if (values.includes("all") || values.includes("")) return [];
  return groupModes.flatMap(([key]) =>
    key && values.includes(key) ? [key] : [],
  );
}

export function matchesGroupModes(
  group: { id: string; join_mode: string },
  modes: GroupMode[],
  myGroups: string[],
) {
  return (
    !modes.length ||
    modes.some((mode) =>
      mode === "mine" ? myGroups.includes(group.id) : group.join_mode === mode,
    )
  );
}
