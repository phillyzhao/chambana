import { expect, it } from "vitest";
import { missionCountdown } from "../src/lib/mission-timing";

const now = Date.parse("2026-10-08T12:00:00Z");
const mission = {
  status: "active",
  expires_at: "2026-10-08T14:15:00Z",
  available_at: "2026-10-08T15:00:00Z",
};

it("shows a countdown only while the active timer is running", () => {
  expect(missionCountdown(mission, now)).toBe("Ends in 2h 15m");
  expect(missionCountdown(mission, Date.parse(mission.expires_at))).toBe(
    "Ready to refresh",
  );
  expect(missionCountdown(mission, Date.parse(mission.expires_at) + 1000)).toBe(
    "Ready to refresh",
  );
});

it.each(["completed", "declined", "expired"])(
  "uses the replacement deadline for %s",
  (status) => {
    expect(missionCountdown({ ...mission, status }, now)).toBe(
      "Next mission in 3h 0m",
    );
    expect(
      missionCountdown(
        { ...mission, status },
        Date.parse(mission.available_at),
      ),
    ).toBe("Ready to refresh");
  },
);

it("keeps the initial render stable before the browser clock is available", () => {
  expect(missionCountdown(mission, null)).toBe("Ends in —");
  expect(missionCountdown({ ...mission, status: "completed" }, null)).toBe(
    "Next mission in —",
  );
});
