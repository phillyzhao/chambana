export type DesktopMissionFilter = "Saved" | "Joined";

export function toggleDesktopMissionFilter(
  current: DesktopMissionFilter[],
  option: "All" | DesktopMissionFilter,
): DesktopMissionFilter[] {
  if (option === "All") return [];
  return current.includes(option)
    ? current.filter((filter) => filter !== option)
    : [...current, option];
}

/** Saved and Joined form a union; text search narrows the resulting missions. */
export function filterDesktopMissions<
  T extends { id: number; title: string; category: string; location: string },
>(
  missions: readonly T[],
  query: string,
  filters: readonly DesktopMissionFilter[],
  saved: readonly number[],
  joined: readonly number[],
): T[] {
  const search = query.trim().toLowerCase();
  return missions.filter(
    (mission) =>
      (!filters.length ||
        (filters.includes("Saved") && saved.includes(mission.id)) ||
        (filters.includes("Joined") && joined.includes(mission.id))) &&
      `${mission.title} ${mission.category} ${mission.location}`
        .toLowerCase()
        .includes(search),
  );
}
