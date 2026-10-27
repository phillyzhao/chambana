export type DesktopGroupFilter = "Outdoors" | "Social" | "Arts" | "Joined";

export function toggleDesktopGroupFilter(
  current: DesktopGroupFilter[],
  option: "All" | DesktopGroupFilter,
): DesktopGroupFilter[] {
  if (option === "All") return [];
  return current.includes(option)
    ? current.filter((filter) => filter !== option)
    : [...current, option];
}

/** Categories form a union; Joined and text search further narrow the results. */
export function filterDesktopGroups<
  T extends { id: number; name: string; category: string },
>(
  groups: readonly T[],
  query: string,
  filters: readonly DesktopGroupFilter[],
  joined: readonly number[],
): T[] {
  const search = query.trim().toLowerCase();
  const categories = filters.filter((filter) => filter !== "Joined");
  return groups.filter(
    (group) =>
      (!categories.length ||
        categories.some((category) => category === group.category)) &&
      (!filters.includes("Joined") || joined.includes(group.id)) &&
      `${group.name} ${group.category}`.toLowerCase().includes(search),
  );
}
