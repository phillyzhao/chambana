import { describe, expect, it } from "vitest";
import {
  filterDesktopMissions,
  toggleDesktopMissionFilter,
  type DesktopMissionFilter,
} from "../src/lib/desktop-mission-filters";

const missions = Object.freeze([
  Object.freeze({
    id: 40,
    title: "Take the long way home",
    category: "Wander",
    location: "Japan House gardens",
    nuts: 50,
  }),
  Object.freeze({
    id: 5,
    title: "A table for six",
    category: "Connect",
    location: "Campustown",
    nuts: 75,
  }),
  Object.freeze({
    id: 22,
    title: "Find your next favorite",
    category: "Discover",
    location: "Main Library",
    nuts: 40,
  }),
]);

const ids = (results: { id: number }[]) => results.map((mission) => mission.id);

describe("desktop mission selection", () => {
  it("allows Saved and Joined together, then All clears both", () => {
    const saved = toggleDesktopMissionFilter([], "Saved");
    const both = toggleDesktopMissionFilter(saved, "Joined");
    expect(both).toEqual(["Saved", "Joined"]);
    expect(toggleDesktopMissionFilter(both, "All")).toEqual([]);
    expect(saved).toEqual(["Saved"]);
    expect(both).toEqual(["Saved", "Joined"]);
  });

  it("removes just the selected option, with no selection meaning All", () => {
    const current: DesktopMissionFilter[] = ["Saved", "Joined"];
    const joinedOnly = toggleDesktopMissionFilter(current, "Saved");
    expect(joinedOnly).toEqual(["Joined"]);
    expect(toggleDesktopMissionFilter(joinedOnly, "Joined")).toEqual([]);
    expect(current).toEqual(["Saved", "Joined"]);
  });
});

describe("desktop mission search and filtering", () => {
  it("shows all missions in catalog order without active filters", () => {
    const result = filterDesktopMissions(missions, "  ", [], [], []);
    expect(ids(result)).toEqual([40, 5, 22]);
    expect(result).not.toBe(missions);
    expect(result[0]).toBe(missions[0]);
    expect(result[0].nuts).toBe(50);
  });

  it.each([
    ["  LONG WAY  ", [40]],
    ["CONNECT", [5]],
    ["  main LIBRARY ", [22]],
  ])("searches title, category, and location for %s", (query, expected) => {
    expect(ids(filterDesktopMissions(missions, query, [], [], []))).toEqual(
      expected,
    );
  });

  it("uses mission IDs for individual Saved and Joined filters", () => {
    expect(
      ids(filterDesktopMissions(missions, "", ["Saved"], [22, 40], [5])),
    ).toEqual([40, 22]);
    expect(
      ids(filterDesktopMissions(missions, "", ["Joined"], [22, 40], [5])),
    ).toEqual([5]);
  });

  it("unions Saved and Joined without duplicates or reordering the catalog", () => {
    expect(
      ids(
        filterDesktopMissions(
          missions,
          "",
          ["Saved", "Joined"],
          [22, 5, 5],
          [40, 5, 999],
        ),
      ),
    ).toEqual([40, 5, 22]);
  });

  it("applies search within the combined selection, including empty results", () => {
    expect(
      ids(
        filterDesktopMissions(
          missions,
          "library",
          ["Saved", "Joined"],
          [40, 22],
          [5],
        ),
      ),
    ).toEqual([22]);
    expect(
      filterDesktopMissions(missions, "library", ["Saved"], [40], [22]),
    ).toEqual([]);
    expect(
      filterDesktopMissions(missions, "no such place", [], [], []),
    ).toEqual([]);
  });

  it("shows an empty selection until All is chosen", () => {
    const filters: DesktopMissionFilter[] = ["Saved", "Joined"];
    expect(filterDesktopMissions(missions, "", filters, [], [])).toEqual([]);
    expect(
      ids(
        filterDesktopMissions(
          missions,
          "",
          toggleDesktopMissionFilter(filters, "All"),
          [],
          [],
        ),
      ),
    ).toEqual([40, 5, 22]);
    expect(filterDesktopMissions([], "", [], [], [])).toEqual([]);
  });

  it("accepts frozen inputs and leaves membership and filter state untouched", () => {
    const filters = Object.freeze<DesktopMissionFilter[]>(["Joined", "Saved"]);
    const saved = Object.freeze([22, 40]);
    const joined = Object.freeze([5]);
    const result = filterDesktopMissions(missions, "", filters, saved, joined);
    result.reverse();
    expect(ids([...missions])).toEqual([40, 5, 22]);
    expect(filters).toEqual(["Joined", "Saved"]);
    expect(saved).toEqual([22, 40]);
    expect(joined).toEqual([5]);
  });
});
