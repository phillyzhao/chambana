import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  MemberMissionState,
  MemberSubmission,
} from "../src/lib/member-missions";

const mocks = vi.hoisted(() => ({
  gate: vi.fn(),
  account: vi.fn(),
  activity: vi.fn(),
  catalog: vi.fn(),
  iphone: vi.fn(() => null),
  desktop: vi.fn(() => null),
  previewGate: vi.fn(() => null),
}));

vi.mock("../src/lib/preview-access", () => ({ hasPreviewAccess: mocks.gate }));
vi.mock("../src/lib/member-auth", () => ({ getMemberAccount: mocks.account }));
vi.mock("../src/lib/member-mission-store", () => ({
  getMemberMissionState: mocks.activity,
}));
vi.mock("../src/lib/mission-library-store", () => ({
  listPublishedMissions: mocks.catalog,
}));
vi.mock("../src/components/ios-concepts", () => ({
  IOSConcepts: mocks.iphone,
}));
vi.mock("../src/components/desktop-home-preview", () => ({
  DesktopHomePreview: mocks.desktop,
}));
vi.mock("../src/components/preview-access-gate", () => ({
  PreviewAccessGate: mocks.previewGate,
}));

import MemberAppPage from "../src/app/app/page";

const userId = "50000000-0000-4000-8000-000000000001";
const profile = {
  name: "Taylor Reed",
  handle: "taylorreed",
  interests: ["Outdoors"],
};
const account = { id: userId, email: "taylor@illinois.edu", profile };
const submission: MemberSubmission = {
  id: "50000000-0000-4000-8000-000000000002",
  user_id: userId,
  mission_id: "50000000-0000-4000-8000-000000000003",
  status: "pending",
  mission_title: "A real campus mission",
  mission_instructions: "Find the sign beside the research plots.",
  proof_prompt: "Take a photo with the sign.",
  nuts: 25,
  mission_revision: 1,
  proof_path: `${userId}/private-proof.jpg`,
  mime_type: "image/jpeg",
  size_bytes: 256,
  created_at: "2026-11-11T15:00:00Z",
  submitted_at: "2026-11-11T15:01:00Z",
  reviewed_at: null,
  rejection_reason: null,
};
const state: MemberMissionState = {
  submissions: [submission],
  nuts: 0,
  completedCount: 0,
};
const catalog = {
  missions: [{ id: submission.mission_id, title: submission.mission_title }],
};

function page(view?: string, auth_error?: string) {
  return MemberAppPage({ searchParams: Promise.resolve({ view, auth_error }) });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", "true");
  mocks.gate.mockResolvedValue(true);
  mocks.account.mockResolvedValue(account);
  mocks.activity.mockResolvedValue(state);
  mocks.catalog.mockResolvedValue(catalog);
});

afterEach(() => vi.unstubAllEnvs());

describe("real member app entry", () => {
  it("checks the preview gate before reading account, submissions, or catalog", async () => {
    mocks.gate.mockResolvedValue(false);
    const result = await page("desktop");
    expect(result.type).toBe(mocks.previewGate);
    expect(result.props.destination).toBe("/app");
    expect(mocks.account).not.toHaveBeenCalled();
    expect(mocks.activity).not.toHaveBeenCalled();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });

  it.each([undefined, "desktop"])(
    "opens real sign-in for an unauthenticated %s visitor",
    async (view) => {
      mocks.account.mockResolvedValue(null);
      const result = await page(view);
      expect(result.type).toBe(mocks.iphone);
      expect(result.props).toMatchObject({ realAccount: true });
      expect(result.props.member).toBeUndefined();
      expect(result.props.verifiedEmail).toBeUndefined();
      expect(result.props.missionLibrary).toBeUndefined();
      expect(mocks.activity).not.toHaveBeenCalled();
      expect(mocks.catalog).not.toHaveBeenCalled();
    },
  );

  it("continues profile onboarding for a verified member without a profile", async () => {
    mocks.account.mockResolvedValue({ ...account, profile: null });
    const result = await page();
    expect(result.type).toBe(mocks.iphone);
    expect(result.props).toMatchObject({
      realAccount: true,
      verifiedEmail: account.email,
    });
    expect(result.props.member).toBeUndefined();
    expect(mocks.activity).not.toHaveBeenCalled();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });

  it.each(["expired", "<script>untrusted error</script>"])(
    "shows safe expired-link guidance for auth_error=%s",
    async (error) => {
      mocks.account.mockResolvedValue(null);
      const result = await page(undefined, error);
      expect(result.props.realAccount).toBe(true);
      expect(result.props.initialError).toBe(
        "That sign-in link could not be verified. Request a new one.",
      );
      expect(result.props.initialError).not.toContain(error);
      expect(mocks.activity).not.toHaveBeenCalled();
    },
  );

  it("does not show an auth failure for a healthy sign-in entry", async () => {
    mocks.account.mockResolvedValue(null);
    expect((await page()).props.initialError).toBeUndefined();
  });

  it.each([undefined, "desktop"])(
    "passes real zero-balance activity and the shared catalog to %s",
    async (view) => {
      const result = await page(view);
      expect(result.type).toBe(
        view === "desktop" ? mocks.desktop : mocks.iphone,
      );
      expect(mocks.activity).toHaveBeenCalledOnce();
      expect(mocks.activity).toHaveBeenCalledWith(userId);
      expect(result.props.missionLibrary).toBe(catalog);
      expect(result.props.member).toEqual({ ...state, id: userId, profile });
      expect(result.props.member.nuts).toBe(0);
      expect(result.props.member.completedCount).toBe(0);
      expect(result.props.member.submissions[0].status).toBe("pending");
      if (view !== "desktop") expect(result.props.realAccount).toBe(true);
    },
  );

  it.each([undefined, "desktop"])(
    "uses the persisted approved balance after a later %s page load",
    async (view) => {
      const approvedState = {
        nuts: 25,
        completedCount: 1,
        submissions: [
          {
            ...submission,
            status: "approved",
            reviewed_at: "2026-11-11T15:10:00Z",
          },
        ],
      };
      mocks.activity.mockResolvedValue(approvedState);
      const result = await page(view);
      expect(result.props.member).toEqual({
        ...approvedState,
        id: userId,
        profile,
      });
      expect(result.props.member.nuts).not.toBe(340);
      expect(result.props.member.completedCount).not.toBe(6);
    },
  );

  it.each([undefined, "false", "TRUE", "1"])(
    "passes an explicit empty catalog when delivery is disabled (%s), preventing sample fallback",
    async (flag) => {
      vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", flag);
      for (const view of [undefined, "desktop"]) {
        const result = await page(view);
        expect(result.props.missionLibrary).toEqual({ missions: [] });
        expect(result.props.member).toEqual({ ...state, id: userId, profile });
      }
      expect(mocks.catalog).not.toHaveBeenCalled();
    },
  );

  it("preserves catalog failure information without falling back to sample missions", async () => {
    const unavailable = {
      missions: [],
      error: "Missions are temporarily unavailable.",
    };
    mocks.catalog.mockResolvedValue(unavailable);
    expect((await page()).props.missionLibrary).toBe(unavailable);
  });

  it("does not use query parameters as a member identity or nut balance", async () => {
    const result = await MemberAppPage({
      searchParams: Promise.resolve({
        view: "desktop",
        user_id: "someone-else",
        nuts: "99999",
      }),
    });
    expect(mocks.activity).toHaveBeenCalledWith(userId);
    expect(result.props.member.id).toBe(userId);
    expect(result.props.member.nuts).toBe(0);
  });

  it("fails closed when real member activity cannot be loaded", async () => {
    mocks.activity.mockRejectedValue(new Error("Activity unavailable"));
    await expect(page()).rejects.toThrow("Activity unavailable");
  });

  it("does not turn account lookup failures into a demo session", async () => {
    mocks.account.mockRejectedValue(new Error("Account unavailable"));
    await expect(page()).rejects.toThrow("Account unavailable");
    expect(mocks.activity).not.toHaveBeenCalled();
    expect(mocks.catalog).not.toHaveBeenCalled();
  });
});
