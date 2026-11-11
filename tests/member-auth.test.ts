import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  configured: vi.fn(),
  database: vi.fn(),
  service: vi.fn(),
  getUser: vi.fn(),
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
}));
vi.mock("../src/lib/supabase", () => ({
  isConfigured: mocks.configured,
  database: mocks.database,
  serviceDatabase: mocks.service,
}));
import { getMemberAccount, requireMemberAccount } from "../src/lib/member-auth";

const user = {
  id: "user-a",
  email: "Student@Illinois.edu",
  email_confirmed_at: "2026-11-11T00:00:00Z",
};
const profile = { name: "Student", handle: "student", interests: ["Outdoors"] };
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-only-key");
  mocks.configured.mockReturnValue(true);
  mocks.getUser.mockResolvedValue({ data: { user }, error: null });
  mocks.database.mockResolvedValue({ auth: { getUser: mocks.getUser } });
  mocks.maybeSingle.mockResolvedValue({ data: profile, error: null });
  mocks.eq.mockReturnValue({ maybeSingle: mocks.maybeSingle });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.service.mockReturnValue({ from: mocks.from });
});
afterEach(() => vi.unstubAllEnvs());

describe("member account guard", () => {
  it("validates the session with Auth and reads only that user's profile", async () => {
    expect(await getMemberAccount()).toEqual({
      id: "user-a",
      email: "student@illinois.edu",
      profile,
    });
    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.eq).toHaveBeenCalledWith("id", "user-a");
  });
  it.each([
    null,
    { ...user, email_confirmed_at: null },
    { ...user, email: "student@gmail.com" },
    { ...user, email: "student@illinois.edu.evil.test" },
  ])(
    "rejects absent, unconfirmed, and off-campus identities",
    async (candidate) => {
      mocks.getUser.mockResolvedValue({
        data: { user: candidate },
        error: null,
      });
      expect(await getMemberAccount()).toBeNull();
      expect(mocks.service).not.toHaveBeenCalled();
      await expect(requireMemberAccount()).rejects.toMatchObject({
        status: 401,
      });
    },
  );
  it("allows onboarding but rejects submissions before profile completion", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    expect(await requireMemberAccount()).toMatchObject({ profile: null });
    await expect(requireMemberAccount({ profile: true })).rejects.toMatchObject(
      { status: 403 },
    );
  });
  it("treats missing sessions as signed out", async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { name: "AuthSessionMissingError", status: 400 },
    });
    expect(await getMemberAccount()).toBeNull();
  });
  it.each(["configuration", "auth", "profile"])(
    "reports %s failures without exposing backend details",
    async (failure) => {
      if (failure === "configuration") mocks.configured.mockReturnValue(false);
      if (failure === "auth")
        mocks.getUser.mockRejectedValue(new Error("private backend detail"));
      if (failure === "profile")
        mocks.maybeSingle.mockResolvedValue({
          data: null,
          error: new Error("private backend detail"),
        });
      await expect(getMemberAccount()).rejects.toMatchObject({ status: 503 });
      await expect(getMemberAccount()).rejects.not.toThrow(
        "private backend detail",
      );
    },
  );
});
