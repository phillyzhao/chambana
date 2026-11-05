import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCookie: vi.fn(),
  listAdminMissions: vi.fn(),
  MissionAdmin: vi.fn(() => null),
  MissionAdminLogin: vi.fn(() => null),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: mocks.getCookie }),
}));
vi.mock("../src/lib/mission-library-store", () => ({
  listAdminMissions: mocks.listAdminMissions,
}));
vi.mock("../src/components/mission-admin", () => ({
  MissionAdmin: mocks.MissionAdmin,
  MissionAdminLogin: mocks.MissionAdminLogin,
}));

import MissionAdminPage from "../src/app/mission-admin/page";
import {
  createMissionAdminToken,
  MISSION_ADMIN_COOKIE,
} from "../src/lib/mission-admin-token";
import {
  createPreviewToken,
  PREVIEW_ACCESS_COOKIE,
} from "../src/lib/preview-access-token";

const adminSecret = "test-owner-admin-secret-with-over-thirty-two-characters";
const previewSecret =
  "test-public-preview-secret-with-over-thirty-two-characters";
const draft = {
  id: "private-draft-id",
  title: "Private mission draft",
  approved_at: null,
};

function signInAsOwner() {
  mocks.getCookie.mockImplementation((name: string) =>
    name === MISSION_ADMIN_COOKIE
      ? { value: createMissionAdminToken(adminSecret) }
      : undefined,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("MISSION_ADMIN_SECRET", adminSecret);
  vi.stubEnv("PREVIEW_ACCESS_SECRET", previewSecret);
  vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", "false");
  mocks.getCookie.mockReturnValue(undefined);
  mocks.listAdminMissions.mockResolvedValue({ missions: [draft] });
});

afterEach(() => vi.unstubAllEnvs());

describe("private mission library page", () => {
  it("does not fetch or serialize drafts for an unauthenticated visitor", async () => {
    const result = await MissionAdminPage();
    expect(result.type).toBe(mocks.MissionAdminLogin);
    expect(result.props).toEqual({ configured: true });
    expect(mocks.listAdminMissions).not.toHaveBeenCalled();
    expect(JSON.stringify(result.props)).not.toContain(draft.title);
  });

  it("does not treat a valid public preview session as owner authorization", async () => {
    mocks.getCookie.mockImplementation((name: string) =>
      name === PREVIEW_ACCESS_COOKIE
        ? { value: createPreviewToken(previewSecret) }
        : undefined,
    );
    const result = await MissionAdminPage();
    expect(result.type).toBe(mocks.MissionAdminLogin);
    expect(mocks.getCookie).toHaveBeenCalledWith(MISSION_ADMIN_COOKIE);
    expect(mocks.listAdminMissions).not.toHaveBeenCalled();
  });

  it("rejects a preview token copied into the admin cookie", async () => {
    mocks.getCookie.mockReturnValue({
      value: createPreviewToken(previewSecret),
    });
    const result = await MissionAdminPage();
    expect(result.type).toBe(mocks.MissionAdminLogin);
    expect(mocks.listAdminMissions).not.toHaveBeenCalled();
  });

  it("shows setup state without accessing the library when the owner key is missing", async () => {
    vi.stubEnv("MISSION_ADMIN_SECRET", "");
    const result = await MissionAdminPage();
    expect(result.type).toBe(mocks.MissionAdminLogin);
    expect(result.props).toEqual({ configured: false });
    expect(mocks.listAdminMissions).not.toHaveBeenCalled();
  });

  it.each([undefined, "false", "TRUE", "1"])(
    "keeps MVP delivery paused unless explicitly enabled (%s)",
    async (flag) => {
      signInAsOwner();
      vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", flag);
      const result = await MissionAdminPage();
      expect(result.type).toBe(mocks.MissionAdmin);
      expect(result.props.missions).toEqual([draft]);
      expect(result.props.deliveryEnabled).toBe(false);
      expect(mocks.listAdminMissions).toHaveBeenCalledOnce();
    },
  );

  it("exposes the enabled delivery state only after owner authorization", async () => {
    signInAsOwner();
    vi.stubEnv("CHAMBANA_MISSION_LIBRARY_ENABLED", "true");
    const result = await MissionAdminPage();
    expect(result.props.deliveryEnabled).toBe(true);
  });

  it("renders a connection error instead of presenting a false empty success", async () => {
    signInAsOwner();
    mocks.listAdminMissions.mockResolvedValue({
      missions: [],
      error: "The mission library is not configured.",
    });
    const result = await MissionAdminPage();
    expect(result.type).toBe(mocks.MissionAdmin);
    expect(result.props.error).toBe("The mission library is not configured.");
    expect(result.props.missions).toEqual([]);
  });
});
