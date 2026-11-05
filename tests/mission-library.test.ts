import { describe, expect, it } from "vitest";
import {
  chicagoDateTimeInput,
  isPublishedMission,
  missionDraftSchema,
  missionFormInput,
  missionStatus,
  parseChicagoDateTime,
} from "../src/lib/mission-library";
import {
  createMissionAdminToken,
  MISSION_ADMIN_MAX_AGE,
  validMissionAdminSecret,
  verifyMissionAdminToken,
} from "../src/lib/mission-admin-token";
import { createPreviewToken } from "../src/lib/preview-access-token";

const now = Date.parse("2026-10-28T15:00:00Z");
const key = "test-owner-key-longer-than-thirty-two-characters";
const base = {
  title: "Quad victory lap",
  category: "Self Improvement",
  instructions: "Take one lap and invent a silly team name.",
  location_name: "Main Quad",
  location_address: "",
  city: "Urbana",
  duration_minutes: 10,
  cost_label: "Free",
  min_people: 1,
  max_people: 4,
  nuts: 25,
  proof_prompt: "Tell us your team name.",
  source_url: "https://illinois.edu/",
  source_checked_on: "2026-10-28",
  starts_at: null,
  ends_at: null,
};

describe("mission publication boundaries", () => {
  const draft = {
    approved_at: null,
    archived_at: null,
    starts_at: null,
    ends_at: null,
  };
  it("never publishes a draft even when its schedule is current", () => {
    expect(isPublishedMission(draft, now)).toBe(false);
    expect(
      isPublishedMission({ ...draft, starts_at: "2026-10-27T00:00:00Z" }, now),
    ).toBe(false);
    expect(
      missionStatus({ ...draft, starts_at: "2026-12-01T00:00:00Z" }, now),
    ).toBe("Draft");
  });
  it("makes approved start inclusive and end exclusive, and hides archives", () => {
    const mission = {
      ...draft,
      approved_at: "2026-10-27T00:00:00Z",
      starts_at: new Date(now).toISOString(),
    };
    expect(isPublishedMission(mission, now - 1)).toBe(false);
    expect(isPublishedMission(mission, now)).toBe(true);
    expect(
      isPublishedMission(
        { ...mission, ends_at: new Date(now).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(
      isPublishedMission(
        { ...mission, archived_at: new Date(now).toISOString() },
        now,
      ),
    ).toBe(false);
    expect(missionStatus(mission, now - 1)).toBe("Scheduled");
  });
});

describe("mission input and Central scheduling", () => {
  it("validates local categories, city, group limits, links and schedule ordering", () => {
    expect(missionDraftSchema.safeParse(base).success).toBe(true);
    for (const change of [
      { city: "Chicago" },
      { category: "Random" },
      { source_url: "javascript:alert(1)" },
      { source_url: "https://user:secret@example.com/" },
      { min_people: 4, max_people: 2 },
      { duration_minutes: 0 },
      { source_checked_on: "2026-02-30" },
      { starts_at: "2026-11-02T12:00:00Z", ends_at: "2026-11-02T11:00:00Z" },
    ])
      expect(missionDraftSchema.safeParse({ ...base, ...change }).success).toBe(
        false,
      );
  });
  it("uses Central winter/summer offsets regardless of server timezone", () => {
    expect(parseChicagoDateTime("2026-10-28T17:30")).toBe(
      "2026-10-28T22:30:00.000Z",
    );
    expect(parseChicagoDateTime("2026-12-28T17:30")).toBe(
      "2026-12-28T23:30:00.000Z",
    );
    expect(chicagoDateTimeInput("2026-10-28T22:30:00Z")).toBe(
      "2026-10-28T17:30",
    );
    expect(parseChicagoDateTime("")).toBeNull();
  });
  it("rejects nonexistent dates and DST gaps/duplicates", () => {
    expect(() => parseChicagoDateTime("2026-03-08T02:30")).toThrow(
      "does not exist",
    );
    expect(() => parseChicagoDateTime("2026-11-01T01:30")).toThrow(
      "occurs twice",
    );
    expect(() => parseChicagoDateTime("2026-02-30T12:30")).toThrow();
    expect(() => parseChicagoDateTime("2026-10-28T25:00")).toThrow();
  });
  it("parses form schedules server-side and ignores forged approval fields", () => {
    const form = new FormData();
    Object.entries(base).forEach(([key, value]) =>
      form.set(key, value === null ? "" : String(value)),
    );
    form.set("starts_local", "2026-10-28T17:30");
    form.set("approved_at", "2026-10-28T00:00:00Z");
    expect(missionFormInput(form)).toMatchObject({
      starts_at: "2026-10-28T22:30:00.000Z",
    });
    expect(missionFormInput(form)).not.toHaveProperty("approved_at");
    form.set("duration_minutes", "");
    expect(() => missionFormInput(form)).toThrow();
  });
});

describe("mission owner credential", () => {
  it("requires a complete configured secret without accepting preview credentials", () => {
    expect(validMissionAdminSecret(key, key)).toBe(true);
    expect(validMissionAdminSecret("0010110", key)).toBe(false);
    expect(validMissionAdminSecret(key + " ", key)).toBe(false);
    expect(validMissionAdminSecret(key, undefined)).toBe(false);
    expect(validMissionAdminSecret("short", "short")).toBe(false);
    expect(validMissionAdminSecret(new File([key], "key"), key)).toBe(false);
    expect(
      verifyMissionAdminToken(createPreviewToken(key, now), key, now),
    ).toBe(false);
  });
  it("expires sessions, rejects forgeries/future issuance, and revokes on key rotation", () => {
    const token = createMissionAdminToken(key, now);
    expect(verifyMissionAdminToken(token, key, now)).toBe(true);
    expect(token).not.toContain(key);
    expect(
      verifyMissionAdminToken(token, key, now + MISSION_ADMIN_MAX_AGE * 1000),
    ).toBe(false);
    expect(verifyMissionAdminToken(token, key, now - 1000)).toBe(false);
    expect(verifyMissionAdminToken(token, key + "new", now)).toBe(false);
    expect(
      verifyMissionAdminToken(
        token.replace("mission-admin-v1", "v1"),
        key,
        now,
      ),
    ).toBe(false);
    expect(verifyMissionAdminToken(token.slice(0, -1) + "z", key, now)).toBe(
      false,
    );
    expect(verifyMissionAdminToken(token, undefined, now)).toBe(false);
  });
});
