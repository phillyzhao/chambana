import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissionLibraryFeed } from "../src/components/mission-library-feed";
import { DesktopProfile } from "../src/components/desktop-profile";
import {
  missionDraftSchema,
  type MissionLibraryRecord,
} from "../src/lib/mission-library";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const now = "2026-10-28T18:00:00.000Z";
const id = "da21fcd1-9d9a-46c8-8fe1-adf9f814393b";
const mission: MissionLibraryRecord = {
  id,
  title: "A campus adventure",
  category: "Campus Exploration",
  placement: "missions",
  instructions:
    "Find a detail you have never noticed and describe it to a friend.",
  location_name: "Main Quad",
  location_address: "",
  city: "Urbana",
  duration_minutes: 15,
  cost_label: "Free",
  min_people: 1,
  max_people: 4,
  nuts: 25,
  proof_prompt: "Share the detail you found.",
  source_url: "https://illinois.edu/",
  source_checked_on: "2026-10-28",
  starts_at: null,
  ends_at: null,
  approved_at: "2026-10-27T18:00:00.000Z",
  archived_at: null,
  created_at: "2026-10-27T18:00:00.000Z",
  updated_at: "2026-10-27T18:00:00.000Z",
  revision: 2,
};

function feed(
  overrides: Partial<ComponentProps<typeof MissionLibraryFeed>> = {},
) {
  return renderToStaticMarkup(
    createElement(MissionLibraryFeed, {
      data: { missions: [mission] },
      saved: [id],
      selectedId: null,
      savedOnly: false,
      onToggleSave: vi.fn(),
      onSelectMission: vi.fn(),
      onSavedOnlyChange: vi.fn(),
      ...overrides,
    }),
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(now));
});
afterEach(() => vi.useRealTimers());

describe("shared library saved mission contract", () => {
  it("keeps the three curated Play challenges separate from the other 22 Missions", async () => {
    const seeds = JSON.parse(
      await readFile(
        new URL("../data/mission-library-seed.json", import.meta.url),
        "utf8",
      ),
    ) as unknown[];
    const catalog: MissionLibraryRecord[] = seeds.map((seed, index) => ({
      ...missionDraftSchema.parse(seed),
      id: `30000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      approved_at: "2026-10-27T18:00:00.000Z",
      archived_at: null,
      created_at: "2026-10-27T18:00:00.000Z",
      updated_at: "2026-10-27T18:00:00.000Z",
      revision: 1,
    }));
    const play = feed({
      data: { missions: catalog },
      play: true,
      savedOnly: true,
      saved: [],
    });
    const missions = feed({ data: { missions: catalog }, saved: [] });
    expect(play.match(/<article\b/g)).toHaveLength(3);
    expect(missions.match(/<article\b/g)).toHaveLength(22);
    expect(
      catalog
        .filter((item) => item.placement === "play")
        .map((item) => item.title),
    ).toEqual(["Moonwalk past Alma", "Everybody jump", "Backwards high-five"]);
    for (const item of catalog) {
      const title = renderToStaticMarkup(createElement("h2", null, item.title));
      expect(item.placement === "play" ? play : missions).toContain(title);
      expect(item.placement === "play" ? missions : play).not.toContain(title);
    }
  });

  it("can open a published saved Play challenge without adding it to the Missions list", () => {
    const playMission = { ...mission, placement: "play" as const };
    const html = feed({ data: { missions: [playMission] }, selectedId: id });
    expect(html).not.toContain("<article");
    expect(html).toContain(mission.title);
    expect(html).toContain(mission.proof_prompt);
  });
  it("renders parent-owned saved UUIDs in Home and Missions after remounts", () => {
    for (const home of [true, false]) {
      const html = feed({ home });
      expect(html).toContain('aria-label="Unsave A campus adventure"');
      expect(html).toContain(mission.title);
    }
  });

  it("keeps Home recommendations visible when the Missions Saved filter is active", () => {
    expect(feed({ home: true, savedOnly: true, saved: [] })).toContain(
      mission.title,
    );
  });

  it("uses the controlled saved filter reached from iPhone Profile", () => {
    expect(feed({ savedOnly: true })).toContain(mission.title);
    expect(feed({ savedOnly: true, saved: [] })).not.toContain(mission.title);
  });

  it("opens the selected UUID's real details when requested from Profile", () => {
    const html = feed({ selectedId: id });
    expect(html).toContain("Get it on camera.");
    expect(html).toContain(mission.proof_prompt);
    expect(html).toContain("Saved for later");
  });

  it.each([
    { approved_at: null },
    { archived_at: now },
    { starts_at: "2026-10-29T18:00:00.000Z" },
    { ends_at: now },
  ])(
    "does not show or open saved missions outside their publishing window: %j",
    (change) => {
      const html = feed({
        data: { missions: [{ ...mission, ...change }] },
        selectedId: id,
      });
      expect(html).not.toContain(mission.title);
      expect(html).not.toContain(mission.proof_prompt);
      expect(html).toContain("New missions are on the way.");
    },
  );

  it("does not expose a stale mission detail when catalog refresh fails", () => {
    const html = feed({
      data: { missions: [mission], error: "Unavailable" },
      selectedId: id,
    });
    expect(html).toContain("Missions are temporarily unavailable.");
    expect(html).not.toContain(mission.title);
  });

  it("displays a saved UUID mission on Desktop Profile instead of an empty list", () => {
    const html = renderToStaticMarkup(
      createElement(DesktopProfile, {
        groups: [],
        missions: [
          {
            id,
            title: mission.title,
            location: mission.location_name,
            time: "Available now",
            duration: "15 minutes · Free",
            nuts: 25,
            image: "/design-assets/social.jpg",
            alt: "Illustrative campus social scene",
          },
        ],
        saved: [id],
        joined: [],
        activeTab: "saved",
        onTabChange: vi.fn(),
        onOpenGroup: vi.fn(),
        onOpenMission: vi.fn(),
        onBrowseGroups: vi.fn(),
        onBrowseMissions: vi.fn(),
        onSave: vi.fn(),
      }),
    );
    expect(html).toContain('aria-label="View A campus adventure"');
    expect(html).toContain('aria-label="Unsave A campus adventure"');
    expect(html).not.toContain("Nothing saved yet.");
  });
});
