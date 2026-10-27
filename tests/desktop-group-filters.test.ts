import { describe, expect, it } from "vitest";
import {
  filterDesktopGroups,
  toggleDesktopGroupFilter,
  type DesktopGroupFilter,
} from "../src/lib/desktop-group-filters";

const groups = Object.freeze([
  Object.freeze({
    id: 40,
    name: "Campus walkers",
    category: "Outdoors",
    members: 12,
  }),
  Object.freeze({
    id: 7,
    name: "Sunday supper",
    category: "Social",
    members: 8,
  }),
  Object.freeze({
    id: 21,
    name: "Campus sketchbook",
    category: "Arts",
    members: 6,
  }),
  Object.freeze({
    id: 3,
    name: "Trail friends",
    category: "Outdoors",
    members: 15,
  }),
]);

const ids = (results: { id: number }[]) => results.map((group) => group.id);

describe("desktop group filter selection", () => {
  it("combines categories with Joined and clears every selection with All", () => {
    const outdoors = toggleDesktopGroupFilter([], "Outdoors");
    const categories = toggleDesktopGroupFilter(outdoors, "Arts");
    const joinedCategories = toggleDesktopGroupFilter(categories, "Joined");
    expect(joinedCategories).toEqual(["Outdoors", "Arts", "Joined"]);
    expect(toggleDesktopGroupFilter(joinedCategories, "All")).toEqual([]);
    expect(outdoors).toEqual(["Outdoors"]);
    expect(categories).toEqual(["Outdoors", "Arts"]);
    expect(joinedCategories).toEqual(["Outdoors", "Arts", "Joined"]);
  });

  it("removes only the toggled option and returns to All after the last option", () => {
    const current: DesktopGroupFilter[] = ["Social", "Joined"];
    const joinedOnly = toggleDesktopGroupFilter(current, "Social");
    expect(joinedOnly).toEqual(["Joined"]);
    expect(toggleDesktopGroupFilter(joinedOnly, "Joined")).toEqual([]);
    expect(current).toEqual(["Social", "Joined"]);
    expect(toggleDesktopGroupFilter([], "All")).toEqual([]);
  });
});

describe("desktop group search and filtering", () => {
  it("shows all groups in source order when no filters are selected", () => {
    const result = filterDesktopGroups(groups, "  ", [], [7]);
    expect(ids(result)).toEqual([40, 7, 21, 3]);
    expect(result).not.toBe(groups);
    expect(result[0]).toBe(groups[0]);
    expect(result[0].members).toBe(12);
  });

  it.each([
    ["  CAMPUS  ", [40, 21]],
    ["outDOORS", [40, 3]],
    ["  sunday SUPPER ", [7]],
  ])("searches names and categories for %s", (query, expected) => {
    expect(ids(filterDesktopGroups(groups, query, [], []))).toEqual(expected);
  });

  it("includes any selected category while preserving source order", () => {
    expect(
      ids(filterDesktopGroups(groups, "", ["Arts", "Outdoors"], [])),
    ).toEqual([40, 21, 3]);
    expect(ids(filterDesktopGroups(groups, "", ["Social"], []))).toEqual([7]);
  });

  it("uses group IDs for Joined alone, ignoring duplicate and missing IDs", () => {
    expect(
      ids(filterDesktopGroups(groups, "", ["Joined"], [21, 7, 21, 999])),
    ).toEqual([7, 21]);
  });

  it("restricts selected categories to joined groups instead of adding other categories", () => {
    expect(
      ids(
        filterDesktopGroups(
          groups,
          "",
          ["Outdoors", "Arts", "Joined"],
          [7, 21, 3],
        ),
      ),
    ).toEqual([21, 3]);
    expect(
      filterDesktopGroups(groups, "", ["Outdoors", "Joined"], [7, 21]),
    ).toEqual([]);
  });

  it("applies search within the category and membership selection", () => {
    expect(
      ids(
        filterDesktopGroups(
          groups,
          "campus",
          ["Outdoors", "Arts", "Joined"],
          [7, 21, 3],
        ),
      ),
    ).toEqual([21]);
    expect(filterDesktopGroups(groups, "supper", ["Arts"], [7])).toEqual([]);
    expect(filterDesktopGroups(groups, "unlisted club", [], [])).toEqual([]);
  });

  it("supports empty catalogs, no memberships, and resetting filters", () => {
    const selected: DesktopGroupFilter[] = ["Arts", "Joined"];
    expect(filterDesktopGroups(groups, "", selected, [])).toEqual([]);
    expect(
      ids(
        filterDesktopGroups(
          groups,
          "campus",
          toggleDesktopGroupFilter(selected, "All"),
          [],
        ),
      ),
    ).toEqual([40, 21]);
    expect(filterDesktopGroups([], "campus", ["Joined"], [40])).toEqual([]);
  });

  it("accepts frozen inputs and does not mutate data, filters, or membership", () => {
    const filters = Object.freeze<DesktopGroupFilter[]>(["Outdoors", "Joined"]);
    const joined = Object.freeze([3, 40]);
    const result = filterDesktopGroups(groups, "", filters, joined);
    expect(ids(result)).toEqual([40, 3]);
    result.reverse();
    expect(ids([...groups])).toEqual([40, 7, 21, 3]);
    expect(filters).toEqual(["Outdoors", "Joined"]);
    expect(joined).toEqual([3, 40]);
  });
});
