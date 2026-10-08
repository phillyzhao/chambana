import { expect, it } from "vitest";
import { matchesGroupModes, parseGroupModes } from "../src/lib/group-filters";

it("accepts multiple modes and normalizes duplicates and unknown values", () => {
  expect(parseGroupModes("organization,open,open,unknown")).toEqual([
    "open",
    "organization",
  ]);
  expect(parseGroupModes(["open", "organization"])).toEqual([
    "open",
    "organization",
  ]);
  expect(parseGroupModes("unknown")).toEqual([]);
});

it.each([undefined, "", "all", "all,open"])(
  "treats %s as All groups",
  (value) => {
    expect(parseGroupModes(value)).toEqual([]);
  },
);

it("includes either selected join mode and excludes unselected modes", () => {
  const modes = parseGroupModes("open,organization");
  expect(matchesGroupModes({ id: "a", join_mode: "open" }, modes, [])).toBe(
    true,
  );
  expect(
    matchesGroupModes({ id: "b", join_mode: "organization" }, modes, []),
  ).toBe(true);
  expect(matchesGroupModes({ id: "c", join_mode: "invite" }, modes, [])).toBe(
    false,
  );
});

it("combines My groups with other selected modes without requiring membership in both", () => {
  const modes = parseGroupModes("mine,open");
  expect(
    matchesGroupModes({ id: "member", join_mode: "invite" }, modes, ["member"]),
  ).toBe(true);
  expect(
    matchesGroupModes({ id: "public", join_mode: "open" }, modes, ["member"]),
  ).toBe(true);
  expect(
    matchesGroupModes({ id: "other", join_mode: "invite" }, modes, ["member"]),
  ).toBe(false);
  expect(matchesGroupModes({ id: "other", join_mode: "invite" }, [], [])).toBe(
    true,
  );
});
