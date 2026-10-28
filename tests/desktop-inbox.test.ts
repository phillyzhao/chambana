import { describe, expect, it } from "vitest";
import {
  desktopConversationPreview,
  filterDesktopConversations,
  type DesktopInboxGroup,
} from "../src/lib/desktop-inbox";

const groups: DesktopInboxGroup[] = [
  {
    id: 0,
    name: "The in-between club",
    initials: "IC",
    members: ["Maya Chen", "Julia Lee", "Julian Park (you)"],
  },
  {
    id: 1,
    name: "Good company",
    initials: "GC",
    members: ["Maya Chen", "Theo Kim"],
  },
  {
    id: 2,
    name: "Outside the syllabus",
    initials: "OS",
    members: ["Maya Chen", "Eli Carter", "Nora Patel"],
  },
];

function ids(result: DesktopInboxGroup[]) {
  return result.map((group) => group.id);
}

describe("desktop conversation discovery", () => {
  it("shows all conversations in their original order when All is selected", () => {
    expect(
      ids(filterDesktopConversations(groups, "  ", false, [0, 2], {})),
    ).toEqual([0, 1, 2]);
  });

  it.each([
    ["  GOOD COMPANY  ", [1]],
    ["nora patel", [2]],
    ["GARDEN ENTRANCE", [0]],
    ["Maya Chen", [0, 1, 2]],
    ["Julian Park", [0]],
  ])("matches group, member, or latest message for %s", (query, expected) => {
    expect(
      ids(filterDesktopConversations(groups, query, false, [], {})),
    ).toEqual(expected);
  });

  it("combines a search with Unread instead of including every search match", () => {
    expect(
      ids(filterDesktopConversations(groups, "Maya", true, [2], {})),
    ).toEqual([2]);
    expect(
      filterDesktopConversations(groups, "Good company", true, [0, 2], {}),
    ).toEqual([]);
  });

  it("removes a read conversation without disturbing the remaining unread result", () => {
    expect(
      ids(filterDesktopConversations(groups, "", true, [0, 2], {})),
    ).toEqual([0, 2]);
    expect(ids(filterDesktopConversations(groups, "", true, [2], {}))).toEqual([
      2,
    ]);
    expect(filterDesktopConversations(groups, "", true, [], {})).toEqual([]);
    expect(ids(filterDesktopConversations(groups, "", false, [], {}))).toEqual([
      0, 1, 2,
    ]);
  });

  it("searches the visible latest sent message, not an obsolete preview", () => {
    const sent = { 0: ["I will bring a thermos.", "Meet at the south gate."] };
    expect(desktopConversationPreview(0, sent)).toBe(
      "You: Meet at the south gate.",
    );
    expect(
      ids(filterDesktopConversations(groups, "SOUTH GATE", false, [], sent)),
    ).toEqual([0]);
    expect(
      filterDesktopConversations(groups, "thermos", false, [], sent),
    ).toEqual([]);
    expect(
      filterDesktopConversations(groups, "garden entrance", false, [], sent),
    ).toEqual([]);
  });

  it("keeps messages isolated to their conversation", () => {
    const sent = { 0: ["Meet at the south gate."] };
    expect(desktopConversationPreview(2, sent)).toBe(
      "Eli: Bringing my favorite Joan Didion.",
    );
    expect(
      ids(filterDesktopConversations(groups, "Didion", false, [], sent)),
    ).toEqual([2]);
  });

  it("responds to current group membership without mutating source state", () => {
    const before = structuredClone(groups);
    const joined = groups.map((group) =>
      group.id === 1
        ? { ...group, members: [...group.members, "Julian Park (you)"] }
        : group,
    );
    expect(
      ids(filterDesktopConversations(joined, "Julian Park", false, [], {})),
    ).toEqual([0, 1]);
    expect(groups).toEqual(before);
  });

  it("handles an empty inbox or a group with no seed messages", () => {
    expect(filterDesktopConversations([], "", false, [], {})).toEqual([]);
    expect(desktopConversationPreview(99, {})).toBe("No messages yet");
    expect(desktopConversationPreview(99, { 99: ["Hello everyone"] })).toBe(
      "You: Hello everyone",
    );
  });
});
